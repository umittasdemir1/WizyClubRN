# 2026-03-02 Mobile Supabase Phase 2 Execution Plan

Bu plan, canonical son durum dokumani olan `2026-03-02 Mobile Supabase Final Performance Review.md` sonrasinda uygulanacak tek aktif execution planidir.

Bu konu icin bundan sonra:

- ikinci bir paralel plan acilmayacak
- yeni adimlar bu belgeye eklenerek ilerleyecek
- her oturumda once bu belgedeki aktif checkpoint takip edilecek

## Amac

- mevcut kazanimi korumak
- gercek canli sinyalleri temiz bicimde toplamak
- kalan performans maliyetlerini en dusuk riskle azaltmak
- DB ve mobile tarafinda gereksiz ikinci tur refactor yapmadan dogru noktalara vurmak

## Basari Kriterleri

Bu faz sonunda su sorular net cevaplanmis olmali:

1. Hangi RPC ne kadar sik kullaniliyor?
2. Hangi akislarda hala legacy fallback'e dusuluyor?
3. Upload sonrasi gereksiz ikinci/ucuncu fetch nerede kaliyor?
4. Mevcut index paketi buyuk veri altinda hala yeterli mi?
5. Ikinci index paketi veya replica gercekten gerekli mi?

## Tek Calisma Plani

Bu plan asagidaki checkpoint'lerle yurutulur:

### Checkpoint A - Enstrumantasyon

Hedef:

- telemetry hook'larini koda eklemek
- upload fallback yollarini gorunur kilmak

Durum:

- tamamlandi

Exit criteria:

- RPC fallback event'leri loglaniyor
- upload payload/poll/refresh event'leri loglaniyor
- TypeScript derlemesi temiz

### Checkpoint B - Upload Telemetry Okuma ve Son Daraltma Karari

Hedef:

- upload akisinin gercekte hangi yoldan ilerledigini netlestirmek
- son gereksiz refresh/polling yolunu ancak veriye dayanarak kapatmak

Durum:

- aktif checkpoint

Guncel not:

- payload-first prepend denemesi gecici olarak rollback edildi
- bu checkpoint artik "payload-first'i tekrar acmak" degil, "stabil polling-first akis uzerinde hangi fallback yolunun baskin oldugunu okumak" odaklidir

Exit criteria:

- en az birkac gercek/dev upload turunda telemetry okunmus olacak
- `refresh_triggered` sinyali sik mi seyrek mi netlesecek
- buna gore upload son-care refresh davranisi korunacak veya daraltilacak

### Checkpoint C - DB Temiz Olcum Penceresi

Hedef:

- `pg_stat_statements` ve ikinci DB dogrulama turu

Durum:

- Checkpoint B tamamlanmadan baslanmayacak

Exit criteria:

- temiz zaman penceresi secildi
- temel RPC'ler icin `calls`, `mean_exec_time`, `total_exec_time` cikti
- canonical dokumana sonuc notu eklendi

### Checkpoint D - DB Karar Kapisi

Hedef:

- ikinci index paketi veya replica ihtiyaci var mi karar vermek

Durum:

- Checkpoint C sonrasinda

Exit criteria:

- "mevcut index yeterli" veya "ikinci tuning gerekli" net karari verilmis olacak
- karar olcume dayali olacak

## Faz 2.1 - Gozlemlenebilirlik ve Sinyal Toplama

Bu faz yeni performans karari icin zorunludur.

### 1. RPC fallback telemetry

Hedef:

- `get_feed_page_v1`
- `get_user_interaction_v1`
- `search_hashtags_v1`
- `toggle_like_v1`
- `toggle_save_v1`

icin ne zaman legacy yola dusuldugunu saymak.

Durum:

- uygulandi

Beklenen cikti:

- debug/dev log akisinda okunabilir fallback gorunurlugu
- ayni event her cagriyi spamlamayacak; sayac ve ornekleme mantigi ile okunabilir kalacak

### 2. Upload akisi telemetry

Hedef:

- upload response payload denemesi
- polling fallback sonucu
- refresh skip / refresh trigger

yollarini birbirinden ayirarak okumak.

Durum:

- uygulandi

Toplanan event'ler:

- `VIDEO_UPLOAD_PAYLOAD_USED`
- `VIDEO_UPLOAD_POLL_RESOLVED`
- `VIDEO_UPLOAD_POLL_MISSED`
- `VIDEO_UPLOAD_REFRESH_SKIPPED`
- `VIDEO_UPLOAD_REFRESH_TRIGGERED`
- `VIDEO_UPLOAD_FLOW_SUMMARY`

### 3. Temiz pg_stat_statements okuma penceresi hazirligi

DB tarafinda ikinci karar turu icin:

- rollout/DDL bittikten sonra temiz pencere belirlenecek
- bu pencerede sadece normal uygulama trafigi izlenecek
- olcum notlari canonical dokumana eklenecek

Toplanacak alanlar:

