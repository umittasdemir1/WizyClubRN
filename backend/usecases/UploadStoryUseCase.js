const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { STORY_RETENTION_MS } = require('../config/constants');
const { toStoryInsertPayload } = require('../mappers/storyMapper');
const { createHttpError } = require('../utils/httpError');

class UploadStoryUseCase {
    constructor({
        mediaProcessingService,
        storageAdapter,
        createStoryRepository,
        safeParseJsonArray,
        logLine,
        logBanner,
    }) {
        this.mediaProcessingService = mediaProcessingService;
        this.storageAdapter = storageAdapter;
        this.createStoryRepository = createStoryRepository;
        this.safeParseJsonArray = safeParseJsonArray;
        this.logLine = logLine;
        this.logBanner = logBanner;
    }

    async execute({ files, body, dbClient, authenticatedUserId, thumbnailFile }) {
        const { userId, brandName, brandUrl, commercialType, taggedPeople, coverIndex } = body || {};
        const parsedTaggedPeople = this.safeParseJsonArray(taggedPeople, [], (error) => {
            this.logLine('WARN', 'TAGS', 'Failed to parse taggedPeople payload', {
                error: error?.message || error,
            });
        });
        const parsedCoverIndex = Number.parseInt(String(coverIndex ?? '0'), 10);
        const safeCoverIndex = Number.isFinite(parsedCoverIndex) && parsedCoverIndex >= 0 ? parsedCoverIndex : 0;

        if (!files || files.length === 0) {
            throw createHttpError(400, 'No files provided');
        }

        const effectiveUserId = authenticatedUserId || userId;
        if (!effectiveUserId) {
            throw createHttpError(400, 'User ID is required');
        }

        if (authenticatedUserId && userId && userId !== authenticatedUserId) {
            this.logLine('WARN', 'STORY', 'Request userId mismatch, using token user', {
                bodyUserId: userId,
                tokenUserId: authenticatedUserId,
            });
        }

        const uniqueId = uuidv4();
        const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');

        this.logBanner('STORY UPLOAD REQUEST', [
            `Upload ID  : ${uniqueId}`,
            `User ID    : ${effectiveUserId}`,
            `Item Count : ${files.length}`,
            `Post Type  : ${isCarousel ? 'carousel' : 'video'}`,
        ]);

        const storyRepository = this.createStoryRepository(dbClient);
        const tempPathsToCleanup = new Set();
        if (thumbnailFile?.path) {
            tempPathsToCleanup.add(thumbnailFile.path);
        }
        let customThumbnailConsumed = false;
        const uploadCustomThumbnailIfSelected = async (itemIndex, baseKey) => {
            if (
                customThumbnailConsumed
                || !thumbnailFile?.path
                || itemIndex !== safeCoverIndex
            ) {
                return '';
            }

            customThumbnailConsumed = true;
            const customThumbnailMimeType =
                typeof thumbnailFile.mimetype === 'string' && thumbnailFile.mimetype.startsWith('image/')
                    ? thumbnailFile.mimetype
                    : 'image/jpeg';

            const customThumbUrl = await this.storageAdapter.upload(
                thumbnailFile.path,
                `${baseKey}/thumb.jpg`,
                customThumbnailMimeType
            );

            if (fs.existsSync(thumbnailFile.path)) {
                fs.unlinkSync(thumbnailFile.path);
            }
            tempPathsToCleanup.delete(thumbnailFile.path);

            return customThumbUrl;
        };

        try {
            const mediaUrls = [];
            let firstThumbUrl = '';
            let finalWidth = 1080;
            let finalHeight = 1920;
            let portraitBase = { width: 0, height: 0 };

            for (let i = 0; i < files.length; i += 1) {
                const file = files[i];
                const isVideo = file.mimetype.startsWith('video/');
                const indexLabel = files.length > 1 ? `_${i}` : '';
                const baseKey = `media/${effectiveUserId}/stories/${uniqueId}${indexLabel}`;
                const inputPath = file.path;

                if (isVideo) {
                    const metadata = await this.mediaProcessingService.probeMetadata(inputPath);
                    const { width, height } = this.mediaProcessingService.extractDimensionsFromProbe(metadata);

                    const videoKey = `${baseKey}/story.mp4`;
                    const storyUrl = await this.storageAdapter.upload(inputPath, videoKey, file.mimetype);

                    const thumbPath = path.join(os.tmpdir(), `${uniqueId}_${i}_thumb.jpg`);
                    tempPathsToCleanup.add(thumbPath);
                    await this.mediaProcessingService.generateThumbnail(inputPath, thumbPath);

                    const thumbKey = `${baseKey}/thumb.jpg`;
                    const customThumbUrl = await uploadCustomThumbnailIfSelected(i, baseKey);
                    const thumbnailUrl = customThumbUrl || await this.storageAdapter.upload(
                        thumbPath,
                        thumbKey,
                        'image/jpeg'
                    );
                    const thumbDims = await this.mediaProcessingService.safeProbeDimensions(thumbPath);
                    const normalizedSourceDims = this.mediaProcessingService.normalizeDimensionsWithReference(
                        { width, height },
                        thumbDims
                    );
                    const safeWidth = normalizedSourceDims.width || thumbDims.width || width || 1080;
                    const safeHeight = normalizedSourceDims.height || thumbDims.height || height || 1920;
                    portraitBase = this.mediaProcessingService.pickMostPortrait(portraitBase, {
                        width: safeWidth,
                        height: safeHeight,
                    });

                    this.logLine('INFO', 'STORY_DIM', 'Story media dimensions', {
                        source: `${width}x${height}`,
                        thumb: `${thumbDims.width}x${thumbDims.height}`,
                        normalized: `${safeWidth}x${safeHeight}`,
                    });

                    if (i === safeCoverIndex) {
                        firstThumbUrl = thumbnailUrl;
                    }

                    mediaUrls.push({
                        url: storyUrl,
                        type: 'video',
                        thumbnail: thumbnailUrl,
                        width: safeWidth,
                        height: safeHeight,
                    });

                    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
                    tempPathsToCleanup.delete(thumbPath);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    continue;
                }

                const { width, height } = await this.mediaProcessingService.safeProbeDimensions(inputPath);
                portraitBase = this.mediaProcessingService.pickMostPortrait(portraitBase, { width, height });
                const imageKey = `${baseKey}/story.jpg`;
                const imageUrl = await this.storageAdapter.upload(inputPath, imageKey, file.mimetype);
                const customThumbUrl = await uploadCustomThumbnailIfSelected(i, baseKey);

                if (i === safeCoverIndex) firstThumbUrl = customThumbUrl || imageUrl;
                mediaUrls.push({ url: imageUrl, type: 'image', width, height });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }

            if (thumbnailFile?.path) {
                tempPathsToCleanup.delete(thumbnailFile.path);
                if (fs.existsSync(thumbnailFile.path)) {
                    fs.unlinkSync(thumbnailFile.path);
                }
            }

            if (portraitBase.width && portraitBase.height) {
                finalWidth = portraitBase.width;
                finalHeight = portraitBase.height;
            }

            if (!firstThumbUrl && mediaUrls[safeCoverIndex]?.thumbnail) {
                firstThumbUrl = mediaUrls[safeCoverIndex].thumbnail;
            }

            const isCommercial = commercialType && commercialType !== 'Ä°ÅŸ BirliÄŸi Ä°Ã§ermiyor';
            const expiresAt = new Date(Date.now() + STORY_RETENTION_MS).toISOString();

            const uploadedStory = await storyRepository.createStory(toStoryInsertPayload({
                userId: effectiveUserId,
                videoUrl: mediaUrls[0].url,
                thumbnailUrl: firstThumbUrl,
                mediaUrls,
                postType: isCarousel ? 'carousel' : 'video',
                width: finalWidth,
                height: finalHeight,
                isCommercial,
                brandName,
                brandUrl,
                commercialType,
                expiresAt,
            }));
            if (!uploadedStory?.id) {
                throw new Error('Story row was not returned after insert');
            }

            if (parsedTaggedPeople.length > 0) {
                try {
                    await storyRepository.addStoryTags(uploadedStory.id, parsedTaggedPeople);
                } catch (error) {
                    this.logLine('WARN', 'TAGS', 'Failed to insert story tags', {
                        error: error?.message || error,
                        storyId: uploadedStory.id,
                    });
                }
            }

            return uploadedStory;
        } catch (error) {
            this.logLine('ERR', 'STORY', 'Story upload failed', {
                error: error?.message || error,
                uploadId: uniqueId,
            });
            if (files) {
                files.forEach((file) => {
                    if (file?.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
            for (const tempPath of tempPathsToCleanup) {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }
            throw error;
        }
    }
}

module.exports = UploadStoryUseCase;
