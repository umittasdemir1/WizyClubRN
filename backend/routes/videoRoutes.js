const express = require('express');
const EditVideoDTO = require('../dto/EditVideoDTO');
const UploadVideoDTO = require('../dto/UploadVideoDTO');
const VideoIdParamDTO = require('../dto/VideoIdParamDTO');

function createVideoRoutes({
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
}) {
    const router = express.Router();

    router.get('/upload-progress/:id', (req, res) => {
        try {
            const { id } = new VideoIdParamDTO(req.params).toParams();
            return res.json(uploadProgressService.get(id));
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Invalid request' });
        }
    });

    router.post('/upload-hls', upload.array('video', 10), async (req, res) => {
        try {
            const dto = new UploadVideoDTO(req.body, req.files);
            const requestPayload = dto.toRequest();
            const result = await uploadVideoUseCase.execute({
                files: requestPayload.files,
                body: requestPayload.body,
                dbClient: supabase,
            });
            return res.json({ success: true, data: result.data, uploadId: result.uploadId });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Upload failed' });
        }
    });

    router.patch('/videos/:id', requireAuth, requireEditableVideo, async (req, res) => {
        try {
            const { id } = new VideoIdParamDTO(req.params).toParams();
            const dto = new EditVideoDTO(req.body);
            const data = await editVideoUseCase.execute({
                videoId: id,
                userId: req.user?.id,
                body: dto.toBody(),
                dbClient: req.dbClient || supabase,
            });

            return res.json({ success: true, data });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Video edit failed' });
        }
    });

    router.delete('/videos/:id', requireAuth, requireDeletableVideo, async (req, res) => {
        try {
            const { id } = new VideoIdParamDTO(req.params).toParams();
            const result = await deleteVideoUseCase.execute({
                videoId: id,
                force: req.query.force === 'true',
                userId: req.user?.id,
                video: req.video,
                dbClient: req.dbClient || supabase,
            });

            return res.json({ success: true, message: result.message });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Internal server error' });
        }
    });

    router.post('/videos/:id/restore', requireAuth, requireDeletableVideo, async (req, res) => {
        try {
            const { id } = new VideoIdParamDTO(req.params).toParams();
            const result = await restoreVideoUseCase.execute({
                videoId: id,
                dbClient: req.dbClient || supabase,
            });

            return res.json({ success: true, message: result.message });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Internal server error' });
        }
    });

    return router;
}

module.exports = {
    createVideoRoutes,
};
