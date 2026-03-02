const express = require('express');
const UploadAvatarDTO = require('../dto/UploadAvatarDTO');

function createProfileRoutes({ upload, uploadAvatarUseCase, supabase }) {
    const router = express.Router();

    router.post('/upload-avatar', upload.single('image'), async (req, res) => {
        try {
            const dto = new UploadAvatarDTO(req.body, req.file);
            const requestPayload = dto.toRequest();
            const result = await uploadAvatarUseCase.execute({
                file: requestPayload.file,
                userId: requestPayload.userId,
                dbClient: req.dbClient || supabase,
            });

            const { avatarUrl } = result;
            return res.json({ success: true, avatarUrl });
        } catch (error) {
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Avatar upload failed' });
        }
    });

    return router;
}

module.exports = {
    createProfileRoutes,
};
