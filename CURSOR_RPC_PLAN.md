# Cursor Pagination RPC Plan (Beklemede)

## Amaç
`videos` feed sorgusunu uygulama tarafı query builder + fallback modelinden çıkarıp, tek bir PostgreSQL RPC fonksiyonuna taşımak.

## Mevcut Durum
- App tarafında cursor pagination aktif.
- Sorgu `created_at + id` cursor mantığıyla çalışıyor.
- Olası parse/sorgu sorunu için app tarafında fallback query var.

## Hedef Durum
- Feed tamamen `supabase.rpc(...)` ile çekilecek.
- Cursor filtresi SQL içinde deterministik keyset pagination olarak çalışacak.
- App tarafındaki fallback ve karmaşık query kurma kodu kaldırılacak.

## Kapsam
1. DB tarafına RPC fonksiyonu ekleme
2. Gerekli indeksleri doğrulama/ekleme
3. Mobil data source katmanını RPC’ye taşıma
4. Fallback kodunu kaldırma
5. Test + gözlemleme

## Teknik Yaklaşım
### 1) RPC Fonksiyonu
- Örnek isim: `fetch_videos_cursor`
- Parametreler:
  - `p_limit int`
  - `p_user_id uuid`
  - `p_author_id uuid default null`
  - `p_cursor_created_at timestamptz default null`
  - `p_cursor_id uuid default null`
- Sıralama:
  - `ORDER BY created_at DESC, id DESC`
- Cursor koşulu:
  - `created_at < p_cursor_created_at`
  - veya `created_at = p_cursor_created_at AND id < p_cursor_id`

### 2) İndeks
- `videos` tablosunda bu sırayı destekleyen index:
  - `(created_at DESC, id DESC)`
- Yazar filtresi için (gerekirse):
  - `(user_id, created_at DESC, id DESC)`
- Soft delete filtresi için (gerekirse partial):
  - `WHERE deleted_at IS NULL`

### 3) App Değişikliği
- `SupabaseVideoDataSource.getVideos(...)` içinde query builder yerine RPC çağrısı.
- RPC sonucu `videos + nextCursor` formatına map edilecek.
- App fallback bloğu tamamen kaldırılacak.

## Test Planı
1. İlk yükleme (cursor yok) doğru çalışıyor mu?
2. Ardışık `loadMore` çağrılarında tekrar kayıt var mı?
3. Aynı `created_at` değerli kayıtlarda sıra/atlama sorunu var mı?
4. `authorId` filtreli profil feed’i doğru sayfalıyor mu?
5. Büyük veri (100k+) simülasyonunda performans kabul edilebilir mi?

## Rollback Planı
- RPC deploy’dan önce mevcut app query yolu bir feature flag altında tutulabilir.
- Sorun çıkarsa data source eski query yoluna geri çevrilir.

## Uygulama Sırası (Beklemede)
1. SQL migration dosyası hazırlama
2. RPC + index deploy
3. Mobil data source RPC geçişi
4. Fallback temizliği
5. QA + smoke test

## Not
Bu dosya plan amaçlıdır; şu an uygulanmadı, sadece sonraki adımlar için hazır bekletilmektedir.
