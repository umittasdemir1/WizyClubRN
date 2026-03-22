Canonical logging guide. English first, Turkish second. See `mobile/src/core/services/Logger.ts` for the full LogCode list.

# 📊 Logging System Guide

## Overview

Professional logging system with 4-digit codes, categorization, and detailed context tracking.

## Quick Start

```typescript
import { Logger, LogCode, logAuth, logVideo, logCache, logError } from '@/core/services/Logger';

// Simple logging
logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'User signed in', { userId: '123' });
logVideo(LogCode.VIDEO_PLAYBACK_START, 'Video started playing', { videoId: 'abc' });
logCache(LogCode.CACHE_HIT, 'Cache hit for video', { url: '...' });
logError(LogCode.ERROR_NETWORK, 'Network request failed', error);
```

## Log Categories & Code Ranges

### 1xxx: Authentication & Supabase
```typescript
LogCode.AUTH_LOGIN_START       // 1001 - Login attempt started
LogCode.AUTH_LOGIN_SUCCESS     // 1002 - User successfully logged in
LogCode.AUTH_LOGIN_FAILED      // 1003 - Login failed
LogCode.AUTH_LOGOUT            // 1004 - User logged out
LogCode.AUTH_SESSION_CHECK     // 1005 - Session validation
LogCode.AUTH_TOKEN_REFRESH     // 1006 - Token refreshed
LogCode.AUTH_GOOGLE_SIGNIN     // 1007 - Google OAuth signin
LogCode.AUTH_APPLE_SIGNIN      // 1008 - Apple signin
LogCode.SUPABASE_INIT          // 1010 - Supabase initialized
LogCode.SUPABASE_CONNECTION    // 1011 - Supabase connection status
LogCode.SUPABASE_ERROR         // 1012 - Supabase error
```

**Usage Example:**
```typescript
logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'User authenticated', {
    userId: user.id,
    email: user.email,
    method: 'password'
});
```

### 2xxx: Video & Media
```typescript
LogCode.VIDEO_LOAD_START       // 2001 - Video loading started
LogCode.VIDEO_LOAD_SUCCESS     // 2002 - Video loaded successfully
LogCode.VIDEO_LOAD_ERROR       // 2003 - Video loading failed
LogCode.VIDEO_PLAYBACK_START   // 2004 - Playback started
LogCode.VIDEO_PLAYBACK_PAUSE   // 2005 - Playback paused
LogCode.VIDEO_PLAYBACK_ERROR   // 2006 - Playback error
LogCode.VIDEO_BUFFER_START     // 2007 - Buffering started
LogCode.VIDEO_BUFFER_END       // 2008 - Buffering ended
LogCode.VIDEO_QUALITY_CHANGE   // 2009 - Quality changed
LogCode.VIDEO_UPLOAD_START     // 2010 - Upload started
LogCode.VIDEO_UPLOAD_PROGRESS  // 2011 - Upload progress update
LogCode.VIDEO_UPLOAD_SUCCESS   // 2012 - Upload completed
LogCode.VIDEO_UPLOAD_ERROR     // 2013 - Upload failed
LogCode.VIDEO_COMPRESSION_START    // 2014 - Compression started
LogCode.VIDEO_COMPRESSION_SUCCESS  // 2015 - Compression completed
LogCode.VIDEO_COMPRESSION_ERROR    // 2016 - Compression failed
LogCode.MEDIA_PICKER_OPEN      // 2020 - Media picker opened
LogCode.MEDIA_PICKER_SELECT    // 2021 - Media selected
LogCode.MEDIA_PICKER_ERROR     // 2022 - Picker error
LogCode.CAMERA_INIT            // 2030 - Camera initialized
LogCode.CAMERA_CAPTURE         // 2031 - Photo/video captured
LogCode.CAMERA_ERROR           // 2032 - Camera error
```

**Usage Example:**
```typescript
logVideo(LogCode.VIDEO_PLAYBACK_START, 'Started playing video', {
    videoId: '123',
    resolution: '1080p',
    duration: 60
});
```

