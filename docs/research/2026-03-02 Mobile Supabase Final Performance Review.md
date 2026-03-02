# 2026-03-02 Mobile Supabase Final Performance Review

Bu dokuman, `2026-03-02 Mobile Supabase Query Optimization Report.md` sonrasinda yapilan uygulamalarin ve son denetimin ozetidir.

Amac:

- kritik query optimizasyonlarinin gercekten tamamlanip tamamlanmadigini netlestirmek
- database tarafinin dogru yonetilip yonetilmedigini degerlendirmek
- kalan isleri "hata" ve "gelecek optimizasyon" olarak ayirmak

## Sonuc

Kritik seviyede acik bir hata, bloklayici eksik ya da "yanlis query modeli" kalmadi.

Mobile ve Supabase tarafi su an:

- dogru mimari yone alinmis durumda
- canli RPC'ler ile destekleniyor
- fallback mekanizmalari sayesinde guvenli calisiyor
- presentation/app katmaninda daginik Supabase erisimi tasimiyor

Kisa karar:

- Bugun icin "database tarafini yanlis yonetiyoruz" denemez.
- Bugun icin "olcek altinda daha da iyi hale getirebiliriz" denir.

## Tamamlanan Ana Basliklar

### 1. Query consolidation tamamlandi

Canliya alinmis ve dogrulanmis RPC'ler:

- `get_feed_page_v1`
- `get_user_interaction_v1(saved)`
- `get_user_interaction_v1(history)`
- `search_hashtags_v1`
- `toggle_like_v1`
- `toggle_save_v1`

Bu ne sagliyor:

- feed read akisi tek round-trip yola gecebilir
- liked/saved/history activity ekranlari tek read-model ile doner
- hashtag aramasi server-side aggregate ile donebilir
- like/save write akisi read-then-write yerine server-side toggle ile biter

### 2. Clean architecture sinirlari duzeldi

Mobile presentation/app katmaninda dogrudan:

- `supabase.from(...)`
- `supabase.rpc(...)`
- `supabase.channel(...)`
- daginik `supabase.auth.getSession()`

deseni kalmadi.

Bu, veri erisimini:

- data source
- repository
- use case
- service

katmanlarinda topladi.

### 3. Story Realtime modeli iyilesti

`useStories` artik:

- shared channel kullaniyor
- her eventte tum listeyi tekrar cekmiyor
- cache patch mantigi ile tekil story ekleme/guncelleme/silme yapiyor

Ek olarak `getStories()` artik kullanicinin tum `story_views` gecmisini cekmek yerine yalnizca aktif story ID'leri icin gorulme durumu okuyor.

### 4. Over-fetch riskleri daraltildi

- `DeletedContentSheet` kullanici kapsamli ve limitli hale geldi
- watch history fallback akisinda gereksiz ekstra query davranisi temizlendi
- repo tarafinda eksik `video_views` migration'i eklendi

## Database Tarafi Dogru Yonetiliyor mu?

Kisa cevap: Evet, yon dogru. Ama performansin "iyi" olmasi ile "olceklenebilir sekilde iyi" olmasi farkli seylerdir.

Bugun dogru olanlar:

- agir mobile read akislari server-side read-model ile toplandi
- write tarafinda atomik toggle fonksiyonlari var
- canli SQL dogrulandi
- mobile tarafinda fallback oldugu icin deploy riski dusuk
- sorgu seklini azaltma konusunda dogru oncelik secildi

Bugun olctugumuz ana noktalar:

- `get_feed_page_v1`: yaklasik `4.87 ms`
- `get_user_interaction_v1(saved)`: yaklasik `45.75 ms`
- `get_user_interaction_v1(history)`: yaklasik `23.54 ms`
- `search_hashtags_v1`: yaklasik `6.45 ms`

Bu ilk olcumler su sonucu veriyor:

- feed ve hashtag aramasi bugun icin saglikli
- asil tuning ihtiyaci `get_user_interaction_v1`, ozellikle `saved` modu
- tum olcumler cache uzerinden calisti (`Shared Read Blocks = 0`)

Bugun henuz ayrica olculmemis olanlar:

- `pg_stat_statements` ile gercek frekans / toplam maliyet dagilimi
- buyuk veri hacminde indeks etkinliginin ikinci olcum turu
- hangi fallback yolunun ne kadar sik calistigi

Yani:

- mimari dogru
- ilk performans verisi alindi
- artik sira hedefli index tuning'de

## Kalan Riskler (Hata Degil)

### 1. Activity read-model icin yeni query sekline ozel index eksik

Olcumler sonrasi en net hedef artik `get_user_interaction_v1`.

Ozellikle:

- `likes (user_id, created_at desc, video_id) where video_id is not null`
- `saves (user_id, created_at desc, video_id)`
- `post_tags (video_id, created_at, id)`

ilk yazilacak index adaylari.

