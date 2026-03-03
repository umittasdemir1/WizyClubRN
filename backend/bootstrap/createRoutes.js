const { LEGACY_MIGRATION_MAIN_USER_ID } = require('../config/constants');
const { createDraftRepository } = require('../repositories/DraftRepository');
const { createDraftRoutes } = require('../routes/draftRoutes');
const { createProfileRoutes } = require('../routes/profileRoutes');
const { createPlacesRoutes } = require('../routes/placesRoutes');
const { createStoryRoutes } = require('../routes/storyRoutes');
const { createSubtitleRoutes } = require('../routes/subtitleRoutes');
const { createSystemRoutes } = require('../routes/systemRoutes');
const { createVideoRoutes } = require('../routes/videoRoutes');
const { safeParseJsonArray } = require('../utils/safeParseJsonArray');

function createRoutes({ infrastructure, useCases, logLine }) {
    const {
        upload,
        supabase,
        attachOptionalAuth,
        requireAuth,
        requireEditableVideo,
        requireDeletableVideo,
        requireSubtitleGenerationVideo,
        requireSubtitleEditableVideo,
        requireSubtitleDeletableVideo,
        applySubtitleMutationForVideo,
    } = infrastructure;

    const {
        uploadProgressService,
        uploadStoryUseCase,
        deleteStoryUseCase,
        restoreStoryUseCase,
        listRecentlyDeletedStoriesUseCase,
        cleanupExpiredStoriesUseCase,
        cleanupSoftDeletedStoriesUseCase,
        uploadVideoUseCase,
        editVideoUseCase,
        deleteVideoUseCase,
        restoreVideoUseCase,
        uploadAvatarUseCase,
        cleanupExpiredDraftsUseCase,
        getVideoSubtitlesUseCase,
        previewSubtitlesUseCase,
        generateVideoSubtitlesUseCase,
        migrateAssetsUseCase,
        normalizeSubtitleMutationInput,
        placesService,
    } = useCases;

    return {
        storyRoutes: createStoryRoutes({
            supabase,
            attachOptionalAuth,
            upload,
            uploadStoryUseCase,
            requireAuth,
            deleteStoryUseCase,
            restoreStoryUseCase,
            listRecentlyDeletedStoriesUseCase,
            cleanupExpiredStoriesUseCase,
            cleanupSoftDeletedStoriesUseCase,
            logLine,
        }),
        videoRoutes: createVideoRoutes({
            supabase,
            upload,
            uploadVideoUseCase,
            uploadProgressService,
            requireAuth,
            requireEditableVideo,
            requireDeletableVideo,
            editVideoUseCase,
            deleteVideoUseCase,
            restoreVideoUseCase,
        }),
        profileRoutes: createProfileRoutes({
            upload,
            supabase,
            uploadAvatarUseCase,
        }),
        placesRoutes: createPlacesRoutes({
            placesService,
            logLine,
        }),
        draftRoutes: createDraftRoutes({
            supabase,
            createDraftRepository,
            logLine,
            safeParseJsonArray,
            cleanupExpiredDraftsUseCase,
        }),
        subtitleRoutes: createSubtitleRoutes({
            upload,
            getVideoSubtitlesUseCase,
            previewSubtitlesUseCase,
            requireAuth,
            requireSubtitleGenerationVideo,
            requireSubtitleEditableVideo,
            requireSubtitleDeletableVideo,
            generateVideoSubtitlesUseCase,
            applySubtitleMutationForVideo,
            normalizeSubtitleMutationInput,
        }),
        systemRoutes: createSystemRoutes({
            migrateAssetsUseCase,
            logLine,
            requireAuth,
            migrationOwnerUserId: LEGACY_MIGRATION_MAIN_USER_ID,
        }),
    };
}

module.exports = {
    createRoutes,
};
