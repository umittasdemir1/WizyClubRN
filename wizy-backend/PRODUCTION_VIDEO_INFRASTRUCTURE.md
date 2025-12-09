# Production-Grade Video Infrastructure: Gerçek Dünya HLS Sistemi

> **Netflix, YouTube, TikTok, Instagram nasıl yapıyor?**
> MVP değil, **milyarlarca stream** için tasarlanmış gerçek altyapı.

---

## 🏗️ FULL ARCHITECTURE: Upload'dan Playback'e

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. UPLOAD & INGESTION                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Mobile App (React Native)                                          │
│      ↓                                                               │
│  [Chunked Upload] (TUS Protocol / Resumable Upload)                │
│      ↓                                                               │
│  Object Storage (S3/R2) - "Ingestion Bucket"                       │
│      ↓                                                               │
│  [Webhook/Event] → Video Processing Queue (SQS/RabbitMQ)           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  2. TRANSCODING & PROCESSING (Heavy Lifting)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Transcoding Service (Seç Birini)                          │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  A) AWS Elemental MediaConvert (Netflix, Prime Video)      │    │
│  │  B) Google Transcoder API (YouTube)                        │    │
│  │  C) Cloudflare Stream (TikTok benzeri)                     │    │
│  │  D) Mux Video (Modern startups)                            │    │
│  │  E) Self-Hosted FFmpeg Cluster (Instagram)                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Input: raw_video.mp4 (1080p, 100MB, H.264)                        │
│      ↓                                                               │
│  Processing Pipeline:                                               │
│  ├─ Video Analysis (duration, codec, resolution, bitrate)          │
│  ├─ Quality Ladder Selection (adaptive bitrate tiers)              │
│  ├─ Parallel Transcoding (8+ workers)                              │
│  │  ├─ 1080p @ 5000 kbps                                           │
│  │  ├─ 720p  @ 2800 kbps                                           │
│  │  ├─ 540p  @ 1400 kbps                                           │
│  │  ├─ 360p  @ 800 kbps                                            │
│  │  └─ 240p  @ 400 kbps                                            │
│  ├─ HLS Segmentation (6s segments, MPEG-TS)                        │
│  ├─ Thumbnail Generation (every 2s, sprite sheet)                  │
│  ├─ Audio Normalization (-14 LUFS)                                 │
│  ├─ Closed Caption Extraction (if available)                       │
│  └─ DRM Encryption (Widevine, FairPlay, PlayReady)                 │
│                                                                      │
│  Output:                                                             │
│  ├─ master.m3u8 (multi-bitrate playlist)                           │
│  ├─ 1080p/playlist.m3u8 + 50x segments (.ts)                       │
│  ├─ 720p/playlist.m3u8 + 50x segments                              │
│  ├─ 360p/playlist.m3u8 + 50x segments                              │
│  ├─ thumbnails.vtt (WebVTT timeline thumbnails)                    │
│  ├─ poster.jpg (cover image)                                       │
│  └─ metadata.json (duration, codecs, bitrates)                     │
│                                                                      │
│  Processing Time: 60 saniye video → 2-5 dakika (paralel)          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  3. STORAGE & DISTRIBUTION                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Origin Storage (S3/R2/GCS)                                         │
│  └─ videos/                                                         │
│     └─ abc123/                                                      │
│        ├─ master.m3u8                                               │
│        ├─ 1080p/ (50 segments, 10MB each = 500MB)                  │
│        ├─ 720p/  (50 segments, 5MB each = 250MB)                   │
│        ├─ 360p/  (50 segments, 2MB each = 100MB)                   │
│        └─ thumbs/ (100 thumbnails, 20KB each = 2MB)                │
│                                                                      │
│  Total Storage: 850MB for 60s video (5 qualities)                  │
│                                                                      │
│  ↓ Sync to CDN                                                      │
│                                                                      │
│  CDN Multi-Tier (Global Edge Network)                              │
│  ┌───────────────────────────────────────────────────────┐         │
│  │  Tier 1: Edge Locations (Cloudflare, Fastly)         │         │
│  │  └─ 200+ locations worldwide                          │         │
│  │     └─ Cache: Hot content (recently accessed)         │         │
│  │                                                        │         │
│  │  Tier 2: Regional Caches                              │         │
│  │  └─ 20+ regions (US-East, EU-West, Asia-Pacific)     │         │
│  │     └─ Cache: Warm content (24h TTL)                  │         │
│  │                                                        │         │
│  │  Tier 3: Origin Shield                                │         │
│  │  └─ Single origin pull (protect storage from load)    │         │
│  └───────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  4. DELIVERY & PLAYBACK                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Client Request Flow:                                               │
│                                                                      │
│  Mobile App (Istanbul, Turkey)                                      │
│      ↓ DNS Resolution                                               │
│  Anycast DNS → Nearest CDN Edge (Istanbul POP)                     │
│      ↓ HTTP Request                                                 │
│  GET /videos/abc123/master.m3u8                                     │
│      ↓                                                               │
│  Edge Cache Check:                                                  │
│  ├─ HIT  → Serve from edge (5ms latency) ✅                        │
│  └─ MISS → Pull from regional (50ms) → Cache for 1 hour           │
│                                                                      │
│  Master Playlist Response:                                          │
│  #EXTM3U                                                            │
│  #EXT-X-VERSION:7                                                   │
│  #EXT-X-INDEPENDENT-SEGMENTS                                        │
│  #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080          │
│  1080p/playlist.m3u8                                                │
│  #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720           │
│  720p/playlist.m3u8                                                 │
│  ...                                                                │
│                                                                      │
│  ↓ Player (ExoPlayer/AVPlayer) Adaptive Logic                      │
│                                                                      │
│  Initial Quality Selection:                                         │
│  ├─ Network Speed Test (first 2 segments)                          │
│  ├─ Device Capability (screen size, hardware decoder)              │
│  ├─ User Preference (data saver mode)                              │
│  └─ Decision: Start with 720p                                      │
│                                                                      │
│  Segment Requests (Progressive):                                    │
│  GET 720p/segment_000.ts → 5MB (from edge cache)                   │
│  GET 720p/segment_001.ts → 5MB                                     │
│  GET 720p/segment_002.ts → 5MB                                     │
│      ↓ Network slows down                                           │
│  ABR Decision: Switch to 540p                                       │
│  GET 540p/segment_003.ts → 3MB (seamless quality change)          │
│                                                                      │
│  Buffering Strategy:                                                │
│  ├─ Initial buffer: 6 seconds (1 segment)                          │
│  ├─ Target buffer: 30 seconds (5 segments)                         │
│  ├─ Max buffer: 60 seconds (10 segments)                           │
│  └─ Rebuffer threshold: 3 seconds                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  5. ANALYTICS & MONITORING                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Real-time Metrics (every segment request):                        │
│  ├─ Video Start Time (VST): Time to first frame                    │
│  ├─ Rebuffer Rate: Buffering events per minute                     │
│  ├─ Quality Distribution: % of playback at each bitrate            │
│  ├─ CDN Cache Hit Rate: Edge vs origin pulls                       │
│  ├─ Error Rate: Playback failures                                  │
│  └─ Completion Rate: % of video watched                            │
│                                                                      │
│  Tools:                                                             │
│  ├─ Datadog / New Relic (infrastructure)                           │
│  ├─ Mux Data / Conviva (QoE monitoring)                            │
│  ├─ Sentry (error tracking)                                        │
│  └─ Custom ClickHouse / BigQuery (analytics DB)                    │
│                                                                      │
│  Alerts:                                                            │
│  ├─ VST > 3s → Slack alert (CDN issue?)                            │
│  ├─ Error rate > 1% → PagerDuty (critical)                         │
│  └─ CDN hit rate < 80% → Investigate cache config                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 TRANSCODING SERVICE KARŞILAŞTIRMASI

