require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ffprobeStatic = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfprobePath(ffprobeStatic);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in environment.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PAGE_SIZE = 100;

function extractDimensionsFromProbe(metadata) {
    if (!metadata || !Array.isArray(metadata.streams)) {
        return { width: 0, height: 0 };
    }
    const stream =
        metadata.streams.find(s => s.codec_type === 'video' && s.width && s.height) ||
        metadata.streams.find(s => s.width && s.height);
    let width = stream?.width || 0;
    let height = stream?.height || 0;
    const rotation = stream?.tags && stream.tags.rotate ? parseInt(stream.tags.rotate, 10) : 0;
    if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
        [width, height] = [height, width];
    }
    return { width, height };
}

function pickMostPortrait(current, candidate) {
    if (!candidate?.width || !candidate?.height) return current;
    if (!current?.width || !current?.height) return candidate;
    const currentRatio = current.width / current.height;
    const candidateRatio = candidate.width / candidate.height;
    return candidateRatio < currentRatio ? candidate : current;
}

async function downloadToTemp(url) {
    const fileName = `probe_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const filePath = path.join(os.tmpdir(), fileName);

    const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        timeout: 20000,
    });

    await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    return filePath;
}

async function probeUrl(url) {
    let tempPath;
    try {
        tempPath = await downloadToTemp(url);
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg(tempPath).ffprobe((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        return extractDimensionsFromProbe(metadata);
    } catch (error) {
        console.warn(`⚠️ [PROBE] Failed for ${url}:`, error?.message || error);
        return { width: 0, height: 0 };
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
}

async function updateCarouselDimensions() {
    console.log('🔎 Fetching carousel posts...');
    let from = 0;
    let updated = 0;
    let scanned = 0;

    while (true) {
        const { data, error } = await supabase
            .from('videos')
            .select('id, media_urls, width, height, created_at')
            .eq('post_type', 'carousel')
            .order('created_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error('❌ Error fetching videos:', error);
            break;
        }

        if (!data || data.length === 0) break;

        for (const video of data) {
            scanned += 1;
            const mediaUrls = Array.isArray(video.media_urls) ? video.media_urls : [];
            if (mediaUrls.length === 0) {
                console.log(`⏭️  Skip ${video.id} (no media_urls)`);
                continue;
            }

            let portraitBase = { width: 0, height: 0 };
            for (const media of mediaUrls) {
                if (media?.width && media?.height) {
                    portraitBase = pickMostPortrait(portraitBase, { width: media.width, height: media.height });
                    continue;
                }

                const probeTarget = media?.type === 'video' && media?.thumbnail ? media.thumbnail : media?.url;
                if (!probeTarget) continue;

                const { width, height } = await probeUrl(probeTarget);
                portraitBase = pickMostPortrait(portraitBase, { width, height });
            }

            if (!portraitBase.width || !portraitBase.height) {
                console.log(`⚠️  Skip ${video.id} (no dimensions)`);
                continue;
            }

            if (video.width === portraitBase.width && video.height === portraitBase.height) {
                continue;
            }

            const { error: updateError } = await supabase
                .from('videos')
                .update({ width: portraitBase.width, height: portraitBase.height })
                .eq('id', video.id);

            if (updateError) {
                console.error(`❌ Update failed for ${video.id}:`, updateError);
            } else {
                updated += 1;
                console.log(`✅ Updated ${video.id} -> ${portraitBase.width}x${portraitBase.height}`);
            }
        }

        from += PAGE_SIZE;
    }

    console.log(`\n✅ Done. Scanned: ${scanned}, Updated: ${updated}`);
}

updateCarouselDimensions();
