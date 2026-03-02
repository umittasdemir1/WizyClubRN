# 2026-03-02 Mobile Supabase DB Measurement Plan

Bu dokuman, mobile query optimizasyonlarindan sonra database tarafinda yaptigimiz ilk olcum fazini ve bundan sonra uygulanacak DB tuning sirasini toplar.

- once olc
- sonra index ver
- en son gerekirse daha ileri olcekleme kararlarini al

Bu faz artik yalnizca plan degil; SQL Editor uzerinde calistirilan gercek olcumlerin ozeti de asagidadir.

## Neden Bu Faz Oncelikli?

Su an:

- kritik mobile read-model RPC'ler canlida aktif
- query sayisi buyuk oranda dusuruldu
- mimari dogru yone alinmis durumda

Bu noktadan sonra en buyuk hata, olcmek yerine tahminle index eklemek olur.

Bu yuzden ilk odak:

- `EXPLAIN ANALYZE`
- `pg_stat_statements`
- mevcut index manzarasi

olmali.

## Kullanilan SQL Dosyasi

Supabase SQL Editor'da kullanilan dosya:

- [mobile-query-explain-analyze.sql](/home/user/WizyClubRN/backend/scripts/sql/mobile-query-explain-analyze.sql)

Bu dosya su olcumleri icerir:

1. `get_feed_page_v1`
2. `get_user_interaction_v1(saved)`
3. `get_user_interaction_v1(history)`
4. `search_hashtags_v1`
5. mevcut index listesi
6. opsiyonel `pg_stat_statements` bakisi

## Uygulanan Olcumler

Su bloklar Supabase SQL Editor'da tek tek calistirildi:

1. `get_feed_page_v1`
2. `get_user_interaction_v1(saved)`
3. `get_user_interaction_v1(history)`
4. `search_hashtags_v1`

Not:

- `pg_stat_statements` adimi bu turda henuz calistirilmadi
- elimizdeki ilk karar seti su an `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)` sonuclarina dayaniyor

## Olcum Sonuclari

### 1. `get_feed_page_v1`

- `Execution Time`: yaklasik `4.87 ms`
- `Actual Rows`: `10`
- `Shared Hit Blocks`: `1021`
- `Shared Read Blocks`: `0`
- sonuc: feed yolu su an hizli ve saglikli

### 2. `get_user_interaction_v1(saved)`

- `Execution Time`: yaklasik `45.75 ms`
- `Actual Rows`: `8`
- `Shared Hit Blocks`: `1082`
- `Shared Read Blocks`: `0`
- sonuc: en pahali sicak yol burasi

### 3. `get_user_interaction_v1(history)`

- `Execution Time`: yaklasik `23.54 ms`
- `Actual Rows`: `17`
- `Shared Hit Blocks`: `1153`
- `Shared Read Blocks`: `0`
- sonuc: `saved` modundan iyi, ama feed'den belirgin sekilde agir

### 4. `search_hashtags_v1`

- `Execution Time`: yaklasik `6.45 ms`
- `Actual Rows`: `1`
- `Shared Hit Blocks`: `513`
- `Shared Read Blocks`: `0`
- sonuc: su an icin kabul edilebilir

## Bu Sonuclar Ne Soyluyor?

- diskten okuma yok; tum olcumlerde `Shared Read Blocks = 0`
- yani ilk sinyalimiz IO krizi degil, query sekli ve index verimliligi
- feed ve hashtag aramasi bugun icin saglikli
- asil tuning ihtiyaci `get_user_interaction_v1`, ozellikle `saved` modunda
- planlar `Function Scan` olarak gorundugu icin fonksiyon govdesindeki alt join adimlarini bu ciktilardan tam acamiyoruz

Bu yuzden bugunku karar:

- database tarafi yanlis yonetilmiyor
- ama activity read-model yolu bir sonraki net DB optimizasyon hedefi

## Neye Bakiyoruz?

### 1. Seq Scan var mi?

Asagidaki tablolar icin ozellikle dikkat:

- `videos`
- `likes`
- `saves`
- `follows`
- `video_views`
- `hashtags`
- `video_hashtags`

Eger buyuk tabloda pahali `Seq Scan` goruyorsak:

- filtre
- siralama
- join

deseni icin yeni index gerekir.

### 2. Sort maliyeti yuksek mi?

Ozellikle:

- `created_at desc, id desc`
- skor bazli hashtag siralamasi

gibi yerlerde `Sort` maliyeti buyukse, composite index dusunmeliyiz.

### 3. Rows / Buffers orantisi kotu mu?

Eger:

- az satir donuyor
- ama cok buffer okunuyorsa

query sekli dogru olsa bile index zayif demektir.

### 4. RPC icindeki alt sorgular agir mi?

Olcumler `Function Scan` dondugu icin bu turda fonksiyon icindeki alt adimlari dogrudan goremedik.

Bu nedenle bir sonraki teknik arac:

- `pg_stat_statements`
- gerekiyorsa fonksiyon govdesini ayri `EXPLAIN` etmek

olacak.

Ozellikle `Exists`, `HashAggregate`, `Nested Loop`, `Bitmap Heap Scan` gibi adimlarin:

- hangi tabloda
- ne kadar satir uzerinden
- ne kadar buffer ile

calistigina bakacagiz.

## Ilk Index Adaylari

Olcum sonucuna gore ilk mantikli adaylar bunlar:

1. `likes (user_id, created_at desc, video_id) where video_id is not null`
2. `saves (user_id, created_at desc, video_id)`
3. `post_tags (video_id, created_at, id)`
4. `videos (created_at desc, id desc) where deleted_at is null`
5. `videos (user_id, created_at desc, id desc) where deleted_at is null`

Not:

- bugunku verilere gore oncelik `likes/saves/post_tags`
- `videos` index'leri feed'i daha da sertlestirmek icin ikinci sirada
- `hashtags(name)` trigram index su an acil degil; `search_hashtags_v1` su an kotu sinyal vermiyor

## pg_stat_statements Neden Gerekli?

`EXPLAIN ANALYZE` bize plan gosterir.

Ama `pg_stat_statements` sunu gosterir:

- gercekte en cok hangi query calisiyor
- en cok toplam zamani hangi query yiyor
- ortalamasi hangi query kotu

Yani:

- plan = teorik/teknik dogruluk
- stats = canli yukte gercek etki

Ikisini birlikte gormek gerekir.

## Bu Fazdan Sonra Ne Yapacagiz?

1. `likes`, `saves`, `post_tags` ve gerekirse `videos` icin hedefli index SQL'lerini yazacagiz.
2. Bu index'leri uyguladiktan sonra ayni [mobile-query-explain-analyze.sql](/home/user/WizyClubRN/backend/scripts/sql/mobile-query-explain-analyze.sql) bloklarini tekrar calistiracagiz.
3. `get_user_interaction_v1(saved)` ve `history` icin gercek iyilesmeyi ms ve buffer bazinda tekrar olcecegiz.
4. Ardindan `pg_stat_statements` ile canlidaki toplam agirlik/frekans resmini cikaracagiz.
5. Sonraki fazda ancak gerekirse upload polling, broadcast ve ileri DB olcekleme kararlarina gececegiz.

## Kisa Karar

Bu fazin hedefi yeni ozellik degil.

Bu fazin hedefi:

- database'i olcumle yonetmek
- activity yolundaki sicak noktayi hedefli index ile dusurmek
- gereksiz index spam'inden kacinmak