### Option 1: **AWS Elemental MediaConvert** (Netflix, Prime Video)

```yaml
Kullanım Senaryosu: Enterprise, yüksek kalite, tam kontrol
Maliyet: $0.0075 / dakika (HD), $0.036 / dakika (4K)
Özellikler:
  - 4K HDR desteği
  - DRM entegrasyonu (Widevine, FairPlay)
  - 20+ output format (HLS, DASH, CMAF)
  - Frame-accurate editing
  - Audio normalization (Dolby)
  - Closed caption support
Entegrasyon: AWS SDK, Lambda trigger
Scale: Sınırsız paralel job
SLA: 99.9% uptime

Örnek Config:
{
  "Queue": "arn:aws:mediaconvert:us-east-1:...:queues/Default",
  "Role": "arn:aws:iam::...:role/MediaConvertRole",
  "Settings": {
    "Inputs": [
      {
        "FileInput": "s3://bucket/raw_video.mp4",
        "VideoSelector": {},
        "AudioSelectors": { "Audio Selector 1": {} }
      }
    ],
    "OutputGroups": [
      {
        "Name": "Apple HLS",
        "OutputGroupSettings": {
          "Type": "HLS_GROUP_SETTINGS",
          "HlsGroupSettings": {
            "SegmentLength": 6,
            "MinSegmentLength": 0,
            "Destination": "s3://bucket/outputs/abc123/",
            "ManifestDurationFormat": "FLOATING_POINT"
          }
        },
        "Outputs": [
          {
            "NameModifier": "_1080p",
            "VideoDescription": {
              "Width": 1920,
              "Height": 1080,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 5000000
                }
              }
            }
          }
        ]
      }
    ]
  }
}

Kod:
const mediaconvert = new MediaConvert({ region: 'us-east-1' });
const job = await mediaconvert.createJob(jobConfig);
// Processing time: 2-3x realtime (60s video → 2 dakika)
```

