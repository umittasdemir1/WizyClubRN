# 🔍 Supabase Backend Sorgu Mimarisi — Tam Denetim Raporu

**Tarih:** 2026-02-10  
**Analiz Kapsamı:** Tüm sayfalar, tüm veri kaynakları, tüm Supabase sorguları  
**Hedef:** Minimum sorgu ile maksimum veri sağlayan bir mimari önerisi

---

## 1. SİSTEM GENELİ SORGU HARİTASI

### 1.1 Tablolar ve Erişim Noktaları

| Tablo | SELECT | INSERT | UPDATE | DELETE | RPC | Erişen DataSource |
|-------|--------|--------|--------|--------|-----|-------------------|
| `profiles` | ✅ | — | ✅ | — | — | SupabaseProfileDataSource, SupabaseVideoDataSource (join) |
| `videos` | ✅ | — | — | — | ✅ | SupabaseVideoDataSource |
| `stories` | ✅ | — | — | — | — | SupabaseVideoDataSource |
| `likes` | ✅ | ✅ | — | ✅ | — | InteractionDataSource, SupabaseVideoDataSource, UserActivityRepositoryImpl |
| `saves` | ✅ | ✅ | — | ✅ | — | InteractionDataSource, InteractionRepositoryImpl, UserActivityRepositoryImpl |
| `follows` | ✅ | ✅ | — | ✅ | — | InteractionDataSource, SupabaseVideoDataSource, SupabaseProfileDataSource, InteractionRepositoryImpl |
| `story_views` | ✅ | ✅ | — | — | — | SupabaseVideoDataSource |
| `video_views` | ✅ | ✅ | — | — | ✅ | SupabaseVideoDataSource (recordVideoView) |
| `drafts` | ✅ | ✅ | ✅ | ✅ | — | SupabaseDraftDataSource |
| `session_logs` | — | ✅ | — | — | — | SessionLogService |

### 1.2 RPC Fonksiyonları

| Fonksiyon | Çağrıldığı Yer | Amaç |
|-----------|----------------|------|
| `increment_video_counter` | SupabaseVideoDataSource.recordVideoView, useVideoFeed.toggleShare | views_count, shares_count artırma |

---

## 2. SAYFA → SORGU MATRİSİ

### 📱 Ana Sayfa (Feed) — `app/(tabs)/index.tsx`

| # | Sorgu | Tablo(lar) | Tetikleyici | Amaç |
|---|-------|-----------|-------------|------|
| 1 | `videos.select('*, profiles(*)').is('deleted_at', null).order(...)` | `videos` + `profiles` (join) | mount | Video listesini çek |
| 2 | `likes.select('video_id').eq('user_id', X).in('video_id', [...])` | `likes` | mount (batch) | Beğeni durumlarını al |
| 3 | `saves.select('video_id').eq('user_id', X).in('video_id', [...])` | `saves` | mount (batch) | Kaydetme durumlarını al |
| 4 | `follows.select('following_id').eq('follower_id', X).in('following_id', [...])` | `follows` | mount (batch) | Takip durumlarını al |
| 5 | `stories.select('*, profiles(*)').gt('expires_at', now)` | `stories` + `profiles` (join) | mount | Story bar verileri |
| 6 | `story_views.select('story_id').eq('user_id', X)` | `story_views` | mount | Hangi storyler görüldü |
| 7 | `auth.getUser()` | auth | mount | Stories içinde user ID al |
| 8 | `profiles.select('*').eq('id', userId)` | `profiles` | mount (prefetch) | Current user profili (prefetch) |
| 9 | `follows.select(count).eq('follower_id', viewerId).eq('following_id', userId)` | `follows` | mount (prefetch) | Profil için follow durumu |
| 10 | `stories.select('id').eq('user_id', userId).gt('expires_at', now)` | `stories` | mount (prefetch) | Profil için story durumu |
| 11 | `story_views.select(count).eq('user_id', checkerId).in('story_id', [...])` | `story_views` | mount (prefetch) | Unseen story kontrolü |

**Toplam: ~11 sorgu (app açılışı)**

> ⚠️ **Kritik:** Sorgular 1-4 `getVideos()` içinde, 5-7 `getStories()` içinde, 8-11 `getProfile()` içinde çalışır. Birbirleriyle birleştirilmez.

