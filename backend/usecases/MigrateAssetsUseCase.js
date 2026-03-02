class MigrateAssetsUseCase {
    constructor({
        r2,
        bucketName,
        publicUrl,
        copyObjectCommand,
        createProfileRepository,
        createVideoRepository,
        createStoryRepository,
        defaultDbClient,
        mainUserId,
        legacyVideoKeys,
        logLine,
        logBanner,
    }) {
        this.r2 = r2;
        this.bucketName = bucketName;
        this.publicUrl = publicUrl;
        this.CopyObjectCommand = copyObjectCommand;
        this.createProfileRepository = createProfileRepository;
        this.createVideoRepository = createVideoRepository;
        this.createStoryRepository = createStoryRepository;
        this.defaultDbClient = defaultDbClient;
        this.mainUserId = mainUserId;
        this.legacyVideoKeys = Array.isArray(legacyVideoKeys) ? legacyVideoKeys : [];
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async copyObject(sourceKey, destinationKey) {
        await this.r2.send(new this.CopyObjectCommand({
            Bucket: this.bucketName,
            CopySource: `${this.bucketName}/${sourceKey}`,
            Key: destinationKey,
        }));
    }

    async execute({ dbClient } = {}) {
        this.logBanner('MIGRATION REQUEST', ['Starting R2 asset migration endpoint']);
        const client = dbClient || this.defaultDbClient;

        const profileRepository = this.createProfileRepository(client);
        const videoRepository = this.createVideoRepository(client);
        const storyRepository = this.createStoryRepository(client);

        try {
            try {
                const oldAvatarKey = 'avatars/wizyclub-official.jpg';
                const newAvatarKey = `users/${this.mainUserId}/profile/avatar.jpg`;
                await this.copyObject(oldAvatarKey, newAvatarKey);
                await profileRepository.updateAvatarUrl(
                    this.mainUserId,
                    `${this.publicUrl}/${newAvatarKey}`
                );
                this.logLine('OK', 'MIGRATION', 'Avatar migrated');
            } catch (error) {
                this.logLine('WARN', 'MIGRATION', 'Avatar migration skipped', {
                    reason: error?.message || 'already migrated or missing source',
                });
            }

            const videos = await videoRepository.listVideosForMigration();
            const migratedVideoIds = new Set();

            for (let i = 0; i < videos.length; i += 1) {
                const video = videos[i];
                const timestamp = this.legacyVideoKeys[i];
                if (!timestamp) continue;

                const newBase = `media/${this.mainUserId}/videos/${video.id}`;

                try {
                    await this.copyObject(`videos/${timestamp}/master.mp4`, `${newBase}/master.mp4`);
                    await this.copyObject(`thumbs/${timestamp}.jpg`, `${newBase}/thumb.jpg`);

                    try {
                        await this.copyObject(
                            `videos/${timestamp}/sprite_${timestamp}_0.jpg`,
                            `${newBase}/sprite.jpg`
                        );
                    } catch {}

                    await videoRepository.updateMigratedAssetUrls(video.id, {
                        video_url: `${this.publicUrl}/${newBase}/master.mp4`,
                        thumbnail_url: `${this.publicUrl}/${newBase}/thumb.jpg`,
                        sprite_url: `${this.publicUrl}/${newBase}/sprite.jpg`,
                    });
                    migratedVideoIds.add(video.id);
                    this.logLine('OK', 'MIGRATION', 'Video migrated', { videoId: video.id });
                } catch (error) {
                    this.logLine('ERR', 'MIGRATION', 'Video migration failed', {
                        index: i,
                        videoId: video.id,
                        error: error?.message || error,
                    });
                }
            }

            const stories = await storyRepository.listStoriesForMigration();
            let migratedStories = 0;

            for (const story of stories) {
                if (!migratedVideoIds.has(story.id)) {
                    continue;
                }

                const newBase = `media/${this.mainUserId}/videos/${story.id}`;
                await storyRepository.updateMigratedAssetUrls(story.id, {
                    video_url: `${this.publicUrl}/${newBase}/master.mp4`,
                    thumbnail_url: `${this.publicUrl}/${newBase}/thumb.jpg`,
                });
                migratedStories += 1;
            }

            return {
                message: 'Migration triggered successfully. Check logs.',
                migratedVideos: migratedVideoIds.size,
                migratedStories,
            };
        } catch (error) {
            this.logLine('ERR', 'MIGRATION', 'Migration use case failed', { error: error?.message || error });
            throw error;
        }
    }
}

module.exports = MigrateAssetsUseCase;