---

### Option 2: **Cloudflare Stream** (TikTok benzeri, yüksek trafik)

```yaml
Kullanım Senaryosu: Social media, viral content, global scale
Maliyet: $5 / 1000 dakika storage, $1 / 1000 dakika delivery
Özellikler:
  - Otomatik transcoding (single API call)
  - Global CDN dahil (200+ PoP)
  - Watermark, thumbnail generation
  - Analytics dashboard
  - Webhook callbacks
  - Live streaming desteği
Entegrasyon: REST API, TUS upload
Scale: Otomatik, sınırsız
SLA: 100% uptime guarantee (SLA credits)

Örnek:
// 1. Upload video
const response = await fetch(
  'https://api.cloudflare.com/client/v4/accounts/{account_id}/stream',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer {api_token}',
      'Tus-Resumable': '1.0.0',
      'Upload-Length': fileSize
    }
  }
);

// 2. Cloudflare otomatik transcode eder
// 3. HLS playback URL döner (5 dakika içinde)
const videoId = response.uid;
const playbackUrl = `https://customer-{code}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;

// 4. React Native'de kullan
<Video source={{ uri: playbackUrl }} />

Avantajlar:
✅ Zero infrastructure management
✅ CDN + transcoding bundled
✅ Predictable pricing
✅ 5 dakikada production-ready
```

---

### Option 3: **Mux Video** (Modern approach, developer-first)

```yaml
Kullanım Senaryosu: Startups, SaaS, hızlı development
Maliyet: $0.005 / dakika encoding, $0.01 / GB delivery
Özellikler:
  - Video Intelligence (AI thumbnails)
  - Real-time analytics (QoE metrics)
  - DRM, token authentication
  - Webhook events (progress, complete, error)
  - SDK'lar (Node, Python, Ruby, Go)
  - Thumbnail generation (animated GIF)
Entegrasyon: REST API, Next.js plugin
Scale: Otomatik
SLA: 99.9% uptime

Örnek:
// 1. Upload & transcode
const Mux = require('@mux/mux-node');
const { Video } = new Mux(accessToken, secretKey);

const upload = await Video.Uploads.create({
  new_asset_settings: {
    playback_policy: ['public'],
    mp4_support: 'standard',  // Fallback MP4
    max_resolution_tier: '1080p'
  }
});

// 2. Upload video
await uploadToMux(upload.url, videoFile);

// 3. Webhook: video.asset.ready
const asset = await Video.Assets.get(assetId);
const playbackId = asset.playback_ids[0].id;

