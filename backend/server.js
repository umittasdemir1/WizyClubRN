require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, CopyObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os'); // For temp directory in story uploads
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');

const LOG_COLORS_ENABLED = process.stdout.isTTY && process.env.NO_COLOR !== '1';
const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function style(text, ...tokens) {
    if (!LOG_COLORS_ENABLED || tokens.length === 0) return String(text);
    const prefix = tokens.map((token) => ANSI[token] || '').join('');
    return `${prefix}${text}${ANSI.reset}`;
}

function toLogValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return '[unserializable]';
    }
}

function formatMeta(meta) {
    if (meta == null) return '';
    if (typeof meta === 'string') return meta;
    if (meta instanceof Error) return meta.message;
    if (typeof meta !== 'object') return String(meta);

    return Object.entries(meta)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${toLogValue(value)}`)
        .join(' ');
}

const LEVEL_STYLE = {
    INFO: ['blue', 'bold'],
    OK: ['green', 'bold'],
    WARN: ['yellow', 'bold'],
    ERR: ['red', 'bold'],
    BOOT: ['magenta', 'bold'],
};

function logLine(level, scope, message, meta) {
    const ts = style(new Date().toISOString(), 'dim');
    const levelLabel = style(level.padEnd(4), ...(LEVEL_STYLE[level] || ['cyan', 'bold']));
    const scopeLabel = scope ? style(`[${scope}]`, 'cyan') : '';
    const metaText = formatMeta(meta);
    const line = `${ts} ${levelLabel} ${scopeLabel} ${message}${metaText ? ` | ${metaText}` : ''}`;

    if (level === 'ERR') {
        console.error(line);
        return;
    }
    console.log(line);
}

function logBanner(title, lines = []) {
    const border = style('='.repeat(86), 'gray');
    console.log(`\n${border}`);
    console.log(style(title, 'bold', 'cyan'));
    for (const line of lines) {
        console.log(`${style(' -', 'dim')} ${line}`);
    }
    console.log(`${border}\n`);
}

function formatMethod(method) {
    const normalized = (method || 'GET').toUpperCase();
    const palette = {
        GET: 'cyan',
        POST: 'green',
        PUT: 'yellow',
        PATCH: 'yellow',
        DELETE: 'red',
    };
    return style(normalized.padEnd(6), palette[normalized] || 'blue', 'bold');
}

function formatStatus(statusCode) {
    const code = Number(statusCode) || 0;
    let tone = 'red';
    if (code >= 200 && code < 300) tone = 'green';
    else if (code >= 300 && code < 400) tone = 'cyan';
    else if (code >= 400 && code < 500) tone = 'yellow';
    return style(String(code).padStart(3), tone, 'bold');
}

function getPrimaryIpv4Address() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        if (!iface) continue;
        const match = iface.find((entry) => entry.family === 'IPv4' && !entry.internal);
        if (match?.address) return match.address;
    }
    return null;
}

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        const ts = style(new Date().toISOString(), 'dim');
        const duration = style(`${durationMs.toFixed(1)}ms`, 'dim');
        const route = req.originalUrl || req.url;
        console.log(`${ts} ${formatMethod(req.method)} ${route} ${formatStatus(res.statusCode)} ${duration}`);
    });
    next();
});

// Set FFmpeg and FFprobe paths explicitly using static binaries
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;
logLine('OK', 'BOOT', 'FFmpeg binary loaded', { path: ffmpegStatic });
logLine('OK', 'BOOT', 'FFprobe binary loaded', { path: ffprobeStatic });
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic);

// Multer: Temporary uploads
const upload = multer({ dest: 'temp_uploads/' });

logLine('BOOT', 'INIT', 'Initializing R2 client');
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

logLine('BOOT', 'INIT', 'Initializing Supabase client');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logLine('INFO', 'INIT', 'Using Service Role Key for backend operations (RLS Bypass)');
} else {
    logLine('WARN', 'INIT', 'Service Role Key not found! Using Anon Key. RLS policies may block writes.');
}

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

// Swagger / OpenAPI docs (local)
const openApiPath = path.join(__dirname, 'docs', 'openapi.yaml');
const openApiSpec = yaml.load(fs.readFileSync(openApiPath, 'utf8'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Admin page/config endpoints removed.
// Helper: Upload to R2 with CDN Cache Headers
async function uploadToR2(filePath, fileName, contentType) {
    const fileStream = fs.readFileSync(filePath);
    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: fileStream,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable', // 1 year CDN cache
    }));
    return `${process.env.R2_PUBLIC_URL}/${fileName}`;
}

logLine('BOOT', 'INIT', 'Loading HlsService module');
const HlsService = require('./services/HlsService');
logLine('BOOT', 'INIT', 'Initializing HlsService');
const hlsService = new HlsService(r2, process.env.R2_BUCKET_NAME, { logLine, logBanner });
logLine('OK', 'INIT', 'HlsService ready');

// 🔥 Upload Progress Tracking
const uploadProgress = new Map(); // { uniqueId: { stage: string, percent: number } }

// Endpoint: Get Upload Progress
app.get('/upload-progress/:id', (req, res) => {
    const progress = uploadProgress.get(req.params.id);
    if (!progress) {
        return res.json({ stage: 'unknown', percent: 0 });
    }
    res.json(progress);
});

// Helper: Update progress
function setUploadProgress(id, stage, percent) {
    uploadProgress.set(id, { stage, percent });
    logLine('INFO', 'UPLOAD_PROGRESS', 'Progress update', { id, stage, percent });
}

function parseAspectRatioValue(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
    }
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.includes(':')) {
        const [left, right] = trimmed.split(':');
        const num = parseFloat(left);
        const den = parseFloat(right);
        if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
            return num / den;
        }
        return null;
    }

    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseRotationCandidate(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value.trim());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function extractRotationFromStream(stream) {
    if (!stream || typeof stream !== 'object') return 0;

    const tagRotation = parseRotationCandidate(stream?.tags?.rotate);
    if (tagRotation != null) return tagRotation;

    const sideDataList = Array.isArray(stream?.side_data_list) ? stream.side_data_list : [];
    for (const sideData of sideDataList) {
        if (!sideData || typeof sideData !== 'object') continue;

        const directRotation = parseRotationCandidate(sideData.rotation);
        if (directRotation != null) return directRotation;

        const displayMatrix = typeof sideData.displaymatrix === 'string' ? sideData.displaymatrix : '';
        if (displayMatrix) {
            const match = displayMatrix.match(/rotation of\s*(-?\d+(?:\.\d+)?)\s*degrees/i);
            if (match) {
                const parsed = parseFloat(match[1]);
                if (Number.isFinite(parsed)) return parsed;
            }
        }
    }

    return 0;
}

function extractDimensionsFromProbe(metadata) {
    if (!metadata || !Array.isArray(metadata.streams)) {
        return { width: 0, height: 0 };
    }
    const stream =
        metadata.streams.find(s => s.codec_type === 'video' && s.width && s.height) ||
        metadata.streams.find(s => s.width && s.height);
    let width = stream?.width || 0;
    let height = stream?.height || 0;

    const rotation = extractRotationFromStream(stream);
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isQuarterTurn = Math.abs(normalizedRotation - 90) < 1 || Math.abs(normalizedRotation - 270) < 1;

    const displayAspectRatio = parseAspectRatioValue(stream?.display_aspect_ratio);
    const shouldSwapByDisplayAspect =
        displayAspectRatio != null &&
        ((displayAspectRatio < 1 && width > height) || (displayAspectRatio > 1 && width < height));

    if (isQuarterTurn || shouldSwapByDisplayAspect) {
        [width, height] = [height, width];
    }
    return { width, height };
}

function getOrientation(width, height) {
    if (!width || !height) return 'unknown';
    if (Math.abs(width - height) <= 1) return 'square';
    return width > height ? 'landscape' : 'portrait';
}

function normalizeDimensionsWithReference(primary, reference) {
    const primaryWidth = Number(primary?.width) || 0;
    const primaryHeight = Number(primary?.height) || 0;
    const referenceWidth = Number(reference?.width) || 0;
    const referenceHeight = Number(reference?.height) || 0;

    if (!primaryWidth || !primaryHeight) {
        if (referenceWidth && referenceHeight) {
            return { width: referenceWidth, height: referenceHeight };
        }
        return { width: primaryWidth, height: primaryHeight };
    }

    if (!referenceWidth || !referenceHeight) {
        return { width: primaryWidth, height: primaryHeight };
    }

    const primaryOrientation = getOrientation(primaryWidth, primaryHeight);
    const referenceOrientation = getOrientation(referenceWidth, referenceHeight);
    const isOppositeOrientation =
        (primaryOrientation === 'landscape' && referenceOrientation === 'portrait') ||
        (primaryOrientation === 'portrait' && referenceOrientation === 'landscape');

    if (isOppositeOrientation) {
        return { width: primaryHeight, height: primaryWidth };
    }

    return { width: primaryWidth, height: primaryHeight };
}

function pickMostPortrait(current, candidate) {
    if (!candidate?.width || !candidate?.height) return current;
    if (!current?.width || !current?.height) return candidate;
    const currentRatio = current.width / current.height;
    const candidateRatio = candidate.width / candidate.height;
    return candidateRatio < currentRatio ? candidate : current;
}

async function safeProbeDimensions(inputPath) {
    try {
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg(inputPath).ffprobe((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return extractDimensionsFromProbe(metadata);
    } catch (error) {
        logLine('WARN', 'PROBE', 'Failed to read media dimensions', { error: error?.message || error });
        return { width: 0, height: 0 };
    }
}

// Endpoint: HLS Video Upload (Supports Carousels)
app.post('/upload-hls', upload.array('video', 10), async (req, res) => {
    const files = req.files;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    // Determine is_commercial flag
    // 'İş Birliği İçermiyor' means is_commercial = false
    const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';

    const uniqueId = uuidv4();
    const tempOutputDir = path.join(__dirname, 'temp_uploads');
    const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

    logBanner('UPLOAD REQUEST', [
        `Upload ID  : ${uniqueId}`,
        `User ID    : ${userId || 'test-user'}`,
        `Item Count : ${files.length}`,
        `Post Type  : ${isCarousel ? 'carousel' : 'video'}`,
    ]);

    try {
        const mediaUrls = [];
        let firstThumbUrl = '';
        let firstSpriteUrl = '';
        let finalWidth = 1080;
        let finalHeight = 1920;
        let portraitBase = { width: 0, height: 0 };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.mimetype.startsWith('video/');
            const indexLabel = files.length > 1 ? `_${i}` : '';
            const baseKey = `media/${userId || 'test-user'}/posts/${uniqueId}${indexLabel}`;
            const inputPath = file.path;

            setUploadProgress(uniqueId, `item_${i}`, 10 + Math.floor((i / files.length) * 80));

            if (isVideo) {
                const metadata = await new Promise((resolve, reject) => {
                    ffmpeg(inputPath).ffprobe((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                const { width, height } = extractDimensionsFromProbe(metadata);
                const duration = parseFloat(metadata.format.duration || 0);

                const processedThumbPath = path.join(tempOutputDir, `thumb_${uniqueId}_${i}.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .outputOptions(['-q:v 2'])
                        .screenshots({
                            count: 1,
                            filename: `thumb_${uniqueId}_${i}.jpg`,
                            folder: tempOutputDir,
                            size: '1080x?'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });

                const thumbDims = await safeProbeDimensions(processedThumbPath);
                const normalizedSourceDims = normalizeDimensionsWithReference({ width, height }, thumbDims);
                const safeWidth = normalizedSourceDims.width || thumbDims.width || width || 1080;
                const safeHeight = normalizedSourceDims.height || thumbDims.height || height || 1920;

                const thumbUrl = await uploadToR2(processedThumbPath, `${baseKey}/thumb.jpg`, 'image/jpeg');
                if (i === 0) firstThumbUrl = thumbUrl;

                const optimizedPath = path.join(tempOutputDir, `optimized_${uniqueId}_${i}.mp4`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .videoCodec('libx264')
                        .size(safeWidth > 1080 ? '1080x?' : `${safeWidth}x${safeHeight}`)
                        .outputOptions(['-crf 26', '-preset veryfast', '-movflags +faststart', '-pix_fmt yuv420p'])
                        .on('end', resolve)
                        .on('error', reject)
                        .save(optimizedPath);
                });

                const videoUrl = await uploadToR2(optimizedPath, `${baseKey}/master.mp4`, 'video/mp4');
                const optimizedDims = await safeProbeDimensions(optimizedPath);
                const outputWidth = optimizedDims.width || safeWidth;
                const outputHeight = optimizedDims.height || safeHeight;
                portraitBase = pickMostPortrait(portraitBase, { width: outputWidth, height: outputHeight });
                logLine('INFO', 'UPLOAD_DIM', 'Post media dimensions', {
                    source: `${width}x${height}`,
                    thumb: `${thumbDims.width}x${thumbDims.height}`,
                    normalized: `${safeWidth}x${safeHeight}`,
                    output: `${outputWidth}x${outputHeight}`,
                });

                let spriteUrl = '';
                if (i === 0) {
                    spriteUrl = await hlsService.generateSpriteSheet(inputPath, tempOutputDir, uniqueId, baseKey, duration);
                    firstSpriteUrl = spriteUrl;
                }

                mediaUrls.push({ url: videoUrl, type: 'video', thumbnail: thumbUrl, sprite: spriteUrl, width: outputWidth, height: outputHeight });

                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(processedThumbPath)) fs.unlinkSync(processedThumbPath);
                if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
            } else {
                const { width, height } = await safeProbeDimensions(inputPath);
                portraitBase = pickMostPortrait(portraitBase, { width, height });
                const imageKey = `${baseKey}/image.jpg`;
                const imageUrl = await uploadToR2(inputPath, imageKey, file.mimetype);

                if (i === 0) {
                    firstThumbUrl = imageUrl;
                }

                mediaUrls.push({ url: imageUrl, type: 'image', width, height });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }

        if (portraitBase.width && portraitBase.height) {
            finalWidth = portraitBase.width;
            finalHeight = portraitBase.height;
        }

        const { data, error } = await supabase
            .from('videos')
            .insert({
                user_id: userId || 'test-user',
                video_url: mediaUrls[0].url,
                thumbnail_url: firstThumbUrl,
                sprite_url: firstSpriteUrl,
                media_urls: mediaUrls,
                post_type: isCarousel ? 'carousel' : 'video',
                description: description || '',
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                commercial_type: commercialType || null,
                is_commercial: isCommercial,
                width: finalWidth,
                height: finalHeight,
                processing_status: 'completed'
            })
            .select();

        if (error) throw error;

        setUploadProgress(uniqueId, 'done', 100);
        res.json({ success: true, data: data[0] });

    } catch (error) {
        logLine('ERR', 'UPLOAD', 'Upload failed', { error: error?.message || error, uploadId: uniqueId });
        res.status(500).json({ error: error.message });
        if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
});