### 3xxx: Cache & Storage
```typescript
LogCode.CACHE_INIT             // 3001 - Cache initialized
LogCode.CACHE_HIT              // 3002 - Cache hit
LogCode.CACHE_MISS             // 3003 - Cache miss
LogCode.CACHE_SET              // 3004 - Item cached
LogCode.CACHE_DELETE           // 3005 - Cache item deleted
LogCode.CACHE_CLEAR            // 3006 - Cache cleared
LogCode.CACHE_PRUNE            // 3007 - Cache pruned
LogCode.CACHE_ERROR            // 3008 - Cache error
LogCode.CACHE_WARMUP           // 3009 - Cache warmup
LogCode.STORAGE_READ           // 3010 - Storage read
LogCode.STORAGE_WRITE          // 3011 - Storage write
LogCode.STORAGE_DELETE         // 3012 - Storage delete
LogCode.STORAGE_ERROR          // 3013 - Storage error
LogCode.ASYNC_STORAGE_GET      // 3020 - AsyncStorage get
LogCode.ASYNC_STORAGE_SET      // 3021 - AsyncStorage set
LogCode.ASYNC_STORAGE_ERROR    // 3022 - AsyncStorage error
```

**Usage Example:**
```typescript
logCache(LogCode.CACHE_HIT, 'Video found in cache', {
    url: videoUrl.substring(0, 50),
    size: fileSizeInBytes
});
```

### 4xxx: Network & API
```typescript
LogCode.API_REQUEST_START      // 4001 - API request started
LogCode.API_REQUEST_SUCCESS    // 4002 - API request succeeded
LogCode.API_REQUEST_ERROR      // 4003 - API request failed
LogCode.API_TIMEOUT            // 4004 - Request timeout
LogCode.API_RETRY              // 4005 - Request retry
LogCode.NETWORK_ONLINE         // 4010 - Network connected
LogCode.NETWORK_OFFLINE        // 4011 - Network disconnected
LogCode.NETWORK_SLOW           // 4012 - Slow connection
LogCode.FETCH_START            // 4020 - Fetch started
LogCode.FETCH_SUCCESS          // 4021 - Fetch succeeded
LogCode.FETCH_ERROR            // 4022 - Fetch failed
```

**Usage Example:**
```typescript
logNetwork(LogCode.API_REQUEST_START, 'Fetching user profile', {
    endpoint: '/api/profile',
    method: 'GET'
});
```

### 5xxx: UI & Navigation
```typescript
LogCode.NAVIGATION_CHANGE      // 5001 - Navigation changed
LogCode.SCREEN_MOUNT           // 5002 - Screen mounted
LogCode.SCREEN_UNMOUNT         // 5003 - Screen unmounted
LogCode.MODAL_OPEN             // 5004 - Modal opened
LogCode.MODAL_CLOSE            // 5005 - Modal closed
LogCode.SHEET_OPEN             // 5006 - Bottom sheet opened
LogCode.SHEET_CLOSE            // 5007 - Bottom sheet closed
LogCode.INTERACTION_TAP        // 5010 - User tapped
LogCode.INTERACTION_SWIPE      // 5011 - User swiped
LogCode.INTERACTION_SCROLL     // 5012 - User scrolled
LogCode.UI_RENDER              // 5020 - UI rendered
LogCode.UI_ERROR               // 5021 - UI error
```

**Usage Example:**
```typescript
logUI(LogCode.MODAL_OPEN, 'Upload modal opened', {
    source: 'camera',
    assetsCount: 3
});
```

### 6xxx: Performance & Metrics
```typescript
LogCode.PERF_MEASURE_START     // 6001 - Performance measurement started
LogCode.PERF_MEASURE_END       // 6002 - Performance measurement ended
LogCode.PERF_SLOW_RENDER       // 6003 - Slow render detected
LogCode.PERF_MEMORY_WARNING    // 6004 - Memory warning
LogCode.PERF_FPS_DROP          // 6005 - FPS drop detected
LogCode.PERF_BUNDLE_LOAD       // 6006 - Bundle loaded
LogCode.PREFETCH_START         // 6010 - Prefetch started
LogCode.PREFETCH_SUCCESS       // 6011 - Prefetch succeeded
LogCode.PREFETCH_ERROR         // 6012 - Prefetch failed
LogCode.POOL_CREATE            // 6020 - Pool created
LogCode.POOL_ACQUIRE           // 6021 - Pool resource acquired
LogCode.POOL_RELEASE           // 6022 - Pool resource released
LogCode.POOL_CLEANUP           // 6023 - Pool cleanup
```