// 4. Playback URL (HLS + MP4 fallback)
const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;
const mp4Url = `https://stream.mux.com/${playbackId}/high.mp4`;

// 5. Analytics (real-time)
const metrics = await Mux.Data.Metrics.breakdown('video_startup_time', {
  group_by: 'country',
  filters: ['playback_id:' + playbackId]
});

Avantajlar:
✅ Developer experience (best-in-class APIs)
✅ Built-in analytics (QoE monitoring)
✅ AI features (smart thumbnails)
✅ Quick integration (< 1 day)
```

---

### Option 4: **Self-Hosted FFmpeg Cluster** (Instagram, Meta)

```yaml
Kullanım Senaryosu: Maximum control, cost optimization at scale
Maliyet: $0.001 - $0.002 / dakika (EC2 spot instances)
Özellikler:
  - Tam kontrol (custom pipelines)
  - Proprietary codecs (AV1, VP9)
  - Ultra-low latency
  - Custom ML models (content analysis)
  - No vendor lock-in
Entegrasyon: Custom orchestration (Kubernetes)
Scale: Manuel (autoscaling with K8s)
SLA: Self-managed

Mimari:
┌─────────────────────────────────────────────────────────┐
│  Kubernetes Cluster (Transcoding Workers)              │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐    │
│  │  Job Queue (RabbitMQ / SQS)                    │    │
│  │  ├─ Priority: realtime, standard, batch        │    │
│  │  └─ DLQ: Failed jobs                           │    │
│  └────────────────────────────────────────────────┘    │
│           ↓                                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Worker Pods (FFmpeg containers)               │    │
│  │  ├─ CPU-optimized: c6i.4xlarge (16 vCPU)       │    │
│  │  ├─ GPU-accelerated: g4dn.xlarge (NVENC)       │    │
│  │  ├─ Spot instances: 70% cost savings           │    │
│  │  └─ HPA: Scale 10 → 100 pods (traffic-based)  │    │
│  └────────────────────────────────────────────────┘    │
│           ↓                                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  Output to S3 (Multi-region replication)       │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

Dockerfile:
FROM ubuntu:22.04
RUN apt update && apt install -y \
    ffmpeg \
    x264 x265 libvpx-dev libaom-dev \  # Codecs
    nvidia-cuda-toolkit                  # GPU support

COPY worker.py /app/
CMD ["python", "/app/worker.py"]

Worker Logic (worker.py):
import subprocess
import boto3
from redis import Redis

redis = Redis(host='redis')
s3 = boto3.client('s3')

def process_video(job):
    input_path = download_from_s3(job['input_url'])
    output_dir = f'/tmp/{job["video_id"]}'

    # Parallel transcoding (5 qualities)
    profiles = [
        {'height': 1080, 'bitrate': '5000k'},
        {'height': 720,  'bitrate': '2800k'},
        {'height': 540,  'bitrate': '1400k'},
        {'height': 360,  'bitrate': '800k'},
        {'height': 240,  'bitrate': '400k'}
    ]

    for profile in profiles:
        subprocess.run([
            'ffmpeg', '-i', input_path,
            '-c:v', 'libx264', '-preset', 'fast',
            '-crf', '23', '-maxrate', profile['bitrate'],
            '-vf', f"scale=-2:{profile['height']}",
            '-c:a', 'aac', '-b:a', '128k',
            '-f', 'hls', '-hls_time', '6',
            '-hls_segment_filename', f"{output_dir}/{profile['height']}p/seg_%03d.ts",
            f"{output_dir}/{profile['height']}p/playlist.m3u8"
        ])

    # Upload to S3
    upload_directory_to_s3(output_dir, job['output_bucket'])
    redis.publish('transcode_complete', job['video_id'])

# Consume jobs
while True:
    job = redis.blpop('transcode_queue', timeout=60)
    if job:
        process_video(json.loads(job[1]))

