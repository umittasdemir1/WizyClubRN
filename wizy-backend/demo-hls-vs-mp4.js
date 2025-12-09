// DEMO: FFMpeg ile MP4 vs HLS karşılaştırması
// Bu dosyayı çalıştırmak için: node demo-hls-vs-mp4.js test-video.mp4

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const inputVideo = process.argv[2];

if (!inputVideo || !fs.existsSync(inputVideo)) {
    console.error('❌ Kullanım: node demo-hls-vs-mp4.js <video-dosyası>');
    process.exit(1);
}

console.log('🎬 Demo başlıyor...\n');

// 1️⃣ MEVCUT YÖNTEMİ TEST ET: Tek MP4
console.log('📦 1) TEK MP4 DOSYASI OLUŞTURULUYOR...');
ffmpeg(inputVideo)
    .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 23',
        '-vf scale=720:-2',
        '-c:a aac'
    ])
    .save('output-standard.mp4')
    .on('end', () => {
        const size = fs.statSync('output-standard.mp4').size / 1024 / 1024;
        console.log(`   ✅ Oluşturuldu: output-standard.mp4 (${size.toFixed(2)} MB)`);
        console.log(`   📄 Dosya sayısı: 1 adet\n`);

        // 2️⃣ HLS YÖNTEMİNİ TEST ET: Segmentler
        console.log('📦 2) HLS SEGMENTLERİ OLUŞTURULUYOR...');
        ffmpeg(inputVideo)
            .outputOptions([
                '-c:v libx264',
                '-preset fast',
                '-crf 23',
                '-vf scale=720:-2',
                '-c:a aac',
                // HLS parametreleri
                '-f hls',
                '-hls_time 6',
                '-hls_list_size 0',
                '-hls_segment_filename', 'hls-output/segment_%03d.ts'
            ])
            .save('hls-output/playlist.m3u8')
            .on('start', (cmd) => {
                console.log(`   🔧 FFMpeg komutu:\n   ${cmd.substring(0, 100)}...\n`);
            })
            .on('end', () => {
                const files = fs.readdirSync('hls-output');
                const segments = files.filter(f => f.endsWith('.ts'));
                const totalSize = files.reduce((sum, f) => {
                    return sum + fs.statSync(`hls-output/${f}`).size;
                }, 0) / 1024 / 1024;

                console.log(`   ✅ Oluşturuldu: ${files.length} dosya`);
                console.log(`   📄 Segmentler: ${segments.length} adet (.ts dosyaları)`);
                console.log(`   📄 Playlist: playlist.m3u8`);
                console.log(`   💾 Toplam boyut: ${totalSize.toFixed(2)} MB\n`);

                console.log('📊 KARŞILAŞTIRMA:');
                console.log(`   MP4:  1 dosya, oynatma başlamadan tümü indirilir`);
                console.log(`   HLS:  ${segments.length} segment, ilk 2 segment ile başlar (${(2 * totalSize / segments.length).toFixed(2)} MB)`);

                console.log('\n✨ playlist.m3u8 içeriği:');
                console.log('─'.repeat(50));
                console.log(fs.readFileSync('hls-output/playlist.m3u8', 'utf8'));
            })
            .on('error', (err) => {
                console.error('❌ HLS hatası:', err.message);
            });
    })
    .on('error', (err) => {
        console.error('❌ MP4 hatası:', err.message);
    });

// Klasör oluştur
if (!fs.existsSync('hls-output')) {
    fs.mkdirSync('hls-output');
}