- `calls`
- `mean_exec_time`
- `total_exec_time`
- `rows`
- varsa IO agirlik sinyalleri

## Faz 2.2 - Mobil Akis Maliyeti Azaltma

Bu faz DB tarafini degil, istemci tarafinda kalan ekstra round-trip'leri azaltir.

### 1. Upload sonrasi polling'i azalt

Bu baslik Phase 2'nin ana mobil hedefidir.

Uygulananlar:

1. Polling giris noktalari tespit edildi.
2. Retry davranisi tek helper altinda toplandi.
3. Upload response payload ile dogrudan prepend denemesi yapildi.
4. Bu deneme eksik veri kontrati nedeniyle regression urettigi icin gecici olarak rollback edildi.
5. Polling miss olsa bile video listede zaten varsa full refresh atlanir hale getirildi.
6. Son care refresh yolu ayri telemetry ile izlenir hale getirildi.

Kalan tek karar:

- `VIDEO_UPLOAD_REFRESH_TRIGGERED` sinyali yeterince dusuk mu?

Ek kural:

- payload-first akis, backend response `profiles(*)` ve feed-contract seviyesi dogrulanmadan yeniden acilmayacak

### 2. Fallback kullanan ekranlari daralt

Telemetry sonrasi:

- hangi ekran hala legacy yola daha cok dusuyor
- hangi RPC ortami eksik

gorulunce fallback'i permanent davranis degil, gecici koruma haline getirmek icin cleanup listesi cikarilacak.

Bu adim Checkpoint B sonrasinda yeniden acilacak.

## Faz 2.3 - DB Dogrulama ve Kapasite Karari

### 1. Buyuk veri altinda ikinci olcum

Asagidaki metrikler yeniden kontrol edilecek:

- `get_feed_page_v1`
- `get_user_interaction_v1(saved)`
- `get_user_interaction_v1(history)`
- `search_hashtags_v1`

Bakilacak sorular:

- `saved` ve `history` tek haneli ms bandini koruyor mu?
- `Shared Read Blocks` belirgin artiyor mu?
- feed plani yeni index'i stabil kullaniyor mu?

### 2. Ikinci index paketi icin karar kapisi

Ikinci index paketi ancak su durumlarda dusunulecek:

- temiz `pg_stat_statements` verisi belirgin toplam maliyet gosterirse
- buyuk veri altinda plan regresyonu varsa
- fallback oranlari dusuk ama DB maliyeti hala yuksekse

Aksi halde:

- mevcut index paketi korunur
- gereksiz index spam'inden kacinilir

### 3. Replica / ileri olcekleme karari

Read replica veya daha ileri DB olcekleme ancak:

- query shape temiz
- fallback oranlari dusuk
- mevcut index'ler dogrulanmis
- buna ragmen toplam read yuku yuksek

ise degerlendirilir.

## Upload Telemetry Okuma Rehberi

Upload akisinda su event'ler okunur:

### 1. `VIDEO_UPLOAD_PAYLOAD_USED`

Anlami:

- bu event, payload-first denemesi aktif oldugu turlerde uretilir
- su an rollback sonrasinda normal kosulda gorunmemelidir

Beklenen yorum:

- rollback sonrasi goruluyorsa payload-first yol istemeden tekrar acilmis olabilir

### 2. `VIDEO_UPLOAD_POLL_RESOLVED`

Anlami:

- response payload tek basina yetmedi
- polling fallback devreye girdi
- ama video sonradan bulundu

Beklenen yorum:

- bu event ara sira olabilir
- cok sikse response payload veya mapping eksik olabilir

### 3. `VIDEO_UPLOAD_POLL_MISSED`

Anlami:

- polling denendi ama verilen pencere icinde video bulunamadi

Beklenen yorum:

- bu event yuksekse polling penceresi, backend visibility gecikmesi veya akis tasarimi tekrar degerlendirilir

### 4. `VIDEO_UPLOAD_REFRESH_SKIPPED`

Anlami:

- polling video dondurmedi
- ama video zaten listeye baska yoldan dusmus
- full refresh gereksiz oldugu icin atlandi

Beklenen yorum:

- bu event faydali bir optimizasyon sinyalidir
- yuksek olmasi kotu degil; gereksiz refresh'ten kacildigini gosterir

### 5. `VIDEO_UPLOAD_REFRESH_TRIGGERED`

Anlami:

- payload kullanilamadi
- polling de ise yaramadi
- listede de video yoktu
- sistem son care olarak full refresh yapti

Beklenen yorum:

- bu event dusuk olmali
- bu event yuksekse halen gereksiz maliyet var demektir

## Upload Karar Matrisi

Telemetry okunduktan sonra karar su sekilde verilir:

1. `payload_used` baskin, `refresh_triggered` cok dusuk:
   - yalnizca payload-first yeniden acilmissa yorumlanir
   - bu durumda kontrat tekrar dogrulanir