Scale at Instagram:
- 500M videos uploaded per day
- 10,000 transcoding workers (Kubernetes)
- Average processing time: 30 seconds per video
- Cost: $0.0015 / minute (spot instances + reserved capacity)
```

---

## 🌍 CDN STRATEGY: Global Delivery

### Tier 1: Edge CDN (Cloudflare, Fastly, AWS CloudFront)

```yaml
Purpose: Serve hot content (viral videos, recent uploads)
Locations: 200+ PoPs worldwide
Cache TTL: 1 hour for segments, 5 minutes for playlists
Cache Key: video_id + quality + segment_number
Cache Hit Rate: 95%+ (for popular content)

Config (Cloudflare):
Rules:
  - Cache Level: Everything
  - Edge TTL: 1 hour
  - Browser TTL: 10 minutes
  - Cache Key:
      - URL path
      - Query string: ignore
      - Cookie: ignore (public videos)
  - Origin Shield: Enable (single origin pull)
  - Argo Smart Routing: Enable (30% faster)

Header Response:
HTTP/2 200 OK
CF-Cache-Status: HIT
CF-Ray: 7a1b2c3d4e5f6g7h-IST
Age: 3452
Cache-Control: public, max-age=3600
Content-Type: video/mp2t
Content-Length: 2048576
```

### Tier 2: Regional Cache (Origin Shield)

```yaml
Purpose: Reduce origin load, serve warm content
Locations: 10-20 regions (AWS regions)
Cache TTL: 24 hours
Hit Rate: 85%

Flow:
User (Istanbul) → Edge (Istanbul) [MISS]
                → Regional (EU-West) [HIT]
                → Serve (50ms latency)

If Regional MISS:
                → Origin (US-East) [PULL]
                → Cache in Regional
                → Cache in Edge
                → Serve (200ms first time, 5ms subsequent)
```

### Tier 3: Multi-CDN Strategy (Netflix, YouTube)

```yaml
Problem: Single CDN downtime = catastrophic
Solution: Multiple CDN providers with failover

Providers:
  - Primary: Cloudflare (70% traffic)
  - Secondary: Fastly (20% traffic)
  - Tertiary: AWS CloudFront (10% traffic)

DNS-based routing:
videos.wizyclub.com →
  - US-East: cloudflare.com (30ms)
  - EU-West: fastly.net (25ms)
  - Asia:    cloudfront.net (40ms)

Failover Logic (Anycast DNS):
if cloudflare_health_check fails:
    route_to(fastly)
    alert_ops_team()

Cost Optimization:
- Cloudflare: Unlimited bandwidth ($200/mo flat)
- Fastly: Pay-per-GB ($0.12/GB, good for EU)
- CloudFront: AWS-integrated ($0.085/GB)

Result: 99.99% availability, <100ms global p50 latency
```

---

## 🔐 DRM & SECURITY (Premium Content)

### DRM Providers

```yaml
1. Google Widevine (Android, Chrome)
   - Levels: L1 (hardware), L3 (software)
   - License server: Custom or BuyDRM

2. Apple FairPlay (iOS, Safari)
   - FPS certificate from Apple
   - License server integration

3. Microsoft PlayReady (Xbox, Windows)
   - Enterprise DRM

Multi-DRM Setup:
┌────────────────────────────────────────┐
│  Video Transcoding                     │
│  ├─ Encrypt segments with CENC        │
│  ├─ Generate keys (16-byte AES-128)   │
│  └─ Store keys in KMS (AWS/GCP)       │
└────────────────────────────────────────┘
         ↓
┌────────────────────────────────────────┐
│  Player Request Flow                   │
├────────────────────────────────────────┤
│  1. App: Request video                 │
│  2. Backend: Generate token            │
│     {                                  │
│       "video_id": "abc123",            │
│       "user_id": "user_xyz",           │
│       "expires": 1640000000,           │
│       "signature": "sha256..."         │
│     }                                  │
│  3. Player: Fetch master.m3u8 (token)  │
│  4. Player: Detects encrypted segments │
│  5. Player: Request DRM license        │
│     → License Server validates token   │
│     → Returns decryption key           │
│  6. Player: Decrypt & play             │
└────────────────────────────────────────┘

HLS Manifest (Encrypted):
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="https://license.wizyclub.com/key?token=xyz",KEYFORMAT="com.apple.streamingkeydelivery"
#EXTINF:6.0
segment_000.ts
#EXTINF:6.0
segment_001.ts