**Usage Example:**
```typescript
logPerf(LogCode.PREFETCH_SUCCESS, 'Videos prefetched', {
    count: 5,
    duration: 1200
});
```

### 7xxx: Data & Repositories
```typescript
LogCode.DB_QUERY_START         // 7001 - Database query started
LogCode.DB_QUERY_SUCCESS       // 7002 - Query succeeded
LogCode.DB_QUERY_ERROR         // 7003 - Query failed
LogCode.DB_INSERT              // 7004 - Insert operation
LogCode.DB_UPDATE              // 7005 - Update operation
LogCode.DB_DELETE              // 7006 - Delete operation
LogCode.REPO_FETCH             // 7010 - Repository fetch
LogCode.REPO_SAVE              // 7011 - Repository save
LogCode.REPO_DELETE            // 7012 - Repository delete
LogCode.REPO_ERROR             // 7013 - Repository error
LogCode.DRAFT_SAVE             // 7020 - Draft saved
LogCode.DRAFT_DELETE           // 7021 - Draft deleted
LogCode.DRAFT_CLEANUP          // 7022 - Draft cleanup
```

**Usage Example:**
```typescript
logData(LogCode.DB_INSERT, 'Profile created', {
    userId: '123',
    username: 'john_doe'
});
```

### 8xxx: Errors & Exceptions
```typescript
LogCode.ERROR_CAUGHT           // 8001 - Error caught
LogCode.ERROR_BOUNDARY         // 8002 - Error boundary triggered
LogCode.ERROR_NETWORK          // 8003 - Network error
LogCode.ERROR_TIMEOUT          // 8004 - Timeout error
LogCode.ERROR_PARSE            // 8005 - Parse error
LogCode.ERROR_VALIDATION       // 8006 - Validation error
LogCode.ERROR_PERMISSION       // 8007 - Permission error
LogCode.ERROR_NOT_FOUND        // 8008 - Not found error
LogCode.ERROR_UNAUTHORIZED     // 8009 - Unauthorized error
LogCode.EXCEPTION_UNCAUGHT     // 8010 - Uncaught exception
LogCode.EXCEPTION_PROMISE      // 8011 - Promise rejection
```

**Usage Example:**
```typescript
logError(LogCode.ERROR_NETWORK, 'Failed to fetch data', {
    url: endpoint,
    statusCode: 500,
    error: err.message
});
```

### 9xxx: General & System
```typescript
LogCode.APP_START              // 9001 - App started
LogCode.APP_READY              // 9002 - App ready
LogCode.APP_BACKGROUND         // 9003 - App backgrounded
LogCode.APP_FOREGROUND         // 9004 - App foregrounded
LogCode.APP_CRASH              // 9005 - App crashed
LogCode.STATE_CHANGE           // 9010 - State changed
LogCode.STORE_INIT             // 9011 - Store initialized
LogCode.STORE_UPDATE           // 9012 - Store updated
LogCode.CONFIG_LOAD            // 9020 - Config loaded
LogCode.FEATURE_FLAG           // 9021 - Feature flag checked
LogCode.DEBUG_INFO             // 9030 - Debug information
LogCode.WARNING_IGNORED        // 9031 - Warning ignored
```

**Usage Example:**
```typescript
logSystem(LogCode.APP_START, 'Application started', {
    version: '1.0.0',
    platform: Platform.OS
});
```

## Log Levels

```typescript
enum LogLevel {
    DEBUG = 0,   // Detailed development info
    INFO = 1,    // General information
    WARN = 2,    // Warnings
    ERROR = 3,   // Errors
    NONE = 4,    // No logging
}
```

**Set minimum level:**
```typescript
Logger.setMinLevel(LogLevel.WARN); // Only show WARN and ERROR
```

**Disable logging:**
```typescript
Logger.setEnabled(false);
```

