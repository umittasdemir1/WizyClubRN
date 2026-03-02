# 2026-03-02 Mobile Supabase Query Optimization Report

Bu rapor, mobile tarafindaki Supabase sorgularini inceleyip:

- tekrar eden veya gereksiz query desenlerini bulmak
- hangi alanlarda query sayisini dusurebilecegimizi netlestirmek
- Supabase tarafinda `Edge Functions`, `Realtime` ve diger ilgili ozelliklerin bize ne katacagini belirlemek

icin hazirlandi.

## Ozet

Mobile uygulamada en buyuk kazanc, yeni bir cache kutuphanesi eklemekten degil, mevcut veri erisim seklini daha az query ile daha tutarli hale getirmekten gelecek.

Kod taramasinda gordugum ana durum:

- feed ve activity ekranlarinda ayni "video + interaction hydration" modeli tekrar ediyor
- bazi sorgular hala UI katmaninda calisiyor
- like/save gibi etkilesimler hala "once oku, sonra yaz" seklinde iki adimli
- story ve upload sonrasi akislarda gereksiz tekrar fetch ve polling var
- Realtime su an kullaniliyor ama yalnizca invalidation tetikleyip tum listeyi yeniden cekiyor

Ana sonuc:

1. Ilk oncelik, client query sayisini azaltmak icin Postgres RPC / view / read-model katmanini genisletmek olmali.
2. `Edge Functions`, DB + dis servis + auth orkestrasyonu gereken islerde faydali olur; saf veri okuma kompozisyonu icin ilk tercih olmamali.
3. `Realtime`, hikaye halkasi ve upload tamamlama gibi dar kapsamli event akislarda faydali; ama "sicak" tablolari dogrudan genis capta `postgres_changes` ile dinlemek dikkatli yapilmali.

## Uygulama Durumu (2026-03-02 guncel)

Bu rapordaki ana maddeler artik kod ve canli SQL tarafinda uygulanmis durumda:

- `get_feed_page_v1` canliya alinmis durumda ve mobile feed fallback'li sekilde bunu kullaniyor
- `get_user_interaction_v1` canliya alinmis durumda; liked ve saved activity ekranlari bunu kullaniyor
- `toggle_like_v1` ve `toggle_save_v1` canliya alinmis durumda; mobile tarafi fallback'li sekilde bunlari deniyor
- UI katmanindaki dogrudan Supabase query'ler data layer / repository / service katmanina tasindi
- daginik `auth.getSession()` kullanimlari ortak auth store + helper/repository hattina toplandi
- `DeletedContentSheet` sorgusu data layer'a tasindi, kullanici kapsaminda ve limitli hale getirildi
- `useStories` artik shared channel kullaniyor; her eventte full invalidation yerine cache patch modeli uyguluyor
- `getStories()` kullanicinin tum `story_views` gecmisini cekmek yerine sadece aktif story ID'leri icin gorulme kayitlarini okuyor
- hashtag aramasi icin `search_hashtags_v1` RPC canliya alinmis durumda ve mobile fallback'li sekilde bunu destekliyor
- watch history icin `get_user_interaction_v1` history destegi canliya alinmis durumda
- canli ortamda toggle/read-model hotfix'leri uygulanmis ve dogrulanmis durumda
- yeni RPC'ler `verify:mobile-rpcs` ile canlida dogrulandi
- repo tarafinda eksik `video_views` migration'i eklendi ve toggle SQL dosyalari tarihsel `text` / guncel `uuid` schema varyantlarina uyumlu hale getirildi

Zorunlu bir uygulama adimi kalmadi.

Bu raporda kalan Faz 3 basliklari:

- `EXPLAIN`
- `pg_stat_statements`
- `index_advisor`
- index tuning / read replica degerlendirmesi

bir eksik tamamlama degil; sonraki performans olcekleme ve kapasite optimizasyon fazidir.

## Inceleme Kapsami

Kod taranan ana alanlar:

- `mobile/src/data/datasources/*`
- `mobile/src/data/repositories/*`
- `mobile/src/presentation/hooks/*`
- `mobile/src/presentation/components/*`
- `mobile/app/*`

Ozellikle su dosyalar sorgu yogunlugu acisindan hotspot:

