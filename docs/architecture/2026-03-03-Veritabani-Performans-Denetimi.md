# 🔍 WizyClub — Veritabanı Performans ve Mimari Denetimi

**Tarih:** 2026-03-03  
**Rol:** Senior Backend & Database Performance Engineer  
**Kapsam:** PostgreSQL + Supabase + İstemci Veri Katmanı  

---

## 📊 Genel Durum Özeti

| Kategori | Durum | Bulgu Sayısı |
|---|---|---|
| 🔴 Kritik (hemen düzeltilmeli) | Var | 4 |
| 🟡 Önemli (yakın zamanda düzeltilmeli) | Var | 5 |
| 🟢 Bilgilendirme / İyileştirme | Var | 6 |
| ✅ Sorunsuz | — | 5 |

---

## 🔴 KRİTİK BULGULAR

### 1. Sequential Scan Krizi: `profiles` Tablosu
**Seviye:** 🔴 Kritik  
**Etki:** Her feed yüklemesi, every like/save/follow işleminde performans kaybı

```
profiles tablosu istatistikleri:
- Sequential Scan: 212,202 kez
- Index Scan: 19 kez
- Okunan Satır: 833,855
- Gerçek Satır: 4
```

**Neden:** `get_feed_page_v1` fonksiyonu `profiles` tablosunu `id::text = user_id::text` cast'iyle join ediyor. Bu cast, PostgreSQL'in mevcut PK indeksini kullanmasını engelliyor ve her sorguda full table scan yapılıyor.

**Aynı sorun şu tablolarda da var:**
| Tablo | Seq Scan | Idx Scan | Oran |
|---|---|---|---|
| `profiles` | 212,202 | 19 | **11,168x** |
| `saves` | 124,636 | 2,547 | **49x** |
| `likes` | 66,438 | 1,381 | **48x** |
| `follows` | 65,831 | 678 | **97x** |
| `videos` | 52,966 | 25,818 | **2x** |

**Kök Neden:** `get_feed_page_v1`, `get_user_interaction_v1` ve `search_content` fonksiyonlarında `user_id::text` casting kullanımı. UUID sütunları `::text`'e cast edildiğinde indeks kullanılamıyor.

---

### 2. `toggle_like_v1` / `toggle_save_v1`: information_schema Sorgusu
**Seviye:** 🔴 Kritik  
**Etki:** Her like/save toggle işleminde gereksiz 2 ekstra sorgu

Her çağrıda bu fonksiyonlar ilk olarak `information_schema.columns` tablosunu sorguluyor:

```sql
SELECT c.data_type
INTO user_id_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'likes'
  AND c.column_name = 'user_id';
```

**Sorun:** Kolon tipi çalışma zamanında hiçbir zaman değişmez. Bu sorgu tamamen gereksiz ve her toggle işleminde bir round-trip ekliyor. Ayrıca `EXECUTE` (dynamic SQL) kullanımı plan cache'ini devre dışı bırakıyor.

---

### 3. `search_content`: ILIKE Tam Tablo Tarama
**Seviye:** 🔴 Kritik  
**Etki:** Arama performansı veri büyüdükçe doğrusal olarak kötüleşecek

```sql
WHERE v.description ILIKE '%arama_terimi%'
  OR p.username ILIKE '%arama_terimi%'
  OR p.full_name ILIKE '%arama_terimi%'
```

`ILIKE '%...%'` kullanımı hiçbir B-Tree indeksinden yararlanamaz. `pg_trgm` eklentisi ve GIN indeksi gerekiyor.

---

### 4. `user_sessions` Tablosu: Kontrol Dışı Büyüme
**Seviye:** 🔴 Kritik  
**Etki:** En büyük tablo (2.3 MB, 12,564 satır), temizlenmiyor

```
user_sessions: 12,564 satır, 2,312 KB
Seq Scan: 120 kez
Seq Tup Read: 276,538 satır okunmuş
```

Oturum kayıtları hiçbir zaman otomatik olarak temizlenmiyor. Bu tablo büyümeye devam edecek ve performansı etkileyecek.

---

## 🟡 ÖNEMLİ BULGULAR

### 5. `get_feed_page_v1`: N+1 Benzeri Alt-Sorgu Deseni
**Seviye:** 🟡 Önemli

Feed RPC'si her video için 3 adet `EXISTS` alt-sorgusu çalıştırıyor:
- `is_liked`: likes tablosunda sequential scan
- `is_saved`: saves tablosunda sequential scan
- `is_following`: follows tablosunda sequential scan

10 videoluk bir sayfa için toplam **30 sequential scan** çalışıyor. Bileşik indeksler bu sorunu çözer.

### 6. `record_video_view_v2`: İndeks Eksikliği (DÜZELTİLDİ ✅)
**Seviye:** ✅ Düzeltildi

Composite index eklendi: `idx_video_views_user_video_viewed (user_id, video_id, viewed_at DESC)`

### 7. Kullanılmayan İndeksler: 20 Adet
**Seviye:** 🟡 Bilgi

20 indeks hiç kullanılmamış. Yazma performansını olumsuz etkileyen indeksler güncellenebilir. Ancak henüz production'a çıkılmadığından beklenmeli.

### 8. `handle_counters` ve `handle_social_counters`: Race Condition Riski
**Seviye:** 🟡 Önemli

```sql
UPDATE videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
```

Yoğun trafikte eşzamanlı güncellemeler sırasında doğru çalışması için `SELECT ... FOR UPDATE` veya `pg_advisory_lock` gerekebilir. Şu an küçük ölçekte sorun yok, ama ölçeklenme planı olmalı.