## Advanced Usage

### Direct Logger Usage
```typescript
Logger.debug(LogCode.DEBUG_INFO, 'Debugging info', { data: 'value' });
Logger.info(LogCode.APP_READY, 'App is ready');
Logger.warn(LogCode.PERF_SLOW_RENDER, 'Slow render detected', { ms: 1500 });
Logger.error(LogCode.ERROR_NETWORK, 'Network failed', error);
```

### With Module Context
```typescript
Logger.info(LogCode.VIDEO_LOAD_SUCCESS, 'Video loaded', { videoId: '123' }, 'VideoPlayer');
```

## Output Format

### Development (Colored & Formatted)
```
14:23:45 [INFO] [1002] AUTH User signed in { userId: '123', email: 'user@example.com' }
14:23:46 [DEBUG] [2004] VIDEO [VideoPlayer] Started playing video { videoId: 'abc', resolution: '1080p' }
14:23:47 [ERROR] [8003] ERROR Network request failed { url: '/api/profile', statusCode: 500 }
```

### Production (Plain Text)
```
14:23:45 [INFO] [1002] AUTH User signed in
14:23:46 [WARN] [6003] PERF Slow render detected
14:23:47 [ERROR] [8003] ERROR Network request failed
```

## Best Practices

1. **Always use LogCodes**: Never use plain console.log
2. **Include context**: Pass relevant data objects
3. **Use appropriate levels**: DEBUG for dev, INFO for important events, ERROR for failures
4. **Keep messages concise**: Descriptive but brief
5. **Sensitive data**: Never log passwords, tokens, or PII

## Migration from console.log

❌ **Before:**
```typescript
console.log('[VideoCache] Cache hit for:', url);
console.error('Failed to load video:', error);
```

✅ **After:**
```typescript
logCache(LogCode.CACHE_HIT, 'Cache hit for video', { url: url.substring(0, 50) });
logError(LogCode.VIDEO_LOAD_ERROR, 'Failed to load video', error);
```

## Configuration

Production logging is automatically minimal. In development, all logs are shown with colors.

**Customize per environment:**
```typescript
if (__DEV__) {
    Logger.setMinLevel(LogLevel.DEBUG);
} else {
    Logger.setMinLevel(LogLevel.ERROR);
}
```

## Quick Reference

| Category | Code Range | Helper |
|----------|------------|--------|
| Authentication | 1001-1012 | `logAuth()` |
| Video & Media | 2001-2032 | `logVideo()` |
| Cache & Storage | 3001-3022 | `logCache()` |
| Network & API | 4001-4022 | `logNetwork()` |
| UI & Navigation | 5001-5021 | `logUI()` |
| Performance | 6001-6023 | `logPerf()` |
| Data & Repositories | 7001-7022 | `logData()` |
| Errors | 8001-8011 | `logError()` |
| System | 9001-9031 | `logSystem()` |

---

# 📊 Loglama Sistemi Kılavuzu

## Genel Bakış

4 haneli kodlar, kategorizasyon ve detaylı bağlam takibi ile profesyonel loglama sistemi.

## Hızlı Başlangıç

```typescript
import { Logger, LogCode, logAuth, logVideo, logCache, logError } from '@/core/services/Logger';

// Basit loglama
logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'Kullanıcı giriş yaptı', { userId: '123' });
logVideo(LogCode.VIDEO_PLAYBACK_START, 'Video oynatılmaya başladı', { videoId: 'abc' });
logCache(LogCode.CACHE_HIT, 'Video önbellekte bulundu', { url: '...' });
logError(LogCode.ERROR_NETWORK, 'Ağ isteği başarısız', error);
```

## Log Kategorileri & Kod Aralıkları

