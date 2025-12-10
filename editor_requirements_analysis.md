# WizyClub Video Editor Requirements Analysis

Bu belge, kullanıcının talep ettiği **Kapsamlı Video Düzenleme (Editor)** özelliklerinin teknik analizini içerir. İki liste birleştirilmiş ve teknik çözümler haritalanmıştır.

## 🛠️ Temel Teknoloji Paydaşları
Bu özelliklerin %90'ını hayata geçirmek için **projemize eklememiz gereken** (veya mevcut olan) kritik kütüphaneler:

1.  **`ffmpeg-kit-react-native` (KRİTİK):** Video kesme, birleştirme, ses ekleme, transcode, silence detection, thumbnail, compress işlemleri için BEKÇİ kütüphane. (Expo Config Plugin ile native modül olarak eklenmeli).
2.  **`@shopify/react-native-skia`:** Video üzerine çizim, sticker, metin, filtre ve efektleri **gerçek zamanlı (GPU)** render etmek için.
3.  **`react-native-reanimated` (Mevcut):** Timeline, sürükle-bırak, zoom ve sticker hareketleri için.
4.  **`expo-av` / `expo-audio-mode`:** Ses kaydı (voiceover) ve müzik önizleme için.
5.  **`react-native-gesture-handler` (Mevcut):** Sticker döndürme, büyütme, taşıma jestleri için.
6.  **`expo-camera` (Gelecek):** Kayıt özellikleri (Zoom, Focus, Stabilization) için.

---

## 📊 Özellik Analizi ve Teknik Çözümler

### 1. ✂️ Trim (Kırpma) & Split (Bölme)
| Özellik | Teknik Çözüm | Zorluk | Kütüphane |
| :--- | :--- | :--- | :--- |
| **Baştan/Sondan Kırpma** | FFmpeg komutu (`-ss`, `-t`). | Orta | `ffmpeg-kit` |
| **Ortadan Kesme** | Videoyu 2 parçaya bölüp birleştirme (Concat demuxer). | Yüksek | `ffmpeg-kit` |
| **Split (Bölme)** | Tek videoyu segmentlere ayırır. | Orta | `ffmpeg-kit` |
| **Timeline Trimmer** | UI tarafında `Reanimated` ile slider + FFmpeg thumbnail dizisi. | Yüksek | `RN-Reanimated` + `FFmpeg` |
| **90sn Limiti** | Dosya seçimi sonrası `ffprobe` ile süre kontrolü ve zorunlu trim. | Düşük | `ffmpeg-kit` |

### 2. 🔇 Silence Detection (Sessizlik Temizleme)
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **Otomatik Tespit** | FFmpeg `silencedetect` filtresi ile log analizi. | `ffmpeg-kit` |
| **Auto Clean** | Loglardan alınan timestamp'lere göre videoyu parçalayıp sessiz kısımları atarak birleştirme. | `ffmpeg-kit` |
| **Timeline Gösterimi** | Sessiz aralıkların koordinatlarını hesaplayıp UI üzerinde gri kutucuklar çizme. | `Skia` / `Reanimated` |

### 3. 🎵 Müzik, Ses ve Nefes
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **Müzik Ekleme** | `amix` filtresi ile orijinal ses ve müziği karıştırma. | `ffmpeg-kit` |
| **Ses Seviyesi (Volume)** | `volume` filtresi (Örn: original 0.5, music 1.0). | `ffmpeg-kit` |
| **Sync/Tempo** | Otomatik beat detection çok zordur, manuel kaydırma (offset) önerilir. | `ffmpeg-kit` |
| **Telifsiz Kütüphane** | Backend tarafında bir müzik API'si ve mp3 deposu gerektirir. | `Backend` + `expo-av` |

### 4. 📝 Metin, Altyazı ve Sticker
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **Manuel Metin** | Video üzerine `Skia` veya `Absolute Layout` ile metin bindirme. Kayıt anında `drawtext` filtresi ile "burn-in" yapma. | `Skia` -> `FFmpeg` |
| **Whisper Altyazı** | **Lokal:** Çok ağır (Mobil için imkansıza yakın). **Cloud:** Videoyu backend'e yolla, OpenAI Whisper API ile SRT al, geri dön. | `Backend` (OpenAI API) |
| **Sticker/GIF** | Ekranda `Image` komponenti olarak göster, koordinatları al, FFmpeg `overlay` filtresi ile videoya yapıştır. | `RN-Gesture-Handler` + `FFmpeg` |
| **Kelime Vurgusu** | SRT dosyasındaki timestamp'e göre ekrandaki Text'in rengini değiştirme. | `Reanimated` |

