# WizyClub Kutuphane Oncelik ve Baglama Plani

Bu not, mevcut kurulu paketler arasindan bu asamada hangilerini gercekten app'e baglamamiz gerektigini belirler.

Temel ilke:

- Her kurulu paketi hemen aktif etmek dogru degil.
- Ilk oncelik, urun akisina dogrudan deger katan ve entegrasyon riski dusuk olan paketlerde olmali.
- Native risk veya mimari etkisi buyuk olan paketler, net bir ekran ve net bir event akisi olmadan baglanmamali.

## 1. Simdi Baglanmasi Gerekenler

### `expo-location`

- Ilk net oncelik bu.
- Gonderiye konum ekleme, "yakindaki firsatlar", kullanicinin paylastigi lokasyonu saklama gibi cekirdek urun akislarina dogrudan hizmet ediyor.
- Entegre edilecek ilk akis:
  - UploadDetails veya gonderi detaylarinda "Konum Ekle"
  - Kullanici cihazindan tek-seferlik konum alma
  - Reverse geocoding gerekiyorsa ikinci adimda eklenir

Neden simdi:

- Uygulamanin sosyal + kupon temasina en dogrudan baglanan paket bu.
- Kurulu ama henuz kullanilmiyor.
- Teknik risk, diger buyuk native paketlere gore dusuk.

### `react-native-maps`

- `expo-location` ile birlikte dusunulmeli.
- Konumu aldiktan sonra kullaniciya gostermek icin gerekli.
- Ilk entegrasyon:
  - Gonderi detayinda mini map preview
  - Profil veya kesif tarafinda lokasyon bazli kart

Neden simdi:

- Konumu alip sadece metin olarak gostermek yarim cozum olur.
- Konum + harita birlikte anlamli bir urun davranisi verir.

Not:

- Ilk asamada basit pin gosterimi yeterli.
- Cluster, heatmap, rota, advanced harita davranislari sonraya kalmali.

### `expo-clipboard`

- Kupon odakli uygulamada hizli kazanc saglayan paketlerden biri.
- Ilk entegrasyon:
  - Kupon kodu satirinda "Kopyala"
  - Kopyalandi toast/haptic

Neden simdi:

- Kucuk is, yuksek deger.
- Kullanici davranisina dogrudan etkisi var.

### `react-native-share` veya `expo-sharing`

- Bu asamada birini aktif etmek mantikli.
- Benim tercihim:
  - App icinden hedefli, daha esnek paylasim gerekiyorsa `react-native-share`
  - Basit sistem share sheet yeterliyse `expo-sharing`

Bu proje icin karar:

- Kupon/gonderi paylasimi uzun vadede daha esnek olacagi icin ana yol olarak `react-native-share`
- Basit dosya share gerekiyorsa yardimci olarak `expo-sharing`

Neden simdi:

- Sosyal yayilim ve kupon dagitimi acisindan dogrudan buyume etkisi var.

## 2. Kisa Vadede Baglanmasi Mantikli Olanlar

### `@segment/analytics-react-native`

- Kurulu ama henuz kontrollu bir event semasi olmadan baglanmamali.
- Bu asamada baglanmasi mantikli, ama once event isimleri netlesmeli.

Ilk event seti:

- `cover_create_opened`
- `cover_thumbnail_selected`
- `cover_gallery_selected`
- `upload_share_tapped`
- `coupon_copy_tapped`
- `coupon_share_tapped`
- `location_add_opened`
- `location_added`

Neden simdi degil, ama hemen sonra:

- Yanlis veya daginik event isimleri bir kere canliya cikinca veri kirlenir.
- Once olay semasi, sonra SDK baglantisi.

### `expo-image-manipulator`

- Kapak olustur akisi icin faydali.
- Ozellikle kullanici galeriden kendi kapagini sectiginde:
  - 16:9 normalize
  - resize
  - dosya boyutu dusurme

Neden kisa vadede:

- Simdi galeriden ozel kapak seciliyor.
- Bu secilen görselleri standardize etmek kalite ve upload stabilitesi icin faydali olur.

### `react-native-video-trim`

- Upload oncesi basit trim ihtiyaci netlesirse baglanmali.
- Mevcut upload/video duzenleme akisinin yanina "hizli kirp" olarak eklenebilir.

Neden hemen degil:

- Once kapak, upload ve medya secim akislarini tam stabilize etmek daha dogru.
- Video trim yeni hata yuzeyi acar; bu yuzden ikinci dalga is.

## 3. Kapak Olustur Icin Hangi Thumbnail Yolu Daha Dogru?

Su an aktif sistem:

- `cover-create` ekraninda `react-native-compressor` icindeki `createVideoThumbnail(...)` kullaniliyor.
- Thumbnail uretiliyor, strip'e konuyor, kullanici seciyor.
- Ayrica galeriden ozel gorsel secme destegi de var.

