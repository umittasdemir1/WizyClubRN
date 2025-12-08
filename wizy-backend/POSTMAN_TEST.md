# Backend API Test Guide

## Postman Test

### 1. Test Health Endpoint

**Request:**
```
GET https://concludible-archidiaconal-monnie.ngrok-free.dev/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-12-08T22:34:45.382Z"
}
```

---

### 2. Test Video Upload

**Request:**
```
POST https://concludible-archidiaconal-monnie.ngrok-free.dev/upload
```

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (form-data):**
- `video`: [File] Select any .mp4 video file
- `userId`: test-user-123
- `description`: Test upload from Postman

**Expected Response:**
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "id": "uuid-here",
    "user_id": "test-user-123",
    "video_url": "https://pub-xxx.r2.dev/videos/timestamp.mp4",
    "thumbnail_url": "https://pub-xxx.r2.dev/thumbs/timestamp.jpg",
    "description": "Test upload from Postman",
    "likes_count": 0,
    "views_count": 0,
    "created_at": "2025-12-08T..."
  }
}
```

---

## Using cURL (Alternative)

```bash
curl -X POST https://concludible-archidiaconal-monnie.ngrok-free.dev/upload \
  -F "video=@path/to/video.mp4" \
  -F "userId=test-user-123" \
  -F "description=Test upload"
```

---

## Verification Steps

1. **Check Supabase:**
   - Go to https://supabase.com/dashboard/project/snpckjrjmwxwgqcqghkl/editor
   - Open `videos` table
   - Verify new row exists

2. **Check R2:**
   - Go to Cloudflare Dashboard → R2 → wizyclub-assets
   - Verify `videos/` and `thumbs/` folders contain uploaded files

3. **Test Video Playback:**
   - Copy `video_url` from response
   - Open in browser
   - Video should play instantly (FastStart optimization)
