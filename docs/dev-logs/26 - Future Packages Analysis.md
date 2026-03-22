# WizyClub - Gelecek Paket Analizi ve Yol Haritası

Bu belge, WizyClub uygulamasının **TikTok (Feed)**, **Instagram (Hikaye)** ve **Pinterest (Keşfet)** hibrit yapısını tam anlamıyla karşılamak için gelecekte ihtiyaç duyulacak paketleri **kategorize edilmiş** ve **gerekçelendirilmiş** şekilde listeler.

---

## 1. 🎬 Gelişmiş Video & Medya Düzenleme (En Kritik)
Uygulamanın kalbi "içerik üretimi" olduğu için bu kısım hayati önem taşır. Şu anki `expo-camera` sadece kayıt yapar, düzenleme için yetersizdir.

| Paket | Ne İşe Yarar? | Neden WizyClub İçin Gerekli? |
|-------|---------------|------------------------------|
| **`ffmpeg-kit-react-native`** | Video sıkıştırma, format değiştirme, ses birleştirme. | Kullanıcı videoya müzik eklediğinde veya videoyu kestiğinde, bu işlemleri telefonda yapmak için ŞART. (Şu an planda var). |
| **`react-native-compressor`** | Video ve resimleri sıkıştırma. | Kullanıcı 100MB video çektiğinde bunu sunucuya yüklemeden önce 10MB'a düşürmek için. Hız ve veri tasarrufu sağlar. |
| **`react-native-video-editor`** (veya benzeri) | Video birleştirme, trim (kesme). | Birden fazla klibi arka arkaya ekleyip tek video yapmak için (TikTok usulü edit). |
| **`react-native-view-shot`** | Ekran görüntüsü alma. | Videodan "kapak fotoğrafı" seçerken veya bir hikayeyi "Resim olarak paylaş" dediğimizde ekranı yakalamak için. |
| **`@react-native-community/cameraroll`** | Galeriye daha gelişmiş erişim. | Sadece resim seçmek değil, düzenlenen videoyu kullanıcının galerisine kaydetmek ("Videoyu İndir" butonu) için. |

---

## 2. 🎨 UI/UX ve Animasyonlar (Premium His)
Uygulamanın "Premium" ve "Akıcı" hissettirmesi için görsel kütüphaneler.

| Paket | Ne İşe Yarar? | Neden WizyClub İçin Gerekli? |
|-------|---------------|------------------------------|
| **`lottie-react-native`** | After Effects animasyonlarını oynatma. | Like atınca çıkan kalpler, yükleniyor ekranları, başarı tikleri gibi "canlı" animasyonlar için standarttır. |
| **`react-native-skeleton-content`** (veya Moti Skeleton) | İskelet yükleme ekranları. | Videolar yüklenirken boş ekran yerine gri, hafif parlayan kutucuklar göstermek için (Youtube/Facebook gibi). |
| **`react-native-keyboard-controller`** | Gelişmiş klavye yönetimi. | Yorum yaparken veya mesajlaşırken klavyenin videoyu kapatmasını engellemek, iOS/Android farklarını yumuşatmak için. |

---

## 3. 💬 Sosyal Etkileşim & Topluluk
Kullanıcıların birbirleriyle etkileşimi için gerekenler.

| Paket | Ne İşe Yarar? | Neden WizyClub İçin Gerekli? |
|-------|---------------|------------------------------|
| **`socket.io-client`** (Eğer Supabase Realtime yetmezse) | Gerçek zamanlı mesajlaşma. | DM (Mesajlaşma) özelliği gelirse veya canlı yayın (Live) yapılırsa anlık iletişim için daha güçlü bir protokol gerekebilir. |
| **`react-native-share-menu`** | Dışarıdan içeri paylaşım. | Galeriden veya başka bir uygulamadan "WizyClub ile Paylaş" diyebilmek için. |

---

## 4. 📊 Analiz, Performans ve Hata Takibi
Uygulama büyüdükçe "Neden çöktü?", "Kim neyi izliyor?" soruları için.

| Paket | Ne İşe Yarar? | Neden WizyClub İçin Gerekli? |
|-------|---------------|------------------------------|
| **`@sentry/react-native`** | Gelişmiş hata yakalama. | Firebase Crashlytics iyidir ama Sentry, hatanın olduğu video karesine kadar detay verebilir (Opsiyonel ama güçlü). |
| **`react-native-performance`** | Performans ölçümü. | "Video listesi kasıyor mu?", "Uygulama kaç saniyede açılıyor?" gibi metrikleri takip etmek için. |

---

## 5. 💰 Monetization (Gelecek Planı)
Para kazanma özellikleri aktif edildiğinde gerekecekler. (Daha önce sildik ama gelecekte dönecekler).

| Paket | Ne İşe Yarar? | Neden WizyClub İçin Gerekli? |
|-------|---------------|------------------------------|
| **`react-native-iap`** | Uygulama içi satın alma. | Coin satışı, Premium üyelik, Rozet satın alma gibi özellikler için market (Apple/Google) entegrasyonu. |
| **`@stripe/stripe-react-native`** | Kredi kartı ödemeleri. | E-Ticaret / Dropshipping özellikleri için direkt kredi kartı ile ürün satışı yapmak istersen. |
| **`react-native-google-mobile-ads`** | Reklam gösterme. | Videolar arasına AdMob reklamları almak istersen. |

---

## 6. 🛠️ Araçlar ve Yardımcılar

| Paket | Ne İşe Yarar? | Neden WizyClub İçin Gerekli? |
|-------|---------------|------------------------------|
| **`expo-updates`** | Mağazasız güncelleme. | Ufak bir CSS veya JS hatası düzelttin diyelim; market onayını beklemeden tüm kullanıcılarda anında güncellemek için (OTA Updates). |
| **`netinfo`** (Mevcut ama önemli) | İnternet bağlantı kontrolü. | İnternet koptuğunda "Bağlantı Yok" uyarısı verip video yüklemeyi duraklatmak için. |

---

## 📝 Özet Yol Haritası

1.  **Hemen Şimdi (Mevcut Build Sonrası):**
    *   `ffmpeg-kit-react-native` (Ses ekleme/Video işleme için)
    *   `react-native-compressor` (Performanslı upload için)

2.  **Orta Vade (Görsel İyileştirme):**
    *   `lottie-react-native` (Daha iyi like/loading animasyonları)
    *   `react-native-view-shot` (Kapak resmi seçimi)

3.  **Uzun Vade (Ticari & Büyüme):**
    *   `react-native-iap` (Para kazanma başlayınca)
    *   `expo-updates` (Kullanıcı sayısı artınca hızlı fix atmak için)