---

### 🔍 Keşfet — `app/(tabs)/explore.tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1-4 | `getVideos()` (aynı 4 sorgu) | mount | Explore grid videoları |
| 5-7 | `getStories()` (aynı 3 sorgu) | mount | Story bar (tekrar!) |

**Toplam: ~7 sorgu**

> 🔴 **Çakışma:** Feed sayfasıyla **aynı stories sorgusu** tekrar çalışır. TanStack Query cache ile çözülmüş ama `getVideos()` her tab için ayrı instance ile çağrılıyor.

---

### 👤 Profil — `app/(tabs)/profile.tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1 | `profiles.select('*').eq('id', userId)` | mount | Profil verileri |
| 2 | `follows.select(count).eq(...)` | mount | isFollowing kontrolü |
| 3 | `stories.select('id').eq('user_id', userId).gt(...)` | mount | Story durumu |
| 4 | `story_views.select(count).eq(...)` | mount | Unseen story |
| 5-8 | `getVideos()` (4 sorgu) | mount | Kullanıcının videoları |
| 9 | `saves.select('video_id').eq('user_id', userId)` | mount | saves tablosundan ID'ler |
| 10 | `videos.select('*, profiles(*)').in('id', [...])` | mount | Kaydedilen video detayları |
| 11-13 | `likes/saves/follows` batch sorgular | mount | Kaydedilen videoların etkileşim durumları |

**Toplam: ~13 sorgu**

> 🔴 **Ağır:** Profil sayfası tek başına 13 sorgu çalıştırıyor. `getProfile()` zaten 4 sorgu + `getVideos()` 4 sorgu + `getSavedVideos()` 5 sorgu.

---

### 👥 Kullanıcı Profili — `app/user/[id].tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1-4 | `getProfile()` | mount | Başka kullanıcı profili |
| 5-8 | `getVideos()` | mount | Kullanıcının videoları |

**Toplam: ~8 sorgu**

---

### 📖 Hikayeler — `app/story/[id].tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1-3 | `getStories()` | mount | Tüm aktif hikayelerin listesi |

