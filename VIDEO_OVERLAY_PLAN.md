# WizyClub Video Overlay (Picture-in-Picture) Mimari Planı

Mevcut WizyClub paketlerimizi (`package.json`) inceledim. Projemizde yer alan kütüphaneler (özellikle `react-native-video-trim`, `react-native-gesture-handler`, `react-native-reanimated` ve `expo-video`) bu özelliği **kusursuz ve en yüksek performansla** (Sunucu taraflı birleştirme - Backend Processing) yapmamız için fazlasıyla yeterli. 

Kullanıcının hem ana videoyu, hem de üstüne ekleyeceği videoyu (overlay) kesip (trim) biçebilmesi, boyutunu ve konumunu ayarlayabilmesi için aşağıdaki mimariyi kurmamız gerekiyor.

---

## 1. Kullanılacak Paketlerimiz (Zaten Yüklü)

- **`react-native-video-trim`**: Kullanıcının hem ana videosunu hem de ekleyeceği ikinci videoyu kırpmasını (başlangıç/bitiş süresi seçimi) sağlayacak kütüphanemiz.
- **`react-native-gesture-handler` & `react-native-reanimated`**: İkinci videonun (Overlay) ana video üzerinde parmakla sürüklenmesi (PanGesture), büyütülüp küçültülmesi (PinchGesture) işlemlerini 60 FPS akıcılığında yapmamızı sağlayacak temel kütüphaneler.
- **`expo-video`**: Seçilen ana ve ikinci videoların yükleme öncesi önizlemesini (Playback) yapmak için.

---

## 2. Geliştirme Aşamaları ve Kullanıcı Doğrultusu (UX)

### Adım 1: Ana Videonun Seçilmesi ve Kırpılması
1. Kullanıcı `GalleryPicker` üzerinden bir ana video seçer.
2. Video boyutu/süresi sınırları aşıyorsa `react-native-video-trim` arayüzü açılır ve kullanıcı videonun istediği kısmını kesip onaylar.

### Adım 2: İkinci Videonun (Overlay) Seçilmesi
1. Ekrana eklenecek "Üzerine Ekle" (Add PIP/Overlay) butonu ile kullanıcı galeriden ikinci bir video seçer.
2. Sistem otomatik olarak ikinci videoyu yeniden `react-native-video-trim` süzgecinden geçirir. Böylece kullanıcı üstte duracak videoyu da dilediği saniyeler aralığında kırpabilir.

### Adım 3: Boyutlandırma ve Konumlandırma (Editör Ekranı)
1. Kırpılmış ana video tam ekran (veya belirlenen oranlarda) oynatılır (`expo-video`).
2. Kırpılmış ikinci video, ana videonun üzerine mutlak (absolute) konumlandırma ile küçük bir `expo-video` bileşeni olarak yerleştirilir.
3. Bu ikinci videonun etrafı bir `GestureDetector` (Reanimated & Gesture Handler) ile sarılır.
   - Kullanıcı tek parmağıyla videoyu sürükleyebilir (X ve Y koordinatları değişir).
   - Kullanıcı iki parmağıyla (Pinch) videoyu büyütebilir veya küçültebilir (Scale).
4. Kullanıcı "İleri (Next)" butonuna bastığında, ekran üzerindeki mutlak konum (px cinsinden X ve Y) ve büyüklük (Scale) değerleri **yüzdelik dilime** (`%`) çevrilir. *(Bunun sebebi: Mobil cihazların ekran çözünürlüğü farklıdır, % cinsinden veri yollarsak sunucu her çözünürlükte doğru konumu hesaplar).*

### Adım 4: Sunucuya Veri Gönderimi (Backend Payload)
Yükleme başladığında `UploadVideoUseCase` servisi, her iki videoyu ve hesaplanan bu koordinat verilerini (Metadata) backend'e yollar.

Örnek Metadata Objesi:
```json
{
  "overlayConfig": {
    "xRatio": 0.15, // Ekranın %15 sağında
    "yRatio": 0.10, // Ekranın %10 aşağısında
    "scale": 0.5,   // Orijinal boyutunun yarısı (veya %25'i kadar alan kaplıyor)
    "trimMain": { "start": 0, "end": 15 },
    "trimOverlay": { "start": 2, "end": 10 }
  }
}
```

---

## 3. Backend (Sunucu) Tarafı İşleme Adımları

Bu işin en önemli "ağır işçiliği" sunucu tarafında (Backend/Node.js) yapılmalıdır. Böylece kullanıcı uygulamayı kapatıp gitse bile, güçlü sunucu videoyu anında birleştirip yayına alır.

Backend tarafında **FFmpeg** kullanılacaktır. 

1. **İndirme/Erişim:** Sunucu her iki videoyu (Ana ve Overlay) da alır.
2. **Kırpma İşlemleri (`trimMain` ve `trimOverlay`)**: Sunucu FFmpeg'in `-ss` (start) ve `-t` (duration) parametrelerini kullanarak her iki videonun da kırpılmış versiyonlarını oluşturur.
3. **Ölçeklendirme (`scale`)**: İkinci video, gönderilen `scale` değerine göre FFmpeg'in `scale=[genişlik]:[yükseklik]` filtresiyle yeniden boyutlandırılır.
4. **Overlay (Üst Üste Bindirme) İşlemi**: FFmpeg'in güçlü `overlay` filtresi (Complex Filter) kullanılır. Gönderilen `xRatio` ve `yRatio` değerleri ana videonun 1080x1920 (veya başka bir çözünürlüğü) ile çarpılarak kesin piksel koordinatı bulunur.
   - Örnek FFmpeg Filtresi: `[main_video][overlay_video]overlay=x=(W*0.15):y=(H*0.10)`
5. **Seslerin Karıştırılması (Audio Mixing)**: Her iki videonun da sesi varsa, `amix` filtresiyle iki videonun da sesi birbirine yedirilir. İsteğe bağlı olarak overlay videonun sesi kısılabilir.
6. **Çıktı (Output)**: Tek bir `.mp4` dosyası haline gelir ve R2 / Supabase'e yüklenip feed'e sunulur.

---

## Özet ve Öncelikli Yapılacaklar Listesi
Eğer bu özelliği hayata geçirmek istersen, sırasıyla uygulayacağımız adımlar şunlardır:

1. **Upload Ekranı Güncellemesi:** "Üzerine Ekle" butonu tasarımı ve `react-native-video-trim` entegrasyonu ile ikinci videonun da kırpılarak seçilebilir hale getirilmesi.
2. **Draggable (Sürüklenebilir) Bileşen:** İkinci videoyu ana videonun üstünde tutup sürükleyip (pan) büyütebileceğimiz (pinch) bir `Reanimated/GestureHandler` modülü yazılması.
3. **Payload Güncellemesi:** Koordinat, kırpma süresi vb. meta verilerinin JSON formatına getirilip API isteğine eklenmesi.
4. **Backend FFmpeg Güncellemesi:** Gelen veriyi (iki video + detaylı metadatalar) alıp FFmpeg scriptini çalıştıran bir servis fonksiyonu entegre edilmesi.
