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

Ilk index tuning turu sonrasinda ikinci olcumde:

- `get_user_interaction_v1(saved)`: `45.75 ms` -> `9.64 ms`
- `get_user_interaction_v1(history)`: `23.54 ms` -> `7.73 ms`
- `get_feed_page_v1`: `4.87 ms` -> `6.97 ms`

Bu da sunu gosteriyor:

- activity read-model tarafindaki asil darboqaz dogrudan dustu
- feed tarafi yeni index ile calisiyor ve hala saglikli tek haneli ms bandinda
- ilk index paketi beklenen hedefi tuttu

Bugun henuz ayrica olculmemis olanlar:

- `pg_stat_statements` icin test ve DDL gurultusundan arinmis daha temiz bir pencere
- hangi fallback yolunun ne kadar sik calistigi

Yani:

- mimari dogru
- ilk performans verisi alindi
- ilk index tuning turu uygulandi ve dogrulandi
- ilk `pg_stat_statements` snapshot'i da alindi
- artik sira daha temiz canli yuk penceresinde tekrar okumakta

## Kalan Riskler (Hata Degil)

### 1. Activity read-model icin DB takibi gerekli

Ilk index paketi uygulandi ve etkisi dogrulandi.

Bu yuzden bir sonraki teknik ihtiyac yeni index degil, canli yuk takibidir.

Ozellikle:

- `pg_stat_statements` ile gercek cagri frekansi
- toplam zaman / ortalama zaman dagilimi
- activity yolunun buyuk veri altindaki davranisi

Ilk `pg_stat_statements` snapshot'inda gercek uygulama RPC cagri ortalamalari saglikli gorunuyor:

- `get_feed_page_v1`: yaklasik `0.80 - 2.29 ms`
- `get_user_interaction_v1`: yaklasik `0.14 - 2.02 ms`
- `toggle_like_v1`: yaklasik `1.14 ms`
- `toggle_save_v1`: yaklasik `1.30 ms`
- `search_hashtags_v1`: yaklasik `0.39 ms`

Ancak ayni snapshot, bizim test/DDL sorgularimizi da iceriyor; bu yuzden bunu "ilk sinyal" olarak okuyup daha temiz bir pencerede tekrar bakmak gerekir.

### 2. Feed icin yeni query sekline ozel index eksik

Temel index'ler vardi; ilk tuning turunda feed icin yeni read-model index'i de eklendi.

Ozellikle:

- `videos (created_at desc, id desc) where deleted_at is null`
- `videos (user_id, created_at desc, id desc) where deleted_at is null`

benzeri partial/composite index'ler artik hazir.

Bu alan artik "eksik" degil; ikinci buyuk veri turunda sadece tekrar dogrulanmali.

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

### 1. pg_stat_statements'i temiz bir pencerede tekrar oku

`EXPLAIN ANALYZE` ilk ve ikinci turu tamamlandi.

Ilk index paketi uygulandi ve beklenen hiz kazanci alindi.

Bu yuzden ilk yapilmasi gereken su:

- gercekte en cok cagrilan sorgular
- en yavas sorgular
- toplam IO / total time agir sorgular

resmini cikarmak.

Not:

- mevcut snapshot kullanisli ama test ve rollout sorgulari ile kirlenmis durumda
- bir sonraki okumayi normal uygulama trafigi altinda yapmak daha dogru karar verir

### 2. Ikinci turu buyuk veri altinda tekrar dogrula

Index'lerden sonra ayni `EXPLAIN ANALYZE` bloklari tekrar calistirildi ve iyilesme dogrulandi.

Sonraki hedef:

- veri hacmi arttiginda bu metrikleri periyodik kontrol etmek
- activity ve feed tarafinda yeni regressions var mi bakmak

Basariyi su sekilde okuyacagiz:

- `saved` ve `history` tek haneli ms bandini koruyor mu?
- `Shared Read Blocks` veri buyudukce sicrama yapiyor mu?
- feed planinda aktif index stabil kullaniliyor mu?

### 3. Upload polling'i event modeline tas

En net bir sonraki mobil performans kazanci burada:

- backend response payload
veya
- Realtime Broadcast

ile upload sonrasi ikinci/ucuncu fetch'leri azaltmak.

### 4. Fallback kullanimini olc

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
2. Fallback kullanimini kisa telemetry ile gorunur hale getir.
3. Upload polling'i response payload veya Broadcast modeline tas.
4. Daha temiz bir zaman penceresinde `pg_stat_statements` tekrar oku.
5. Sonraki turda ancak gerekirse ikinci index paketi, replica veya ileri DB olcekleme dusun.