- `mobile/src/data/datasources/SupabaseVideoDataSource.ts`
- `mobile/src/data/datasources/InteractionDataSource.ts`
- `mobile/src/data/repositories/UserActivityRepositoryImpl.ts`
- `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`
- `mobile/src/presentation/components/profile/DeletedContentSheet.tsx`
- `mobile/src/presentation/hooks/useStories.ts`
- `mobile/app/search.tsx`
- `mobile/app/UploadDetails.tsx`
- `mobile/app/subtitle-edit.tsx`

## Mevcut Query Deseni

Kod taramasina gore en cok erisilen tablolar:

- `videos`
- `likes`
- `saves`
- `follows`
- `story_views`
- `video_views`
- `drafts`
- `profiles`
- `video_hashtags`
- `hashtags`

Olumlu taraf:

- Bazi agir akislarda server-side toplama baslamis
- `search_content` RPC kullaniliyor
- `record_video_view_v2` RPC kullaniliyor
- `get_profile_full` RPC kullaniliyor

Bu iyi bir isaret. Yani mimari zaten RPC odakli optimizasyona uygun bir yone girmis. En yuksek verim, bunu daha genis uygulamaktan gelecek.

## Bulgular

### 1. Feed kisilestirme her sayfada 4 query uretiyor

`mobile/src/data/datasources/SupabaseVideoDataSource.ts:118` icindeki `getVideos()` akisi:

- 1 query: `videos`
- 1 query: `likes`
- 1 query: `saves`
- 1 query: `follows`

Bu desen `:194-198` bolgesinde acik. Yani her feed sayfasi, kullanici varsa en az 4 query ile donuyor.

Ayni hydration mantigi `getVideosByIds()` icinde de tekrar ediyor:

- `mobile/src/data/datasources/SupabaseVideoDataSource.ts:342`
- tekrar edilen interaction fetch: `:372-376`

Sonuc:

- feed listesi
- liked videos
- saved videos
- watch history
- arama sonucu hydrate etme

gibi farkli akislarda ayni interaction fetch mantigi tekrar tekrar calisiyor.

Bu, query sayisini buyutuyor ve iki ayri method arasinda ayni mantigin korunmasini zorlastiriyor.

### 2. Activity ekranlari 1 query degil, fiilen 5 query'ye cikabiliyor

`mobile/src/data/repositories/UserActivityRepositoryImpl.ts`

- `getLikedVideos()` once `likes` tablosundan ID listesi cekiyor (`:13-23`)
- sonra `getVideosByIds()` cagiriyor

`getVideosByIds()` kullanici ile cagirildiginda:

- 1 query: `videos`
- 1 query: `likes`
- 1 query: `saves`
- 1 query: `follows`

Yani `getLikedVideos()` toplamda fiilen 5 query oluyor.

Ayni durum:

- `getSavedVideos()` (`:26-35`)
- `getWatchHistory()` (`:38-49`)

icin de gecerli.

Bu ekranlar, tek bir "activity read-model" RPC ile ciddi sekilde ucuzlatilabilir.

### 3. Like ve save toggle hala read-then-write

`mobile/src/data/datasources/InteractionDataSource.ts`

- `toggleLike()` once `likes.select` ile kontrol ediyor (`:8-14`)
- sonra ya `delete` ya `insert` yapiyor (`:21-42`)

Ayni desen `toggleSave()` icin de var (`:46-90`).

Bu ne demek:

- her toggle, idealde 1 server-side karar ile bitecekken 2 adima bolunuyor
- race condition penceresi buyuyor
- write yogunlugunda gereksiz ekstra round-trip olusuyor

Bu tip akislarda RPC ile atomik "toggle ve sonucu don" modeli daha dogru.

### 4. Story akisi gerektiginden fazla `story_views` okuyabilir

`mobile/src/data/datasources/SupabaseVideoDataSource.ts:251` icindeki `getStories()` akisi:

- `stories` listesini cekiyor (`:255-262`)
- kullanici varsa tum `story_views` satirlarini cekiyor (`:263-265`)

Sorun:

- Bu ikinci query, sadece su an donen story ID'leri icin degil, kullanicinin tum goruntuleme gecmisini getiriyor.
- Aktif ve eski story sayisi arttikca gereksiz veri tasinabilir.

Bu burada su an "dogru ama pahali" bir desen.

Daha iyi model:

- tek RPC ile `stories + is_viewed`
- ya da once story ID'leri alip, ikinci query'yi sadece o ID'lerle sinirlamak

### 5. Story Realtime su an "ince event" degil, "tum listeyi tekrar cek" modeliyle calisiyor

`mobile/src/presentation/hooks/useStories.ts`