### 1xxx: Kimlik Doğrulama & Supabase
```typescript
LogCode.AUTH_LOGIN_START       // 1001 - Giriş denemesi başladı
LogCode.AUTH_LOGIN_SUCCESS     // 1002 - Kullanıcı başarıyla giriş yaptı
LogCode.AUTH_LOGIN_FAILED      // 1003 - Giriş başarısız
LogCode.AUTH_LOGOUT            // 1004 - Kullanıcı çıkış yaptı
LogCode.AUTH_SESSION_CHECK     // 1005 - Oturum doğrulaması
LogCode.AUTH_TOKEN_REFRESH     // 1006 - Token yenilendi
LogCode.AUTH_GOOGLE_SIGNIN     // 1007 - Google OAuth girişi
LogCode.AUTH_APPLE_SIGNIN      // 1008 - Apple girişi
LogCode.SUPABASE_INIT          // 1010 - Supabase başlatıldı
LogCode.SUPABASE_CONNECTION    // 1011 - Supabase bağlantı durumu
LogCode.SUPABASE_ERROR         // 1012 - Supabase hatası
```

**Kullanım Örneği:**
```typescript
logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'Kullanıcı kimlik doğrulaması yapıldı', {
    userId: user.id,
    email: user.email,
    method: 'password'
});
```

### 2xxx: Video & Medya
```typescript
LogCode.VIDEO_LOAD_START       // 2001 - Video yüklemesi başladı
LogCode.VIDEO_LOAD_SUCCESS     // 2002 - Video başarıyla yüklendi
LogCode.VIDEO_LOAD_ERROR       // 2003 - Video yüklemesi başarısız
LogCode.VIDEO_PLAYBACK_START   // 2004 - Oynatma başladı
LogCode.VIDEO_PLAYBACK_PAUSE   // 2005 - Oynatma duraklatıldı
LogCode.VIDEO_PLAYBACK_ERROR   // 2006 - Oynatma hatası
LogCode.VIDEO_BUFFER_START     // 2007 - Tamponlama başladı
LogCode.VIDEO_BUFFER_END       // 2008 - Tamponlama bitti
LogCode.VIDEO_QUALITY_CHANGE   // 2009 - Kalite değişti
LogCode.VIDEO_UPLOAD_START     // 2010 - Yükleme başladı
LogCode.VIDEO_UPLOAD_PROGRESS  // 2011 - Yükleme ilerleme güncellemesi
LogCode.VIDEO_UPLOAD_SUCCESS   // 2012 - Yükleme tamamlandı
LogCode.VIDEO_UPLOAD_ERROR     // 2013 - Yükleme başarısız
LogCode.VIDEO_COMPRESSION_START    // 2014 - Sıkıştırma başladı
LogCode.VIDEO_COMPRESSION_SUCCESS  // 2015 - Sıkıştırma tamamlandı
LogCode.VIDEO_COMPRESSION_ERROR    // 2016 - Sıkıştırma başarısız
LogCode.MEDIA_PICKER_OPEN      // 2020 - Medya seçici açıldı
LogCode.MEDIA_PICKER_SELECT    // 2021 - Medya seçildi
LogCode.MEDIA_PICKER_ERROR     // 2022 - Seçici hatası
LogCode.CAMERA_INIT            // 2030 - Kamera başlatıldı
LogCode.CAMERA_CAPTURE         // 2031 - Fotoğraf/video çekildi
LogCode.CAMERA_ERROR           // 2032 - Kamera hatası
```

**Kullanım Örneği:**
```typescript
logVideo(LogCode.VIDEO_PLAYBACK_START, 'Video oynatılmaya başladı', {
    videoId: '123',
    resolution: '1080p',
    duration: 60
});
```

### 3xxx: Önbellek & Depolama
```typescript
LogCode.CACHE_INIT             // 3001 - Önbellek başlatıldı
LogCode.CACHE_HIT              // 3002 - Önbellek isabeti
LogCode.CACHE_MISS             // 3003 - Önbellek kaybı
LogCode.CACHE_SET              // 3004 - Öğe önbelleğe alındı
LogCode.CACHE_DELETE           // 3005 - Önbellek öğesi silindi
LogCode.CACHE_CLEAR            // 3006 - Önbellek temizlendi
LogCode.CACHE_PRUNE            // 3007 - Önbellek budandı
LogCode.CACHE_ERROR            // 3008 - Önbellek hatası
LogCode.CACHE_WARMUP           // 3009 - Önbellek ısıtması
LogCode.STORAGE_READ           // 3010 - Depolama okuma
LogCode.STORAGE_WRITE          // 3011 - Depolama yazma
LogCode.STORAGE_DELETE         // 3012 - Depolama silme
LogCode.STORAGE_ERROR          // 3013 - Depolama hatası
LogCode.ASYNC_STORAGE_GET      // 3020 - AsyncStorage okuma
LogCode.ASYNC_STORAGE_SET      // 3021 - AsyncStorage yazma
LogCode.ASYNC_STORAGE_ERROR    // 3022 - AsyncStorage hatası
```

