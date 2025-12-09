// KARŞILAŞTIRMA: Mevcut MP4 vs HLS Pipeline

const ffmpeg = require('fluent-ffmpeg');

// ================================
// MEVCUT: Tek MP4 dosyası (server.js satır 73-93)
// ================================
async function processVideoToMP4(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions('-movflags +faststart')
            .outputOptions('-c:v libx264')
            .outputOptions('-preset fast')
            .outputOptions('-crf 23')
            .outputOptions('-vf scale=720:-2')
            .outputOptions('-c:a aac')
            .outputOptions('-b:a 128k')
            .save(outputPath)  // ← output.mp4
            .on('progress', (progress) => {
                console.log(`🔄 ${progress.percent?.toFixed(1)}%`);
            })
            .on('end', () => {
                console.log('✅ MP4 oluşturuldu');
                resolve();
            })
            .on('error', reject);
    });
}

// ================================
// YENİ: HLS Segmentleri (AYNI FFMpeg!)
// ================================
async function processVideoToHLS(inputPath, outputDir, baseFileName) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                // Aynı kalite ayarları
                '-c:v libx264',
                '-preset fast',
                '-crf 23',
                '-vf scale=720:-2',
                '-c:a aac',
                '-b:a 128k',

                // HLS'e özel ayarlar
                '-f hls',                              // HLS formatı
                '-hls_time 6',                         // Her segment 6 saniye
                '-hls_list_size 0',                    // Tüm segmentleri listele (VOD için)
                '-hls_flags independent_segments',     // Her segment bağımsız oynatılabilir
                '-hls_segment_type mpegts',            // .ts dosyaları
                `-hls_segment_filename`, `${outputDir}/${baseFileName}_%03d.ts`
            ])
            .save(`${outputDir}/${baseFileName}.m3u8`)  // ← playlist.m3u8
            .on('progress', (progress) => {
                console.log(`🔄 ${progress.percent?.toFixed(1)}%`);
            })
            .on('end', () => {
                console.log('✅ HLS segmentleri oluşturuldu');
                resolve();
            })
            .on('error', reject);
    });
}

// ================================
// BONUS: Adaptive Bitrate HLS (Çoklu kalite)
// ================================
async function processVideoToAdaptiveHLS(inputPath, outputDir, baseFileName) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                // 720p variant
                '-map 0:v:0', '-map 0:a:0',
                '-c:v:0 libx264', '-b:v:0 2800k',
                '-s:v:0 1280x720',
                '-c:a:0 aac', '-b:a:0 128k',

                // 480p variant
                '-map 0:v:0', '-map 0:a:0',
                '-c:v:1 libx264', '-b:v:1 1400k',
                '-s:v:1 854x480',
                '-c:a:1 aac', '-b:a:1 96k',

                // 360p variant
                '-map 0:v:0', '-map 0:a:0',
                '-c:v:2 libx264', '-b:v:2 800k',
                '-s:v:2 640x360',
                '-c:a:2 aac', '-b:a:2 64k',

                // HLS ayarları
                '-f hls',
                '-hls_time 6',
                '-hls_list_size 0',
                '-hls_flags independent_segments',
                `-var_stream_map`, 'v:0,a:0 v:1,a:1 v:2,a:2',
                `-hls_segment_filename`, `${outputDir}/${baseFileName}_%v_%03d.ts`,
                `-master_pl_name`, `${baseFileName}_master.m3u8`
            ])
            .save(`${outputDir}/${baseFileName}_%v.m3u8`)
            .on('end', () => {
                console.log('✅ Adaptive HLS oluşturuldu (3 kalite seviyesi)');
                resolve();
            })
            .on('error', reject);
    });
}

// ================================
// ÖRNEK KULLANIM
// ================================

console.log(`
📊 FFMPEG İLE 3 FARKLI YÖNTEM:

1️⃣ TEK MP4:
   processVideoToMP4('input.mp4', 'output.mp4')
   → Sonuç: output.mp4 (10 MB)

2️⃣ HLS (Tek kalite):
   processVideoToHLS('input.mp4', 'videos/abc123', 'video')
   → Sonuç:
     videos/abc123/video.m3u8
     videos/abc123/video_000.ts (200 KB)
     videos/abc123/video_001.ts (200 KB)
     ...

3️⃣ ADAPTIVE HLS (Çoklu kalite):
   processVideoToAdaptiveHLS('input.mp4', 'videos/abc123', 'video')
   → Sonuç:
     videos/abc123/video_master.m3u8      (ana playlist)
     videos/abc123/video_0.m3u8           (720p playlist)
     videos/abc123/video_1.m3u8           (480p playlist)
     videos/abc123/video_2.m3u8           (360p playlist)
     videos/abc123/video_0_000.ts         (720p segment 1)
     videos/abc123/video_1_000.ts         (480p segment 1)
     ...
`);

module.exports = {
    processVideoToMP4,
    processVideoToHLS,
    processVideoToAdaptiveHLS
};
