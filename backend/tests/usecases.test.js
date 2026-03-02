const test = require('node:test');
const assert = require('node:assert/strict');

const DeleteStoryUseCase = require('../usecases/DeleteStoryUseCase');
const GenerateVideoSubtitlesUseCase = require('../usecases/GenerateVideoSubtitlesUseCase');
const MigrateAssetsUseCase = require('../usecases/MigrateAssetsUseCase');

test('GenerateVideoSubtitlesUseCase starts generation when guards pass', async () => {
    const triggerCalls = [];
    const warnings = [];
    const useCase = new GenerateVideoSubtitlesUseCase({
        subtitleService: {
            isAvailable: () => true,
        },
        subtitleGenerationService: {
            isInProgress: () => false,
            canTrigger: () => true,
            trigger: (...args) => {
                triggerCalls.push(args);
                return true;
            },
        },
        findLatestSubtitleStatus: async () => null,
        logLine: (...args) => warnings.push(args),
    });

    const result = await useCase.execute({
        videoId: 'video-1',
        video: {
            id: 'video-1',
            post_type: 'video',
            video_url: 'https://cdn.example/video.mp4',
        },
        language: 'tr',
    });

    assert.deepEqual(result, {
        message: 'Subtitle generation started',
        videoId: 'video-1',
        language: 'tr',
    });
    assert.equal(triggerCalls.length, 1);
    assert.deepEqual(triggerCalls[0], [
        'video-1',
        'https://cdn.example/video.mp4',
        'manual-endpoint',
        { language: 'tr' },
    ]);
    assert.equal(warnings.some((call) => call[0] === 'WARN'), false);
});

test('GenerateVideoSubtitlesUseCase rejects when DB already shows processing', async () => {
    const useCase = new GenerateVideoSubtitlesUseCase({
        subtitleService: {
            isAvailable: () => true,
        },
        subtitleGenerationService: {
            isInProgress: () => false,
            canTrigger: () => true,
            trigger: () => true,
        },
        findLatestSubtitleStatus: async () => ({ status: 'processing' }),
        logLine: () => {},
    });

    await assert.rejects(
        () => useCase.execute({
            videoId: 'video-2',
            video: {
                id: 'video-2',
                post_type: 'video',
                video_url: 'https://cdn.example/video.mp4',
            },
            language: 'auto',
        }),
        (error) => error?.statusCode === 409
            && error.message === 'Subtitle generation is already processing in database state'
    );
});

test('GenerateVideoSubtitlesUseCase logs and continues when status lookup fails unexpectedly', async () => {
    const logCalls = [];
    const useCase = new GenerateVideoSubtitlesUseCase({
        subtitleService: {
            isAvailable: () => true,
        },
        subtitleGenerationService: {
            isInProgress: () => false,
            canTrigger: () => true,
            trigger: () => true,
        },
        findLatestSubtitleStatus: async () => {
            throw new Error('lookup failed');
        },
        logLine: (...args) => logCalls.push(args),
    });

    const result = await useCase.execute({
        videoId: 'video-3',
        video: {
            id: 'video-3',
            post_type: 'video',
            video_url: 'https://cdn.example/video.mp4',
        },
        language: 'auto',
    });

    assert.equal(result.message, 'Subtitle generation started');
    assert.equal(logCalls.some((call) => call[0] === 'WARN'), true);
});

test('DeleteStoryUseCase rejects when the authenticated user does not own the story', async () => {
    const useCase = new DeleteStoryUseCase({
        createStoryRepository: () => ({
            findStoryById: async () => ({
                id: 'story-1',
                user_id: 'owner-1',
            }),
        }),
        cleanupStoryAssetsFromR2: async () => {},
        logLine: () => {},
        logBanner: () => {},
    });

    await assert.rejects(
        () => useCase.execute({
            storyId: 'story-1',
            userId: 'other-user',
            force: false,
            dbClient: {},
        }),
        (error) => error?.statusCode === 403 && error.message === 'Forbidden'
    );
});

test('MigrateAssetsUseCase migrates legacy avatar, videos, and linked stories', async () => {
    const sentCommands = [];
    const avatarUpdates = [];
    const videoUpdates = [];
    const storyUpdates = [];

    class MockCopyObjectCommand {
        constructor(input) {
            this.input = input;
        }
    }

    const useCase = new MigrateAssetsUseCase({
        r2: {
            send: async (command) => {
                sentCommands.push(command.input);
                return {};
            },
        },
        bucketName: 'bucket-1',
        publicUrl: 'https://cdn.example',
        copyObjectCommand: MockCopyObjectCommand,
        createProfileRepository: () => ({
            updateAvatarUrl: async (userId, avatarUrl) => {
                avatarUpdates.push({ userId, avatarUrl });
            },
        }),
        createVideoRepository: () => ({
            listVideosForMigration: async () => [
                { id: 'video-1' },
            ],
            updateMigratedAssetUrls: async (videoId, payload) => {
                videoUpdates.push({ videoId, payload });
            },
        }),
        createStoryRepository: () => ({
            listStoriesForMigration: async () => [
                { id: 'video-1' },
                { id: 'story-2' },
            ],
            updateMigratedAssetUrls: async (storyId, payload) => {
                storyUpdates.push({ storyId, payload });
            },
        }),
        defaultDbClient: {},
        mainUserId: 'main-user',
        legacyVideoKeys: ['legacy-1'],
        logLine: () => {},
        logBanner: () => {},
    });

    const result = await useCase.execute();

    assert.deepEqual(result, {
        message: 'Migration triggered successfully. Check logs.',
        migratedVideos: 1,
        migratedStories: 1,
    });
    assert.equal(sentCommands.length, 4);
    assert.deepEqual(avatarUpdates, [
        {
            userId: 'main-user',
            avatarUrl: 'https://cdn.example/users/main-user/profile/avatar.jpg',
        },
    ]);
    assert.equal(videoUpdates.length, 1);
    assert.equal(videoUpdates[0].videoId, 'video-1');
    assert.equal(storyUpdates.length, 1);
    assert.equal(storyUpdates[0].storyId, 'video-1');
});
