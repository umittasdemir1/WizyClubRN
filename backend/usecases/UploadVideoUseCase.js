const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { toVideoInsertPayload } = require('../mappers/videoMapper');
const { createHttpError } = require('../utils/httpError');

class UploadVideoUseCase {
    constructor({
        mediaProcessingService,
        storageAdapter,
        hlsService,
        createVideoRepository,
        safeParseJsonArray,
        normalizeSubtitlePresentationInput,
        normalizeSubtitleStyleInput,
        subtitleGenerationService,
        uploadProgressService,
        logLine,
        logBanner,
        tempOutputDir,
    }) {
        this.mediaProcessingService = mediaProcessingService;
        this.storageAdapter = storageAdapter;
        this.hlsService = hlsService;
        this.createVideoRepository = createVideoRepository;
        this.safeParseJsonArray = safeParseJsonArray;
        this.normalizeSubtitlePresentationInput = normalizeSubtitlePresentationInput;
        this.normalizeSubtitleStyleInput = normalizeSubtitleStyleInput;
        this.subtitleGenerationService = subtitleGenerationService;
        this.uploadProgressService = uploadProgressService;
        this.logLine = logLine;
        this.logBanner = logBanner;
        this.tempOutputDir = tempOutputDir;
    }

    async execute({ files, body, dbClient }) {
        const {
            userId,
            description,
            brandName,
            brandUrl,
            commercialType,
            trimStartSec,
            trimEndSec,
            qualityPreset,
            coverIndex,
            subtitleLanguage,
            manualSubtitles,
            locationName,
            locationAddress,
            locationLatitude,
            locationLongitude,
            taggedPeople,
            tags,
        } = body || {};

        const parsedTags = this.safeParseJsonArray(tags)
            .filter((tag) => typeof tag === 'string' && tag.trim())
            .map((tag) => tag.trim().toLowerCase());

        const parsedTaggedPeople = this.safeParseJsonArray(taggedPeople, [], (error) => {
            this.logLine('WARN', 'TAGS', 'Failed to parse taggedPeople payload', { error: error?.message || error });
        });

        const parsedCoverIndex = Number.parseInt(String(coverIndex ?? '0'), 10);
        const safeCoverIndex = Number.isFinite(parsedCoverIndex) && parsedCoverIndex >= 0 ? parsedCoverIndex : 0;
        const parsedTrimStartSec = Number.parseFloat(String(trimStartSec ?? '0'));
        const parsedTrimEndSec = Number.parseFloat(String(trimEndSec ?? '0'));
        const parsedLocationLatitude = Number.parseFloat(String(locationLatitude ?? ''));
        const parsedLocationLongitude = Number.parseFloat(String(locationLongitude ?? ''));
        const normalizedLocationName =
            typeof locationName === 'string' && locationName.trim() ? locationName.trim() : null;
        const normalizedLocationAddress =
            typeof locationAddress === 'string' && locationAddress.trim() ? locationAddress.trim() : null;
        const normalizedLocationLatitude = Number.isFinite(parsedLocationLatitude)
            ? parsedLocationLatitude
            : null;
        const normalizedLocationLongitude = Number.isFinite(parsedLocationLongitude)
            ? parsedLocationLongitude
            : null;
        const hasTrimRange =
            Number.isFinite(parsedTrimStartSec)
            && Number.isFinite(parsedTrimEndSec)
            && parsedTrimStartSec >= 0
            && parsedTrimEndSec > parsedTrimStartSec;

        const normalizedQualityPreset = String(qualityPreset || 'medium').toLowerCase();
        const qualityMap = {
            low: { crf: 30, preset: 'veryfast' },
            medium: { crf: 26, preset: 'veryfast' },
            high: { crf: 22, preset: 'faster' },
        };
        const qualityConfig = qualityMap[normalizedQualityPreset] || qualityMap.medium;
        const normalizedSubtitleLanguage =
            typeof subtitleLanguage === 'string' && subtitleLanguage.trim()
                ? subtitleLanguage.trim()
                : 'auto';
        const parsedManualSubtitles = this.safeParseJsonArray(manualSubtitles, [], (error) => {
            this.logLine('WARN', 'SUBTITLE', 'Failed to parse manualSubtitles payload', {
                error: error?.message || error,
            });
        });

        if (!files || files.length === 0) {
            throw createHttpError(400, 'No files provided');
        }

        const normalizedUserId = userId || 'test-user';
        const isCommercial = commercialType && commercialType !== 'Ä°ÅŸ BirliÄŸi Ä°Ã§ermiyor';
        const uniqueId = uuidv4();
        const isCarousel = files.length > 1 || files[0].mimetype.startsWith('image/');
        const videoRepository = this.createVideoRepository(dbClient);

        this.logBanner('UPLOAD REQUEST', [
            `Upload ID  : ${uniqueId}`,
            `User ID    : ${normalizedUserId}`,
            `Item Count : ${files.length}`,
            `Post Type  : ${isCarousel ? 'carousel' : 'video'}`,
        ]);

        let phase = 'init';
        const tempPathsToCleanup = new Set();

        try {
            const mediaUrls = [];
            let firstThumbUrl = '';
            let firstSpriteUrl = '';
            let finalWidth = 1080;
            let finalHeight = 1920;
            let portraitBase = { width: 0, height: 0 };

            for (let i = 0; i < files.length; i += 1) {
                const file = files[i];
                const isVideo = file.mimetype.startsWith('video/');
                const indexLabel = files.length > 1 ? `_${i}` : '';
                const baseKey = `media/${normalizedUserId}/posts/${uniqueId}${indexLabel}`;
                const inputPath = file.path;
                let sourcePath = inputPath;

                this.uploadProgressService.set(
                    uniqueId,
                    `item_${i}`,
                    10 + Math.floor((i / files.length) * 80)
                );

                if (isVideo) {
                    phase = `item_${i}_video_probe`;
                    if (files.length === 1 && hasTrimRange) {
                        const trimmedPath = path.join(this.tempOutputDir, `trimmed_${uniqueId}_${i}.mp4`);
                        tempPathsToCleanup.add(trimmedPath);
                        phase = `item_${i}_trim`;
                        await this.mediaProcessingService.trimVideo(
                            inputPath,
                            trimmedPath,
                            parsedTrimStartSec,
                            parsedTrimEndSec - parsedTrimStartSec
                        );
                        sourcePath = trimmedPath;
                    }

                    const metadata = await this.mediaProcessingService.probeMetadata(sourcePath);
                    const { width, height } = this.mediaProcessingService.extractDimensionsFromProbe(metadata);
                    const duration = parseFloat(metadata.format.duration || 0);

                    const processedThumbPath = path.join(this.tempOutputDir, `thumb_${uniqueId}_${i}.jpg`);
                    tempPathsToCleanup.add(processedThumbPath);
                    phase = `item_${i}_thumb_generate`;
                    await this.mediaProcessingService.generateThumbnail(sourcePath, processedThumbPath, {
                        size: '1080x?',
                        qualityOptions: ['-q:v 2'],
                    });

                    const thumbDims = await this.mediaProcessingService.safeProbeDimensions(processedThumbPath);
                    const normalizedSourceDims = this.mediaProcessingService.normalizeDimensionsWithReference(
                        { width, height },
                        thumbDims
                    );
                    const safeWidth = normalizedSourceDims.width || thumbDims.width || width || 1080;
                    const safeHeight = normalizedSourceDims.height || thumbDims.height || height || 1920;

                    phase = `item_${i}_thumb_upload`;
                    const thumbUrl = await this.storageAdapter.upload(
                        processedThumbPath,
                        `${baseKey}/thumb.jpg`,
                        'image/jpeg'
                    );
                    if (i === safeCoverIndex) firstThumbUrl = thumbUrl;

                    const optimizedPath = path.join(this.tempOutputDir, `optimized_${uniqueId}_${i}.mp4`);
                    tempPathsToCleanup.add(optimizedPath);
                    phase = `item_${i}_video_optimize`;
                    await this.mediaProcessingService.optimizeVideo(sourcePath, optimizedPath, {
                        width: safeWidth,
                        height: safeHeight,
                        crf: qualityConfig.crf,
                        preset: qualityConfig.preset,
                    });

                    phase = `item_${i}_video_upload`;
                    const videoUrl = await this.storageAdapter.upload(
                        optimizedPath,
                        `${baseKey}/master.mp4`,
                        'video/mp4'
                    );
                    const optimizedDims = await this.mediaProcessingService.safeProbeDimensions(optimizedPath);
                    const outputWidth = optimizedDims.width || safeWidth;
                    const outputHeight = optimizedDims.height || safeHeight;
                    portraitBase = this.mediaProcessingService.pickMostPortrait(portraitBase, {
                        width: outputWidth,
                        height: outputHeight,
                    });

                    this.logLine('INFO', 'UPLOAD_DIM', 'Post media dimensions', {
                        source: `${width}x${height}`,
                        thumb: `${thumbDims.width}x${thumbDims.height}`,
                        normalized: `${safeWidth}x${safeHeight}`,
                        output: `${outputWidth}x${outputHeight}`,
                    });

                    let spriteUrl = '';
                    if (i === 0) {
                        phase = `item_${i}_sprite_generate_upload`;
                        spriteUrl = await this.hlsService.generateSpriteSheet(
                            sourcePath,
                            this.tempOutputDir,
                            uniqueId,
                            baseKey,
                            duration
                        );
                        this.logLine('OK', 'SPRITE', 'Sprite sheet uploaded', { uploadId: uniqueId, spriteUrl });
                        firstSpriteUrl = spriteUrl;
                    }

                    mediaUrls.push({
                        url: videoUrl,
                        type: 'video',
                        thumbnail: thumbUrl,
                        sprite: spriteUrl,
                        width: outputWidth,
                        height: outputHeight,
                    });

                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (sourcePath !== inputPath && fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
                    if (fs.existsSync(processedThumbPath)) fs.unlinkSync(processedThumbPath);
                    if (fs.existsSync(optimizedPath)) fs.unlinkSync(optimizedPath);
                    tempPathsToCleanup.delete(processedThumbPath);
                    tempPathsToCleanup.delete(optimizedPath);
                    if (sourcePath !== inputPath) {
                        tempPathsToCleanup.delete(sourcePath);
                    }
                    continue;
                }

                phase = `item_${i}_image_probe`;
                const { width, height } = await this.mediaProcessingService.safeProbeDimensions(inputPath);
                portraitBase = this.mediaProcessingService.pickMostPortrait(portraitBase, { width, height });
                const imageKey = `${baseKey}/image.jpg`;
                phase = `item_${i}_image_upload`;
                const imageUrl = await this.storageAdapter.upload(inputPath, imageKey, file.mimetype);

                if (i === safeCoverIndex) {
                    firstThumbUrl = imageUrl;
                }

                mediaUrls.push({ url: imageUrl, type: 'image', width, height });
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            }

            if (portraitBase.width && portraitBase.height) {
                finalWidth = portraitBase.width;
                finalHeight = portraitBase.height;
            }

            if (!firstThumbUrl && mediaUrls[safeCoverIndex]?.thumbnail) {
                firstThumbUrl = mediaUrls[safeCoverIndex].thumbnail;
            }

            phase = 'db_insert_video';
            this.logLine('INFO', 'UPLOAD_DB', 'Inserting uploaded media row', {
                uploadId: uniqueId,
                postType: isCarousel ? 'carousel' : 'video',
                mediaCount: mediaUrls.length,
            });

            const uploadedVideo = await videoRepository.createVideo(toVideoInsertPayload({
                userId: normalizedUserId,
                videoUrl: mediaUrls[0].url,
                thumbnailUrl: firstThumbUrl,
                spriteUrl: firstSpriteUrl,
                mediaUrls,
                postType: isCarousel ? 'carousel' : 'video',
                description,
                brandName,
                brandUrl,
                commercialType,
                locationName: normalizedLocationName,
                locationAddress: normalizedLocationAddress,
                locationLatitude: normalizedLocationLatitude,
                locationLongitude: normalizedLocationLongitude,
                isCommercial,
                width: finalWidth,
                height: finalHeight,
                processingStatus: 'completed',
            }));

            if (!uploadedVideo?.id) {
                throw new Error('Video row was not returned after insert');
            }

            if (
                uploadedVideo.post_type === 'video'
                && Array.isArray(parsedManualSubtitles)
                && parsedManualSubtitles.length > 0
            ) {
                const firstManual = parsedManualSubtitles.find((entry) => Number(entry?.index) === 0)
                    || parsedManualSubtitles[0];
                const rawSegments = Array.isArray(firstManual?.segments) ? firstManual.segments : [];
                const normalizedSegments = rawSegments
                    .map((segment) => ({
                        startMs: Number(segment?.startMs) || 0,
                        endMs: Number(segment?.endMs) || 0,
                        text: String(segment?.text || '').trim(),
                    }))
                    .filter((segment) => segment.endMs > segment.startMs && segment.text.length > 0);

                const normalizedPresentation = this.normalizeSubtitlePresentationInput(firstManual?.presentation);
                const normalizedStyle = this.normalizeSubtitleStyleInput(firstManual?.style);

                if (normalizedSegments.length > 0) {
                    const segmentsPayload = {
                        segments: normalizedSegments,
                        presentation: normalizedPresentation,
                        style: normalizedStyle,
                        source: 'manual_upload',
                    };
                    const subtitleLang = typeof firstManual?.language === 'string' && firstManual.language.trim()
                        ? firstManual.language.trim()
                        : normalizedSubtitleLanguage;

                    await videoRepository.upsertSubtitleFromUpload({
                        video_id: uploadedVideo.id,
                        language: subtitleLang,
                        status: 'completed',
                        segments: segmentsPayload,
                        error_message: null,
                        updated_at: new Date().toISOString(),
                    });

                    this.logLine('OK', 'SUBTITLE', 'Manual subtitles saved from upload payload', {
                        videoId: uploadedVideo.id,
                        language: subtitleLang,
                        segments: normalizedSegments.length,
                    });
                }
            } else if (
                uploadedVideo.post_type === 'video'
                && uploadedVideo.video_url
                && this.subtitleGenerationService?.trigger
            ) {
                this.subtitleGenerationService.trigger(
                    uploadedVideo.id,
                    uploadedVideo.video_url,
                    'upload-hls-auto',
                    { language: normalizedSubtitleLanguage }
                );
            }

            if (parsedTags.length > 0) {
                try {
                    const { linkedCount } = await videoRepository.upsertHashtagsForVideo(uploadedVideo.id, parsedTags);
                    if (linkedCount > 0) {
                        this.logLine('OK', 'HASHTAGS', 'Hashtags saved', {
                            videoId: uploadedVideo.id,
                            tags: parsedTags,
                        });
                    }
                } catch (error) {
                    this.logLine('WARN', 'HASHTAGS', 'Hashtag processing failed', {
                        error: error?.message || error,
                        videoId: uploadedVideo.id,
                    });
                }
            }

            if (parsedTaggedPeople.length > 0) {
                try {
                    await videoRepository.addVideoTags(uploadedVideo.id, parsedTaggedPeople);
                } catch (error) {
                    this.logLine('WARN', 'TAGS', 'Failed to insert video tags', {
                        error: error?.message || error,
                        videoId: uploadedVideo.id,
                    });
                }
            }

            phase = 'response_success';
            this.uploadProgressService.set(uniqueId, 'done', 100);
            return {
                uploadId: uniqueId,
                data: uploadedVideo,
            };
        } catch (error) {
            const cause = error?.cause;
            this.logLine('ERR', 'UPLOAD', 'Upload failed', {
                error: error?.message || error,
                code: error?.code,
                cause: cause?.message || cause,
                causeCode: cause?.code,
                stack: error?.stack,
                uploadId: uniqueId,
                phase,
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

module.exports = UploadVideoUseCase;