- `useQuery` ile liste cekiliyor (`:35-43`)
- `stories` tablosuna `postgres_changes` aboneligi aciliyor (`:51-67`)
- gelen her event, `invalidateQueries` cagiriyor (`:58-60`)

Bu model:

- degisimi hizli algiliyor
- ama her degisimde tum listeyi yeniden cektiriyor

Yani Realtime var, ama cache patch degil, full refetch tetikleyici olarak kullaniliyor.

Kucuk hacimde sorun degil. Story frekansi arttiginda gereksiz load uretebilir.

Ek not:

- Hook her kullanildiginda ayri bir channel aciyor
- story ring, story viewer ve farkli mode'lar ayni anda aciksa abone sayisi artabilir

### 6. UI katmaninda hala dogrudan Supabase query var

Asagidaki UI dosyalari veri katmanini bypass ediyor:

- `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:408-411`
- `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:649-655`
- `mobile/src/presentation/components/poolFeed/hooks/usePoolFeedLifecycleSync.ts:173-181`
- `mobile/src/presentation/components/profile/DeletedContentSheet.tsx:34-39`
- `mobile/app/search.tsx:167-184`
- `mobile/app/edit.tsx:77-82`
- `mobile/app/edit.tsx:120-129`

Bu durumun etkisi:

- ayni tablo farkli yerlerden farkli sekilde okunuyor
- cache ve invalidation tek yerde yonetilemiyor
- query optimizasyonu dagiliyor
- backend contract degistiginde ekranlarin drift etme riski artiyor

### 7. Upload sonrasi ayni videoyu polling ile tekrar tekrar cekiyoruz

`mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:649-666`

Bu blok:

- yeni yuklenen videoyu en fazla 5 kez `videos` tablosundan tekrar sorguluyor
- bulunamazsa `refreshFeed()` ile tum feed'i yeniden cekiyor

Benzer bir upload-sonrasi video cekme deseni `usePoolFeedLifecycleSync` icinde de var:

- `mobile/src/presentation/components/poolFeed/hooks/usePoolFeedLifecycleSync.ts:173-181`

Bu, upload tamamlandiginda:

- tekrarlayan video lookup
- bazen tum feed refetch

uretiyor.

Bu akisin Realtime event veya backend response payload ile sadelestirilmesi buyuk kazanc verir.

### 8. Hashtag aramasi iki adimli ve client-side aggregate yapiyor

`mobile/app/search.tsx:159-203`

Akis:

- `hashtags` tablosundan eslesen tag'ler cekiliyor (`:167-172`)
- sonra `video_hashtags` tablosundan ilgili baglar cekiliyor (`:181-184`)
- post count client tarafinda hesaplanip skorlaniyor (`:186-202`)

Bu iki problem uretir:

- iki ayri query
- aggregation client'ta yapiliyor

Bu tip arama, RPC veya materialized view ile cok daha verimli hale getirilebilir.

### 9. `auth.getSession()` tekrar ediyor, oysa session store'da zaten var

`mobile/src/presentation/store/useAuthStore.ts`

- store zaten `session` tutuyor (`:6-15`)
- initialize asamasinda session dolduruluyor (`:30-45`)

Buna ragmen su ekranlarda tekrar `supabase.auth.getSession()` cagriliyor:

- `mobile/app/UploadDetails.tsx:632`
- `mobile/app/UploadDetails.tsx:703`
- `mobile/app/subtitle-edit.tsx:102`
- `mobile/app/subtitle-edit.tsx:133`
- `mobile/app/edit.tsx:156`

Bu her zaman en pahali operasyon degil, ama:

- gereksiz tekrar
- auth erisim mantiginin dagilmasi
- token erisiminde tutarsizlik

uretir.

Burada tek bir `getAccessToken()` helper ya da store selector yeterli olur.

### 10. `DeletedContentSheet` over-fetch riski tasiyor

`mobile/src/presentation/components/profile/DeletedContentSheet.tsx:34-39`

Burada:

- `videos` tablosundan tum silinmis kayitlar
- pagination olmadan
- UI icinden

isteniyor.

RLS bu veriyi kisitliyor olabilir, ama kod seviyesinde:

- filtrelenmis kullanici kapsami acik degil
- sayfalama yok
- read-model endpoint kullanilmiyor

Bu, veri buyudukce maliyet ve belirsizlik yaratir.

## Ne En Cok Hiz Kazandirir?