// ============================================
// Endpoint: STORY Upload (Simple, no HLS)
// ============================================
// Endpoint: STORY Upload (Supports Carousels)
app.post('/upload-story', upload.array('video', 10), async (req, res) => {
    const files = req.files;
    const { userId, description, brandName, brandUrl, commercialType } = req.body;
    const authHeader = req.headers.authorization;
    let dbClient = supabase;
    let authenticatedUserId = null;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        authenticatedUserId = user.id;
        dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });
    }

    const effectiveUserId = authenticatedUserId || userId;

    if (!effectiveUserId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    if (authenticatedUserId && userId && userId !== authenticatedUserId) {
        logLine('WARN', 'STORY', 'Request userId mismatch, using token user', {
            bodyUserId: userId,
            tokenUserId: authenticatedUserId,
        });
    }

    const uniqueId = uuidv4();
    const tempOutputDir = path.join(__dirname, 'temp_uploads');
    const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

    logBanner('STORY UPLOAD REQUEST', [
        `Upload ID  : ${uniqueId}`,
        `User ID    : ${effectiveUserId}`,
        `Item Count : ${files.length}`,
        `Post Type  : ${isCarousel ? 'carousel' : 'video'}`,
    ]);

    try {
        const mediaUrls = [];
        let firstThumbUrl = '';
        let finalWidth = 1080;
        let finalHeight = 1920;
        let portraitBase = { width: 0, height: 0 };

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isVideo = file.mimetype.startsWith('video/');
            const indexLabel = files.length > 1 ? `_${i}` : '';
            const baseKey = `media/${effectiveUserId}/stories/${uniqueId}${indexLabel}`;
            const inputPath = file.path;

            if (isVideo) {
                const metadata = await new Promise((resolve, reject) => {
                    ffmpeg(inputPath).ffprobe((err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                const { width, height } = extractDimensionsFromProbe(metadata);

                const videoKey = `${baseKey}/story.mp4`;
                await uploadToR2(inputPath, videoKey, file.mimetype);
                const storyUrl = `${process.env.R2_PUBLIC_URL}/${videoKey}`;

                // Process Thumb
                const thumbPath = path.join(os.tmpdir(), `${uniqueId}_${i}_thumb.jpg`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .screenshots({
                            count: 1,
                            folder: os.tmpdir(),
                            filename: `${uniqueId}_${i}_thumb.jpg`,
                            size: '?x480'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });

                const thumbKey = `${baseKey}/thumb.jpg`;
                const thumbnailUrl = await uploadToR2(thumbPath, thumbKey, 'image/jpeg');
                const thumbDims = await safeProbeDimensions(thumbPath);
                const normalizedSourceDims = normalizeDimensionsWithReference({ width, height }, thumbDims);
                const safeWidth = normalizedSourceDims.width || thumbDims.width || width || 1080;
                const safeHeight = normalizedSourceDims.height || thumbDims.height || height || 1920;
                portraitBase = pickMostPortrait(portraitBase, { width: safeWidth, height: safeHeight });
                logLine('INFO', 'STORY_DIM', 'Story media dimensions', {
                    source: `${width}x${height}`,
                    thumb: `${thumbDims.width}x${thumbDims.height}`,
                    normalized: `${safeWidth}x${safeHeight}`,
                });

                if (i === 0) {
                    firstThumbUrl = thumbnailUrl;
                }

                mediaUrls.push({ url: storyUrl, type: 'video', thumbnail: thumbnailUrl, width: safeWidth, height: safeHeight });
                if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            } else {
                const { width, height } = await safeProbeDimensions(inputPath);
                portraitBase = pickMostPortrait(portraitBase, { width, height });
                const imageKey = `${baseKey}/story.jpg`;
                const imageUrl = await uploadToR2(inputPath, imageKey, file.mimetype);

                if (i === 0) firstThumbUrl = imageUrl;
                mediaUrls.push({ url: imageUrl, type: 'image', width, height });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }
        }

        if (portraitBase.width && portraitBase.height) {
            finalWidth = portraitBase.width;
            finalHeight = portraitBase.height;
        }

        const isCommercial = commercialType && commercialType !== 'İş Birliği İçermiyor';
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { data, error } = await dbClient.from('stories').insert({
            user_id: effectiveUserId,
            video_url: mediaUrls[0].url,
            thumbnail_url: firstThumbUrl,
            media_urls: mediaUrls,
            post_type: isCarousel ? 'carousel' : 'video',
            width: finalWidth,
            height: finalHeight,
            is_commercial: isCommercial,
            brand_name: brandName || null,
            brand_url: brandUrl || null,
            commercial_type: commercialType || null,
            expires_at: expiresAt.toISOString()
        }).select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });

    } catch (error) {
        logLine('ERR', 'STORY', 'Story upload failed', { error: error?.message || error, uploadId: uniqueId });
        res.status(500).json({ error: error.message });
        if (files) files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
});

function parseMediaUrlsField(mediaUrlsField) {
    if (Array.isArray(mediaUrlsField)) return mediaUrlsField;
    if (typeof mediaUrlsField !== 'string') return [];

    try {
        const parsed = JSON.parse(mediaUrlsField);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function extractR2KeyFromValue(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        return (parsed.pathname || '').replace(/^\/+/, '') || null;
    } catch {
        const withoutQuery = trimmed.split('?')[0].split('#')[0];
        return withoutQuery.replace(/^\/+/, '') || null;
    }
}

function deriveScopedR2Prefix(key) {
    if (typeof key !== 'string' || key.length === 0) return null;

    const segments = key.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    // Legacy video layout: videos/<id>/...
    if (segments[0] === 'videos') {
        return `videos/${segments[1]}`;
    }

    // Current post layout: media/<userId>/(posts|videos)/<postId>/...
    if (
        segments[0] === 'media' &&
        segments.length >= 4 &&
        (segments[2] === 'posts' || segments[2] === 'videos')
    ) {
        return `media/${segments[1]}/${segments[2]}/${segments[3]}`;
    }

    return null;
}

function deriveLegacyVideoIdFromKey(key) {
    if (typeof key !== 'string' || key.length === 0) return null;
    const segments = key.split('/').filter(Boolean);
    if (segments.length < 2) return null;

    if (segments[0] === 'videos') {
        return segments[1];
    }

    if (segments[0] === 'media' && segments.length >= 4 && segments[2] === 'videos') {
        return segments[3];
    }

    return null;
}

function buildStoryCleanupTargets(story) {
    const objectKeysToDelete = new Set();
    const folderPrefixesToClean = new Set();

    const registerCleanupTarget = (value) => {
        const key = extractR2KeyFromValue(value);
        if (!key) return;
        objectKeysToDelete.add(key);

        const slashIndex = key.lastIndexOf('/');
        if (slashIndex > 0) {
            folderPrefixesToClean.add(key.slice(0, slashIndex));
        }
    };

    if (story && typeof story === 'object') {
        registerCleanupTarget(story.video_url);
        registerCleanupTarget(story.thumbnail_url);

        const mediaUrls = parseMediaUrlsField(story.media_urls);
        for (const mediaItem of mediaUrls) {
            if (!mediaItem || typeof mediaItem !== 'object') continue;
            registerCleanupTarget(mediaItem.url);
            registerCleanupTarget(mediaItem.thumbnail);
            registerCleanupTarget(mediaItem.sprite);
        }
    }

    return { objectKeysToDelete, folderPrefixesToClean };
}

function splitIntoChunks(values, size) {
    const chunks = [];
    for (let i = 0; i < values.length; i += size) {
        chunks.push(values.slice(i, i + size));
    }
    return chunks;
}

async function deleteR2ObjectsUnderPrefix(prefix) {
    let deletedCount = 0;
    let continuationToken = undefined;
    const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;

    do {
        const listRes = await r2.send(new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: normalizedPrefix,
            ContinuationToken: continuationToken,
        }));

        const listedKeys = Array.isArray(listRes.Contents)
            ? listRes.Contents
                .map((obj) => obj?.Key)
                .filter((key) => typeof key === 'string' && key.length > 0)
            : [];

        for (const keyChunk of splitIntoChunks(listedKeys, 1000)) {
            if (keyChunk.length === 0) continue;
            await r2.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: {
                    Objects: keyChunk.map((Key) => ({ Key })),
                },
            }));
            deletedCount += keyChunk.length;
        }

        continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);

    return deletedCount;
}