React Native (ExoPlayer with DRM):
<Video
  source={{
    uri: 'https://cdn.wizyclub.com/videos/abc123/master.m3u8',
    drm: {
      type: 'widevine',
      licenseServer: 'https://license.wizyclub.com/widevine',
      headers: {
        'X-Auth-Token': userToken
      }
    }
  }}
/>
```

---

## 📊 ANALYTICS & QoE MONITORING

### Real-time Metrics

```javascript
// Client-side (React Native)
import { VideoQualityMonitor } from 'video-analytics';

const monitor = new VideoQualityMonitor({
  videoId: 'abc123',
  userId: 'user_xyz',
  endpoint: 'https://analytics.wizyclub.com/events'
});

// Events to track
monitor.on('play', (event) => {
  // Video started
  logEvent({
    type: 'video_start',
    timestamp: Date.now(),
    start_time_ms: event.startTime,  // Time to first frame
    initial_bitrate: event.bitrate,
    network_type: event.networkType  // wifi, 4g, 5g
  });
});

monitor.on('quality_change', (event) => {
  // ABR switched quality
  logEvent({
    type: 'bitrate_change',
    from: event.oldBitrate,
    to: event.newBitrate,
    reason: event.reason  // 'bandwidth', 'user', 'error'
  });
});

monitor.on('buffer', (event) => {
  // Rebuffering occurred
  logEvent({
    type: 'rebuffer',
    duration_ms: event.duration,
    position_sec: event.position,
    bitrate: event.currentBitrate
  });
});

monitor.on('error', (event) => {
  // Playback error
  logEvent({
    type: 'playback_error',
    error_code: event.code,
    error_message: event.message,
    stack_trace: event.stack
  });
});

// KPIs Dashboard (Real-time)
┌─────────────────────────────────────────────────────┐
│  Video Quality Dashboard (Last 15 minutes)         │
├─────────────────────────────────────────────────────┤
│  📊 Video Start Time (VST)                         │
│      P50: 1.2s  │ P95: 3.5s  │ P99: 8.2s          │
│      [████████████░░░░░░░░░░] Target: <2s          │
│                                                     │
│  🔄 Rebuffer Rate                                   │
│      0.15 events/min (↓ 20% vs yesterday)          │
│      [██████████████████░░░░] Target: <0.2         │
│                                                     │
│  📶 Quality Distribution                            │
│      1080p: 45%  │ 720p: 35%  │ 540p: 15%  │ 360p: 5% │
│      [████████████████████████████████░░░░░]       │
│                                                     │
│  🌍 CDN Performance                                 │
│      Hit Rate: 94.2% (↑ 2%)                        │
│      [██████████████████████████████████░░]        │
│                                                     │
│  ❌ Error Rate                                      │
│      0.08% (12 errors / 15,000 plays)              │
│      [█████████████████████████████████████████]   │
│                                                     │
│  🎯 Completion Rate                                 │
│      78% (users watched to end)                    │
│      [████████████████████████████████░░░░░]       │
└─────────────────────────────────────────────────────┘
```

---

## 💰 COST AT SCALE

### Example: TikTok-sized App (1M monthly users)

```yaml
Assumptions:
- 1M users upload 100M videos/month (0.1 video per user)
- Average video: 30 seconds
- Total uploaded: 50,000 hours/month
- Each user watches 100 videos/month
- Total views: 100M plays/month
- Average watch time: 20 seconds (67% completion)

