# Backend API Endpoint

**Public URL (Ngrok):** https://concludible-archidiaconal-monnie.ngrok-free.dev

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

**Ngrok Dashboard:** http://127.0.0.1:4040 (local monitoring)