async function cleanupStoryAssetsFromR2(story, options = {}) {
    const { scope = 'STORY_CLEANUP', storyId = story?.id } = options;
    const { objectKeysToDelete, folderPrefixesToClean } = buildStoryCleanupTargets(story);
    const cleanedPrefixes = new Set();
    let deletedCount = 0;

    for (const folderPrefix of folderPrefixesToClean) {
        const normalizedPrefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
        try {
            deletedCount += await deleteR2ObjectsUnderPrefix(normalizedPrefix);
            cleanedPrefixes.add(normalizedPrefix);
        } catch (error) {
            logLine('WARN', scope, 'R2 prefix cleanup failed', {
                storyId,
                folderPrefix: normalizedPrefix,
                error: error?.message || error,
            });
            throw error;
        }
    }

    const directKeys = Array.from(objectKeysToDelete).filter((key) =>
        !Array.from(cleanedPrefixes).some((prefix) => key.startsWith(prefix))
    );

    for (const keyChunk of splitIntoChunks(directKeys, 1000)) {
        if (keyChunk.length === 0) continue;
        try {
            await r2.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: {
                    Objects: keyChunk.map((Key) => ({ Key })),
                },
            }));
            deletedCount += keyChunk.length;
        } catch (error) {
            logLine('WARN', scope, 'R2 direct key cleanup failed', {
                storyId,
                keyCount: keyChunk.length,
                error: error?.message || error,
            });
            throw error;
        }
    }

    return { deletedCount };
}