**Kullanım Örneği:**
```typescript
logCache(LogCode.CACHE_HIT, 'Video önbellekte bulundu', {
    url: videoUrl.substring(0, 50),
    size: fileSizeInBytes
});
```

### 4xxx: Ağ & API
```typescript
LogCode.API_REQUEST_START      // 4001 - API isteği başladı
LogCode.API_REQUEST_SUCCESS    // 4002 - API isteği başarılı
LogCode.API_REQUEST_ERROR      // 4003 - API isteği başarısız
LogCode.API_TIMEOUT            // 4004 - İstek zaman aşımı
LogCode.API_RETRY              // 4005 - İstek yeniden deneme
LogCode.NETWORK_ONLINE         // 4010 - Ağ bağlandı
LogCode.NETWORK_OFFLINE        // 4011 - Ağ bağlantısı kesildi
LogCode.NETWORK_SLOW           // 4012 - Yavaş bağlantı
LogCode.FETCH_START            // 4020 - Veri çekme başladı
LogCode.FETCH_SUCCESS          // 4021 - Veri çekme başarılı
LogCode.FETCH_ERROR            // 4022 - Veri çekme başarısız
```

**Kullanım Örneği:**
```typescript
logNetwork(LogCode.API_REQUEST_START, 'Kullanıcı profili getiriliyor', {
    endpoint: '/api/profile',
    method: 'GET'
});
```

### 5xxx: Arayüz & Navigasyon
```typescript
LogCode.NAVIGATION_CHANGE      // 5001 - Navigasyon değişti
LogCode.SCREEN_MOUNT           // 5002 - Ekran yüklendi
LogCode.SCREEN_UNMOUNT         // 5003 - Ekran kaldırıldı
LogCode.MODAL_OPEN             // 5004 - Modal açıldı
LogCode.MODAL_CLOSE            // 5005 - Modal kapatıldı
LogCode.SHEET_OPEN             // 5006 - Alt panel açıldı
LogCode.SHEET_CLOSE            // 5007 - Alt panel kapatıldı
LogCode.INTERACTION_TAP        // 5010 - Kullanıcı dokundu
LogCode.INTERACTION_SWIPE      // 5011 - Kullanıcı kaydırdı
LogCode.INTERACTION_SCROLL     // 5012 - Kullanıcı kaydırdı
LogCode.UI_RENDER              // 5020 - Arayüz render edildi
LogCode.UI_ERROR               // 5021 - Arayüz hatası
```

**Kullanım Örneği:**
```typescript
logUI(LogCode.MODAL_OPEN, 'Yükleme modalı açıldı', {
    source: 'camera',
    assetsCount: 3
});
```

### 6xxx: Performans & Metrikler
```typescript
LogCode.PERF_MEASURE_START     // 6001 - Performans ölçümü başladı
LogCode.PERF_MEASURE_END       // 6002 - Performans ölçümü bitti
LogCode.PERF_SLOW_RENDER       // 6003 - Yavaş render tespit edildi
LogCode.PERF_MEMORY_WARNING    // 6004 - Bellek uyarısı
LogCode.PERF_FPS_DROP          // 6005 - FPS düşüşü tespit edildi
LogCode.PERF_BUNDLE_LOAD       // 6006 - Paket yüklendi
LogCode.PREFETCH_START         // 6010 - Ön yükleme başladı
LogCode.PREFETCH_SUCCESS       // 6011 - Ön yükleme başarılı
LogCode.PREFETCH_ERROR         // 6012 - Ön yükleme başarısız
LogCode.POOL_CREATE            // 6020 - Havuz oluşturuldu
LogCode.POOL_ACQUIRE           // 6021 - Havuz kaynağı alındı
LogCode.POOL_RELEASE           // 6022 - Havuz kaynağı serbest bırakıldı
LogCode.POOL_CLEANUP           // 6023 - Havuz temizlendi
```

