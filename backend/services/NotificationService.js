const https = require('https');
const os = require('os');

const EXPO_PUSH_BATCH_SIZE = 100;
const PROFILE_PAGE_SIZE = 1000;
const NOTIFICATION_INSERT_CHUNK_SIZE = 500;
const MAX_QUEUE_SCAN_PER_TICK = 200;
const MAX_QUEUE_PROCESS_PER_TICK = 50;
const STALE_LOCK_MINUTES = 10;
const RETRY_BASE_SECONDS = 30;
const RETRY_MAX_SECONDS = 15 * 60;

function createNotificationService({ supabase, logLine }) {
    const workerId = `${os.hostname()}:${process.pid}`;

    function nowIso() {
        return new Date().toISOString();
    }

    function toIso(dateLike) {
        return new Date(dateLike).toISOString();
    }

    function chunkArray(items, size) {
        const chunks = [];
        for (let index = 0; index < items.length; index += size) {
            chunks.push(items.slice(index, index + size));
        }
        return chunks;
    }

    function safeErrorMessage(error) {
        const message = error?.message || String(error) || 'Unknown notification error';
        return message.slice(0, 1500);
    }

    function parsePayloadData(value) {
        if (!value) return {};
        if (typeof value === 'object' && !Array.isArray(value)) return value;
        if (typeof value !== 'string') return {};

        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            return {};
        }

        return {};
    }

    function getMaxAttempts(item) {
        const configured = Number(item?.max_attempts ?? 3);
        if (!Number.isFinite(configured) || configured < 1) return 3;
        return Math.floor(configured);
    }

    function isRetryDue(item, currentEpochMs) {
        if (!item?.next_retry_at) return true;
        const retryAtMs = new Date(item.next_retry_at).getTime();
        if (Number.isNaN(retryAtMs)) return true;
        return retryAtMs <= currentEpochMs;
    }

    function computeRetryDelaySeconds(nextAttempt) {
        const exponential = RETRY_BASE_SECONDS * (2 ** Math.max(nextAttempt - 1, 0));
        return Math.min(exponential, RETRY_MAX_SECONDS);
    }

    function computeNextRetryAt(nextAttempt) {
        const delaySeconds = computeRetryDelaySeconds(nextAttempt);
        const retryDate = new Date(Date.now() + (delaySeconds * 1000));
        return toIso(retryDate);
    }

    function isLikelyExpoPushToken(token) {
        if (!token || typeof token !== 'string') return false;
        return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
    }

    function normalizeExpoTokens(tokens) {
        const unique = new Set();
        for (const token of tokens || []) {
            if (isLikelyExpoPushToken(token)) {
                unique.add(token);
            }
        }
        return Array.from(unique);
    }

    function sendExpoBatch(messages) {
        if (!messages.length) return Promise.resolve({ data: [] });

        const reqData = JSON.stringify(messages);
        const options = {
            hostname: 'exp.host',
            path: '/--/api/v2/push/send',
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(reqData),
            },
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => { responseBody += chunk; });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`Expo push HTTP ${res.statusCode}: ${responseBody.slice(0, 400)}`));
                        return;
                    }

                    try {
                        const parsed = JSON.parse(responseBody || '{}');
                        resolve(parsed);
                    } catch {
                        reject(new Error(`Failed to parse Expo response: ${responseBody.slice(0, 400)}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(reqData);
            req.end();
        });
    }

    async function sendExpoPushNotifications(tokens, title, body, data = {}) {
        const validTokens = normalizeExpoTokens(tokens);
        const tokenBatches = chunkArray(validTokens, EXPO_PUSH_BATCH_SIZE);
        const errors = [];
        let ticketErrorCount = 0;

        for (const batch of tokenBatches) {
            const messages = batch.map((token) => ({
                to: token,
                sound: 'default',
                title,
                body,
                data,
            }));

            try {
                const response = await sendExpoBatch(messages);
                const tickets = Array.isArray(response?.data) ? response.data : [];
                for (const ticket of tickets) {
                    if (ticket?.status === 'error') {
                        ticketErrorCount += 1;
                    }
                }
            } catch (error) {
                errors.push(safeErrorMessage(error));
            }
        }

        return {
            requested: (tokens || []).length,
            valid: validTokens.length,
            invalid: Math.max((tokens || []).length - validTokens.length, 0),
            batches: tokenBatches.length,
            ticketErrorCount,
            errors,
        };
    }

    async function fetchProfilesPage(from, to) {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, expo_push_token')
            .order('id', { ascending: true })
            .range(from, to);

        if (error) {
            throw new Error(`Failed to fetch profiles page: ${error.message}`);
        }

        return data || [];
    }

    async function loadRecipients(targetUserId) {
        if (targetUserId) {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, expo_push_token')
                .eq('id', targetUserId)
                .maybeSingle();

            if (error) {
                throw new Error(`Failed to fetch target profile: ${error.message}`);
            }

            if (!data) {
                return { userIds: [], tokens: [] };
            }

            return {
                userIds: [data.id],
                tokens: data.expo_push_token ? [data.expo_push_token] : [],
            };
        }

        const userIds = [];
        const tokens = [];
        let from = 0;

        while (true) {
            const page = await fetchProfilesPage(from, from + PROFILE_PAGE_SIZE - 1);
            if (!page.length) break;

            for (const profile of page) {
                userIds.push(profile.id);
                if (profile.expo_push_token) {
                    tokens.push(profile.expo_push_token);
                }
            }

            if (page.length < PROFILE_PAGE_SIZE) break;
            from += PROFILE_PAGE_SIZE;
        }

        return { userIds, tokens };
    }

    async function upsertInAppNotifications(queueItem, userIds) {
        if (!userIds.length) return 0;

        const payloadData = parsePayloadData(queueItem.data);
        const deliveredAt = nowIso();
        const scheduledAt = queueItem.scheduled_at || deliveredAt;

        const notificationRows = userIds.map((userId) => ({
            user_id: userId,
            title: queueItem.title,
            message: queueItem.body,
            type: 'system',
            scheduled_at: scheduledAt,
            source_queue_id: queueItem.id,
            delivered_at: deliveredAt,
            channel: 'in_app_push',
            metadata: payloadData,
        }));

        let insertedOrUpserted = 0;

        for (const chunk of chunkArray(notificationRows, NOTIFICATION_INSERT_CHUNK_SIZE)) {
            const { error } = await supabase
                .from('notifications')
                .upsert(chunk, {
                    onConflict: 'user_id,source_queue_id',
                    ignoreDuplicates: true,
                });

            if (error) {
                const message = safeErrorMessage(error);
                const missingNewColumns = error.code === '42703'
                    || message.includes('source_queue_id')
                    || message.includes('delivered_at')
                    || message.includes('metadata')
                    || message.includes('channel');
                const missingUpsertConstraint = message.includes('no unique or exclusion constraint matching the ON CONFLICT specification');

                if (!missingNewColumns && !missingUpsertConstraint) {
                    throw new Error(`Failed to write notifications: ${message}`);
                }

                const legacyRows = chunk.map((row) => ({
                    user_id: row.user_id,
                    title: row.title,
                    message: row.message,
                    type: row.type,
                    scheduled_at: row.scheduled_at,
                }));

                const { error: legacyError } = await supabase
                    .from('notifications')
                    .insert(legacyRows);

                if (legacyError) {
                    throw new Error(`Failed to write legacy notifications: ${legacyError.message}`);
                }
            }

            insertedOrUpserted += chunk.length;
        }

        return insertedOrUpserted;
    }

    async function recoverStaleLocks() {
        const staleBefore = new Date(Date.now() - (STALE_LOCK_MINUTES * 60 * 1000)).toISOString();
        const retryAt = nowIso();

        const { data, error } = await supabase
            .from('notification_queue')
            .update({
                status: 'pending',
                next_retry_at: retryAt,
                locked_at: null,
                locked_by: null,
                error_message: 'Recovered stale processing lock',
            })
            .eq('status', 'processing')
            .lte('locked_at', staleBefore)
            .select('id');

        if (error) {
            logLine('ERR', 'NOTIFY_SCHEDULER', 'Failed to recover stale locks', { error: error.message });
            return;
        }

        if (data?.length) {
            logLine('WARN', 'NOTIFY_SCHEDULER', 'Recovered stale notification locks', {
                count: data.length,
                staleBefore,
            });
        }
    }

    async function fetchPendingCandidates() {
        const currentTime = nowIso();
        const { data, error } = await supabase
            .from('notification_queue')
            .select('id, user_id, title, body, data, status, scheduled_at, next_retry_at, attempt_count, max_attempts, priority, created_at')
            .eq('status', 'pending')
            .lte('scheduled_at', currentTime)
            .order('priority', { ascending: true })
            .order('scheduled_at', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(MAX_QUEUE_SCAN_PER_TICK);

        if (error) {
            logLine('ERR', 'NOTIFY_SCHEDULER', 'Failed to fetch pending notifications', { error: error.message });
            return [];
        }

        const nowMs = Date.now();
        return (data || []).filter((item) => isRetryDue(item, nowMs));
    }

    async function claimQueueItem(itemId) {
        const claimAt = nowIso();

        const { data, error } = await supabase
            .from('notification_queue')
            .update({
                status: 'processing',
                locked_at: claimAt,
                locked_by: workerId,
                error_message: null,
            })
            .eq('id', itemId)
            .eq('status', 'pending')
            .select('*')
            .maybeSingle();

        if (error) {
            throw new Error(`Failed to claim queue item ${itemId}: ${error.message}`);
        }

        return data;
    }

    async function markQueueItemSent(itemId, summary) {
        const { error } = await supabase
            .from('notification_queue')
            .update({
                status: 'sent',
                processed_at: nowIso(),
                next_retry_at: null,
                locked_at: null,
                locked_by: null,
                error_message: null,
                delivery_summary: summary,
            })
            .eq('id', itemId);

        if (error) {
            throw new Error(`Failed to mark queue item as sent (${itemId}): ${error.message}`);
        }
    }

    async function markQueueItemRetryOrFail(item, error) {
        const currentAttempt = Number(item?.attempt_count ?? 0);
        const nextAttempt = currentAttempt + 1;
        const maxAttempts = getMaxAttempts(item);
        const errorMessage = safeErrorMessage(error);

        const basePayload = {
            attempt_count: nextAttempt,
            error_message: errorMessage,
            last_error_at: nowIso(),
            locked_at: null,
            locked_by: null,
        };

        const shouldFail = nextAttempt >= maxAttempts;
        const updatePayload = shouldFail
            ? {
                ...basePayload,
                status: 'failed',
                processed_at: nowIso(),
                next_retry_at: null,
            }
            : {
                ...basePayload,
                status: 'pending',
                processed_at: null,
                next_retry_at: computeNextRetryAt(nextAttempt),
            };

        const { error: updateError } = await supabase
            .from('notification_queue')
            .update(updatePayload)
            .eq('id', item.id);

        if (updateError) {
            logLine('ERR', 'NOTIFY_SCHEDULER', 'Failed to update queue retry/fail state', {
                id: item.id,
                error: updateError.message,
            });
            return;
        }

        logLine(shouldFail ? 'ERR' : 'WARN', 'NOTIFY_SCHEDULER', shouldFail
            ? `Queue item failed after max attempts (${item.id})`
            : `Queue item scheduled for retry (${item.id})`, {
            attempt: nextAttempt,
            maxAttempts,
            error: errorMessage,
            nextRetryAt: shouldFail ? null : updatePayload.next_retry_at,
        });
    }

    async function processClaimedQueueItem(item) {
        const currentAttempt = Number(item?.attempt_count ?? 0);
        const maxAttempts = getMaxAttempts(item);

        if (currentAttempt >= maxAttempts) {
            await markQueueItemRetryOrFail(item, new Error('Max attempts already reached before processing'));
            return;
        }

        try {
            const recipients = await loadRecipients(item.user_id);
            const inAppCount = await upsertInAppNotifications(item, recipients.userIds);
            const pushResult = await sendExpoPushNotifications(
                recipients.tokens,
                item.title,
                item.body,
                parsePayloadData(item.data),
            );

            const summary = {
                worker_id: workerId,
                recipients: recipients.userIds.length,
                in_app_rows: inAppCount,
                push: pushResult,
                processed_at: nowIso(),
            };

            await markQueueItemSent(item.id, summary);

            if (pushResult.errors.length || pushResult.ticketErrorCount > 0) {
                logLine('WARN', 'NOTIFY_SCHEDULER', `Queue item sent with push warnings (${item.id})`, {
                    pushErrors: pushResult.errors.length,
                    ticketErrorCount: pushResult.ticketErrorCount,
                });
            }
        } catch (error) {
            await markQueueItemRetryOrFail(item, error);
        }
    }

    async function processScheduledNotifications() {
        const tickStartedAt = nowIso();
        logLine('DEBUG', 'NOTIFY_SCHEDULER', 'Checking for notifications...', {
            now: tickStartedAt,
            workerId,
        });

        await recoverStaleLocks();
        const pending = await fetchPendingCandidates();

        if (!pending.length) {
            return;
        }

        logLine('INFO', 'NOTIFY_SCHEDULER', `Found ${pending.length} notifications to process`, {
            now: tickStartedAt,
            workerId,
        });

        let processedCount = 0;

        for (const candidate of pending) {
            if (processedCount >= MAX_QUEUE_PROCESS_PER_TICK) {
                break;
            }

            try {
                const claimed = await claimQueueItem(candidate.id);
                if (!claimed) {
                    continue;
                }

                await processClaimedQueueItem(claimed);
                processedCount += 1;
            } catch (error) {
                logLine('ERR', 'NOTIFY_SCHEDULER', `Failed to claim/process notification ${candidate.id}`, {
                    error: safeErrorMessage(error),
                });
            }
        }

        if (processedCount > 0) {
            logLine('INFO', 'NOTIFY_SCHEDULER', `Processed ${processedCount} notifications`, {
                workerId,
                startedAt: tickStartedAt,
            });
        }
    }

    function startNotificationScheduler(intervalMs = 60000) {
        logLine('OK', 'NOTIFY_SCHEDULER', 'Notification scheduler started', { intervalMs, workerId });

        processScheduledNotifications().catch((error) => {
            logLine('ERR', 'NOTIFY_SCHEDULER', 'Initial run failed', { error: safeErrorMessage(error) });
        });

        setInterval(() => {
            processScheduledNotifications().catch((error) => {
                logLine('ERR', 'NOTIFY_SCHEDULER', 'Scheduled run failed', { error: safeErrorMessage(error) });
            });
        }, intervalMs);
    }

    return {
        sendExpoPushNotifications,
        processScheduledNotifications,
        startNotificationScheduler,
    };
}

module.exports = {
    createNotificationService,
};