// Endpoint: DELETE Story (Soft Delete by default, ?force=true for permanent)
app.delete('/stories/:id', async (req, res) => {
    const storyId = req.params.id;
    const force = req.query.force === 'true';

    logBanner('DELETE STORY REQUEST', [
        `Story ID: ${storyId}`,
        `Force query: ${req.query.force ?? 'undefined'}`,
        `Mode: ${force ? 'HARD DELETE (Permanent)' : 'SOFT DELETE (Trash)'}`,
    ]);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        const { data: story, error: fetchError } = await dbClient
            .from('stories')
            .select('id, user_id, video_url, thumbnail_url, media_urls')
            .eq('id', storyId)
            .single();

        if (fetchError || !story) {
            return res.status(404).json({ error: 'Story not found' });
        }

        if (story.user_id !== user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (force) {
            // ============================================
            // HARD DELETE (Permanent) - R2 + DB
            // ============================================
            await cleanupStoryAssetsFromR2(story, { scope: 'DELETE_STORY', storyId });

            const { data: deletedRows, error: deleteError } = await dbClient
                .from('stories')
                .delete()
                .eq('id', storyId)
                .eq('user_id', user.id)
                .select('id');

            if (deleteError) throw deleteError;
            if (!deletedRows || deletedRows.length === 0) {
                return res.status(404).json({ error: 'Story not found' });
            }

            logLine('OK', 'DELETE_STORY', 'Story hard deleted', { storyId, userId: user.id });
            return res.json({ success: true, message: 'Story deleted permanently' });
        } else {
            // ============================================
            // SOFT DELETE - Set deleted_at timestamp
            // ============================================
            const { error: updateError } = await dbClient
                .from('stories')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', storyId)
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            logLine('OK', 'DELETE_STORY', 'Story soft deleted (moved to trash)', { storyId, userId: user.id });
            return res.json({ success: true, message: 'Story moved to trash' });
        }
    } catch (error) {
        logLine('ERR', 'DELETE_STORY', 'Story delete failed', {
            storyId,
            force,
            error: error?.message || error,
        });
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Endpoint: RESTORE Story (from trash)
app.post('/stories/:id/restore', async (req, res) => {
    const storyId = req.params.id;
    logBanner('RESTORE STORY REQUEST', [`Story ID: ${storyId}`]);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        // Check story exists and belongs to user and is soft-deleted
        const { data: story, error: fetchError } = await dbClient
            .from('stories')
            .select('id, user_id, deleted_at')
            .eq('id', storyId)
            .not('deleted_at', 'is', null)
            .single();

        if (fetchError || !story) {
            return res.status(404).json({ error: 'Deleted story not found' });
        }

        if (story.user_id !== user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Check if 24 hours have passed since deletion
        const deletedAt = new Date(story.deleted_at);
        const now = new Date();
        const hoursSinceDelete = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceDelete >= 24) {
            return res.status(410).json({ error: 'Story can no longer be restored. 24 hours have passed.' });
        }

        // Restore: set deleted_at to null
        const { error: updateError } = await dbClient
            .from('stories')
            .update({ deleted_at: null })
            .eq('id', storyId)
            .eq('user_id', user.id);

        if (updateError) throw updateError;

        logLine('OK', 'RESTORE_STORY', 'Story restored successfully', { storyId, userId: user.id });
        return res.json({ success: true, message: 'Story restored' });
    } catch (error) {
        logLine('ERR', 'RESTORE_STORY', 'Story restore failed', {
            storyId,
            error: error?.message || error,
        });
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Endpoint: GET Recently Deleted Stories
app.get('/stories/recently-deleted', async (req, res) => {
    logLine('INFO', 'RECENTLY_DELETED', 'Fetching recently deleted stories');

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        // Get stories deleted within last 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: stories, error: fetchError } = await supabase
            .from('stories')
            .select('*, profiles(*)')
            .eq('user_id', user.id)
            .not('deleted_at', 'is', null)
            .gt('deleted_at', cutoff)
            .order('deleted_at', { ascending: false });

        if (fetchError) throw fetchError;

        logLine('OK', 'RECENTLY_DELETED', 'Recently deleted stories fetched', {
            userId: user.id,
            count: stories?.length || 0,
        });

        return res.json({ success: true, data: stories || [] });
    } catch (error) {
        logLine('ERR', 'RECENTLY_DELETED', 'Failed to fetch recently deleted stories', {
            error: error?.message || error,
        });
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Endpoint: Cleanup expired soft-deleted stories (called by cron or manually)
app.post('/stories/cleanup-expired', async (req, res) => {
    logBanner('CLEANUP EXPIRED STORIES', ['Mode: Hard delete soft-deleted stories older than 24h']);

    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Fetch all soft-deleted stories older than 24h
        const { data: expiredStories, error: fetchError } = await supabase
            .from('stories')
            .select('id, user_id, video_url, thumbnail_url, media_urls, deleted_at')
            .not('deleted_at', 'is', null)
            .lt('deleted_at', cutoff);

        if (fetchError) throw fetchError;

        if (!expiredStories || expiredStories.length === 0) {
            logLine('INFO', 'CLEANUP', 'No expired soft-deleted stories found');
            return res.json({ success: true, cleaned: 0 });
        }

        logLine('INFO', 'CLEANUP', 'Found expired stories to clean', { count: expiredStories.length });

        let cleaned = 0;
        for (const story of expiredStories) {
            try {
                // 1. Clean R2 assets
                await cleanupStoryAssetsFromR2(story, { scope: 'CLEANUP_EXPIRED', storyId: story.id });

                // 2. Hard delete from DB
                await supabase
                    .from('stories')
                    .delete()
                    .eq('id', story.id);

                cleaned++;
                logLine('OK', 'CLEANUP', 'Expired story permanently deleted', { storyId: story.id });
            } catch (storyError) {
                logLine('ERR', 'CLEANUP', 'Failed to clean expired story', {
                    storyId: story.id,
                    error: storyError?.message || storyError,
                });
            }
        }

        logLine('OK', 'CLEANUP', 'Cleanup completed', { total: expiredStories.length, cleaned });
        return res.json({ success: true, total: expiredStories.length, cleaned });
    } catch (error) {
        logLine('ERR', 'CLEANUP', 'Cleanup failed', { error: error?.message || error });
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Auto-cleanup: Run every hour to clean expired soft-deleted stories
async function runStoryCleanup() {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: expiredStories, error: fetchError } = await supabase
            .from('stories')
            .select('id, user_id, video_url, thumbnail_url, media_urls, deleted_at')
            .not('deleted_at', 'is', null)
            .lt('deleted_at', cutoff);

        if (fetchError || !expiredStories || expiredStories.length === 0) return;

        logLine('INFO', 'AUTO_CLEANUP', 'Auto-cleaning expired stories', { count: expiredStories.length });

        for (const story of expiredStories) {
            try {
                await cleanupStoryAssetsFromR2(story, { scope: 'AUTO_CLEANUP', storyId: story.id });
                await supabase.from('stories').delete().eq('id', story.id);
                logLine('OK', 'AUTO_CLEANUP', 'Story permanently deleted', { storyId: story.id });
            } catch (err) {
                logLine('ERR', 'AUTO_CLEANUP', 'Failed to clean story', { storyId: story.id, error: err?.message });
            }
        }
    } catch (err) {
        logLine('ERR', 'AUTO_CLEANUP', 'Auto-cleanup failed', { error: err?.message });
    }
}

// Run cleanup every hour
setInterval(runStoryCleanup, 60 * 60 * 1000);
// Run once on startup (after 30 seconds to let server fully start)
setTimeout(runStoryCleanup, 30 * 1000);

// Endpoint: DELETE Video (Soft Delete by default)
app.delete('/videos/:id', async (req, res) => {
    const videoId = req.params.id;
    const force = req.query.force === 'true'; // ?force=true for permanent delete

    logBanner('DELETE REQUEST', [
        `Video ID: ${videoId}`,
        `Force query: ${req.query.force ?? 'undefined'}`,
        `Mode: ${force ? 'HARD DELETE (Permanent)' : 'SOFT DELETE (Trash)'}`,
    ]);

    // 🔐 JWT Authentication
    const authHeader = req.headers.authorization;
    logLine('INFO', 'DELETE', 'Authorization header check', { present: Boolean(authHeader) });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logLine('WARN', 'DELETE', 'No valid Authorization header');
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated Supabase client (respects RLS)
    const dbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    logLine('INFO', 'DELETE', 'Token verification', {
        userId: user?.id || 'none',
        error: authError?.message || 'none',
    });

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    try {
        if (force) {
            // ============================================
            // HARD DELETE (Permanent)
            // ============================================

            // 1. Get video info (using authenticated client)
            const { data: video, error: fetchError } = await dbClient
                .from('videos')
                .select('*')
                .eq('id', videoId)
                .single();

            if (fetchError || !video) {
                logLine('WARN', 'DELETE', 'Video not found during hard delete lookup', {
                    videoId,
                    error: fetchError?.message || 'none',
                });
                return res.status(404).json({ error: 'Video not found' });
            }

            // 1. Fetch Video Details (Already done above as 'video')
            // Using 'video' object which contains video_url, sprite_url, thumbnail_url since we selected '*'

            // 2. R2 Cleanup - Covers legacy URLs + current media_urls carousel structure
            const objectKeysToDelete = new Set();
            const folderPrefixesToClean = new Set();
            const legacyVideoIds = new Set();

            const registerCleanupTarget = (value) => {
                const key = extractR2KeyFromValue(value);
                if (!key) return;
                objectKeysToDelete.add(key);

                const prefix = deriveScopedR2Prefix(key);
                if (prefix) {
                    folderPrefixesToClean.add(prefix);
                }

                const legacyVideoId = deriveLegacyVideoIdFromKey(key);
                if (legacyVideoId) {
                    legacyVideoIds.add(legacyVideoId);
                }
            };

            // Main URL fields
            registerCleanupTarget(video.video_url);
            registerCleanupTarget(video.thumbnail_url);
            registerCleanupTarget(video.sprite_url);

            // Carousel/media-specific URLs
            const mediaUrls = parseMediaUrlsField(video.media_urls);
            for (const mediaItem of mediaUrls) {
                if (!mediaItem || typeof mediaItem !== 'object') continue;
                registerCleanupTarget(mediaItem.url);
                registerCleanupTarget(mediaItem.thumbnail);
                registerCleanupTarget(mediaItem.sprite);
            }

            // Fallback cleanup candidates for thumbnails to handle legacy + mixed records
            for (const folderPrefix of folderPrefixesToClean) {
                objectKeysToDelete.add(`${folderPrefix}/thumb.jpg`);
                objectKeysToDelete.add(`${folderPrefix}/thumb.jpeg`);
                objectKeysToDelete.add(`${folderPrefix}/thumb.png`);
                objectKeysToDelete.add(`${folderPrefix}/thumbnail.jpg`);
                objectKeysToDelete.add(`${folderPrefix}/thumbnail.jpeg`);
                objectKeysToDelete.add(`${folderPrefix}/thumbnail.png`);
            }
            for (const legacyVideoId of legacyVideoIds) {
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.jpg`);
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.jpeg`);
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.png`);
                objectKeysToDelete.add(`thumbs/${legacyVideoId}.webp`);
            }

            logLine('INFO', 'DELETE', 'R2 cleanup targets prepared', {
                keys: objectKeysToDelete.size,
                folders: folderPrefixesToClean.size,
            });

            // 2A. Prefix cleanup for scoped folders
            for (const folderPrefix of folderPrefixesToClean) {
                try {
                    const prefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
                    logLine('INFO', 'DELETE', 'Cleaning R2 folder', { prefix });
                    const listCmd = new ListObjectsV2Command({
                        Bucket: process.env.R2_BUCKET_NAME,
                        Prefix: prefix
                    });
                    const listRes = await r2.send(listCmd);

                    if (listRes.Contents && listRes.Contents.length > 0) {
                        const deleteParams = {
                            Bucket: process.env.R2_BUCKET_NAME,
                            Delete: {
                                Objects: listRes.Contents.map(obj => ({ Key: obj.Key }))
                            }
                        };
                        await r2.send(new DeleteObjectsCommand(deleteParams));
                        logLine('OK', 'DELETE', 'R2 folder cleaned', {
                            prefix,
                            deletedFiles: listRes.Contents.length,
                        });
                    } else {
                        logLine('WARN', 'DELETE', 'No files found in R2 folder', { prefix });
                    }
                } catch (r2Error) {
                    logLine('ERR', 'DELETE', 'R2 folder cleanup failed', {
                        folderPrefix,
                        error: r2Error?.message || r2Error,
                    });
                }
            }

            // 2B. Direct key cleanup (covers standalone keys like thumbs/<id>.jpg)
            if (objectKeysToDelete.size > 0) {
                try {
                    const keys = Array.from(objectKeysToDelete).map((Key) => ({ Key }));
                    const chunkSize = 1000;
                    for (let i = 0; i < keys.length; i += chunkSize) {
                        const chunk = keys.slice(i, i + chunkSize);
                        await r2.send(new DeleteObjectsCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            Delete: { Objects: chunk },
                        }));
                    }
                    logLine('OK', 'DELETE', 'R2 direct key cleanup sent', { keys: objectKeysToDelete.size });
                } catch (r2Error) {
                    logLine('ERR', 'DELETE', 'R2 direct key cleanup failed', {
                        error: r2Error?.message || r2Error,
                    });
                }
            }

            // 3. DB Delete (using authenticated client for RLS)
            const { error: deleteError, count } = await dbClient
                .from('videos')
                .delete()
                .eq('id', videoId);

            logLine('INFO', 'DELETE', 'Database hard delete result', {
                count,
                error: deleteError?.message || 'none',
            });

            if (deleteError) throw deleteError;

            logLine('OK', 'DELETE', 'Hard delete completed', { videoId });
            return res.json({ success: true, message: 'Video permanently deleted' });

        } else {
            // ============================================
            // SOFT DELETE
            // ============================================
            logLine('INFO', 'DELETE', 'Attempting soft delete RPC', { videoId });
            const { error } = await dbClient.rpc('soft_delete_video', { video_id: videoId });

            if (error) {
                logLine('ERR', 'DELETE', 'Soft delete RPC error', {
                    videoId,
                    error: error?.message || error,
                });
                throw error;
            }

            // Verify if it was actually deleted (optional but good for feedback)
            // Just assume success if no error, as RPC handles it.
            // If the ID didn't exist, the update inside RPC just does nothing.
            // We can check if we want to return 404, but for now Success is fine.

            logLine('OK', 'DELETE', 'Video moved to trash', { videoId });
            return res.json({ success: true, message: 'Video moved to trash' });
        }

    } catch (error) {
        logLine('ERR', 'DELETE', 'Unexpected delete error', {
            videoId,
            error: error?.message || error,
        });
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Endpoint: RESTORE Video
app.post('/videos/:id/restore', async (req, res) => {
    const videoId = req.params.id;
    logBanner('RESTORE REQUEST', [`Video ID: ${videoId}`]);

    try {
        logLine('INFO', 'RESTORE', 'Attempting restore RPC', { videoId });
        const { error } = await supabase.rpc('restore_video', { video_id: videoId });

        if (error) {
            logLine('ERR', 'RESTORE', 'Restore RPC error', { videoId, error: error?.message || error });
            throw error;
        }

        logLine('OK', 'RESTORE', 'Video restored successfully', { videoId });
        res.json({ success: true, message: 'Video restored' });

    } catch (error) {
        logLine('ERR', 'RESTORE', 'Restore failed', { videoId, error: error?.message || error });
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Avatar Upload
app.post('/upload-avatar', upload.single('image'), async (req, res) => {
    const file = req.file;
    const { userId } = req.body;

    if (!file || !userId) {
        return res.status(400).json({ error: 'Missing image or userId' });
    }

    try {
        logBanner('AVATAR UPLOAD REQUEST', [`User ID: ${userId}`]);
        const extension = path.extname(file.originalname) || '.jpg';

        const fileName = `users/${userId}/profile/avatar${extension}`;

        // 1. Upload to R2
        const rawAvatarUrl = await uploadToR2(file.path, fileName, file.mimetype);

        // 2. Add Cache Buster (important for CDNs and apps)

        const avatarUrl = `${rawAvatarUrl}?t=${Date.now()}`;

        // 3. Update Supabase Profile Record
        logLine('INFO', 'AVATAR', 'Syncing avatar URL to Supabase profile', { userId });
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', userId);

        if (dbError) {
            logLine('ERR', 'AVATAR', 'Supabase profile update failed', { userId, error: dbError.message });
            throw dbError;
        }

        // Cleanup temp file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        logLine('OK', 'AVATAR', 'Avatar upload completed', { userId, avatarUrl });
        res.json({ success: true, avatarUrl });

    } catch (error) {
        logLine('ERR', 'AVATAR', 'Avatar upload failed', { userId, error: error?.message || error });
        res.status(500).json({ error: error.message });
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

// Health check
// Temporary Migration Endpoint
app.get('/migrate-assets', async (req, res) => {
    try {
        logBanner('MIGRATION REQUEST', ['Starting R2 asset migration endpoint']);
        const mainUserId = "687c8079-e94c-42c2-9442-8a4a6b63dec6";

        // 1. Migrate Avatar
        try {
            const oldAvatarKey = "avatars/wizyclub-official.jpg";
            const newAvatarKey = `users/${mainUserId}/profile/avatar.jpg`;
            await r2.send(new CopyObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                CopySource: `${process.env.R2_BUCKET_NAME}/${oldAvatarKey}`,
                Key: newAvatarKey
            }));
            await supabase.from('profiles').update({ avatar_url: `${process.env.R2_PUBLIC_URL}/${newAvatarKey}` }).eq('id', mainUserId);
            logLine('OK', 'MIGRATION', 'Avatar migrated');
        } catch (e) {
            logLine('WARN', 'MIGRATION', 'Avatar migration skipped', { reason: e?.message || 'already migrated or missing source' });
        }

        // 2. Migrate Videos
        const { data: videos } = await supabase.from('videos').select('*').order('created_at', { ascending: true });
        const r2Videos = ["1766009656643", "1766011111754", "1766012583186"];

        if (videos) {
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i];
                const timestamp = r2Videos[i];
                if (!timestamp) continue;

                const newBase = `media/${mainUserId}/videos/${video.id}`;

                // Copy Video
                try {
                    await r2.send(new CopyObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        CopySource: `${process.env.R2_BUCKET_NAME}/videos/${timestamp}/master.mp4`,
                        Key: `${newBase}/master.mp4`
                    }));
                    await r2.send(new CopyObjectCommand({
                        Bucket: process.env.R2_BUCKET_NAME,
                        CopySource: `${process.env.R2_BUCKET_NAME}/thumbs/${timestamp}.jpg`,
                        Key: `${newBase}/thumb.jpg`
                    }));
                    // Optional sprite
                    try {
                        await r2.send(new CopyObjectCommand({
                            Bucket: process.env.R2_BUCKET_NAME,
                            CopySource: `${process.env.R2_BUCKET_NAME}/videos/${timestamp}/sprite_${timestamp}_0.jpg`,
                            Key: `${newBase}/sprite.jpg`
                        }));
                    } catch (e) { }

                    await supabase.from('videos').update({
                        video_url: `${process.env.R2_PUBLIC_URL}/${newBase}/master.mp4`,
                        thumbnail_url: `${process.env.R2_PUBLIC_URL}/${newBase}/thumb.jpg`,
                        sprite_url: `${process.env.R2_PUBLIC_URL}/${newBase}/sprite.jpg`
                    }).eq('id', video.id);
                    logLine('OK', 'MIGRATION', 'Video migrated', { videoId: video.id });
                } catch (err) {
                    logLine('ERR', 'MIGRATION', 'Video migration failed', { index: i, videoId: video.id, error: err?.message || err });
                }
            }
        }

        // 3. Migrate Stories
        const { data: stories } = await supabase.from('stories').select('*');
        if (stories && videos) {
            for (const story of stories) {
                const matchingVideo = videos.find(v => v.id === story.id);
                if (matchingVideo) {
                    const newBase = `media/${mainUserId}/videos/${matchingVideo.id}`;
                    await supabase.from('stories').update({
                        video_url: `${process.env.R2_PUBLIC_URL}/${newBase}/master.mp4`,
                        thumbnail_url: `${process.env.R2_PUBLIC_URL}/${newBase}/thumb.jpg`
                    }).eq('id', story.id);
                }
            }
        }

        res.json({ success: true, message: "Migration triggered successfully. Check logs." });
    } catch (err) {
        logLine('ERR', 'MIGRATION', 'Migration endpoint failed', { error: err?.message || err });
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================================
// DRAFTS ENDPOINTS
// ========================================

// Get all drafts for current user
app.get('/drafts', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        logLine('ERR', 'DRAFTS', 'Failed to fetch drafts', { error: error?.message || error, userId });
        res.status(500).json({ error: 'Failed to fetch drafts' });
    }
});

// Get single draft by ID
app.get('/drafts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        logLine('ERR', 'DRAFTS', 'Failed to fetch draft', { draftId: id, error: error?.message || error });
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

// Create new draft
app.post('/drafts', async (req, res) => {
    const {
        userId,
        mediaUri,
        mediaType,
        thumbnailUri,
        description,
        commercialType,
        brandName,
        brandUrl,
        tags,
        useAILabel,
        uploadMode
    } = req.body;

    if (!userId || !mediaUri || !mediaType) {
        return res.status(400).json({ error: 'userId, mediaUri, and mediaType are required' });
    }

    try {
        const { data, error } = await supabase
            .from('drafts')
            .insert({
                user_id: userId,
                media_uri: mediaUri,
                media_type: mediaType,
                thumbnail_uri: thumbnailUri,
                description: description || null,
                commercial_type: commercialType || null,
                brand_name: brandName || null,
                brand_url: brandUrl || null,
                tags: tags || [],
                use_ai_label: useAILabel || false,
                upload_mode: uploadMode || 'video',
            })
            .select()
            .single();

        if (error) throw error;

        logLine('OK', 'DRAFTS', 'Draft created', { draftId: data.id, userId });
        res.json({ success: true, data });
    } catch (error) {
        logLine('ERR', 'DRAFTS', 'Failed to create draft', { userId, error: error?.message || error });
        res.status(500).json({ error: 'Failed to create draft' });
    }
});

// Update draft
app.patch('/drafts/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Map frontend fields to database fields
    const dbUpdates = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.commercialType !== undefined) dbUpdates.commercial_type = updates.commercialType;
    if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName;
    if (updates.brandUrl !== undefined) dbUpdates.brand_url = updates.brandUrl;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.useAILabel !== undefined) dbUpdates.use_ai_label = updates.useAILabel;

    try {
        const { data, error } = await supabase
            .from('drafts')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        logLine('OK', 'DRAFTS', 'Draft updated', { draftId: id });
        res.json({ success: true, data });
    } catch (error) {
        logLine('ERR', 'DRAFTS', 'Failed to update draft', { draftId: id, error: error?.message || error });
        res.status(500).json({ error: 'Failed to update draft' });
    }
});

// Delete draft
app.delete('/drafts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('drafts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        logLine('OK', 'DRAFTS', 'Draft deleted', { draftId: id });
        res.json({ success: true });
    } catch (error) {
        logLine('ERR', 'DRAFTS', 'Failed to delete draft', { draftId: id, error: error?.message || error });
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

const STORY_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const STORY_CLEANUP_DELETE_BATCH_SIZE = 200;
const DRAFT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function cleanupExpiredStoriesInternal() {
    const nowIso = new Date().toISOString();
    const { data: expiredStories, error: fetchError } = await supabase
        .from('stories')
        .select('id, user_id, video_url, thumbnail_url, media_urls, expires_at')
        .lt('expires_at', nowIso)
        .order('expires_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!expiredStories || expiredStories.length === 0) {
        return { deletedCount: 0, failedCount: 0, deletedR2Objects: 0 };
    }

    const deletableStoryIds = [];
    const failedStoryIds = [];
    let deletedR2Objects = 0;

    for (const story of expiredStories) {
        try {
            const cleanup = await cleanupStoryAssetsFromR2(story, {
                scope: 'STORY_CLEANUP',
                storyId: story.id,
            });
            deletedR2Objects += cleanup.deletedCount || 0;
            deletableStoryIds.push(story.id);
        } catch (error) {
            failedStoryIds.push(story.id);
            logLine('WARN', 'STORY_CLEANUP', 'Skipping story hard delete because R2 cleanup failed', {
                storyId: story.id,
                error: error?.message || error,
            });
        }
    }

    let deletedCount = 0;
    for (const storyIdChunk of splitIntoChunks(deletableStoryIds, STORY_CLEANUP_DELETE_BATCH_SIZE)) {
        if (storyIdChunk.length === 0) continue;

        const { data: deletedRows, error: deleteError } = await supabase
            .from('stories')
            .delete()
            .in('id', storyIdChunk)
            .select('id');

        if (deleteError) throw deleteError;
        deletedCount += deletedRows?.length || 0;
    }

    logLine('INFO', 'STORY_CLEANUP', 'Expired stories cleaned', {
        expiredCount: expiredStories.length,
        deletedCount,
        failedCount: failedStoryIds.length,
        deletedR2Objects,
    });

    return { deletedCount, failedCount: failedStoryIds.length, deletedR2Objects };
}

function startStoryCleanupScheduler() {
    cleanupExpiredStoriesInternal().catch((error) => {
        logLine('ERR', 'STORY_CLEANUP', 'Scheduled cleanup failed', { error: error?.message || error });
    });

    setInterval(() => {
        cleanupExpiredStoriesInternal().catch((error) => {
            logLine('ERR', 'STORY_CLEANUP', 'Scheduled cleanup failed', { error: error?.message || error });
        });
    }, STORY_CLEANUP_INTERVAL_MS);
}

async function cleanupExpiredDraftsInternal() {
    const { data, error } = await supabase
        .from('drafts')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

    if (error) throw error;

    const count = data?.length || 0;
    logLine('INFO', 'DRAFTS', 'Expired drafts cleaned', { deletedCount: count });
    return count;
}

function startDraftCleanupScheduler() {
    // Avoid relying on the client; run periodic cleanup in the backend.
    cleanupExpiredDraftsInternal().catch((error) => {
        logLine('ERR', 'DRAFTS', 'Scheduled cleanup failed', { error: error?.message || error });
    });
    setInterval(() => {
        cleanupExpiredDraftsInternal().catch((error) => {
            logLine('ERR', 'DRAFTS', 'Scheduled cleanup failed', { error: error?.message || error });
        });
    }, DRAFT_CLEANUP_INTERVAL_MS);
}

// Cleanup expired stories (hard delete + R2 cleanup)
app.post('/stories/cleanup', async (req, res) => {
    try {
        const result = await cleanupExpiredStoriesInternal();
        res.json({ success: true, ...result });
    } catch (error) {
        logLine('ERR', 'STORY_CLEANUP', 'Manual cleanup failed', { error: error?.message || error });
        res.status(500).json({ error: 'Failed to cleanup stories' });
    }
});

// Cleanup expired drafts (cron job endpoint)
app.post('/drafts/cleanup', async (req, res) => {
    try {
        const count = await cleanupExpiredDraftsInternal();
        res.json({ success: true, deletedCount: count });
    } catch (error) {
        logLine('ERR', 'DRAFTS', 'Manual cleanup failed', { error: error?.message || error });
        res.status(500).json({ error: 'Failed to cleanup drafts' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    const localAccess = `http://localhost:${PORT}`;
    const ipAddress = getPrimaryIpv4Address();
    const networkAccess = ipAddress ? `http://${ipAddress}:${PORT}` : 'unavailable';
    const bindAddress = `http://0.0.0.0:${PORT}`;

    logBanner('WizyClub Backend Ready', [
        `Bind Address : ${bindAddress}`,
        `Local Access : ${localAccess}`,
        `Network      : ${networkAccess}`,
        `R2 Bucket    : ${process.env.R2_BUCKET_NAME || 'undefined'}`,
        'Status       : Ready to accept uploads',
    ]);

    startStoryCleanupScheduler();
    startDraftCleanupScheduler();
});
