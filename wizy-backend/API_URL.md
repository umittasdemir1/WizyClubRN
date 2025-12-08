# Backend API Endpoint

**Public URL:** https://wet-berries-appear.loca.lt

## Endpoints:

### Health Check
```
GET /health
```

### Upload Video
```
POST /upload
Content-Type: multipart/form-data

Fields:
- video: File (mp4)
- userId: String
- description: String
```

## Mobile App Integration

Use this URL in your React Native app for video uploads.

**Note:** This URL will change when you restart localtunnel. For production, deploy to a permanent server (Railway, Render, Fly.io).
