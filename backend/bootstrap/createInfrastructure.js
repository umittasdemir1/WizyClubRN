const multer = require('multer');
const {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const R2StorageAdapter = require('../adapters/storage/R2StorageAdapter');
const { CDN_CACHE_HEADER } = require('../config/constants');
const { createRequireAuth, createAttachOptionalAuth } = require('../middleware/authMiddleware');
const { createRequireVideoOwnership } = require('../middleware/requireVideoOwnership');
const { createSubtitleRepository } = require('../repositories/SubtitleRepository');
const { createCleanupService } = require('../services/CleanupService');
const { createMediaProcessingService } = require('../services/MediaProcessingService');
const { createR2CleanupService } = require('../services/R2CleanupService');

function createInfrastructure({ envConfig, ffmpeg, logLine }) {
    const upload = multer({ dest: 'temp_uploads/' });

    logLine('BOOT', 'INIT', 'Initializing R2 client');
    const r2 = new S3Client({
        region: 'auto',
        endpoint: `https://${envConfig.r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: envConfig.r2AccessKeyId,
            secretAccessKey: envConfig.r2SecretAccessKey,
        },
    });

    const storageAdapter = new R2StorageAdapter({
        client: r2,
        bucketName: envConfig.r2BucketName,
        publicUrl: envConfig.r2PublicUrl,
        cacheControl: CDN_CACHE_HEADER,
        putObjectCommand: PutObjectCommand,
        logLine,
    });
    const mediaProcessingService = createMediaProcessingService({
        ffmpeg,
        logLine,
    });

    logLine('BOOT', 'INIT', 'Initializing Supabase client');
    const supabaseKey = envConfig.supabaseServiceKey;

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        logLine('INFO', 'INIT', 'Using Service Role Key for backend operations (RLS Bypass)');
    } else {
        logLine('WARN', 'INIT', 'Service Role Key not found! Using Anon Key. RLS policies may block writes.');
    }

    const supabase = createClient(envConfig.supabaseUrl, supabaseKey);
    const {
        applySubtitleMutationForVideo,
        findLatestSubtitleStatus,
    } = createSubtitleRepository(supabase);
    const requireAuth = createRequireAuth(supabase, envConfig);
    const attachOptionalAuth = createAttachOptionalAuth(supabase, envConfig);
    const requireEditableVideo = createRequireVideoOwnership(supabase, {
        forbiddenMessage: 'You can only edit your own videos',
    });
    const requireDeletableVideo = createRequireVideoOwnership(supabase, {
        select: '*',
        forbiddenMessage: 'You can only delete your own videos',
    });
    const requireSubtitleGenerationVideo = createRequireVideoOwnership(supabase, {
        select: 'id, user_id, video_url, post_type',
        forbiddenMessage: 'You can only generate subtitles for your own videos',
    });
    const requireSubtitleEditableVideo = createRequireVideoOwnership(supabase, {
        forbiddenMessage: 'You can only edit subtitles for your own videos',
    });
    const requireSubtitleDeletableVideo = createRequireVideoOwnership(supabase, {
        forbiddenMessage: 'You can only delete subtitles for your own videos',
    });

    const {
        splitIntoChunks,
        cleanupStoryAssetsFromR2,
        cleanupVideoAssetsFromR2,
    } = createR2CleanupService({
        r2,
        bucketName: envConfig.r2BucketName,
        logLine,
        listObjectsV2Command: ListObjectsV2Command,
        deleteObjectsCommand: DeleteObjectsCommand,
    });
    const {
        cleanupExpiredStories,
        cleanupExpiredDrafts,
        cleanupSoftDeletedStories,
        startStoryCleanupScheduler,
        startDraftCleanupScheduler,
        startSoftDeletedStoryCleanupScheduler,
    } = createCleanupService({
        supabase,
        cleanupStoryAssetsFromR2,
        splitIntoChunks,
        logLine,
    });

    return {
        upload,
        r2,
        storageAdapter,
        mediaProcessingService,
        supabase,
        applySubtitleMutationForVideo,
        findLatestSubtitleStatus,
        requireAuth,
        attachOptionalAuth,
        requireEditableVideo,
        requireDeletableVideo,
        requireSubtitleGenerationVideo,
        requireSubtitleEditableVideo,
        requireSubtitleDeletableVideo,
        cleanupStoryAssetsFromR2,
        cleanupVideoAssetsFromR2,
        cleanupExpiredStories,
        cleanupExpiredDrafts,
        cleanupSoftDeletedStories,
        schedulers: {
            startStoryCleanupScheduler,
            startDraftCleanupScheduler,
            startSoftDeletedStoryCleanupScheduler,
        },
    };
}

module.exports = {
    createInfrastructure,
};
