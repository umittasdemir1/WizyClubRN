class EditVideoUseCase {
    constructor({
        createVideoRepository,
        normalizeSubtitleMutationInput,
        createHttpError,
        logLine,
        logBanner,
    }) {
        this.createVideoRepository = createVideoRepository;
        this.normalizeSubtitleMutationInput = normalizeSubtitleMutationInput;
        this.createHttpError = createHttpError;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ videoId, userId, body, dbClient }) {
        this.logBanner('PATCH VIDEO REQUEST', [`Video ID: ${videoId}`]);

        try {
            const {
                description,
                commercialType,
                brandName,
                brandUrl,
                isCommercial,
                tags,
                taggedPeople,
                subtitleOperation,
                subtitleId,
                subtitleLanguage,
                subtitleSegments,
                subtitlePresentation,
                subtitleStyle,
            } = body || {};

            const requestedSubtitleMutation = subtitleOperation
                ? this.normalizeSubtitleMutationInput({
                    operation: subtitleOperation,
                    subtitleId,
                    language: subtitleLanguage,
                    segments: subtitleSegments,
                    presentation: subtitlePresentation,
                    style: subtitleStyle,
                })
                : null;

            const rpcArgs = {
                p_video_id: videoId,
                p_actor_user_id: userId,
                p_has_description: description !== undefined,
                p_description: description ?? null,
                p_has_commercial_type: commercialType !== undefined,
                p_commercial_type: commercialType ?? null,
                p_has_brand_name: brandName !== undefined,
                p_brand_name: brandName ?? null,
                p_has_brand_url: brandUrl !== undefined,
                p_brand_url: brandUrl ?? null,
                p_has_is_commercial: isCommercial !== undefined,
                p_is_commercial: isCommercial ?? null,
                p_has_tags: Array.isArray(tags),
                p_tags: Array.isArray(tags) ? tags : [],
                p_has_tagged_people: Array.isArray(taggedPeople),
                p_tagged_people: Array.isArray(taggedPeople) ? taggedPeople : [],
                p_subtitle_operation: requestedSubtitleMutation?.operation || null,
                p_subtitle_id: requestedSubtitleMutation?.subtitleId || null,
                p_subtitle_language: requestedSubtitleMutation?.language || null,
                p_subtitle_segments: requestedSubtitleMutation?.segments || null,
                p_subtitle_presentation: requestedSubtitleMutation?.presentation || null,
                p_subtitle_style: requestedSubtitleMutation?.style || null,
            };

            const videoRepository = this.createVideoRepository(dbClient);
            const rpcResult = await videoRepository.editVideoAtomic(rpcArgs);

            if (rpcResult && typeof rpcResult === 'object') {
                return rpcResult;
            }

            return { video_id: videoId };
        } catch (error) {
            const missingFunction =
                typeof error?.message === 'string'
                && error.message.includes('edit_video_atomic');

            if (missingFunction) {
                throw this.createHttpError(500, 'edit_video_atomic RPC bulunamadi. SQL migration uygulanmali.');
            }

            this.logLine('ERR', 'PATCH', 'Video edit failed', { videoId, error: error?.message || error });
            throw error;
        }
    }
}

module.exports = EditVideoUseCase;