**Toplam: ~3 sorgu** (TanStack Query ile cache'ten gelebilir)

---

### 🔎 Arama — `app/search.tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1 | `profiles.select('*').or(ilike...)` | kullanıcı input | Profil arama |
| 2 | `follows.select('following_id').in(...)` | kullanıcı input | Sonuçlar için follow durumu |
| 3 | `videos.select('id').ilike('description', ...)` | kullanıcı input | Video arama (açıklama) |
| 4 | `profiles.select('id').or(ilike...)` | kullanıcı input | Video arama (profil-yazar match) |
| 5 | `videos.select('id').in('user_id', [...])` | kullanıcı input | Yazar videoları |
| 6 | `videos.select('*, profiles(*)').in('id', [...])` | kullanıcı input | Video detayları |

**Toplam: ~6 sorgu (her arama)**

> ⚠️ **N+1 benzeri:** Arama akışı 3 ayrı aşamalı sorgu: ID bul → detay çek.

---

### 📝 Taslaklar — `app/drafts.tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1 | `drafts.select('*').eq('user_id', X)` | mount | Taslak listesi |

**Toplam: 1 sorgu** ✅

---

### 📊 Aktiviteler — `app/user/activities/[type].tsx`

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| — | `likes.select('video_id').eq('user_id', X)` | mount | Beğenilen video ID'leri |
| — | `videos.select('*, profiles(*)').in('id', [...])` | mount | Video detayları |
| — | `likes/saves/follows` batch | mount | Etkileşim durumları |

Type'a göre: `likes` → 4 sorgu, `saved` → 4 sorgu, `history` → 4 sorgu

---

### ⏺ Video İzleme Kaydı (Her video için)

| # | Sorgu | Tetikleyici | Amaç |
|---|-------|-------------|------|
| 1 | `video_views.select('viewed_at').eq(user/video)` | 2sn timer | Cooldown kontrolü |
| 2 | `video_views.insert(...)` | timer sonrası | İzleme kaydı |
| 3 | `rpc('increment_video_counter')` | insert sonrası | Sayaç artırma |

**Her video izlemede: 2-3 sorgu**

> ⚠️ **Yoğun:** Kullanıcı her videoyu 2sn izlediğinde 2-3 sorgu çalışır. Bu seri scroll'larda çok sayıda sorgu üretir.

---

## 3. ÇAKIŞAN VE TEKRARLAYAN SORGULAR

### 3.1 `profiles` Tablosu Çakışmaları

| Sorgu Noktası | Select Kolonları | Çağrı Yeri | Çakışma |
|---------------|-----------------|------------|---------|
| `getProfile()` | `*` (tüm kolonlar) | Profile tab, user/[id], Prefetch | 🔴 Ağır |
| `getProfileLite()` | `id, username, full_name, avatar_url, is_verified` | ~~Story bar~~ (artık kaldırıldı) | ✅ Kaldırıldı |
| `videos.select('*, profiles(*)')` | `profiles` join | Feed, Explore, Profile videos | 🟡 Join ile geliyor |
| `stories.select('*, profiles(*)')` | `profiles` join | Stories | 🟡 Join ile geliyor |
| `searchProfiles()` | `*` | Search | 🟢 Bağımsız |

**Analiz:**  
- `profiles` tablosu en az **5 farklı şekilde** sorgulanıyor.
- Video feed ve stories zaten `profiles(*)` join yapıyor — bu sayede feed'deki her videonun profil bilgisi tek sorguda geliyor ✅.
- `getProfile()` ise ayrıca `follows` + `stories` + `story_views` tabloları ile ek 3 sorgu daha yapıyor → **Bu kısım optimize edilmeli.**

### 3.2 `follows` Tablosu Çakışmaları

| Sorgu Noktası | Koşul | Çağrı Yeri |
|---------------|-------|------------|
| `getVideos()` içinde batch | `follower_id=X, in('following_id', ids)` | Feed, Explore, Profile |
| `getProfile()` içinde count | `follower_id=viewer, following_id=user` | Profile, Prefetch |
| `searchProfiles()` içinde batch | `follower_id=viewer, in('following_id', ids)` | Search |
| `toggleFollow/unfollow` | insert/delete | Etkileşim |

**Analiz:**  
- `follows` tablosuna neredeyse her sayfadan bağımsız sorgular gidiyor.
- Feed'deki `getVideos()` zaten batch olarak follow durumlarını çekiyor → `getProfile()` içindeki tekil follow kontrolü gereksiz olabilir.

### 3.3 `stories` + `story_views` Çakışmaları

| Sorgu Noktası | Amaç | Çağrı Yeri |
|---------------|------|------------|
| `getStories()` | Tüm stories + views | Feed, Explore, Story modal |
| `getProfile()` inner | `stories.select('id')` tek user | Profile, Prefetch |
| `getProfile()` inner | `story_views.select(count)` | Profile, Prefetch |

**🔴 Kritik Çakışma:**  
- `getStories()` zaten **tüm** aktif storyleri + tüm `story_views`'ları çekiyor.
- `getProfile()` aynı bilgiyi **tek kullanıcı için tekrar** sorguluyor.
- `getProfile()` içindeki story kontrolü tamamen **gereksiz** — `getStories()` verisinden türetilebilir.

---

## 4. N+1 RİSK ANALİZİ

### 🔴 Yüksek Risk

| Pattern | Dosya | Açıklama |
|---------|-------|----------|
| **getProfile() waterfall** | `SupabaseProfileDataSource.getProfile()` | 4 ardışık sorgu: profiles → follows → stories → story_views. Bunlar `Promise.all` ile paralelleştirilebilir. |
| **recordVideoView()** | `SupabaseVideoDataSource.recordVideoView()` | 3 ardışık sorgu: cooldown kontrolü → insert → RPC. Her video izlemede tetiklenir. |
| **Search waterfall** | `SupabaseVideoDataSource.searchVideos()` | 3 aşamalı: description search + profile search → author video search → getVideosByIds. |

### 🟡 Orta Risk

| Pattern | Dosya | Açıklama |
|---------|-------|----------|
| **getVideosByIds interaction batch** | `SupabaseVideoDataSource.getVideosByIds()` | Video çekimi sonrası 3 ek batch sorgu (likes, saves, follows). Patterns tekrarlanıyor. |
| **getSavedVideos waterfall** | `UserActivityRepositoryImpl.getSavedVideos()` | saves tablosundan ID'ler → getVideosByIds (4 sorgu total). |

### 🟢 Düşük Risk

| Pattern | Dosya | Açıklama |
|---------|-------|----------|
| **toggleLike/toggleSave** | `InteractionDataSource` | SELECT + INSERT/DELETE (zorunlu: idempotent olmalı). |

---

## 5. MİNİMUM SORGU MİMARİSİ ÖNERİSİ

### 5.1 getProfile() → Tek RPC ile 4'ten 1'e

**Mevcut durum:** 4 ardışık sorgu
```
profiles.select(*) → follows.select(count) → stories.select(id) → story_views.select(count)
```

**Öneri:** Tek RPC fonksiyonu

```sql
CREATE OR REPLACE FUNCTION get_profile_full(
    p_user_id UUID,
    p_viewer_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', row_to_json(p.*),
        'is_following', CASE 
            WHEN p_viewer_id IS NOT NULL THEN 
                EXISTS(SELECT 1 FROM follows WHERE follower_id = p_viewer_id AND following_id = p_user_id)
            ELSE false 
        END,
        'has_stories', EXISTS(
            SELECT 1 FROM stories WHERE user_id = p_user_id AND expires_at > NOW()
        ),
        'has_unseen_story', CASE
            WHEN p_viewer_id IS NOT NULL THEN (
                SELECT COUNT(*) FROM stories s 
                WHERE s.user_id = p_user_id AND s.expires_at > NOW()
                AND NOT EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = p_viewer_id)
            ) > 0
            ELSE true
        END
    ) INTO result
    FROM profiles p
    WHERE p.id = p_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Kazanç:** 4 sorgu → 1 RPC. ~75% azalma.

---

### 5.2 recordVideoView() → Tek RPC ile 3'ten 1'e

**Mevcut durum:** 3 ardışık sorgu
```
video_views.select(cooldown) → video_views.insert → rpc(increment_video_counter)
```

**Öneri:**
```sql
CREATE OR REPLACE FUNCTION record_video_view(
    p_user_id UUID,
    p_video_id UUID,
    p_cooldown_ms INT DEFAULT 1800000
)
RETURNS TEXT AS $$  -- returns 'inserted' | 'cooldown'
DECLARE
    last_viewed TIMESTAMPTZ;
BEGIN
    SELECT viewed_at INTO last_viewed
    FROM video_views
    WHERE user_id = p_user_id AND video_id = p_video_id
    ORDER BY viewed_at DESC
    LIMIT 1;
    
    IF last_viewed IS NOT NULL AND 
       EXTRACT(EPOCH FROM (NOW() - last_viewed)) * 1000 < p_cooldown_ms THEN
        RETURN 'cooldown';
    END IF;
    
    INSERT INTO video_views (user_id, video_id) VALUES (p_user_id, p_video_id);
    UPDATE videos SET views_count = views_count + 1 WHERE id = p_video_id;
    
    RETURN 'inserted';
END;
$$ LANGUAGE plpgsql;
```

**Kazanç:** 3 sorgu → 1 RPC. Her video izleme %66 daha az sorgu.

---

### 5.3 getStories() → story_views embed ile 3'ten 2'ye

**Mevcut durum:**
```
stories.select('*, profiles(*)') → auth.getUser() → story_views.select(story_id)
```

**Öneri:** `auth.getUser()` çağrısını kaldır, userId'yi parametre olarak al (zaten useAuthStore'da var):

```typescript
// SupabaseVideoDataSource.ts
async getStories(userId?: string): Promise<Story[]> {
    const now = new Date().toISOString();

    const [storiesResult, viewsResult] = await Promise.all([
        supabase.from('stories').select('*, profiles(*)').gt('expires_at', now).order('created_at', { ascending: false }).limit(50),
        userId ? supabase.from('story_views').select('story_id').eq('user_id', userId) : Promise.resolve({ data: [] })
    ]);
    // ... map results
}
```

**Kazanç:** `auth.getUser()` çağrısı kaldırıldı (yavaş async call), 2 sorgu paralel çalışır.

---

### 5.4 Profil Sayfası — 13'ten 6'ya

**Mevcut:** Profile tab = getProfile(4) + getVideos(4) + getSavedVideos(5) = **13 sorgu**

**Öneri:**
1. `getProfile()` → RPC ile **1 sorgu** (5.1)
2. `getVideos()` → mevcut hali zaten verimli, **4 sorgu** (zorunlu: video + likes + saves + follows batch)
3. `getSavedVideos()` → **Lazy load** (tab'a tıklanınca yükle, mount'ta değil)

**Kazanç:** 13 → 5 sorgu (ilk açılış), saved videos lazily yüklenince toplam ~10.

---

### 5.5 Search → 2 Aşamaya İndir

**Mevcut:** 6 sorgu (aşamalı waterfall)
**Öneri:** Full-text search RPC ile tek sorguya indir:

```sql
CREATE OR REPLACE FUNCTION search_content(
    p_query TEXT,
    p_limit INT DEFAULT 20
)
RETURNS TABLE(content_type TEXT, content_id UUID) AS $$
BEGIN
    RETURN QUERY
    -- Videos by description
    SELECT 'video'::TEXT, v.id FROM videos v 
    WHERE v.deleted_at IS NULL AND v.description ILIKE '%' || p_query || '%'
    UNION
    -- Videos by author
    SELECT 'video'::TEXT, v.id FROM videos v
    JOIN profiles p ON v.user_id = p.id
    WHERE v.deleted_at IS NULL 
    AND (p.username ILIKE '%' || p_query || '%' OR p.full_name ILIKE '%' || p_query || '%')
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Kazanç:** 6 sorgu → 2 sorgu (search RPC + getVideosByIds).

---

## 6. ÖNCE / SONRA KARŞILAŞTIRMASI

### App Açılış Senaryosu (Feed + Story Bar + Profile Prefetch)

| Akış | Önce | Sonra | Kazanç |
|------|------|-------|--------|
| getVideos (feed) | 4 sorgu | 4 sorgu | — |
| getStories | 3 sorgu | 2 sorgu | **-1** |
| getProfile (prefetch) | 4 sorgu | 1 RPC | **-3** |
| **TOPLAM** | **11** | **7** | **%36 ↓** |

### Profil Tab Açılış

| Akış | Önce | Sonra | Kazanç |
|------|------|-------|--------|
| getProfile | 4 sorgu | 0 (cache) | **-4** |
| getVideos | 4 sorgu | 4 sorgu | — |
| getSavedVideos | 5 sorgu | 0 (lazy) | **-5** |
| **TOPLAM** | **13** | **4** | **%69 ↓** |

### Video İzleme (per video)

| Akış | Önce | Sonra | Kazanç |
|------|------|-------|--------|
| recordVideoView | 3 sorgu | 1 RPC | **-2** |
| **TOPLAM** | **3** | **1** | **%66 ↓** |

### Arama (per search)

| Akış | Önce | Sonra | Kazanç |
|------|------|-------|--------|
| searchVideos | 6 sorgu | 2 sorgu | **-4** |
| **TOPLAM** | **6** | **2** | **%66 ↓** |

---

## 7. ÖNCELİK SIRASI (Uygulama Yol Haritası)

| Öncelik | Eylem | Etki | Zorluk | Tahmini Kazanç |
|---------|-------|------|--------|----------------|
| 🔴 P0 | `get_profile_full` RPC oluştur | Her profil görüntülemede 4→1 | Orta | %75/sorgu |
| 🔴 P0 | `record_video_view` RPC oluştur | Her video izlemede 3→1 | Kolay | %66/sorgu |
| 🟡 P1 | getStories'den `auth.getUser()` kaldır | App başlangıcında -1 sorgu | Kolay | %33/stories |
| 🟡 P1 | SavedVideos lazy load | Profil açılışı 13→8 | Kolay | %38/profil |
| 🟡 P1 | getProfile() waterfall → Promise.all | Profil yükleme hızı | Kolay | Latency %50↓ |
| 🟢 P2 | Search RPC | Arama akışı 6→2 | Orta | %66/arama |
| 🟢 P2 | getVideos interaction batch → RPC | Feed/explore her yerde | Yüksek | Yapısal iyileşme |

---

## 8. JSON ÇIKTI

```json
[
  {
    "page": "Feed (tabs/index)",
    "queries": ["getVideos(4)", "getStories(3)", "getProfile-prefetch(4)"],
    "tables": ["videos", "profiles", "likes", "saves", "follows", "stories", "story_views"],
    "issues": ["getProfile 4 seri sorgu", "getStories auth.getUser() çağrısı gereksiz"],
    "recommended_merge": "getProfile → get_profile_full RPC, getStories userId parametre olarak al"
  },
  {
    "page": "Explore (tabs/explore)",
    "queries": ["getVideos(4)", "getStories(3)"],
    "tables": ["videos", "profiles", "likes", "saves", "follows", "stories", "story_views"],
    "issues": ["Stories Feed ile aynı sorgu (TanStack cache çözüyor)"],
    "recommended_merge": "Cache yeterli, ek aksiyon gerekmez"
  },
  {
    "page": "Profile (tabs/profile)",
    "queries": ["getProfile(4)", "getVideos(4)", "getSavedVideos(5)"],
    "tables": ["profiles", "videos", "likes", "saves", "follows", "stories", "story_views"],
    "issues": ["13 sorgu çok ağır", "getSavedVideos mount'ta yükleniyor"],
    "recommended_merge": "getProfile → RPC, getSavedVideos → lazy load"
  },
  {
    "page": "User Profile (user/[id])",
    "queries": ["getProfile(4)", "getVideos(4)"],
    "tables": ["profiles", "videos", "likes", "saves", "follows", "stories", "story_views"],
    "issues": ["getProfile 4 seri sorgu"],
    "recommended_merge": "getProfile → get_profile_full RPC"
  },
  {
    "page": "Story (story/[id])",
    "queries": ["getStories(3)"],
    "tables": ["stories", "profiles", "story_views"],
    "issues": ["auth.getUser() gereksiz"],
    "recommended_merge": "userId parametre olarak al"
  },
  {
    "page": "Search",
    "queries": ["searchProfiles(2)", "searchVideos(4-6)"],
    "tables": ["profiles", "follows", "videos"],
    "issues": ["3 aşamalı waterfall arama"],
    "recommended_merge": "search_content RPC ile 6→2"
  },
  {
    "page": "Activities (user/activities/[type])",
    "queries": ["getLikedVideos(4) OR getSavedVideos(4) OR getWatchHistory(4)"],
    "tables": ["likes/saves/video_views", "videos", "profiles"],
    "issues": ["getVideosByIds her seferinde etkileşim batch sorguları yapıyor"],
    "recommended_merge": "Activities sayfası için etkileşim sorgularını skip et (kendi liked/saved listesi olduğu için zorunlu değil)"
  },
  {
    "page": "Video View Tracking (her video)",
    "queries": ["recordVideoView(3)"],
    "tables": ["video_views", "videos"],
    "issues": ["3 seri sorgu, yüksek frekans"],
    "recommended_merge": "record_video_view RPC ile 3→1"
  }
]
```

---

## 9. SONUÇ

### Mevcut Durum
- App açılışında **~11 Supabase sorgusu**
- Profil sayfası açılışında **~13 sorgu**
- Her video izlemede **3 sorgu**
- Toplam: Bir kullanıcı oturumunda (5dk, 10 video izleme) yaklaşık **~55-60 Supabase sorgusu**

### Hedef Mimari
- App açılışında **~7 sorgu** (%36 azalma)
- Profil sayfası **~4 sorgu** (%69 azalma)  
- Her video izlemede **1 sorgu** (%66 azalma)
- Toplam aynı senaryo: **~25-30 sorgu** (%50+ azalma)

### En Yüksek Öncelikli 2 Aksiyon
1. **`get_profile_full` RPC** — Bir kere yaz, her yerde kullan. Profil görüntüleme her sayfada var.
2. **`record_video_view` RPC** — En sık çalışan sorgu. Her video izlemede 3→1.

Bu iki değişiklik tek başına toplam sorgu hacmini **%40-50** azaltır.