┌───────────────────────────────────────────────────────────┐
│  TRANSCODING COSTS                                        │
├───────────────────────────────────────────────────────────┤
│  Cloudflare Stream:                                       │
│    50,000 hours × $5 / 1000 hrs = $250/month              │
│                                                            │
│  AWS MediaConvert (alternative):                          │
│    50,000 hours × 60 min × $0.0075 = $22,500/month       │
│                                                            │
│  Self-hosted FFmpeg (EC2 spot):                           │
│    50,000 hours × 60 min × $0.002 = $6,000/month         │
│    + Infrastructure: $2,000/month                         │
│    Total: $8,000/month                                    │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  STORAGE COSTS (R2 / S3)                                  │
├───────────────────────────────────────────────────────────┤
│  100M videos × 30s avg × 800KB/s (compressed) = 2.4 PB   │
│                                                            │
│  Cloudflare R2:                                           │
│    2,400 TB × $0.015/GB/month = $36,000/month            │
│                                                            │
│  AWS S3 (with lifecycle to Glacier after 90 days):       │
│    Hot (30 days): 200 TB × $0.023 = $4,600               │
│    Warm (60 days): 400 TB × $0.0125 = $5,000            │
│    Cold (rest): 1,800 TB × $0.004 = $7,200              │
│    Total: $16,800/month                                   │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  CDN / DELIVERY COSTS                                     │
├───────────────────────────────────────────────────────────┤
│  100M plays × 20s watch × 400KB/s (540p avg) = 800 TB    │
│                                                            │
│  Cloudflare Stream:                                       │
│    800 TB = 800,000 GB                                    │
│    800,000 GB / 1000 × $1 = $800/month                   │
│                                                            │
│  Cloudflare Enterprise (unlimited):                       │
│    Flat fee: $5,000/month (all-inclusive)                │
│                                                            │
│  AWS CloudFront:                                          │
│    800 TB × $0.085/GB (first 10TB tier) ≈ $68,000/mo     │
│    With regional pricing: ~$40,000/month                  │
│                                                            │
│  Fastly:                                                  │
│    800 TB × $0.12/GB = $96,000/month                     │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  TOTAL MONTHLY COST COMPARISON                            │
├───────────────────────────────────────────────────────────┤
│  Option A: All-in Cloudflare Stream                      │
│    Transcoding: $250                                      │
│    Storage: Included                                      │
│    Delivery: $800                                         │
│    Total: $1,050/month                                    │
│    Per user: $0.001/month                                 │
│    ✅ Best for: MVP, rapid scaling                        │
│                                                            │
│  Option B: AWS Full Stack                                │
│    Transcoding: $22,500                                   │
│    Storage (S3): $16,800                                  │
│    Delivery (CloudFront): $40,000                         │
│    Total: $79,300/month                                   │
│    Per user: $0.079/month                                 │
│    ⚠️ Expensive, but maximum control                      │
│                                                            │
│  Option C: Hybrid (Self-hosted + Cloudflare CDN)         │
│    Transcoding (Self-hosted): $8,000                      │
│    Storage (R2): $36,000                                  │
│    Delivery (Cloudflare Enterprise): $5,000              │
│    Total: $49,000/month                                   │
│    Per user: $0.049/month                                 │
│    ✅ Best for: Scale + Cost optimization                 │
│                                                            │
│  Option D: Mux Video                                      │
│    Encoding: 50K hrs × 60 × $0.005 = $15,000            │
│    Delivery: 800 TB × $0.01/GB = $8,000                  │
│    Storage: Included (90 days)                           │
│    Total: $23,000/month                                   │
│    Per user: $0.023/month                                 │
│    ✅ Best for: Balance of simplicity & scale             │
└───────────────────────────────────────────────────────────┘

🎯 RECOMMENDATION FOR WIZYCLUB:
Phase 1 (0-100K users): Cloudflare Stream ($1K/mo)
Phase 2 (100K-1M users): Mux Video ($20K/mo)
Phase 3 (1M+ users): Hybrid self-hosted ($50K/mo)
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)

```yaml
1. Choose transcoding provider:
   - Cloudflare Stream (recommended for MVP)
   - Or Mux Video (better analytics)

2. Setup storage:
   - Cloudflare R2 (existing) ✅
   - Add lifecycle policies (30-day retention)

3. Implement upload flow:
   - TUS resumable upload
   - Webhook for transcode complete
   - Update Supabase metadata

4. Update React Native:
   - Replace local videos with HLS URLs
   - Add quality selector (auto, high, medium, low)
   - Implement video player controls
```

### Phase 2: Optimization (Week 3-4)

