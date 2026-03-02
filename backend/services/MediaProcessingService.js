const path = require('path');

function createMediaProcessingService({ ffmpeg, logLine }) {
    function probeMetadata(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg(filePath).ffprobe((err, data) => {
                if (err) return reject(err);
                return resolve(data || {});
            });
        });
    }

    function parseAspectRatioValue(value) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            return value;
        }
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;

        if (trimmed.includes(':')) {
            const [left, right] = trimmed.split(':');
            const num = parseFloat(left);
            const den = parseFloat(right);
            if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
                return num / den;
            }
            return null;
        }

        const parsed = parseFloat(trimmed);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    function parseRotationCandidate(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const parsed = parseFloat(value.trim());
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    }

    function extractRotationFromStream(stream) {
        if (!stream || typeof stream !== 'object') return 0;

        const tagRotation = parseRotationCandidate(stream?.tags?.rotate);
        if (tagRotation != null) return tagRotation;

        const sideDataList = Array.isArray(stream?.side_data_list) ? stream.side_data_list : [];
        for (const sideData of sideDataList) {
            if (!sideData || typeof sideData !== 'object') continue;

            const directRotation = parseRotationCandidate(sideData.rotation);
            if (directRotation != null) return directRotation;

            const displayMatrix = typeof sideData.displaymatrix === 'string' ? sideData.displaymatrix : '';
            if (displayMatrix) {
                const match = displayMatrix.match(/rotation of\s*(-?\d+(?:\.\d+)?)\s*degrees/i);
                if (match) {
                    const parsed = parseFloat(match[1]);
                    if (Number.isFinite(parsed)) return parsed;
                }
            }
        }

        return 0;
    }

    function extractDimensionsFromProbe(metadata) {
        if (!metadata || !Array.isArray(metadata.streams)) {
            return { width: 0, height: 0 };
        }

        const stream =
            metadata.streams.find((entry) => entry.codec_type === 'video' && entry.width && entry.height)
            || metadata.streams.find((entry) => entry.width && entry.height);
        let width = stream?.width || 0;
        let height = stream?.height || 0;

        const rotation = extractRotationFromStream(stream);
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const isQuarterTurn = Math.abs(normalizedRotation - 90) < 1 || Math.abs(normalizedRotation - 270) < 1;

        const displayAspectRatio = parseAspectRatioValue(stream?.display_aspect_ratio);
        const shouldSwapByDisplayAspect =
            displayAspectRatio != null
            && ((displayAspectRatio < 1 && width > height) || (displayAspectRatio > 1 && width < height));

        if (isQuarterTurn || shouldSwapByDisplayAspect) {
            [width, height] = [height, width];
        }

        return { width, height };
    }

    function getOrientation(width, height) {
        if (!width || !height) return 'unknown';
        if (Math.abs(width - height) <= 1) return 'square';
        return width > height ? 'landscape' : 'portrait';
    }

    function normalizeDimensionsWithReference(primary, reference) {
        const primaryWidth = Number(primary?.width) || 0;
        const primaryHeight = Number(primary?.height) || 0;
        const referenceWidth = Number(reference?.width) || 0;
        const referenceHeight = Number(reference?.height) || 0;

        if (!primaryWidth || !primaryHeight) {
            if (referenceWidth && referenceHeight) {
                return { width: referenceWidth, height: referenceHeight };
            }
            return { width: primaryWidth, height: primaryHeight };
        }

        if (!referenceWidth || !referenceHeight) {
            return { width: primaryWidth, height: primaryHeight };
        }

        const primaryOrientation = getOrientation(primaryWidth, primaryHeight);
        const referenceOrientation = getOrientation(referenceWidth, referenceHeight);
        const isOppositeOrientation =
            (primaryOrientation === 'landscape' && referenceOrientation === 'portrait')
            || (primaryOrientation === 'portrait' && referenceOrientation === 'landscape');

        if (isOppositeOrientation) {
            return { width: primaryHeight, height: primaryWidth };
        }

        return { width: primaryWidth, height: primaryHeight };
    }

    function pickMostPortrait(current, candidate) {
        if (!candidate?.width || !candidate?.height) return current;
        if (!current?.width || !current?.height) return candidate;
        const currentRatio = current.width / current.height;
        const candidateRatio = candidate.width / candidate.height;
        return candidateRatio < currentRatio ? candidate : current;
    }

    async function safeProbeDimensions(inputPath) {
        try {
            const metadata = await probeMetadata(inputPath);
            return extractDimensionsFromProbe(metadata);
        } catch (error) {
            if (typeof logLine === 'function') {
                logLine('WARN', 'PROBE', 'Failed to read media dimensions', { error: error?.message || error });
            }
            return { width: 0, height: 0 };
        }
    }

    async function generateThumbnail(inputPath, outputPath, options = {}) {
        const {
            size = '?x480',
            qualityOptions = [],
        } = options;

        return new Promise((resolve, reject) => {
            const outputFolder = path.dirname(outputPath);
            const filename = path.basename(outputPath);
            const command = ffmpeg(inputPath);

            if (qualityOptions.length > 0) {
                command.outputOptions(qualityOptions);
            }

            command
                .screenshots({
                    count: 1,
                    folder: outputFolder,
                    filename,
                    size,
                })
                .on('end', () => resolve(outputPath))
                .on('error', reject);
        });
    }

    async function trimVideo(inputPath, outputPath, startSec, durationSec) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .setStartTime(startSec)
                .setDuration(durationSec)
                .outputOptions(['-c:v libx264', '-c:a aac', '-movflags +faststart', '-pix_fmt yuv420p'])
                .on('end', () => resolve(outputPath))
                .on('error', reject)
                .save(outputPath);
        });
    }

    async function optimizeVideo(inputPath, outputPath, options = {}) {
        const {
            width,
            height,
            crf,
            preset,
        } = options;

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .videoCodec('libx264')
                .size(width > 1080 ? '1080x?' : `${width}x${height}`)
                .outputOptions([
                    `-crf ${crf}`,
                    `-preset ${preset}`,
                    '-movflags +faststart',
                    '-pix_fmt yuv420p',
                ])
                .on('end', () => resolve(outputPath))
                .on('error', reject)
                .save(outputPath);
        });
    }

    return {
        probeMetadata,
        extractDimensionsFromProbe,
        normalizeDimensionsWithReference,
        pickMostPortrait,
        safeProbeDimensions,
        generateThumbnail,
        trimVideo,
        optimizeVideo,
    };
}

module.exports = {
    createMediaProcessingService,
};
