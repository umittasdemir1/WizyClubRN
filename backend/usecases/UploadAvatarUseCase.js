const fs = require('fs');
const path = require('path');

class UploadAvatarUseCase {
    constructor({
        storageAdapter,
        createProfileRepository,
        logLine,
        logBanner,
    }) {
        this.storageAdapter = storageAdapter;
        this.createProfileRepository = createProfileRepository;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ file, userId, dbClient }) {
        try {
            this.logBanner('AVATAR UPLOAD REQUEST', [`User ID: ${userId}`]);
            const extension = path.extname(file.originalname) || '.jpg';
            const fileName = `users/${userId}/profile/avatar${extension}`;
            const rawAvatarUrl = await this.storageAdapter.upload(file.path, fileName, file.mimetype);
            const avatarUrl = `${rawAvatarUrl}?t=${Date.now()}`;

            this.logLine('INFO', 'AVATAR', 'Syncing avatar URL to Supabase profile', { userId });
            const profileRepository = this.createProfileRepository(dbClient);
            await profileRepository.updateAvatarUrl(userId, avatarUrl);

            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            this.logLine('OK', 'AVATAR', 'Avatar upload completed', { userId, avatarUrl });
            return { avatarUrl };
        } catch (error) {
            this.logLine('ERR', 'AVATAR', 'Avatar upload failed', { userId, error: error?.message || error });
            if (file?.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            throw error;
        }
    }
}

module.exports = UploadAvatarUseCase;