### 9. `saves` ve `likes` Tabloları: Bileşik İndeks Eksikliği
**Seviye:** 🟡 Önemli

`get_feed_page_v1` fonksiyonunda:
```sql
EXISTS(SELECT 1 FROM likes l WHERE l.user_id::text = p_user_id AND l.video_id = v.id)
EXISTS(SELECT 1 FROM saves s WHERE s.user_id::text = p_user_id AND s.video_id = v.id)
EXISTS(SELECT 1 FROM follows f WHERE f.follower_id::text = p_user_id AND f.following_id::text = v.user_id)
```

Bu sorguları hızlandırmak için bileşik indeksler gerekiyor:
- `likes(user_id, video_id)`
- `saves(user_id, video_id)` 
- `follows(follower_id, following_id)`

---

## 🟢 BİLGİLENDİRME / İYİLEŞTİRME

### 10. RLS Politikaları: Düzeltildi ✅
Önceki denetimde düzeltildi. 10 adet aşırı izinli politika kapatıldı, 20 fonksiyona `search_path` eklendi, tüm initplan uyarıları giderildi.

### 11. Realtime Subscription Verimliliği
**Seviye:** 🟢 Bilgi

`realtime.list_changes` fonksiyonu 1.27M kez çağrılmış (toplam 5,959 saniye). Bu Supabase altyapısı tarafından yönetiliyor ve doğrudan müdahale edilemez. Ancak gereksiz yere tüm tablolara Realtime açıldıysa kapatılmalı.

### 12. Connection Pooling
**Seviye:** 🟢 Bilgi

Supabase free plan'de PgBouncer transaction mode ile çalışıyor. Şu an yeterli.

### 13. Normalizasyon vs Denormalizasyon
**Seviye:** 🟢 İyi

Counter alanları (`likes_count`, `saves_count`, `views_count` vb.) doğru bir şekilde denormalize edilmiş ve trigger'larla senkronize ediliyor. Bu, feed sorgularında JOIN'leri ortadan kaldırıyor.

### 14. Depolama ve Egress
**Seviye:** 🟢 Bilgi

R2 proxy üzerinden video sunumu yapılıyor (`wizy-r2-proxy.tasdemir-umit.workers.dev`). Dosya URL'leri normalize ediliyor. Sorunsuz.

### 15. Transaction Integrity
**Seviye:** 🟢 İyi

`edit_video_atomic` fonksiyonu atomik olarak çalışıyor. `toggle_like_v1` ve `toggle_save_v1` unique violation'ı yakalıyor.

---

## ✅ SORUNSUZ ALANLAR

| Alan | Durum |
|---|---|
| **Cursor-based Pagination** | ✅ `get_feed_page_v1` cursor-based pagination kullanıyor (`created_at + id`) |
| **İstemci Önbellekleme** | ✅ React Query ile staleTime/cacheTime stratejisi var |
| **Clean Architecture** | ✅ Domain → Data → Presentation katmanları doğru ayrılmış |
| **Query Batching** | ✅ Feed tek RPC'de listeliyor, N+1 sorgu istemci tarafında yok |
| **Güvenlik (RLS)** | ✅ Önceki denetimde düzeltildi |

---

## 📈 Tablo Boyutları ve Satır Sayıları

| Tablo | Satır | Toplam Boyut | Tablo | İndeks |
|---|---|---|---|---|
| user_sessions | 12,564 | 2,312 KB | 1,096 KB | 1,216 KB |
| videos | 38 | 360 KB | 176 KB | 184 KB |
| video_views | 380 | 240 KB | 56 KB | 184 KB |
| subtitles | 17 | 184 KB | 88 KB | 96 KB |
| likes | 12 | 152 KB | 8 KB | 144 KB |
| hashtags | 22 | 112 KB | 8 KB | 104 KB |
| post_tags | 10 | 112 KB | 8 KB | 104 KB |
| stories | 0 | 96 KB | 8 KB | 88 KB |
| profiles | 4 | 48 KB | 8 KB | 40 KB |

---

## 🏗️ Tetikleyiciler (Triggers)

| Tablo | Trigger | Olay | Fonksiyon |
|---|---|---|---|
| follows | sync_follow_counters | INSERT/DELETE | handle_social_counters() |
| likes | sync_likes_counter | INSERT/DELETE | handle_counters() |
| saves | sync_saves_counter | INSERT/DELETE | handle_counters() |
| videos | sync_video_posts_counter | INSERT/DELETE | handle_social_counters() |
| video_hashtags | trg_video_hashtags_count | INSERT/DELETE | update_hashtag_post_count() |
| drafts | drafts_updated_at | UPDATE | update_drafts_updated_at() |

---

## 🎯 Öncelik Sıralaması

| Öncelik | Bulgu | Beklenen Etki |
|---|---|---|
| P0 | UUID::text cast kaldırma (get_feed, toggle_like, toggle_save) | **80%+ seq scan azalma** |
| P0 | information_schema sorgusu kaldırma | **Toggle işlem süresi %50 azalma** |
| P0 | Bileşik indeksler (likes, saves, follows) | **Feed sorgu süresi %60 azalma** |
| P1 | search_content ILIKE → pg_trgm GIN indeksi | **Arama %95 hızlanma** |
| P1 | user_sessions temizleme politikası | **Tablo boyutu kontrol altına alınır** |
| P2 | Kullanılmayan indeks değerlendirmesi | Disk alanı ve yazma performansı |
| P2 | handle_counters race condition koruması | Ölçeklenme hazırlığı |