En buyuk kazanci saglayacak adimlar oncelik sirasiyla su sekilde:

### A. Feed ve activity icin read-model RPC'ler

En kritik optimizasyon bu.

Su anda bircok ekran:

- once ID listesi cekiyor
- sonra video satirlarini cekiyor
- sonra like/save/follow durumunu ayri query'lerle hydrate ediyor

Bunun yerine su tip RPC'ler tanimlanmali:

- `get_feed_page_v1(user_id, cursor, limit)`
- `get_activity_v1(user_id, mode, cursor, limit)`  
  `mode`: liked | saved | history
- `get_stories_v1(user_id)`
- `search_hashtags_v1(query, limit)`

Bu RPC'ler:

- tek round-trip
- dogru siralama
- `is_liked`, `is_saved`, `is_following`, `is_viewed` gibi flag'leri server-side hesaplama
- mobilde daha basit mapping

saglar.

Bu, tek basina en buyuk performans ve sadelik kazancidir.

### B. Interaction toggle RPC'leri

Su tip fonksiyonlar:

- `toggle_like_v1(user_id, target_id, target_type)`
- `toggle_save_v1(user_id, video_id)`
- gerekirse `toggle_follow_v1(follower_id, following_id)`

ile:

- once oku sonra yaz modelinden cikilir
- atomik sonuc doner
- yeni durum ve gerekirse yeni sayac ayni response'ta gelir

### C. UI katmanindaki query'leri data layer'a toplamak

Ozellikle su dosyalardaki dogrudan query'ler tasinmali:

- `InfiniteFeedManager`
- `usePoolFeedLifecycleSync`
- `DeletedContentSheet`
- `search.tsx`
- `edit.tsx`

Bu teknik olarak "sadece mimari temizlik" degil. Duzgun cache, dedupe ve tek nokta optimizasyonu icin zorunlu.

### D. Upload sonrasi polling yerine event veya response payload

En pratik iyilestirme:

- upload endpoint response'una feed icin gereken minimum video DTO'yu eklemek
- mobile tarafinda ikinci `videos` sorgusunu kaldirmak

Bir sonraki seviye:

- "user-specific upload completed" eventi
- Realtime Broadcast ya da backend callback ile listeye ekleme

## Supabase Ozellikleri Bize Nasil Fayda Saglar?

## 1. Edge Functions

Supabase dokumanina gore Edge Functions:

- server-side TypeScript fonksiyonlari
- edge'de global dagitim
- dusuk gecikmeli HTTP endpoint
- webhook, auth kontrolu, ucuncu taraf servis entegrasyonu icin uygun

Kaynak:

- https://supabase.com/docs/guides/functions

Bizim projede Edge Functions ne zaman mantikli:

- DB + Storage + push notification + harici API gibi birden fazla sistemi orkestra edecegimiz zaman
- "mobil istemciye anon key vermek istemedigimiz" privileged akislarda
- upload bittiginde ek isleme, webhook karsilama, event yayma gibi durumlarda

Somut uygun kullanimlar:

- upload tamamlaninca feed DTO'su hazirlama ve opsiyonel broadcast
- push notification / in-app notification dagitimi
- moderation / AI / STT benzeri ek isleme orkestrasyonu
- "deleted content", "profile dashboard", "insights" gibi birden cok kaynagi birlestiren ozel endpoint'ler

Ama onemli ayrim:

- Eger is sadece "Postgres'ten veriyi birlestirip dondurmek" ise ilk tercih `Postgres RPC / view` olmali
- Edge Function, saf SQL okuma icin gereksiz bir ekstra network katmani yaratabilir

Yani:

- DB-only read composition -> once RPC
- DB + side effect / external service / privileged orchestration -> Edge Function

## 2. Realtime

Supabase dokumanina gore Realtime su uc alani kapsiyor:

- Broadcast
- Presence
- Postgres Changes

Kaynak:

- https://supabase.com/docs/guides/realtime

### 2.1 Postgres Changes

Bugun mevcut kodda kullanilan model bu.

Su an bize faydasi:

- story insert/update/delete oldugunda UI hizli reaksiyon veriyor

Ama Supabase dokumani onemli bir performans uyarisi yapiyor:

- her degisimin abone kullanicilar icin yetki kontrolunden gecmesi gerekir
- cok sayida abone varsa tek bir degisim ek DB okuma carpani olusturur

Kaynak:

- https://supabase.com/docs/guides/realtime/postgres-changes

