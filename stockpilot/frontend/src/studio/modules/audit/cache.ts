import {
    AUDIT_HISTORY_KEY,
    AUDIT_HISTORY_LIMIT,
    AUDIT_SESSION_ACTIVE_KEY,
} from "./constants";
import type { AuditSession } from "./types";

function canUseStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function sanitizeSession(session: AuditSession): AuditSession {
    return {
        ...session,
        responses: Object.fromEntries(
            Object.entries(session.responses).map(([key, response]) => [
                key,
                {
                    ...response,
                    mediaFiles: response.mediaFiles.map((media) => ({
                        ...media,
                        objectUrl: null,
                    })),
                },
            ])
        ),
    };
}

function readJson<T>(key: string, fallback: T): T {
    if (!canUseStorage()) {
        return fallback;
    }

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function writeJson<T>(key: string, value: T) {
    if (!canUseStorage()) {
        return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
}

export function getActiveAuditSession() {
    return readJson<AuditSession | null>(AUDIT_SESSION_ACTIVE_KEY, null);
}

export function saveActiveAuditSession(session: AuditSession) {
    writeJson(AUDIT_SESSION_ACTIVE_KEY, sanitizeSession(session));
}

export function clearActiveAuditSession() {
    if (!canUseStorage()) {
        return;
    }

    window.localStorage.removeItem(AUDIT_SESSION_ACTIVE_KEY);
}

export function getAuditHistory() {
    return readJson<AuditSession[]>(AUDIT_HISTORY_KEY, []);
}

export function saveAuditHistory(history: AuditSession[]) {
    writeJson(
        AUDIT_HISTORY_KEY,
        history.map((session) => sanitizeSession(session)).slice(0, AUDIT_HISTORY_LIMIT)
    );
}

export function pushAuditHistory(session: AuditSession) {
    const nextHistory = [
        sanitizeSession(session),
        ...getAuditHistory().filter((entry) => entry.id !== session.id),
    ].slice(0, AUDIT_HISTORY_LIMIT);

    saveAuditHistory(nextHistory);
    return nextHistory;
}
