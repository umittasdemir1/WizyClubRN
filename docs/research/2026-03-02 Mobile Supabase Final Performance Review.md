# 2026-03-02 Mobile Supabase Final Performance Review

Bu dosya, `2026-03-02 Mobile Supabase Query Optimization Report.md` ve `2026-03-02 Mobile Supabase DB Measurement Plan.md` icindeki kararlarin birlestirilmis ve guncel tek kaynagidir.

Bu tarih itibariyla bu konu icin canonical dokuman budur.

## Faz Sirasi

1. Ilk analiz ve mimari yon: `Query Optimization Report`
2. Ilk olcum ve DB tuning: `DB Measurement Plan`
3. Birlesik son durum ve yurutme karari: bu dokuman

## Net Durum

Kritik seviyede acik bir hata, bloklayici eksik ya da yanlis query modeli kalmadi.

Mobile + Supabase hattinda su basliklar tamamlanmis durumda:

- query consolidation yapildi
- read-model RPC'ler canliya alindi
- toggle RPC'ler canliya alindi
- UI katmanindaki daginik Supabase erisimi buyuk oranda data layer'a toplandi
- auth/session erisimi ortak hatta toplandi
- `DeletedContentSheet` kullanici kapsamli ve limitli hale getirildi
- `useStories` shared channel + cache patch modeline tasindi
- story gorulme sorgusu sadece aktif story ID'leri ile sinirlandi
- watch history fallback akisi sadeleştirildi
- eksik `video_views` migration'i eklendi
- canli toggle/read-model hotfix'leri dogrulandi

Canliya alinmis ve dogrulanmis ana RPC'ler:

- `get_feed_page_v1`
- `get_user_interaction_v1`
- `search_hashtags_v1`
- `toggle_like_v1`
- `toggle_save_v1`
- mevcut diger destek RPC'leri (`search_content`, `record_video_view_v2`, `get_profile_full`)

Kisa karar:

- Bugun icin "database tarafini yanlis yonetiyoruz" denemez.
- Bugun icin "olcek altinda daha da iyi hale getirebiliriz" denir.

## Olcum ve DB Tuning Sonucu

Ilk `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)` turunda:

- `get_feed_page_v1`: yaklasik `4.87 ms`
- `get_user_interaction_v1(saved)`: yaklasik `45.75 ms`
- `get_user_interaction_v1(history)`: yaklasik `23.54 ms`
- `search_hashtags_v1`: yaklasik `6.45 ms`

Ilk sinyal:

- feed ve hashtag aramasi saglikli
- asil tuning ihtiyaci `get_user_interaction_v1`, ozellikle `saved`
- olcumler sicak cache uzerinden calisti

Ilk index hotfix paketi uygulandi:

- SQL: `backend/scripts/sql/mobile-query-index-hotfix.sql`

Ikinci olcum turunda:

- `get_user_interaction_v1(saved)`: `45.75 ms -> 9.64 ms`
- `get_user_interaction_v1(history)`: `23.54 ms -> 7.73 ms`
- `get_feed_page_v1`: `4.87 ms -> 6.97 ms`

Bu ne demek:

- activity read-model tarafindaki ana darboqaz hedefli sekilde dusuruldu
- feed tarafinda regresyon yok; hala tek haneli ms bandinda
- ilk index paketi beklenen hedefi tuttu

## pg_stat_statements Durumu

`pg_stat_statements` aktif ve ilk snapshot alindi.

Ancak bu ilk pencere:

- `EXPLAIN` sorgulari
- `CREATE FUNCTION`
- `CREATE INDEX`
- rollout sirasindaki DDL

ile kirlenmis durumda.

Ilk faydali sinyal olarak gorulen uygulama RPC ortalamalari saglikli:

- `get_feed_page_v1`: yaklasik `0.80 - 2.29 ms`
- `get_user_interaction_v1`: yaklasik `0.14 - 2.02 ms`
- `toggle_like_v1`: yaklasik `1.14 ms`
- `toggle_save_v1`: yaklasik `1.30 ms`
- `search_hashtags_v1`: yaklasik `0.39 ms`

Ama karar vermek icin daha temiz pencere gereklidir.

## Kalanlar: Hata Mi, Sonraki Faz Mi?

Ana mimari ve ilk tuning fazi tamamlandi.

Ancak su an halen kapatilmasi gereken uygulama seviyesinde acik teknik konular var.

Kalan basliklar sonraki performans ve olcekleme fazidir:

- temiz `pg_stat_statements` okumasi
- buyuk veri altinda ikinci dogrulama
- fallback kullanimini telemetry ile gorunur kilma
- upload polling'i guvenli sekilde event/payload modeline tasima
- gerekirse ikinci index paketi veya daha ileri DB olcekleme

Ek olarak loglardan gorulen acik operasyonel sorunlar:

- `get_feed_page_v1` su anda bazi ortamlarda fallback'e dusuyor; read-model RPC yolu stabil degil
- `SessionLogService` `user_sessions` insert hattinda hata veriyor
- `getStories()` fetch'inde hata goruluyor
- `get_profile_full` RPC yolunda bazi fetch hatalari goruluyor
- upload response payload'i ile dogrudan feed prepend denemesi gecici olarak rollback edildi; yeniden ancak dogru veri kontrati ve dogrulama ile acilacak

## Guncel Oncelik Sirasi

1. `get_feed_page_v1` fallback nedenini izole et ve read-model RPC yolunu tekrar stabil hale getir.
2. `SessionLogService`, `getStories()` ve `get_profile_full` tarafindaki canli hata kaynaklarini ayikla.
3. Mobil fallback kullanimini telemetry ile gorunur tut ve acik kalan fallback oranlarini dogrula.
4. Upload polling tarafini su an stabil polling-first modelde tut; payload-first akisi ancak dogru profile verisi ve tekrar dogrulama ile yeniden ac.
5. Temiz bir zaman penceresinde `pg_stat_statements` tekrar oku.
6. Veri buyudukce ayni `EXPLAIN` bloklarini periyodik tekrar dogrula.
7. Ancak bu verilerden sonra ikinci index paketi, replica veya daha ileri DB olcekleme dusun.

## Uygulama Olarak Sonraki Teknik Is

Kod tarafinda en dogru ilk is:

- fallback kullanimini sayilabilir hale getirmek
- hangi RPC'lerin ne kadar sik legacy yola dustugunu loglamak
- bir sonraki performans turu icin net sinyal toplamak

Bu, yeni index yazmaktan once daha dogru ve daha dusuk riskli adimdir.

## Superseded Dokumanlar

Asagidaki dosyalar tarihsel baglam icin tutulur ama artik tek basina karar kaynagi degildir:

- `2026-03-02 Mobile Supabase Query Optimization Report.md`
- `2026-03-02 Mobile Supabase DB Measurement Plan.md`

Bu konu icin guncel kararlar yalnizca bu dosyadan okunmalidir.