2. `poll_resolved` belirgin ama `refresh_triggered` dusuk:
   - mevcut polling-first akis saglikli kabul edilir
   - daha fazla daraltma zorunlu degildir
3. `poll_missed` ve `refresh_triggered` yuksek:
   - upload flow yeniden ele alinir
   - response payload kapsami veya event modeline gecis oncelik kazanir
4. `refresh_skipped` yuksek, `refresh_triggered` dusuk:
   - mevcut optimizasyon ise yariyor
   - refresh fallback daha da daraltilabilir

## Dev Oturum Kontrol Listesi

Checkpoint B icin her dev oturumda su sira izlenecek:

1. Bir veya daha fazla video upload akisi calistir.
2. Su event'lerden hangileri ciktigini not et:
   - `VIDEO_UPLOAD_PAYLOAD_USED`
   - `VIDEO_UPLOAD_POLL_RESOLVED`
   - `VIDEO_UPLOAD_POLL_MISSED`
   - `VIDEO_UPLOAD_REFRESH_SKIPPED`
   - `VIDEO_UPLOAD_REFRESH_TRIGGERED`
3. Hangi event'in baskin oldugunu tek cumle ile yaz.
   - tercihen `VIDEO_UPLOAD_FLOW_SUMMARY` uzerinden
4. Sadece buna gore son upload daraltma karari ver.
5. Upload checkpoint kapanmadan DB checkpoint'ine gecme.

## Uygulama Sirasi

1. RPC fallback telemetry helper'ini ekle.
2. Mevcut fallback noktalarini bu helper ile instrument et.
3. Upload polling'i telemetry destekli ve stabil hale getir.
4. Upload telemetry sonucuna gore son mobil daraltma kararini ver.
5. `get_feed_page_v1` fallback nedenini izole et.
6. `SessionLogService`, story fetch ve profile RPC hatalarini ayikla.
7. Sonra temiz `pg_stat_statements` ve DB olcum turunu calistir.
8. En son gerekiyorsa ikinci DB tuning kararini ver.

## Uygulama Disiplini

- Yeni is eklemeden once her adim canonical dokumana baglanacak.
- Ayni problem icin ikinci bir paralel not dosyasi acilmayacak.
- Her yeni performans karari bir olcum veya telemetry sinyaline dayanacak.
- "Tahmini iyilestirme" degil, "olculmus etki" standardi korunacak.
- Checkpoint B kapanmadan DB tarafinda yeni tuning karari alinmayacak.

## Uygulama Durumu

Su adimlar tamamlandi:

- RPC fallback telemetry eklendi
- ana fallback noktalari instrument edildi
- upload sonrasi tekrar eden retry parametreleri tek helper altinda toplandi
- upload response payload denemesi yapildi ve rollback edildi
- upload akisi icin orneklemeli telemetry helper eklendi
- upload refresh skip ve refresh trigger olaylari ayri sinyaller halinde ayrildi

Su anki teknik etkisi:

- su an aktif model tekrar polling-first modeldir
- payload-first prepend yolu gecici olarak kapali tutulur
- polling miss olsa bile video listede zaten varsa full refresh atlanabiliyor
- upload akisi icin payload/poll/refresh-skip/refresh-trigger telemetry sinyalleri ayri okunabiliyor
- davranis riski dusuk, kazanim anlik

## Acik Supabase Sorunlari

Loglardan gorulen ve kapanmasi gereken aktif konular:

1. `get_feed_page_v1` read-model RPC yolu bazi ortamlarda fallback'e dusuyor.
2. `SessionLogService` `user_sessions` insert hattinda hata veriyor.
3. `getStories()` fetch hattinda hata goruluyor.
4. `get_profile_full` RPC yolunda hata goruluyor.
5. Upload response payload'i feed-contract ile birebir uyumlu olmadigi icin dogrudan prepend su an guvenli degil.

## Kalan Isler

Bu belgede kod tarafinda ayni sinifi tekrar tekrar ele almak yerine kalan is yalnizca su siradadir:

1. Checkpoint B icin upload telemetry event dagilimini oku.
2. `get_feed_page_v1` fallback nedenini ayikla.
3. `SessionLogService`, story fetch ve profile RPC hatalarini ayikla.
4. Sadece gerekirse upload tarafindaki son refresh/polling yolunu son kez daralt.
5. Sonra Checkpoint C olarak temiz `pg_stat_statements` prosedurunu uygula.
6. En son DB karar kapisini kapat.

## Done Kriteri

Bu belge asagidaki kosullar saglaninca tamamlanmis kabul edilir:

1. Upload akisinda hangi fallback yolunun baskin oldugu net olarak yazilmis olacak.
2. Upload tarafinda son gereksiz refresh karari verilmis olacak.
3. Temiz `pg_stat_statements` notlari canonical dokumana islenmis olacak.
4. Ikinci index paketi gerekip gerekmedigi tek cumlelik net karar ile kapatilmis olacak.
