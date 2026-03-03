const { CopyObjectCommand } = require('@aws-sdk/client-s3');
const {
    SUBTITLE_COOLDOWN_MS,
    STORY_RETENTION_MS,
    LEGACY_MIGRATION_MAIN_USER_ID,
    LEGACY_MIGRATION_VIDEO_KEYS,
} = require('../config/constants');
const { createProfileRepository } = require('../repositories/ProfileRepository');
const { createStoryRepository } = require('../repositories/StoryRepository');
const { createVideoRepository } = require('../repositories/VideoRepository');
const SubtitleGenerationService = require('../services/SubtitleGenerationService');
const UploadProgressService = require('../services/UploadProgressService');
const {
    normalizeSubtitlePresentationInput,
    normalizeSubtitleStyleInput,
    normalizeSubtitleMutationInput,
} = require('../services/SubtitleMutationService');
const CleanupExpiredDraftsUseCase = require('../usecases/CleanupExpiredDraftsUseCase');
const CleanupExpiredStoriesUseCase = require('../usecases/CleanupExpiredStoriesUseCase');
const CleanupSoftDeletedStoriesUseCase = require('../usecases/CleanupSoftDeletedStoriesUseCase');
const DeleteStoryUseCase = require('../usecases/DeleteStoryUseCase');
const DeleteVideoUseCase = require('../usecases/DeleteVideoUseCase');
const EditVideoUseCase = require('../usecases/EditVideoUseCase');
const GenerateVideoSubtitlesUseCase = require('../usecases/GenerateVideoSubtitlesUseCase');
const GetVideoSubtitlesUseCase = require('../usecases/GetVideoSubtitlesUseCase');
const ListRecentlyDeletedStoriesUseCase = require('../usecases/ListRecentlyDeletedStoriesUseCase');
const MigrateAssetsUseCase = require('../usecases/MigrateAssetsUseCase');
const PreviewSubtitlesUseCase = require('../usecases/PreviewSubtitlesUseCase');
const RestoreStoryUseCase = require('../usecases/RestoreStoryUseCase');
const RestoreVideoUseCase = require('../usecases/RestoreVideoUseCase');
const UploadAvatarUseCase = require('../usecases/UploadAvatarUseCase');
const UploadStoryUseCase = require('../usecases/UploadStoryUseCase');
const UploadVideoUseCase = require('../usecases/UploadVideoUseCase');
const HlsService = require('../services/HlsService');
const PlacesService = require('../services/PlacesService');
const SubtitleService = require('../services/SubtitleService');
const { createHttpError } = require('../utils/httpError');
const { safeParseJsonArray } = require('../utils/safeParseJsonArray');

function createUseCases({
    envConfig,
    infrastructure,
    logLine,
    logBanner,
    tempOutputDir,
}) {
    const {
        r2,
        supabase,
        storageAdapter,
        mediaProcessingService,
        findLatestSubtitleStatus,
        cleanupStoryAssetsFromR2,
        cleanupVideoAssetsFromR2,
        cleanupExpiredStories,
        cleanupExpiredDrafts,
        cleanupSoftDeletedStories,
    } = infrastructure;

    logLine('BOOT', 'INIT', 'Loading HlsService module');
    const hlsService = new HlsService(r2, envConfig.r2BucketName, { logLine, logBanner });
    logLine('OK', 'INIT', 'HlsService ready');

    logLine('BOOT', 'INIT', 'Loading SubtitleService module');
    const subtitleService = new SubtitleService(supabase, { logLine, logBanner });
    logLine('OK', 'INIT', 'SubtitleService ready', { sttAvailable: subtitleService.isAvailable() });

    const uploadProgressService = new UploadProgressService();
    const subtitleGenerationService = new SubtitleGenerationService({
        subtitleService,
        logLine,
        cooldownMs: SUBTITLE_COOLDOWN_MS,
    });
    const placesService = new PlacesService({
        apiKey: envConfig.googlePlacesApiKey,
        logLine,
    });

    return {
        placesService,
        uploadProgressService,
        generateVideoSubtitlesUseCase: new GenerateVideoSubtitlesUseCase({
            subtitleService,
            subtitleGenerationService,
            findLatestSubtitleStatus,
            logLine,
        }),
        getVideoSubtitlesUseCase: new GetVideoSubtitlesUseCase({
            subtitleService,
            logLine,
        }),
        previewSubtitlesUseCase: new PreviewSubtitlesUseCase({
            subtitleService,
            mediaProcessingService,
            logLine,
        }),
        uploadStoryUseCase: new UploadStoryUseCase({
            mediaProcessingService,
            storageAdapter,
            createStoryRepository,
            safeParseJsonArray,
            logLine,
            logBanner,
        }),
        deleteStoryUseCase: new DeleteStoryUseCase({
            createStoryRepository,
            cleanupStoryAssetsFromR2,
            logLine,
            logBanner,
        }),
        restoreStoryUseCase: new RestoreStoryUseCase({
            createStoryRepository,
            storyRetentionMs: STORY_RETENTION_MS,
            logLine,
            logBanner,
        }),
        listRecentlyDeletedStoriesUseCase: new ListRecentlyDeletedStoriesUseCase({
            createStoryRepository,
            storyRetentionMs: STORY_RETENTION_MS,
            logLine,
        }),
        cleanupExpiredStoriesUseCase: new CleanupExpiredStoriesUseCase({
            cleanupExpiredStories,
        }),
        cleanupSoftDeletedStoriesUseCase: new CleanupSoftDeletedStoriesUseCase({
            cleanupSoftDeletedStories,
        }),
        cleanupExpiredDraftsUseCase: new CleanupExpiredDraftsUseCase({
            cleanupExpiredDrafts,
        }),
        uploadVideoUseCase: new UploadVideoUseCase({
            mediaProcessingService,
            storageAdapter,
            hlsService,
            createVideoRepository,
            safeParseJsonArray,
            normalizeSubtitlePresentationInput,
            normalizeSubtitleStyleInput,
            subtitleGenerationService,
            uploadProgressService,
            logLine,
            logBanner,
            tempOutputDir,
        }),
        editVideoUseCase: new EditVideoUseCase({
            createVideoRepository,
            normalizeSubtitleMutationInput,
            createHttpError,
            logLine,
            logBanner,
        }),
        deleteVideoUseCase: new DeleteVideoUseCase({
            createVideoRepository,
            cleanupVideoAssetsFromR2,
            logLine,
            logBanner,
        }),
        restoreVideoUseCase: new RestoreVideoUseCase({
            createVideoRepository,
            logLine,
            logBanner,
        }),
        uploadAvatarUseCase: new UploadAvatarUseCase({
            storageAdapter,
            createProfileRepository,
            logLine,
            logBanner,
        }),
        migrateAssetsUseCase: new MigrateAssetsUseCase({
            r2,
            bucketName: envConfig.r2BucketName,
            publicUrl: envConfig.r2PublicUrl,
            copyObjectCommand: CopyObjectCommand,
            createProfileRepository,
            createVideoRepository,
            createStoryRepository,
            defaultDbClient: supabase,
            mainUserId: LEGACY_MIGRATION_MAIN_USER_ID,
            legacyVideoKeys: LEGACY_MIGRATION_VIDEO_KEYS,
            logLine,
            logBanner,
        }),
        normalizeSubtitleMutationInput,
    };
}

module.exports = {
    createUseCases,
};