**Kullanım Örneği:**
```typescript
logPerf(LogCode.PREFETCH_SUCCESS, 'Videolar ön yüklendi', {
    count: 5,
    duration: 1200
});
```

### 7xxx: Veri & Repository'ler
```typescript
LogCode.DB_QUERY_START         // 7001 - Veritabanı sorgusu başladı
LogCode.DB_QUERY_SUCCESS       // 7002 - Sorgu başarılı
LogCode.DB_QUERY_ERROR         // 7003 - Sorgu başarısız
LogCode.DB_INSERT              // 7004 - Ekleme işlemi
LogCode.DB_UPDATE              // 7005 - Güncelleme işlemi
LogCode.DB_DELETE              // 7006 - Silme işlemi
LogCode.REPO_FETCH             // 7010 - Repository veri getirme
LogCode.REPO_SAVE              // 7011 - Repository kaydetme
LogCode.REPO_DELETE            // 7012 - Repository silme
LogCode.REPO_ERROR             // 7013 - Repository hatası
LogCode.DRAFT_SAVE             // 7020 - Taslak kaydedildi
LogCode.DRAFT_DELETE           // 7021 - Taslak silindi
LogCode.DRAFT_CLEANUP          // 7022 - Taslak temizleme
```

**Kullanım Örneği:**
```typescript
logData(LogCode.DB_INSERT, 'Profil oluşturuldu', {
    userId: '123',
    username: 'john_doe'
});
```

### 8xxx: Hatalar & İstisnalar
```typescript
LogCode.ERROR_CAUGHT           // 8001 - Hata yakalandı
LogCode.ERROR_BOUNDARY         // 8002 - Hata sınırı tetiklendi
LogCode.ERROR_NETWORK          // 8003 - Ağ hatası
LogCode.ERROR_TIMEOUT          // 8004 - Zaman aşımı hatası
LogCode.ERROR_PARSE            // 8005 - Ayrıştırma hatası
LogCode.ERROR_VALIDATION       // 8006 - Doğrulama hatası
LogCode.ERROR_PERMISSION       // 8007 - İzin hatası
LogCode.ERROR_NOT_FOUND        // 8008 - Bulunamadı hatası
LogCode.ERROR_UNAUTHORIZED     // 8009 - Yetkisiz hatası
LogCode.EXCEPTION_UNCAUGHT     // 8010 - Yakalanmamış istisna
LogCode.EXCEPTION_PROMISE      // 8011 - Promise reddi
```

**Kullanım Örneği:**
```typescript
logError(LogCode.ERROR_NETWORK, 'Veri getirme başarısız', {
    url: endpoint,
    statusCode: 500,
    error: err.message
});
```

### 9xxx: Genel & Sistem
```typescript
LogCode.APP_START              // 9001 - Uygulama başlatıldı
LogCode.APP_READY              // 9002 - Uygulama hazır
LogCode.APP_BACKGROUND         // 9003 - Uygulama arka plana gitti
LogCode.APP_FOREGROUND         // 9004 - Uygulama ön plana geldi
LogCode.APP_CRASH              // 9005 - Uygulama çöktü
LogCode.STATE_CHANGE           // 9010 - Durum değişti
LogCode.STORE_INIT             // 9011 - Store başlatıldı
LogCode.STORE_UPDATE           // 9012 - Store güncellendi
LogCode.CONFIG_LOAD            // 9020 - Yapılandırma yüklendi
LogCode.FEATURE_FLAG           // 9021 - Özellik bayrağı kontrol edildi
LogCode.DEBUG_INFO             // 9030 - Hata ayıklama bilgisi
LogCode.WARNING_IGNORED        // 9031 - Uyarı göz ardı edildi
```

**Kullanım Örneği:**
```typescript
logSystem(LogCode.APP_START, 'Uygulama başlatıldı', {
    version: '1.0.0',
    platform: Platform.OS
});
```

