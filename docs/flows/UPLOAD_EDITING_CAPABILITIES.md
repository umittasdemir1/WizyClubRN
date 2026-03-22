# Araştırma: Yükleme Düzenleme Yetenekleri (Mevcut Kütüphaneler)

Bu belge, WizyClub projesinde **halihazırda kurulu olan** kütüphaneleri kullanarak, video ve resim yükleme aşamasında hangi düzenleme özelliklerinin uygulanabileceğini detaylandırmaktadır. Bu özellikleri hayata geçirmek için yeni bir paket kurulumu gerekmemektedir.

---

## 1. Backend Yetenekleri (FFmpeg)
Projede zaten `fluent-ffmpeg` ve `ffmpeg-static` bulunmaktadır. Bu ikili, medya işleme konusunda oldukça güçlüdür ve yüklenen içerik üzerinde kalıcı (videoya işlenmiş) değişiklikler yapabilir.

### 📝 Metin ve Emoji Katmanları
*   **Metin Yazdırma:** `drawtext` filtresini kullanarak videonun herhangi bir yerine kalıcı metinler ekleyebilirsiniz. Yazı tipini, boyutunu, rengini, opaklığını ve konumunu tamamen kontrol edebilirsiniz.
*   **Emoji/Resim Kaplamaları:** Emojiler, PNG veya SVG dosyaları olarak `overlay` filtresi ile videonun üzerine eklenebilir. Bu sayede videonun herhangi bir yerine statik çıkartmalar veya marka logoları yerleştirilebilir.

### 🎨 Görsel Filtreler
FFmpeg yüzlerce hazır filtre içerir:
*   **Renk Düzeltme:** Parlaklık (`eq`), kontrast, doygunluk ve ton (`hue`) ayarları.
*   **Artistik Efektler:** Siyah-beyaz (grayscale), sepya, vinyet ve bulanıklaştırma (`boxblur` veya `gblur`).
*   **Gelişmiş:** Eğer LUT dosyaları sağlanırsa, `lut3d` filtresi ile profesyonel renk filtreleri (3D LUTs) uygulanabilir.

### 🎵 Ses Düzenleme
*   **Arka Plan Müziği (BGM):** Birden fazla ses kanalını (`amix` filtresi) birleştirebilirsiniz. Bu, orijinal sesi kısık seviyede tutup üzerine bir müzik parçası eklemenize olanak tanır.
*   **Ses Değiştirme:** Orijinal ses kanalını tamamen yeni bir ses dosyasıyla değiştirebilirsiniz.
*   **Geçiş Efektleri:** Ses parçalarına profesyonel giriş/çıkış (fade-in/fade-out) efektleri eklenebilir (`afade`).
*   **Ses Kontrolü:** Videonun ses seviyesini normalize edebilir veya değiştirebilirsiniz.

### ✂️ Kesme ve Kırpma (Trim & Crop)
*   **Hassas Kesme:** Başlangıç (`-ss`) ve süre (`-t`) veya bitiş (`-to`) parametrelerini kullanarak videoyu istediğiniz zaman aralığına göre kesebilirsiniz.
*   **Kırpma:** `crop` filtresi ile videonun en-boy oranını değiştirebilir veya belirli bir alana odaklanabilirsiniz (örneğin 16:9'u hikayeler için 9:16'ya çevirmek).

---

## 2. Mobil Yetenekleri (React Native & Expo)
Mobil uygulama tarafında hem gerçek zamanlı UI düzenlemeleri (kalıcı olmayan) hem de kullanıcı etkileşimi için gerekli kütüphaneler mevcuttur.

### ⌨️ UI Tabanlı Metin ve Emoji
*   **Dinamik Katmanlar:** React Native yapısı gereği, video oynatıcının üzerine `Text` veya `View` (emoji içeren) bileşenlerini mutlak konumlandırma (absolute positioning) ile yerleştirebiliriz.
*   **Emoji Klavyesi:** `rn-emoji-keyboard` paketi projede zaten kuruludur ve bir seçici (picker) olarak kullanılmaya hazırdır.
*   **Sürüklenebilir/Yeniden Boyutlandırılabilir Arayüz:** Projede mevcut olan `react-native-reanimated` ve `gesture-handler` kütüphanelerini kullanarak, metin ve çıkartmalar için tam kapsamlı bir "sürükle-bırak" düzenleme arayüzü oluşturulabilir.

### 🎭 Önizleme Filtreleri
*   **Arayüz Filtreleri:** `expo-blur` ve `expo-image` ile uygulama içinde görsel çıktılara bulanıklık veya renk tonları eklenebilir.
*   **Gerçek Zamanlı Kamera Efektleri:** `react-native-vision-camera` çerçeve işleyicilerini (frame processors) destekler. Bu, kayıt sırasında gerçek zamanlı filtreler (yüz takibi veya renk değişimleri gibi) uygulanmasına olanak tanır.

### ⏱️ Kesme (Trimming) Etkileşimi
*   **Metadata Takibi:** Projedeki `useUploadComposerStore` zaten `trimStartSec` ve `trimEndSec` değerlerini tutmaktadır.
*   **Zaman Çizelgesi Önizleme:** `expo-av` veya `expo-video` kullanarak, kullanıcı kesme kollarını ayarlarken kare kare önizleme yapılabilir.

### 📉 Çok Kanallı Ses Önizleme
*   **Eşzamanlı Oynatma:** `expo-av`, yerel olarak bir videoyu ve ayrı bir ses dosyasını (BGM) aynı anda oynatmanıza izin vererek, kullanıcının nihai sonucun nasıl duyulacağını önizlemesini sağlar.

---

## 3. Uygulama Yolu Özeti
Sadece bu araçları kullanarak TikTok benzeri profesyonel bir deneyim için:
1.  **Mobil:** Videoyu Kaydet/Seç -> Metin/Emoji için yüzen UI katmanlarını ekle -> Kesme aralığını seç (slider) -> Müzik parçasını seç.
2.  **Yükleme:** Orijinal dosyayı + **Metadata** bilgilerini (Metin içeriği/konumu, Kesme aralığı, Müzik ID, Filtre adı) backend'e gönder.
3.  **Backend:** Gelen metadata bilgilerine göre FFmpeg kullanarak videoyu işle (Kes -> Filtreleri Uygula -> Sesi Birleştir -> Metni Göm) ve ardından S3/R2'ye kaydet.

---
*Antigravity AI tarafından oluşturulmuştur - Araştırma Aşaması*
