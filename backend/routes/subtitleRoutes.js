const express = require('express');
const DeleteSubtitleQueryDTO = require('../dto/DeleteSubtitleQueryDTO');
const GenerateSubtitlesDTO = require('../dto/GenerateSubtitlesDTO');
const SubtitleListQueryDTO = require('../dto/SubtitleListQueryDTO');
const VideoIdParamDTO = require('../dto/VideoIdParamDTO');

function createSubtitleRoutes({
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
}) {
    const router = express.Router();

    router.post('/stt-preview', upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
    ]), async (req, res) => {
        try {
            const result = await previewSubtitlesUseCase.execute({
                files: req.files,
                body: req.body,
            });
            return res.json(result);
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'STT transcription failed' });
        }
    });

    router.get('/videos/:id/subtitles', async (req, res) => {
        try {
            const { id: videoId } = new VideoIdParamDTO(req.params).toParams();
            const { language } = new SubtitleListQueryDTO(req.query).toQuery();
            const subtitles = await getVideoSubtitlesUseCase.execute({
                videoId,
                language,
            });
            return res.json({ success: true, data: subtitles });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to fetch subtitles' });
        }
    });

    router.post(
        '/videos/:id/subtitles/generate',
        requireAuth,
        requireSubtitleGenerationVideo,
        async (req, res) => {
            try {
                const { id: videoId } = new VideoIdParamDTO(req.params).toParams();
                const video = req.video;
                const { language } = new GenerateSubtitlesDTO(req.body).toBody();
                const result = await generateVideoSubtitlesUseCase.execute({
                    videoId,
                    video,
                    language,
                });
                return res.json({ success: true, ...result });
            } catch (error) {
                return res.status(error?.statusCode || 500).json({ error: error.message });
            }
        }
    );

    router.put(
        '/videos/:id/subtitles',
        requireAuth,
        requireSubtitleEditableVideo,
        async (req, res) => {
            try {
                const { id: videoId } = new VideoIdParamDTO(req.params).toParams();
                const { subtitleId, language, segments, presentation, style } = req.body || {};
                const result = await applySubtitleMutationForVideo(
                    videoId,
                    normalizeSubtitleMutationInput({
                        operation: 'update',
                        subtitleId,
                        language,
                        segments,
                        presentation,
                        style,
                    })
                );
                return res.json({ success: true, data: result.data });
            } catch (error) {
                return res.status(error?.statusCode || 500).json({ error: error.message });
            }
        }
    );

    router.delete(
        '/videos/:id/subtitles',
        requireAuth,
        requireSubtitleDeletableVideo,
        async (req, res) => {
            try {
                const { id: videoId } = new VideoIdParamDTO(req.params).toParams();
                const { subtitleId, language } = new DeleteSubtitleQueryDTO(req.query).toQuery();
                const result = await applySubtitleMutationForVideo(
                    videoId,
                    normalizeSubtitleMutationInput({
                        operation: 'delete',
                        subtitleId,
                        language,
                    })
                );
                return res.json({ success: true, deletedCount: result.deletedCount || 0 });
            } catch (error) {
                return res.status(error?.statusCode || 500).json({ error: error.message });
            }
        }
    );

    return router;
}

module.exports = {
    createSubtitleRoutes,
};