Bu yuzden benim onerim:

- `stories` gibi dar kapsamli, dusuk frekansli akislarda kullan
- `likes`, `views`, `videos` gibi sicak tablolari herkese acik buyuk fan-out ile dogrudan baglama

### 2.2 Broadcast

Supabase dokumanina gore Broadcast dusuk gecikmeli istemciler arasi mesajlasma icin uygun.

Bu bize burada su acilardan fayda saglar:

- upload tamamlandi -> sadece ilgili kullaniciya "yeni video hazir" eventi
- deleted content guncellendi -> sadece ilgili oturuma yenile sinyali
- story ring full refetch yerine daha ince "story changed" domain event'i

Ozellikle dokumandaki performans notuna dayanarak sunu oneriyorum:

- genis olcekli public tablo degisimlerini dogrudan `postgres_changes` ile istemciye acmak yerine
- server-side tarafta degisimi yakalayip ince bir Broadcast event olarak dagitmak

Bu yorum, Supabase'in `Postgres Changes` icin yaptigi olcek uyarisi uzerinden cikartilmis mimari sonuc.

### 2.3 Presence

Presence bu proje icin veri performansini tek basina artirmaz, ama ileride:

- story izleyen aktif kullanicilar
- canli oda / ortak izleme
- "kim online" tipi sosyal katman

icin faydali olabilir.

Bugun icin ana performans hedefi degil.

## 3. Database Webhooks

Supabase dokumanina gore Database Webhooks:

- `INSERT`, `UPDATE`, `DELETE` sonrasi tetiklenir
- aslinda `pg_net` tabanli asenkron trigger wrapper'idir
- uzun sureli network cagrilarini DB write akisini fazla bloklamadan tetikleyebilir

Kaynak:

- https://supabase.com/docs/guides/database/webhooks

Bu bize su alanlarda fayda saglar:

- yeni video eklendiginde Edge Function tetikle
- denormalized counter / cache / search index warmup tetikle
- mobil icin ince bir event payload hazirla
- bildirim veya audit akisini ayir

Ozellikle "DB degisti, simdi baska bir sistem haberdar olsun" tipinde cok degerli.

## 4. Query Optimization / Indexing

Supabase'in query optimization dokumani acikca sunu soyluyor:

- indeksler dogru query desenine gore hiz kazandirir
- `where`, `join`, `order by` kolonlari kritik
- partial ve composite index'ler bu tip senaryolarda fark yaratir

Kaynak:

- https://supabase.com/docs/guides/database/query-optimization

Bu projede en muhtemel index adaylari:

- `videos (created_at desc, id desc) where deleted_at is null`
- `videos (user_id, created_at desc) where deleted_at is null`
- `stories (expires_at, created_at desc) where deleted_at is null`
- `story_views (user_id, story_id)`
- `likes (user_id, video_id)`
- `likes (user_id, story_id)`
- `saves (user_id, video_id)`
- `follows (follower_id, following_id)`
- `video_views (user_id, viewed_at desc)`
- `video_hashtags (video_id)`
- `video_hashtags (hashtag_id)`
- arama desenine gore `hashtags(name)` icin trigram ya da uygun text index

Not:

- Bunlar koddaki query pattern'lerinden cikartilan adaylardir
- kesin karar icin `EXPLAIN`, `pg_stat_statements` ve `index_advisor` ile dogrulama gerekir

## 5. Read Replicas

Supabase dokumanina gore Read Replicas:

- read-only DB kopyalaridir
- bolgesel olarak daha dusuk latency ve daha iyi read management saglar
- Pro ve ustu planlarda kullanilabilir

Kaynak:

- https://supabase.com/docs/guides/platform/read-replicas/getting-started

Bu bize ne zaman anlamli:

- sorgu sekli duzeltildikten sonra
- halen okuma yukumuz cok yuksekse
- cografi olarak daginik kullanici tabaninda latency dusurmek istiyorsak

Bu bir "ilk cozum" degil.

Once query shape duzeltilmeli.

## 6. pg_cron

Supabase dokumaninda `pg_cron` Postgres icinde zamanlanmis isler icin sunuluyor.

Kaynak:

- https://supabase.com/docs/guides/database/extensions/pg_cron

Bu bize su alanlarda fayda saglayabilir:

- eski `story_views` veya gecici read-model tablolarini temizlemek
- populer hashtag / feed sira puani gibi precompute tablolari yenilemek
- periyodik rapor / refresh islerini uygulama instance'ina bagli olmadan DB tarafina tasimak