### 5. 🎨 Filtre ve Görsel Efektler
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **Temel Filtreler** | FFmpeg `eq` (contrast, brightness, saturation). Önizleme için `Skia` ColorMatrix. | `Skia` (Preview) + `FFmpeg` (Export) |
| **Güzelleştirme (AI)** | Mobilde native kütüphane gerektirir (Örn: `react-native-vision-camera` + frame processor). FFmpeg ile zordur. | ⚠️ **Zor/Native Modül Gerekir** |
| **Blur/Vignette** | FFmpeg `boxblur`, `vignette` filtreleri. | `ffmpeg-kit` |

### 6. 🖼️ Çoklu Medya ve Carousel
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **Video Birleştirme** | Formatları (boyut, codec) eşitleyip `concat` etme. | `ffmpeg-kit` |
| **PIP / Duet** | `hstack` veya `overlay` filtresi ile yan yana koyma. | `ffmpeg-kit` |
| **Carousel** | `react-native-pager-view` (Zaten Roadmap'te). Video olarak çıktı almak gerekirse slayt video üretimi. | `RN-Pager-View` |

### 7. 📸 Kamera Özellikleri
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **Zoom/Focus** | `expo-camera` veya `react-native-vision-camera`. | `expo-camera` |
| **Stabilization** | Cihaz destekliyse `videoStabilizationMode`. | `expo-camera` |
| **1080p/60FPS** | Kamera ayarlarından preset seçimi. | `expo-camera` |

### 8. 💾 Export ve Kalite
| Özellik | Teknik Çözüm | Kütüphane |
| :--- | :--- | :--- |
| **1080p/H.264** | `-c:v libx264 -preset ultrafast -crf 23`. | `ffmpeg-kit` |
| **Moov Atom** | `-movflags +faststart` (Stream için kritik). | `ffmpeg-kit` |
| **Draft Sistemi** | Kesme noktalarını, filtreleri JSON olarak `AsyncStorage` veya `MMKV`'de saklama. | `Zustand` + `MMKV` |

---

## 🚦 Kritik Karar Noktası
Kullanıcının istediği **"Video Düzenleme (Editing)"** özellikleri, basit bir sosyal medya uygulamasının ötesinde, tam teşekküllü bir **"Video Editor App" (CapCut Lite)** yapısını gerektiriyor.

**Mevcut yolda (HLS/Streaming) ilerlerken bu özellikleri eklemek:**
1.  **Uygulama Boyutu:** `ffmpeg-kit` (full-gpl) yaklaşık **50-100 MB** boyut ekler.
2.  **Performans:** Telefonda video işleme (render/transcode) batarya tüketir ve ısınma yapar.
3.  **Geliştirme Süresi:** Bu liste tek başına **2-3 aylık** bir geliştirme (sadece editor kısmı için) gerektirebilir.

### 💡 Öneri
Liste harika ve vizyoner. Ancak hepsini native (telefonda) yapmak yerine hibrit bir yaklaşım öneririm:
1.  **Basit İşlemler (Telefonda):** Trim, Crop, Müzik Ekleme, Videoları Birleştirme (`ffmpeg-kit` ile).
2.  **Ağır İşlemler (Cloud):** Sessizlik temizleme, Altyazı (Whisper), AI Filtreleri. (Videoyu ham yükleyip sunucuda işleyip geri bildirim verme).
3.  **UI:** `Skia` ve `Reanimated` kullanarak kullanıcının "efekt yapıyormuş gibi" hissetmesini sağlayıp, asıl işlemi arka planda yapmak.

**Sonuç:** Bu listeyi hayata geçirmek için `ffmpeg-kit-react-native` ve `react-native-skia` kütüphanelerini **Library Roadmap**'e eklemeliyiz. Bu kütüphaneler büyük native paketlerdir ve build gerektirir.