### 2. Feed icin yeni query sekline ozel index eksik

Temel index'ler var, ama yeni read-model'e ozel en guclu kombinasyonlar henuz eklenmedi.

Ozellikle:

- `videos (created_at desc, id desc) where deleted_at is null`
- `videos (user_id, created_at desc, id desc) where deleted_at is null`

benzeri partial/composite index'ler feed buyudukce fark yaratacak.

Bu yok diye sistem yanlis degil, ama bu olmadan bir sure sonra gereksiz scan maliyeti buyur.

### 3. Story patch modeli hala event basina tekil fetch yapiyor

Bugunku model, full refetch'ten daha iyi.

Ama her `INSERT/UPDATE` olayinda tek bir `getStoryById()` fetch'i yapiyor.

Story frekansi cok artarsa bir sonraki adim:

- server-side Broadcast payload
- ya da daha ince domain event modeli

olmali.

### 4. Upload sonrasi polling tam bitmedi

Upload sonrasi ortak servisle temizlendi, ama hala:

- kisa sureli polling
- gerekirse feed refresh

deseni var.

En iyi sonraki adim:

- upload response icine minimal video DTO koymak
- ya da Realtime Broadcast ile ilgili oturuma "video hazir" eventi atmak

### 5. Hashtag arama icin DB tuning sonrasi yapilmali

`search_hashtags_v1` artik dogru yerde.

Ama arama yukunde gercek fark icin:

- `hashtags(name)` tarafinda trigram ya da uygun text index

degerlendirilmeli.

Bu, kod degil DB tuning fazidir.

### 6. Canli schema farkliligi riski artik kontrol altinda ama not edilmeli

Tarihsel migration dosyalarinda `user_id` tipleri yer yer `text`, canli ortamda bazi tablolarda `uuid`.

Bu yuzden toggle SQL'leri portable hale getirildi:

- alttaki kolon tipini runtime'da okuyup
- `text` ya da `uuid` varyantina gore calisiyor

Bu dogru cozum. Ama ileride schema standardizasyonu ayrica ele alinmali.

## Performans Onerileri (En Dogru Sonraki Faz)

### 1. Index tuning fazina gec

`EXPLAIN ANALYZE` ilk turu tamamlandi.

Bu yuzden ilk yapilmasi gereken su:

- `likes`
- `saves`
- `post_tags`
- ikinci sirada `videos`

icin hedefli index SQL yazmak ve uygulamak.

Ilk hedef:

- `get_user_interaction_v1(saved)` yolunu dusurmek
- sonra `history` ve feed'i ikinci turda tekrar olcmek

### 2. pg_stat_statements ile gercek agir query'leri olc

Hissettiren yavaslik yerine gercek maliyeti gormek icin:

- en cok cagrilan sorgular
- en yavas sorgular
- toplam IO / total time agir sorgular

tespit edilmeli.

Bu olmadan index kararlari kismen tahmin olur.

### 3. Ikinci olcum turunu yap

Index'lerden sonra ayni `EXPLAIN ANALYZE` bloklari tekrar calistirilmali.

Basariyi su sekilde okuyacagiz:

- `saved` ve `history` ms suresi duser mi?
- `Shared Hit Blocks` anlamsiz yuksek kalir mi?
- feed planinda ek buffer iyilesmesi olur mu?

### 4. Upload polling'i event modeline tas

En net bir sonraki mobil performans kazanci burada:

- backend response payload
veya
- Realtime Broadcast

ile upload sonrasi ikinci/ucuncu fetch'leri azaltmak.

### 5. Fallback kullanimini olc

Kod fallback'li yazildi. Bu guvenli.

Ama artik bilmek istedigimiz sey:

- gercekte hangi akislarda hala fallback'e dusuluyor?
- hangi ekranlar artik tam RPC yolunu kullaniyor?

Bunun icin kisa telemetry/log eklemek cok degerli olur.

## Net Durum

Bugun kalanlar ikiye ayriliyor:

### Hata / eksik tamamlama

Zorunlu bir hata ya da eksik tamamlama kalmadi.

### Sonraki optimizasyon fazi

Kalanlar:

- ikinci tur olcum
- index tuning
- upload eventlestirme
- schema standardizasyonu

basliklari.

Bu nedenle bugunku durum "tamamlanmamis refactor" degil, "yeni performans fazina hazir saglam taban" durumudur.

## Onerilen Sirali Sonraki Adimlar

1. `likes`, `saves`, `post_tags` ve `videos` icin hedefli index SQL'lerini yaz.
2. Bu index'leri uygulayip ayni `EXPLAIN ANALYZE` bloklarini tekrar olc.
3. `pg_stat_statements` ile gercek yuku cikar.
4. Upload polling'i response payload veya Broadcast modeline tas.
5. Sonraki turda ancak gerekirse replica / ileri DB olcekleme dusun.
