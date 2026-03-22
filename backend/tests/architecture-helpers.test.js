const test = require('node:test');
const assert = require('node:assert/strict');

const CreateDraftDTO = require('../dto/CreateDraftDTO');
const DeleteSubtitleQueryDTO = require('../dto/DeleteSubtitleQueryDTO');
const GenerateSubtitlesDTO = require('../dto/GenerateSubtitlesDTO');
const ListDraftsQueryDTO = require('../dto/ListDraftsQueryDTO');
const SubtitleListQueryDTO = require('../dto/SubtitleListQueryDTO');
const UpdateDraftDTO = require('../dto/UpdateDraftDTO');
const VideoIdParamDTO = require('../dto/VideoIdParamDTO');
const { toDraftInsertPayload, toDraftRecord } = require('../mappers/draftMapper');
const { normalizeMediaUrlsField, toVideoInsertPayload } = require('../mappers/videoMapper');
const { toStoryInsertPayload } = require('../mappers/storyMapper');

test('normalizeMediaUrlsField parses stored json arrays safely', () => {
    assert.deepEqual(
        normalizeMediaUrlsField('[{"url":"https://cdn.example/video.mp4"}]'),
        [{ url: 'https://cdn.example/video.mp4' }]
    );
    assert.deepEqual(normalizeMediaUrlsField('not-json'), []);
});

test('draft mapper converts camelCase input into DB payload and normalizes tags', () => {
    const insertPayload = toDraftInsertPayload({
        userId: 'user-1',
        mediaUri: 'file:///video.mp4',
        mediaType: 'video',
        thumbnailUri: 'file:///thumb.jpg',
        description: 'demo',
        commercialType: 'brand',
        brandName: 'Wizy',
        brandUrl: 'https://wizy.example',
        tags: ['one', 'two'],
        useAILabel: true,
        uploadMode: 'video',
    });

    assert.deepEqual(insertPayload, {
        user_id: 'user-1',
        media_uri: 'file:///video.mp4',
        media_type: 'video',
        thumbnail_uri: 'file:///thumb.jpg',
        description: 'demo',
        commercial_type: 'brand',
        brand_name: 'Wizy',
        brand_url: 'https://wizy.example',
        tags: ['one', 'two'],
        use_ai_label: true,
        upload_mode: 'video',
    });

    assert.deepEqual(
        toDraftRecord({ id: 'draft-1', tags: '["alpha","beta"]' }).tags,
        ['alpha', 'beta']
    );
});

test('video and story mappers convert upload payloads into DB payloads', () => {
    const videoPayload = toVideoInsertPayload({
        userId: 'user-1',
        videoUrl: 'https://cdn.example/master.mp4',
        thumbnailUrl: 'https://cdn.example/thumb.jpg',
        spriteUrl: 'https://cdn.example/sprite.jpg',
        mediaUrls: [{ url: 'https://cdn.example/master.mp4' }],
        postType: 'video',
        description: 'desc',
        brandName: 'Wizy',
        brandUrl: 'https://wizy.example',
        commercialType: 'brand',
        locationName: 'Midtown AVM',
        locationAddress: 'Atasehir, Istanbul',
        locationLatitude: 40.987654,
        locationLongitude: 29.123456,
        isCommercial: true,
        width: 1080,
        height: 1920,
        processingStatus: 'completed',
    });

    assert.equal(videoPayload.user_id, 'user-1');
    assert.equal(videoPayload.video_url, 'https://cdn.example/master.mp4');
    assert.equal(videoPayload.is_commercial, true);
    assert.equal(videoPayload.location_name, 'Midtown AVM');
    assert.equal(videoPayload.location_address, 'Atasehir, Istanbul');

    const storyPayload = toStoryInsertPayload({
        userId: 'user-2',
        videoUrl: 'https://cdn.example/story.mp4',
        thumbnailUrl: 'https://cdn.example/story-thumb.jpg',
        mediaUrls: [{ url: 'https://cdn.example/story.mp4' }],
        postType: 'video',
        width: 720,
        height: 1280,
        isCommercial: false,
        brandName: null,
        brandUrl: null,
        commercialType: null,
        expiresAt: '2026-03-03T00:00:00.000Z',
    });

    assert.equal(storyPayload.user_id, 'user-2');
    assert.equal(storyPayload.video_url, 'https://cdn.example/story.mp4');
    assert.equal(storyPayload.is_commercial, false);
});

test('draft DTOs validate required inputs and normalize values', () => {
    const queryDto = new ListDraftsQueryDTO({ userId: ' user-1 ' });
    assert.deepEqual(queryDto.toQuery(), { userId: 'user-1' });

    const createDto = new CreateDraftDTO({
        userId: ' user-2 ',
        mediaUri: ' file:///media.mp4 ',
        mediaType: ' video ',
    });
    const createBody = createDto.toBody();
    assert.equal(createBody.userId, 'user-2');
    assert.equal(createBody.mediaUri, 'file:///media.mp4');
    assert.equal(createBody.mediaType, 'video');

    assert.throws(
        () => new UpdateDraftDTO({ tags: 'bad' }).toBody(),
        (error) => error?.statusCode === 400 && error.message === 'tags must be an array when provided'
    );
});

test('subtitle and video param DTOs normalize trimmed values', () => {
    assert.deepEqual(
        new VideoIdParamDTO({ id: ' vid-1 ' }).toParams(),
        { id: 'vid-1' }
    );

    assert.deepEqual(
        new SubtitleListQueryDTO({ language: ' tr ' }).toQuery(),
        { language: 'tr' }
    );

    assert.deepEqual(
        new GenerateSubtitlesDTO({ language: ' en ' }).toBody(),
        { language: 'en' }
    );

    assert.deepEqual(
        new DeleteSubtitleQueryDTO({ subtitleId: ' sub-1 ', language: ' auto ' }).toQuery(),
        { subtitleId: 'sub-1', language: 'auto' }
    );

    assert.throws(
        () => new VideoIdParamDTO({ id: '   ' }).toParams(),
        (error) => error?.statusCode === 400 && error.message === 'video id is required'
    );
});