Bu asamada karar:

- Ana yol olarak mevcut `react-native-compressor` tabanli sistem kalmali.
- `react-native-create-thumbnail` su an ana yola alinmamali.

Neden:

- Mevcut sistem zaten su an ekrana bagli ve calisiyor.
- Native patch ile zaman bazli thumbnail uretimi bu akis icin ozellestirilmis durumda.
- Uygulama mantigi, store ve preview akisi buna gore oturmus durumda.
- Sirf paket kurulu diye sistemi ikinci thumbnail motoruna tasimak gereksiz risk.

`react-native-create-thumbnail` ne olmali:

- Yedek plan / fallback
- Sadece su durumda denenmeli:
  - belirli Android cihazlarda `react-native-compressor` thumbnail uretimi tekrar unstable olursa
  - kalite veya hiz sorunu cihaz bazli ve kalici cikarsa

Net sonuc:

- Bu asamada daha performansli ve daha dogru yol: mevcut `react-native-compressor` akisini korumak
- Yeni paket: hemen ana yola alinmamali

Kapak tarafi icin sonraki en dogru iyilestirme:

- `expo-image-manipulator` ile galeriden secilen kapagi 16:9 ve hedef genislikte normalize etmek
- Gerekirse thumbnail uretim interval'ini video suresine gore adaptif yapmak

## 4. Konum Tarafi Icin Dogru Yol

Konum sistemi iki parcali kurulmalı:

### Asama 1

- `expo-location`
- Tek seferlik izin iste
- Kullanici konum secsin veya mevcut konumu kullan
- Gonderiye text + coordinates olarak yaz

### Asama 2

- `react-native-maps`
- Gonderi detayinda map preview goster
- Marker ile konumu goster

### Asama 3

- `expo-notifications`
- Konuma dayali firsat veya yakin kampanya bildirimi

### Asama 4

- `expo-task-manager`
- Ancak arka plan konum, geofencing veya sessiz periyodik konum kontrolu netlesirse

Net sonuc:

- Simdi `expo-location`
- Hemen arkasindan `react-native-maps`
- `expo-task-manager` su an mecburi degil

## 5. Simdi Baglamamamiz Gerekenler

### `react-native-create-thumbnail`

- Kurulu kalabilir
- Ama ana thumbnail motoru olarak degistirmeyelim

### `react-native-mmkv`

- Hizli ama su an gercek bir storage bottleneck kaniti yok
- Mevcut durumda yeni karmasa yaratir

### `@shopify/react-native-skia`

- Guclu ama ancak foto/video ustune yazi, sticker, canvas tabanli editor netlestiginde baglanmali
- Simdilik gereksiz erken

### `react-native-vision-camera`

- Mevcut kamera akisinda `expo-camera` yeterliyse beklesin
- Vision Camera ancak frame processing, gelismis kamera kontrolu veya barcode hiz ihtiyaci buyurse aktif edilmeli

### `react-native-permissions`

- Expo modulleri kendi izin akislarini cogu durumda yonetiyor
- Ozel, merkezi izin yonetimi ihtiyaci netlesmeden baglamaya gerek yok

### `expo-auth-session`

- Sosyal login kesinlesmeden bekleyebilir
- Ilk once urun akislarini oturtmak daha degerli

## 6. Benim Net Oncelik Siram

Bu proje icin bugunden itibaren en dogru uygulama sirasi:

1. `expo-location`
2. `react-native-maps`
3. `expo-clipboard`
4. `react-native-share`
5. `expo-image-manipulator` (kapak / custom cover normalize)
6. `@segment/analytics-react-native` (event semasi netlestikten sonra)
7. `react-native-video-trim`

## 7. Hemen Sonraki Tavsiye Edilen Uygulama Isleri

### Is 1: Konum Ekle

- UploadDetails'e "Konum Ekle" entry
- `expo-location` ile secim
- Draft'e kayit

### Is 2: Konum Goster

- Gonderi detay kartina kucuk harita preview
- `react-native-maps`

### Is 3: Kupon Kopyala + Paylas

- `expo-clipboard`
- `react-native-share`

### Is 4: Kapak Gorsel Normalize

- Galeriden secilen kapagi `expo-image-manipulator` ile standardize et

### Is 5: Event Semasi

- Cover, upload, coupon ve location event isimlerini netlestir
- Sonra `@segment/analytics-react-native` bagla

## Son Karar

Bu asamada en dogru strateji:

- Thumbnail tarafinda mevcut `react-native-compressor` sistemi korunmali
- Konum ve harita baglantisi one alinmali
- Kupon odakli hizli kazanc icin clipboard + share hemen kullanilmali
- Agir ve genis etkili paketler sadece net ekran/akis olusunca devreye alinmali

Bu siralama, hem urune dogrudan deger katar hem de gereksiz native risk olusturmaz.