## Log Seviyeleri

```typescript
enum LogLevel {
    DEBUG = 0,   // Detaylı geliştirme bilgisi
    INFO = 1,    // Genel bilgiler
    WARN = 2,    // Uyarılar
    ERROR = 3,   // Hatalar
    NONE = 4,    // Loglama yok
}
```

**Minimum seviye ayarlama:**
```typescript
Logger.setMinLevel(LogLevel.WARN); // Sadece WARN ve ERROR göster
```

**Loglamayı devre dışı bırakma:**
```typescript
Logger.setEnabled(false);
```

## Gelişmiş Kullanım

### Doğrudan Logger Kullanımı
```typescript
Logger.debug(LogCode.DEBUG_INFO, 'Hata ayıklama bilgisi', { data: 'değer' });
Logger.info(LogCode.APP_READY, 'Uygulama hazır');
Logger.warn(LogCode.PERF_SLOW_RENDER, 'Yavaş render tespit edildi', { ms: 1500 });
Logger.error(LogCode.ERROR_NETWORK, 'Ağ başarısız', error);
```

### Modül Bağlamı İle
```typescript
Logger.info(LogCode.VIDEO_LOAD_SUCCESS, 'Video yüklendi', { videoId: '123' }, 'VideoPlayer');
```

## Çıktı Formatı

### Geliştirme (Renkli & Formatlı)
```
14:23:45 [INFO] [1002] AUTH Kullanıcı giriş yaptı { userId: '123', email: 'user@example.com' }
14:23:46 [DEBUG] [2004] VIDEO [VideoPlayer] Video oynatılmaya başladı { videoId: 'abc', resolution: '1080p' }
14:23:47 [ERROR] [8003] ERROR Ağ isteği başarısız { url: '/api/profile', statusCode: 500 }
```

### Prodüksiyon (Düz Metin)
```
14:23:45 [INFO] [1002] AUTH Kullanıcı giriş yaptı
14:23:46 [WARN] [6003] PERF Yavaş render tespit edildi
14:23:47 [ERROR] [8003] ERROR Ağ isteği başarısız
```

## En İyi Uygulamalar

1. **Her zaman LogCode kullanın**: Asla düz console.log kullanmayın
2. **Bağlam ekleyin**: İlgili veri nesnelerini iletin
3. **Uygun seviyeleri kullanın**: Geliştirme için DEBUG, önemli olaylar için INFO, hatalar için ERROR
4. **Mesajları kısa tutun**: Açıklayıcı ama özlü
5. **Hassas veriler**: Asla şifre, token veya kişisel bilgileri loglamamayın

## console.log'dan Geçiş

❌ **Önce:**
```typescript
console.log('[VideoCache] Önbellekte bulundu:', url);
console.error('Video yüklenemedi:', error);
```

✅ **Sonra:**
```typescript
logCache(LogCode.CACHE_HIT, 'Video önbellekte bulundu', { url: url.substring(0, 50) });
logError(LogCode.VIDEO_LOAD_ERROR, 'Video yüklenemedi', error);
```

## Yapılandırma

Prodüksiyon loglaması otomatik olarak minimaldir. Geliştirmede tüm loglar renklerle gösterilir.

**Ortama göre özelleştirme:**
```typescript
if (__DEV__) {
    Logger.setMinLevel(LogLevel.DEBUG);
} else {
    Logger.setMinLevel(LogLevel.ERROR);
}
```

## Hızlı Referans

| Kategori | Kod Aralığı | Yardımcı Fonksiyon |
|----------|-------------|-------------------|
| Kimlik Doğrulama | 1001-1012 | `logAuth()` |
| Video & Medya | 2001-2032 | `logVideo()` |
| Önbellek & Depolama | 3001-3022 | `logCache()` |
| Ağ & API | 4001-4022 | `logNetwork()` |
| Arayüz & Navigasyon | 5001-5021 | `logUI()` |
| Performans | 6001-6023 | `logPerf()` |
| Veri & Repository | 7001-7022 | `logData()` |
| Hatalar | 8001-8011 | `logError()` |
| Sistem | 9001-9031 | `logSystem()` |