## 7. Gozden Kacan Ama Cok Isimize Yarayan Araclar

Bence burada en degerli ama kolayca atlanan seyler bunlar:

### 7.1 `pg_stat_statements` ve Supabase inspect komutlari

Supabase CLI, `pg_stat_statements` verisine dayali outlier sorgulari gosterebiliyor.

Bu bize:

- en cok zaman harcayan query'leri
- cok cagrilan ama pahali query'leri
- IO agir sorgulari

objektif sekilde gosterir.

Yani "hissedilen yavaslik" yerine gercek query maliyeti gorulur.

### 7.2 `index_advisor`

Supabase query optimization rehberi, `index_advisor` aracini yeni baslayanlar icin ozellikle oneriyor.

Bu, query'ye gore potansiyel index onerebilir.

### 7.3 Materialized View / Read Model Tablolari

Bu dogrudan bir "Supabase urun dugmesi" degil ama Supabase Postgres icinde en faydali cozumlerden biridir.

Ozellikle:

- hashtag search skorlamasi
- personalized olmayan explore listeleri
- populer icerik listeleri

icin materialized view veya denormalized read-model tablo ciddi kazanc saglar.

## Onerilen Yol Haritasi

## Faz 1 - En Yuksek Kazanc (hemen)

1. `get_feed_page_v1` RPC tasarla ve feed hydration'i tek sorguya indir.
2. `get_activity_v1` RPC ile liked/saved/history ekranlarini tek endpoint mantigina topla.
3. `toggle_like_v1` ve `toggle_save_v1` RPC'lerine gec.
4. `InfiniteFeedManager`, `DeletedContentSheet`, `search.tsx`, `edit.tsx` icindeki dogrudan Supabase query'leri data layer'a tasi.
5. `getAccessToken()` benzeri tekil auth helper ekle; daginik `auth.getSession()` cagrilarini kaldir.

## Faz 2 - Event ve Realtime Iyilestirmesi

1. `useStories` icinde full invalidation yerine cache patch veya ince event modeli kur.
2. Story ve upload akislari icin tekil/shared channel stratejisi belirle.
3. Upload tamamlaninca polling yerine response payload ya da Broadcast kullan.

## Faz 3 - DB Performans ve Olcekleme

1. `EXPLAIN` ve `pg_stat_statements` ile gercek agir sorgulari olc.
2. Koddan cikardigimiz index adaylarini test et.
3. Gerekirse `index_advisor` ile index kararlarini dogrula.
4. Ancak bunlardan sonra gerekliyse Read Replica degerlendir.

## Net Mimari Oneri

Bu proje icin en dogru ayrim su:

- Feed, activity, story, arama gibi saf veri okuma kompozisyonlari: Postgres RPC / view / read-model
- Webhook, bildirim, upload-sonrasi orkestrasyon, DB + dis servis akislari: Edge Functions
- Dar kapsamli canli UI sinyalleri: Realtime Broadcast veya dikkatli secilmis Postgres Changes
- Periyodik bakim ve precompute: pg_cron
- DB degisince baska sistem tetiklenecekse: Database Webhooks

## Sonuc

Bugun mobile tarafinda asil yavaslik riski:

- "tek query pahali" olmaktan cok
- "bir ekranin ayni isi birden fazla query ile yapmasi"

seklinde gorunuyor.

Bu nedenle en buyuk kazanci su sirayla aliriz:

1. Query sayisini azalt
2. Veri erisimini tek merkezde topla
3. Server-side read-model kur
4. Sonra Realtime ve event akislarini incelt
5. En son altyapi olcekleme (index, replica, cron) ile destekle

Tek cumlelik karar:

Bu uygulamada ilk buyuk kazanc `Edge Function` eklemekten degil, `RPC + read-model + query consolidation` yapmaktan gelecek; `Edge Functions` ve `Realtime` ise bunu tamamlayan ikinci katman olmali.

## Resmi Kaynaklar

- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase Realtime Postgres Changes: https://supabase.com/docs/guides/realtime/postgres-changes
- Supabase Database Webhooks: https://supabase.com/docs/guides/database/webhooks
- Supabase Query Optimization: https://supabase.com/docs/guides/database/query-optimization
- Supabase Read Replicas: https://supabase.com/docs/guides/platform/read-replicas/getting-started
- Supabase pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron
