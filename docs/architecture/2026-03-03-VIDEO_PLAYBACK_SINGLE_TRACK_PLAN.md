# Video Playback Single-Track Plan

Bu notun amaci, mobil uygulamadaki video oynatma katmanini tek ana cizgiye indirme konusunu netlestirmektir. Buradaki hedef "hemen her seyi degistir" degil, mevcut durumu dogru okuyup gereksiz crash ve native lifecycle riskini azaltmaktir.

## Ozet

Su an uygulamada gercek playback tarafinda ana motor zaten `react-native-video`.

`expo-video` su anda sadece `UploadDetails` ekraninda thumbnail uretimi icin kullaniliyor.

`expo-av` uygulama kodunda kullanilmiyor; sadece dependency olarak duruyor.

Bu nedenle bugun icin kritik bir mimari problem yok. Asil konu, ileride video playback'i ikinci bir kutup ile dagitmamaktir.

## Mevcut Durum

### 1. Ana playback moturu: `react-native-video`

Uygulamanin asagidaki ana video yuzeyleri `react-native-video` kullaniyor:

- Feed player havuzu:
  - `mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx`
- Infinite feed karti:
  - `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`
- Story izleyici:
  - `mobile/src/presentation/components/story/StoryViewer.tsx`
- Upload preview:
  - `mobile/src/presentation/components/upload/VideoPlayerPreview.tsx`
- Video editor:
  - `mobile/app/video-editor.tsx`
- Cover create preview:
  - `mobile/app/cover-create.tsx`
- Diger ekran preview'leri:
  - `mobile/app/(tabs)/explore.tsx`
  - `mobile/app/search.tsx`
  - `mobile/app/(tabs)/profile.tsx`
  - `mobile/app/user/[id].tsx`
  - `mobile/src/presentation/components/explore/TrendingCarousel.tsx`

Bu, pratikte su an "ana video oyuncu kutup noktasi"nin `react-native-video` oldugu anlamina gelir.

### 2. Yardimci thumbnail yolu: `expo-video`

`expo-video` sadece burada kullaniliyor:

- `mobile/app/UploadDetails.tsx`

Burada `useVideoPlayer(...)` ile local thumbnail olusturma denemesi yapiliyor. Yani bu paket su an feed playback, editor playback veya story playback tarafinda ana rol almiyor.

### 3. Kullanilmayan dependency: `expo-av`

`expo-av`:

- `mobile/package.json` icinde tanimli
- uygulama kodunda import edilmiyor

Yani bugun itibariyla aktif video playback zincirinin parcasi degil.

## Neden Tek Cizgiye Inmek Isteriz

Video tarafinda ayni projede birden fazla native player aktif rol almaya basladiginda su riskler buyur:

- Android surface ve decoder davranislari farkli yonetilir
- audio focus farkli ele alinir
- `onLoad`, `onReadyForDisplay`, `onProgress`, `seek` gibi lifecycle callback'leri farkli davranabilir
- hata geldigi zaman kok sebep analizi zorlasir
- bir player icin yazilan yerel patch digerine yaramaz

Bu repo icin bu madde ozellikle onemli, cunku `react-native-video` zaten yerel olarak patchlenmis durumda:

- `mobile/scripts/patch-react-native-video.js`

Bu patch su alanlara dokunuyor:

- `disableFocus` davranisi
- stale callback ignore etme
- `videoLoaded()` icin null-guard

Bu da `react-native-video`nin burada "ozel stabilize edilmis" kutuphane oldugunu gosterir.

## Su An Sorun Var mi

Hayir.

Bugun icin su tablo var:

- aktif playback: `react-native-video`
- tekil thumbnail helper: `expo-video`
- kullanilmayan paket: `expo-av`

Yani sistem dağinik degil; sadece kismen fazla bagimlilik var.

Bu nedenle "hemen refactor yapilmali" durumu yok.

## Orta Vadede Ne Yapmak Gerek

### 1. `react-native-video` ana playback cizgisi olarak kalmali

Asagidaki alanlar ayni kutuphane ile gitmeli:

- feed
- story
- editor
- upload preview
- cover preview
- profil / arama / kesfet gibi ekran icindeki video kartlari

Bunun nedeni, bu yuzeylerde zaten ayni davranis ve ayni patchli native katman kullaniliyor olmasi.

### 2. `expo-video` playback'e yayilmamali

`expo-video` bu projede su anda sadece thumbnail veya yardimci medya islemleri icin kullanilabilir.

Ancak sunlari `expo-video`ya tasimak icin acele edilmemeli:

- feed player
- story player
- editor player
- paylasim onizleme player'i

Bu alanlarda ikinci bir aktif playback motoru olusturmak, crash yuzeyini ve davranis farklarini buyutur.

### 3. `expo-av` kaldirilmasi aday paket

`expo-av` kodda aktif kullanilmadigi icin teknik borc olarak duruyor.

Yapilacak is:

1. import taramasini yeniden dogrula
2. config/plugin bagliligi yoksa kaldir
3. build al
4. regressions var mi kontrol et

Bu kaldirma islemi acil degil ama temiz bir sadeleme adimidir.

### 4. Thumbnail stratejisi tek karar ile netlesmeli

Su an thumbnail tarafinda birden fazla deneme var:

- `expo-video` tabanli thumbnail generation
- `react-native-compressor` ile thumbnail denemeleri
- `react-native-video` ile seek-based frame preview cozumleri

Bunlardan biri "resmi yol" olarak secilmeli.

Benim mevcut tercih sirasim:

1. `react-native-compressor` ile stabil thumbnail uretimi
2. gerekirse seek-based preview fallback
3. `expo-video`yu sadece guvenilir kaldigi kadar sinirli kullanmak

Sebep:

- playback motoru ile thumbnail motorunu ayri dusunebiliriz
- ama playback tarafinda ikinci bir ana kutup olusturmamaliyiz

## Somut Karar Listesi

Bugun icin alinabilecek pratik kararlar:

1. `react-native-video` ana playback standardi olarak kabul et
2. yeni video ekranlari yazarken once `react-native-video` ile ilerle
3. `expo-video`yu thumbnail veya yardimci media utility seviyesinde tut
4. `expo-av`i ilerleyen temizlik turunda kaldirma adayi olarak isaretle
5. video playback bug'larinda once `react-native-video` patch zincirini referans al

## Ne Zaman Gercekten Refactor Gerekir

Asagidaki durumlardan biri olursa medya stack sadeleme isi oncelik kazanir:

- `expo-video` ile ikinci bir feed/player akisi yazilmaya baslanirsa
- `expo-av` ile ayri bir playback veya recording akisi eklenirse
- ayni ekranda iki farkli player motoru birlikte yasamaya baslarsa
- Android'de surface crash, siyah ekran, ses odagi veya seek sapmasi artarsa
- yeni native patch'ler birden fazla kutuphaneye dagilmaya baslarsa

## Sonuc

Su anki yapi temelde dogru:

- Ana playback kutuphanesi zaten `react-native-video`
- `expo-video` yardimci rolde
- `expo-av` ise aktif kullanilmayan bagimlilik

Bu nedenle hemen buyuk bir medya refactor'u gerekmiyor.

Asil dogru yon:

- `react-native-video` etrafinda standardize olmak
- diger paketleri yardimci rol ile sinirlamak
- kullanilmayan medyayi zamanla temizlemek

Bu not, ileride medya refactor kararlarinda referans olarak kullanilmak uzere bir "tek ana cizgi" karari dokumanidir.