```yaml
1. CDN configuration:
   - Setup Cloudflare caching rules
   - Configure origin shield
   - Enable Argo routing

2. Analytics integration:
   - Implement video event tracking
   - Setup dashboard (Grafana / Datadog)
   - Monitor VST, rebuffer rate, error rate

3. User experience:
   - Thumbnail generation (preview on hover)
   - Seek preview (sprite sheet)
   - Offline download (encrypted storage)
```

### Phase 3: Scale & Security (Week 5-8)

```yaml
1. DRM implementation:
   - Widevine for Android
   - FairPlay for iOS
   - License server (BuyDRM / custom)

2. Multi-region deployment:
   - Regional transcoding (reduce latency)
   - Multi-CDN failover
   - Database replication (Supabase read replicas)

3. Cost optimization:
   - Implement usage-based pricing (for creators)
   - Archive old videos (S3 Glacier)
   - Optimize bitrate ladder (per-title encoding)
```

---

## 📝 SUMMARY: Production Checklist

```markdown
✅ Video Upload
   ✅ Chunked upload (TUS protocol, resumable)
   ✅ Upload progress (UI feedback)
   ✅ Error handling (retry logic)
   ✅ Metadata extraction (duration, resolution)

✅ Transcoding
   ✅ Adaptive bitrate (5 qualities: 1080p → 240p)
   ✅ HLS segmentation (6s segments)
   ✅ Thumbnail generation (poster + sprite sheet)
   ✅ Audio normalization (-14 LUFS)
   ✅ Processing queue (SQS / RabbitMQ)
   ✅ Webhook callbacks (progress, complete, error)

✅ Storage & Distribution
   ✅ Object storage (R2 / S3)
   ✅ Lifecycle policies (auto-delete old content)
   ✅ Multi-region replication (global availability)
   ✅ CDN integration (Cloudflare / Fastly)
   ✅ Cache optimization (TTL, purge API)
   ✅ Origin shield (reduce origin load)

✅ Playback
   ✅ HLS player (ExoPlayer / AVPlayer)
   ✅ ABR logic (automatic quality switching)
   ✅ Buffering strategy (initial, target, max)
   ✅ Error handling (retry, fallback to lower quality)
   ✅ Seek preview (thumbnail sprites)
   ✅ PiP mode (background playback)

✅ Security
   ✅ DRM (Widevine, FairPlay)
   ✅ Signed URLs (time-limited access)
   ✅ Token authentication (JWT)
   ✅ Rate limiting (prevent abuse)
   ✅ Watermarking (identify leaks)

✅ Analytics
   ✅ QoE metrics (VST, rebuffer rate, quality)
   ✅ Real-time dashboard (Grafana / Datadog)
   ✅ Error tracking (Sentry)
   ✅ User behavior (watch time, completion rate)
   ✅ CDN performance (hit rate, latency)
   ✅ Cost monitoring (per-user, per-video)

✅ Operations
   ✅ Monitoring & alerting (PagerDuty)
   ✅ Auto-scaling (Kubernetes HPA)
   ✅ Disaster recovery (multi-region)
   ✅ Cost optimization (spot instances, lifecycle)
   ✅ SLA compliance (99.9% uptime)
```

---

## 🎯 FINAL RECOMMENDATION FOR WIZYCLUB

```yaml
Immediate (This Week):
1. Sign up for Cloudflare Stream
   - $5/month minimum
   - Upload your 12 demo videos
   - Get HLS URLs in 5 minutes
   - Update React Native to use HLS

2. Implement basic analytics
   - Track video starts, completion rate
   - Monitor errors (Sentry)

Short-term (Month 1-3):
3. Add upload flow (user-generated content)
   - TUS upload (resumable)
   - Webhook → Supabase metadata
   - Feed integration

4. Optimize CDN
   - Configure cache rules
   - Monitor hit rate (target: >90%)

Long-term (Month 4-12):
5. Scale infrastructure
   - Migrate to Mux (better analytics) or
   - Build self-hosted (if >1M users)

6. Add premium features
   - DRM for paid content
   - Live streaming
   - AI recommendations
```

**Next step:** Cloudflare Stream entegrasyonunu yapalım mı? 15 dakikada HLS'li video sistemi hazır olur.
