# 📦 Proje Paket ve Kütüphane Detaylı Açıklama Rehberi

> Bu doküman, projemizde kullanılan tüm paket ve kütüphanelerin ne işe yaradığını, neden kullanıldığını ve hangi özellikleri sağladığını detaylı bir şekilde açıklar. Teknik bilgisi olmayan kişiler için de anlaşılır şekilde hazırlanmıştır.

## 📑 İçindekiler

- [React & React Native Temelleri](#react--react-native-temelleri)
- [Expo Ekosistemi](#expo-ekosistemi)
- [UI ve Animasyon Kütüphaneleri](#ui-ve-animasyon-kütüphaneleri)
- [Video ve Medya İşlemleri](#video-ve-medya-i̇şlemleri)
- [Backend ve Veritabanı](#backend-ve-veritabanı)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [Bildirim Sistemleri](#bildirim-sistemleri)
- [Performans ve Optimizasyon](#performans-ve-optimizasyon)
- [Geliştirici Araçları](#geliştirici-araçları)

---

## 🎯 React & React Native Temelleri

### **react** (v19.1.0)
**Ne işe yarar:** Uygulamanın kalbidir. Kullanıcı arayüzünü parça parça (component) oluşturmamızı sağlar.

**Günlük hayattan örnek:** Bir LEGO seti gibi düşünün. Her LEGO parçası bir component'tir. Bu parçaları birleştirerek büyük yapılar (ekranlar) oluşturursunuz.

**Neden önemli:**
- Her ekranı küçük, yönetilebilir parçalara böler
- Bir parçayı değiştirdiğinizde diğerleri etkilenmez
- Kodun yeniden kullanılabilir olmasını sağlar

---

### **react-native** (v0.81.5)
**Ne işe yarar:** React'i mobil uygulamalara dönüştürür. JavaScript ile yazdığınız kodları iOS ve Android'in anlayabileceği native koda çevirir.

**Günlük hayattan örnek:** Bir tercüman gibidir. Siz İngilizce konuşursunuz (JavaScript), o hem Türkçeye (iOS) hem de Almancaya (Android) çevirir.

**Sağladığı özellikler:**
- Tek kod ile hem iPhone hem Android uygulaması
- Native performans (gerçek mobil uygulama hızı)
- Kamera, konum, bildirim gibi telefon özelliklerine erişim

---

### **react-dom** (v19.1.0)
**Ne işe yarar:** React uygulamasının web tarayıcısında çalışmasını sağlar.

**Neden kullanıyoruz:** Mobil uygulamanızın web versiyonunu da oluşturabilirsiniz.

---

### **react-native-web** (v0.21.0)
**Ne işe yarar:** React Native kodlarının web sitesi olarak çalışmasını sağlar.

**Günlük hayattan örnek:** Aynı yemek tarifini hem fırında hem mikrodalga fırında kullanabilme gibi. Tek kod, üç platform (iOS, Android, Web).

---

## 🚀 Expo Ekosistemi

> Expo, React Native geliştirmeyi kolaylaştıran ve hızlandıran bir platform ve araç setidir.

### **expo** (v54.0.0)
**Ne işe yarar:** React Native'in geliştirilmiş, daha kolay versiyonudur. Karmaşık konfigürasyonları halleder.

**Günlük hayattan örnek:** Otomatik vites araba gibidir. Manuel vites (pure React Native) yerine otomatik (Expo) kullanarak daha kolay sürüş yaparsınız.

**Sağladığı faydalar:**
- Hızlı başlangıç (5 dakikada uygulama çalışır)
- Over-the-air updates (uygulama mağazası olmadan güncelleme)
- Hazır modüller (kamera, konum, bildirim vb.)
- Kolay build ve deployment

---

### **expo-router** (v6.0.21)
**Ne işe yarar:** Uygulamada sayfa geçişlerini ve navigasyonu yönetir.

**Günlük hayattan örnek:** Bir sitenin menüsü gibidir. Ana Sayfa, Profil, Ayarlar gibi bölümler arası geçişi sağlar.

**Özellikler:**
- Dosya bazlı routing (klasör yapısı = sayfa yapısı)
- Otomatik tab bar oluşturma
- Deep linking desteği
- Type-safe navigation

**Projenizde kullanımı:**
```
app/
  (tabs)/
    index.tsx      → Ana sayfa
    profile.tsx    → Profil sayfası
    deals.tsx      → Fırsatlar sayfası
```

---

### **expo-camera** (v17.0.0)
**Ne işe yarar:** Telefonun kamerasını kullanmanızı sağlar.

**Kullanım alanları:**
- Fotoğraf çekme
- Video kaydetme
- QR kod tarama
- Ön/arka kamera geçişi

**Projenizde:** `upload.tsx` dosyasında içerik yüklerken kamera kullanımı

---

### **expo-image-picker** (v17.0.0)
**Ne işe yarar:** Kullanıcının galerisinden fotoğraf/video seçmesini veya yeni çekmesini sağlar.

**Günlük hayattan örnek:** WhatsApp'ta fotoğraf gönderirken "Kameradan Çek" veya "Galeriden Seç" seçenekleri gibi.

**Özellikler:**
- Çoklu seçim
- Crop (kırpma) özelliği
- Video seçimi
- İzin yönetimi

**Projenizde kullanımı:**
- `upload.tsx` - İçerik yükleme
- `UploadModal.tsx` - Modal içinde medya seçimi
- `EditProfileSheet.tsx` - Profil fotoğrafı değiştirme

---

### **expo-av** (v16.0.0)
**Ne işe yarar:** Ses ve video dosyalarını oynatır, kaydeder.

**Özellikler:**
- Video oynatma kontrolü
- Ses kaydetme
- Playback kontrolü (play, pause, seek)
- Volume kontrolü

---

### **expo-image** (v3.0.0)
**Ne işe yarar:** Görselleri yükler ve gösterir. React Native'in varsayılan Image componentinden çok daha performanslıdır.

**Avantajları:**
- Otomatik önbellekleme (cache)
- Blurhash desteği (resim yüklenirken bulanık önizleme)
- Daha hızlı yükleme
- Daha az bellek kullanımı

**Projenizde:** 
- `explore.tsx` - Keşfet sayfası
- `BrandAvatar.tsx` - Marka logoları
- `CategoryCard.tsx` - Kategori resimleri

---

### **expo-linear-gradient** (v15.0.0)
**Ne işe yarar:** Renkler arası geçişli (gradient) arka planlar oluşturur.

**Günlük hayattan örnek:** Gün batımında gökyüzünün turuncudan mora geçişi gibi.

**Projenizde kullanımı:**
- `login.tsx` - Giriş ekranı arka planı
- `signup.tsx` - Kayıt ekranı arka planı
- `upload.tsx` - Yükleme ekranı arka planı

---

### **expo-blur** (v15.0.0)
**Ne işe yarar:** Görselleri bulanıklaştırır (blur efekti).

**Kullanım alanları:**
- Modal arka planları
- Glassmorphism efekti
- Odak çekmek için arka planı bulanıklaştırma

**Projenizde:**
- `MorphBlurView.tsx` - Özel blur görünümleri
- `DeleteConfirmationModal.tsx` - Silme onay modalı
- `StoryPage.tsx` - Story görüntüleyici

---

### **expo-haptics** (v15.0.0)
**Ne işe yarar:** Telefonda titreşim (haptic feedback) oluşturur.

**Günlük hayattan örnek:** iPhone'da klavyede yazdığınızda hissettiğiniz hafif titreşim.

**Kullanım senaryoları:**
- Butona tıklama
- Hata mesajı
- Başarılı işlem onayı
- Beğenme, favorileme gibi aksiyonlar

**Projenizde:**
- `explore.tsx` - Keşfet etkileşimleri
- `FeedItemOverlay.tsx` - Feed üzerinde etkileşim

---

### **expo-notifications** (v0.32.0)
**Ne işe yarar:** Push bildirimleri (notifications) gönderir ve alır.

**Özellikler:**
- Yerel bildirimler (local notifications)
- Uzaktan bildirimler (push notifications)
- Bildirim zamanlaması
- Bildirim tıklama yönetimi

---

### **expo-location** (v19.0.0)
**Ne işe yarar:** Kullanıcının konumunu alır.

**Kullanım alanları:**
- Yakındaki yerler
- Konum bazlı içerik
- Harita uygulamaları
- Teslim adresi belirleme

---

### **expo-file-system** (v19.0.0)
**Ne işe yarar:** Telefonun dosya sistemine erişim sağlar.

**Yapabilecekleriniz:**
- Dosya okuma/yazma
- Dosya indirme
- Önbellek yönetimi
- Geçici dosya oluşturma

**Projenizde:** `DraftsGrid.tsx` - Taslak dosyaları yönetimi

---

### **expo-media-library** (v18.2.1)
**Ne işe yarar:** Telefonun fotoğraf ve video galerisine erişim.

**Özellikler:**
- Galeriye fotoğraf kaydetme
- Albüm oluşturma
- Medya dosyalarını listeleme
- Medya detaylarını okuma

**Projenizde:** `upload.tsx` - Yüklenen içerikleri galeriye kaydetme

---

### **expo-contacts** (v15.0.0)
**Ne işe yarar:** Telefonun rehberine erişim sağlar.

**Kullanım alanları:**
- Arkadaş önerileri
- Davet gönderme
- Kişi arama
- Sosyal özellikler

---

### **expo-clipboard** (v8.0.0)
**Ne işe yarar:** Kopyala-yapıştır (clipboard) işlemlerini yönetir.

**Günlük hayattan örnek:** Bir metni kopyalayıp başka yere yapıştırma.

**Kullanım senaryoları:**
- Link kopyalama
- Kod kopyalama
- Metin paylaşımı

---

### **expo-sharing** (v14.0.0)
**Ne işe yarar:** Dosyaları diğer uygulamalarla paylaşır.

**Günlük hayattan örnek:** Bir fotoğrafı WhatsApp, Instagram veya Mail ile paylaşma.

---

### **expo-secure-store** (v15.0.0)
**Ne işe yarar:** Hassas verileri güvenli bir şekilde saklar.

**Günlük hayattan örnek:** Bir kasada değerli eşyaları saklamak gibi.

**Saklanan veriler:**
- Şifreler
- Token'lar
- API anahtarları
- Kişisel bilgiler

**Güvenlik özellikleri:**
- Şifreli saklama
- Sistem güvenliği entegrasyonu
- Sadece uygulama erişebilir

---

### **expo-splash-screen** (v31.0.0)
**Ne işe yarar:** Uygulama açılırken gösterilen ilk ekranı (splash screen) yönetir.

**Günlük hayattan örnek:** Bir mağazanın vitrin camı gibi. Mağaza hazırlanırken müşteri vitrini görür.

---

### **expo-status-bar** (v3.0.0)
**Ne işe yarar:** Telefonun üst kısmındaki durum çubuğunu (saat, batarya, sinyal) kontrol eder.

**Yapabilecekleriniz:**
- Renk değiştirme (açık/koyu)
- Gizleme/gösterme
- Stil ayarlama

---

### **expo-font** (v14.0.0)
**Ne işe yarar:** Özel yazı tiplerini (custom fonts) uygulamaya yükler.

**Günlük hayattan örnek:** Word'de Arial yerine fancy bir font kullanmak gibi.

---

### **expo-keep-awake** (v15.0.0)
**Ne işe yarar:** Ekranın otomatik kapanmasını engeller.

**Kullanım alanları:**
- Video izlerken
- Tarif okurken
- Sunum yaparken

**Projenizde:** `_layout.tsx` - Uygulama genelinde ekran açık tutma

---

### **expo-screen-orientation** (v9.0.0)
**Ne işe yarar:** Ekran yönünü (dikey/yatay) kontrol eder.

**Projenizde:** `VideoLayer.tsx` - Video oynatırken yön kilitleme

---

### **expo-web-browser** (v15.0.0)
**Ne işe yarar:** Uygulamadan çıkmadan web sayfası açar.

**Günlük hayattan örnek:** Instagram'da bir linke tıkladığınızda Instagram içinde tarayıcı açılması.

---

### **expo-constants** (v18.0.0)
**Ne işe yarar:** Uygulama hakkında sabit bilgiler sağlar.

**Erişilebilen bilgiler:**
- Uygulama versiyonu
- Cihaz bilgisi
- Platform bilgisi
- Çevre değişkenleri

---

### **expo-device** (v8.0.0)
**Ne işe yarar:** Cihaz hakkında detaylı bilgi verir.

**Öğrenilebilecek bilgiler:**
- Cihaz modeli
- İşletim sistemi
- Tablet/telefon kontrolü
- Üretici bilgisi

---

### **expo-apple-authentication** (v8.0.0)
**Ne işe yarar:** "Apple ile Giriş Yap" özelliğini ekler.

**Avantajları:**
- Hızlı kayıt
- Güvenli giriş
- E-posta gizleme
- iOS için zorunlu (eğer sosyal giriş varsa)

---

### **expo-local-authentication** (v17.0.0)
**Ne işe yarar:** Parmak izi ve yüz tanıma ile kimlik doğrulama.

**Günlük hayattan örnek:** Telefonunuzu parmak izi ile açmak.

**Kullanım alanları:**
- Uygulama kilidi
- Ödeme onayı
- Hassas işlem onayı

---

### **expo-tracking-transparency** (v6.0.0)
**Ne işe yarar:** iOS'ta kullanıcı takibi için izin ister (Apple politikası gereği).

**Ne zaman gerekli:** Reklam gösteriyorsanız veya kullanıcı davranışını takip ediyorsanız.

---

### **expo-background-fetch** (v14.0.0)
**Ne işe yarar:** Uygulama kapalıyken arka planda veri güncelleme.

**Kullanım örnekleri:**
- Haber güncellemeleri
- Mesaj senkronizasyonu
- İçerik önbellekleme

---

### **expo-task-manager** (v14.0.0)
**Ne işe yarar:** Arka plan görevlerini yönetir.

**Kullanım alanları:**
- Konum takibi
- Periyodik veri güncelleme
- Arka plan işlemleri

---

### **expo-build-properties** (v1.0.0)
**Ne işe yarar:** Native build ayarlarını yapılandırır.

**Yapılandırılabilenler:**
- Minimum SDK versiyonu
- Compile options
- Gradle ayarları
- Podfile ayarları

---

### **expo-dev-client** (v6.0.0)
**Ne işe yarar:** Özel geliştirme ortamı oluşturur.

**Faydaları:**
- Native modüller test etme
- Hızlı geliştirme
- Custom native kod ekleme

---

### **expo-navigation-bar** (v5.0.0)
**Ne işe yarar:** Android'de alt navigasyon çubuğunu kontrol eder.

**Yapabilecekleriniz:**
- Renk değiştirme
- Şeffaflık ayarlama
- Gizleme/gösterme

---

## 🎨 UI ve Animasyon Kütüphaneleri

### **@shopify/react-native-skia** (v2.2.12)
**Ne işe yarar:** Çok güçlü 2D grafik çizimi ve animasyonlar.

**Günlük hayattan örnek:** Photoshop gibi profesyonel bir çizim aracı.

**Kullanım alanları:**
- Story ring animasyonları
- Custom şekiller
- Karmaşık grafikler
- Yüksek performans gerektiren görsel efektler

**Projenizde:**
- `AdvancedStoryRing.tsx` - Gelişmiş story halkaları
- `RectangularStoryRing.tsx` - Dikdörtgen story halkaları

**Neden Skia:**
- 60 FPS animasyon garantisi
- GPU üzerinde çalışır
- Native performans

---

### **react-native-reanimated** (v4.1.1)
**Ne işe yarar:** React Native'deki en güçlü animasyon kütüphanesi.

**Günlük hayattan örnek:** Film stüdyosunda kullanılan profesyonel animasyon yazılımı.

**Avantajları:**
- 60 FPS garanti
- Gesture (dokunma) entegrasyonu
- UI thread'de çalışır (ana thread'i bloke etmez)
- Karmaşık animasyon zincirleri

**Animasyon türleri:**
- Spring (yay gibi)
- Timing (zamanlı)
- Decay (yavaşlayarak durma)
- Layout animasyonları

**Projenizde:**
- `profile.tsx` - Profil animasyonları
- `user/[id].tsx` - Kullanıcı profili animasyonları
- `HeroBannerCarousel.tsx` - Banner carousel animasyonları

---

### **moti** (v0.30.0)
**Ne işe yarar:** Reanimated'in basitleştirilmiş versiyonu. Daha kolay animasyon yazmak için.

**Günlük hayattan örnek:** Otomatik vites araba (Reanimated ise manuel vites).

**Kullanım alanları:**
- Fade animasyonları
- Scale animasyonları
- Skeleton loaders (yükleme animasyonları)

**Projenizde:** `FeedSkeleton.tsx` - Feed yüklenirken gösterilen iskelet animasyonu

---

### **react-native-gesture-handler** (v2.28.0)
**Ne işe yarar:** Dokunma, kaydırma, sıkıştırma gibi tüm gesture'ları yönetir.

**Özellikler:**
- Pan (kaydırma)
- Pinch (iki parmakla zoom)
- Tap (dokunma)
- Long press (basılı tutma)
- Swipe (hızlı kaydırma)

**Projenizde:**
- `BrightnessController.tsx` - Parlaklık kontrolü için gesture
- `SideOptionsSheet.tsx` - Alt menü açma/kapama

---

### **@gorhom/bottom-sheet** (v5.0.0)
**Ne işe yarar:** Alttan yukarı açılan menüler (bottom sheet) oluşturur.

**Günlük hayattan örnek:** Google Maps'te bir yere tıkladığınızda alttan yukarı çıkan bilgi kartı.

**Özellikler:**
- Sürüklenebilir
- Birden fazla snap noktası
- Backdrop (arka plan kararması)
- Keyboard aware (klavye ile uyumlu)

**Projenizde:**
- `profile.tsx` - Profil ayarları menüsü
- `drafts.tsx` - Taslak işlemleri menüsü
- `user/[id].tsx` - Kullanıcı işlemleri menüsü

---

### **lottie-react-native** (v7.3.5)
**Ne işe yarar:** After Effects'te yapılan animasyonları uygulamada kullanır.

**Günlük hayattan örnek:** Profesyonel bir animatörün yaptığı animasyonu uygulamanızda kullanmak.

**Kullanım alanları:**
- Loading animasyonları
- Success/error animasyonları
- Onboarding animasyonları
- Ödül animasyonları

**Format:** JSON dosyası

**Kaynak:** LottieFiles.com

---

### **nativewind** (v4.0.0)
**Ne işe yarar:** Tailwind CSS'i React Native'de kullanmanızı sağlar.

**Günlük hayattan örnek:** Hazır giyim mağazası. Kendiniz dikiş dikmek yerine hazır kombinler alırsınız.

**Avantajlar:**
- Hızlı stil yazma
- Tutarlı tasarım
- Responsive tasarım kolaylığı

**Örnek kullanım:**
```jsx
<View className="flex-1 bg-blue-500 p-4">
  <Text className="text-white text-xl font-bold">Merhaba</Text>
</View>
```

---

### **react-native-svg** (v15.12.1)
**Ne işe yarar:** SVG (vektörel) grafikler çizer.

**Günlük hayattan örnek:** Her boyutta net görünen logolar (zoom yaptığınızda bozulmaz).

**Kullanım alanları:**
- İkonlar
- Logolar
- Şekiller
- Grafikler

**Projenizde:**
- `profile.tsx` - Profil ikonları
- `user/[id].tsx` - Kullanıcı ikonları

---

### **@expo/vector-icons** (v15.0.3)
**Ne işe yarar:** Binlerce hazır ikon sağlar.

**İkon setleri:**
- Ionicons
- FontAwesome
- MaterialIcons
- Feather
- AntDesign

**Projenizde:**
- `deals.tsx` - Fırsatlar ikonları
- `SocialTags.tsx` - Sosyal medya ikonları

---

### **lucide-react-native** (v0.471.0)
**Ne işe yarar:** Modern ve şık ikon seti.

**Özellikler:**
- 1000+ ikon
- Tutarlı tasarım
- Customize edilebilir
- Hafif ve performanslı

**Projenizde:**
- `deals.tsx` - Fırsatlar sayfası
- `explore.tsx` - Keşfet sayfası
- `notifications.tsx` - Bildirimler sayfası
- `profile.tsx` - Profil sayfası
- `login.tsx` - Giriş sayfası

---

### **react-native-edge-to-edge** (v1.7.0)
**Ne işe yarar:** Uygulamanın ekranın tamamını kullanmasını sağlar (status bar ve navigation bar altına kadar).

**Günlük hayattan örnek:** Tam ekran film izleme modu.

**Projenizde:** Tüm tab sayfalarda tam ekran deneyimi

---

### **expo-blur** (v15.0.0)
**Detaylı açıklama:** (Yukarıda Expo bölümünde açıklandı)

**Ek bilgi - Blur tipleri:**
- Light (açık)
- Dark (koyu)
- Regular (normal)
- Prominent (belirgin)

---

## 🎬 Video ve Medya İşlemleri

### **react-native-video** (v6.0.0)
**Ne işe yarar:** Video oynatır.

**Özellikler:**
- Oynat/Duraklat kontrolü
- Seek (ileri/geri sarma)
- Hız kontrolü
- Alt yazı desteği
- Streaming desteği
- Arka planda oynatma

**Video formatları:**
- MP4
- HLS (canlı yayın)
- MOV
- M3U8

**Projenizde:**
- `explore.tsx` - Keşfet video oynatma
- `profile.tsx` - Profil videoları
- `user/[id].tsx` - Kullanıcı videoları

---

### **expo-video** (v3.0.0)
**Ne işe yarar:** Expo'nun kendi video oynatıcısı.

**react-native-video vs expo-video:**
- expo-video daha yeni
- Daha iyi performans
- Daha az bug
- Expo ekosistemi ile entegre

---

### **react-native-vision-camera** (v4.7.3)
**Ne işe yarar:** Profesyonel kamera kontrolü.

**Özellikler:**
- 4K video kayıt
- 60 FPS
- Manuel fokus
- ISO, shutter speed kontrolü
- QR kod tarama
- Yüz tanıma
- Frame processor (her kare üzerinde işlem)

**react-native-vision-camera vs expo-camera:**
- Vision camera daha güçlü
- Daha fazla kontrol
- Profesyonel video çekim için ideal

---

### **@react-native-firebase/analytics** (v23.7.0)
**Ne işe yarar:** Google Analytics entegrasyonu. Kullanıcı davranışlarını takip eder.

**Takip edilebilecekler:**
- Hangi sayfa kaç kez görüntülendi
- Hangi buton kaç kez tıklandı
- Kullanıcı ne kadar süre kaldı
- Hangi özellikler kullanılıyor

**Günlük hayattan örnek:** Mağazada müşterilerin hangi reyonları gezdiğini izlemek.

---

### **@react-native-firebase/crashlytics** (v23.7.0)
**Ne işe yarar:** Uygulama çöktüğünde (crash) raporlar.

**Faydası:** Hangi hatalar oluşuyor, hangi cihazlarda problem var öğrenirsiniz.

**Çöküş raporu içeriği:**
- Hangi satırda hata oldu
- Hangi cihazda oldu
- Hangi işletim sisteminde
- Hata mesajı

---

### **@react-native-firebase/messaging** (v23.7.0)
**Ne işe yarar:** Firebase Cloud Messaging (FCM) ile push notification gönderir.

**Kullanım alanları:**
- Yeni mesaj bildirimi
- Kampanya duyuruları
- Hatırlatmalar

---

### **@react-native-firebase/app** (v23.7.0)
**Ne işe yarar:** Firebase'in temel paketi. Diğer Firebase paketlerinin çalışması için gerekli.

---

### **react-native-compressor** (v1.16.0)
**Ne işe yarar:** Video ve fotoğrafları sıkıştırır (boyutunu küçültür).

**Neden önemli:**
- Yavaş internet olan kullanıcılar için
- Sunucu maliyetini düşürür
- Daha hızlı yükleme

**Sıkıştırma seçenekleri:**
- Kalite ayarı
- Çözünürlük değiştirme
- Format dönüştürme

---

### **react-native-color-matrix-image-filters** (v8.0.2)
**Ne işe yarar:** Fotoğraflara filtre uygular.

**Günlük hayattan örnek:** Instagram filtreleri gibi.

**Filtreler:**
- Sepia (nostaljik)
- Grayscale (siyah-beyaz)
- Brightness (parlaklık)
- Contrast (kontrast)
- Saturation (renk doygunluğu)

---

### **@qeepsake/react-native-images-collage** (v3.3.6)
**Ne işe yarar:** Birden fazla fotoğrafı kolaj şeklinde birleştirir.

**Günlük hayattan örnek:** Anı defterinde birden fazla fotoğrafı bir arada göstermek.

**Kullanım alanları:**
- Ürün galerisi
- Story highlights
- Profil kapak fotoğrafı

---

## 🔐 Backend ve Veritabanı

### **@supabase/supabase-js** (v2.47.0)
**Ne işe yarar:** Supabase veritabanı ile iletişim kurar.

**Supabase nedir:** Firebase'e açık kaynak alternatif. Backend as a Service (BaaS).

**Supabase özellikleri:**
- PostgreSQL veritabanı
- Gerçek zamanlı senkronizasyon
- Authentication (kimlik doğrulama)
- Storage (dosya depolama)
- Edge Functions (sunucu fonksiyonları)

**Günlük hayattan örnek:** Bir kütüphane. Kitapları (veri) saklarsınız, ödünç alırsınız (çekersiniz), geri verirsiniz (güncellersiniz).

**Projenizde kullanımı:**
- `supabase.ts` - Supabase bağlantısı
- `useAuthStore.ts` - Kimlik doğrulama store'u

**Temel işlemler:**
```javascript
// Veri çekme
const { data } = await supabase.from('users').select('*')

// Veri ekleme
await supabase.from('posts').insert({ title: 'Merhaba' })

// Veri güncelleme
await supabase.from('users').update({ name: 'Ahmet' }).eq('id', 1)

// Veri silme
await supabase.from('posts').delete().eq('id', 5)
```

---

## 🔑 Kimlik Doğrulama

### **@react-native-google-signin/google-signin** (v16.0.0)
**Ne işe yarar:** "Google ile Giriş Yap" özelliği ekler.

**Kullanıcı için faydası:**
- Hızlı kayıt (bir tıkla)
- Şifre hatırlamaya gerek yok
- Güvenli

**Geliştirici için faydası:**
- Kullanıcı bilgilerini doğrulanmış alırsınız
- E-posta verification'a gerek yok

---

## 🔔 Bildirim Sistemleri

### **react-native-toast-message** (v2.0.0)
**Ne işe yarar:** Ekranda kısa süreli bildirim mesajları gösterir (toast).

**Günlük hayattan örnek:** Android'de "İnternet bağlantısı kesildi" şeklinde altta çıkan mesajlar.

**Toast tipleri:**
- Success (başarılı işlem) - Yeşil
- Error (hata) - Kırmızı
- Info (bilgi) - Mavi
- Warning (uyarı) - Sarı

**Projenizde:** `_layout.tsx` - Uygulama genelinde toast gösterimi

---

## ⚡ Performans ve Optimizasyon

### **@shopify/flash-list** (v2.0.2)
**Ne işe yarar:** Çok uzun listeleri performanslı gösterir.

**Normal FlatList vs FlashList:**
- FlashList 5x daha hızlı
- Daha az bellek kullanır
- Blank screen problemi yok
- Recycling mekanizması daha iyi

**Günlük hayattan örnek:** Süpermarkette sonsuz uzunluktaki bir koridor. Sadece gördüğünüz raflar hazır, diğerleri gerektiğinde yüklenir.

**Projenizde:**
- `CarouselLayer.tsx` - Carousel'de item listesi
- `FeedManager.tsx` - Feed listesi

**Kullanım senaryoları:**
- Sonsuz scroll
- Binlerce itemli listeler
- Video feed
- Chat mesaj listesi

---

### **react-native-mmkv** (v3.3.0)
**Ne işe yarar:** Çok hızlı key-value storage (anahtar-değer deposu).

**AsyncStorage vs MMKV:**
- MMKV 30x daha hızlı
- Senkron işlem yapabilir
- Daha güvenli
- Daha büyük veri saklayabilir

**Günlük hayattan örnek:** Cüzdanınız (MMKV) vs banka kasası (AsyncStorage). Küçük değerli şeylere hızlıca erişmek için cüzdan kullanırsınız.

**Saklanan veriler:**
- Kullanıcı tercihleri
- Token'lar
- Cache verileri
- App state

---

### **@react-native-async-storage/async-storage** (v2.2.0)
**Ne işe yarar:** Asenkron veri saklama.

**Kullanım alanları:**
- Uzun metinler
- JSON verileri
- Offline veri

**Projenizde:**
- `PerformanceLogger.ts` - Performans logları
- `supabase.ts` - Token saklama
- `ThemeContext.tsx` - Tema tercihi

---

### **react-native-worklets** (v0.5.1) & **react-native-worklets-core** (v1.3.0)
**Ne işe yarar:** JavaScript kodunu UI thread'de çalıştırır.

**Normal JavaScript vs Worklet:**
- Normal JS: JavaScript thread'de çalışır (yavaş olabilir)
- Worklet: UI thread'de çalışır (60 FPS garanti)

**Kullanım alanları:**
- Gesture handling
- Animasyonlar
- Video processing
- Real-time hesaplamalar

**Teknik detay:** Reanimated 2 ve Skia bu teknoloji ile çalışır.

---

### **@react-native-community/netinfo** (v11.4.1)
**Ne işe yarar:** İnternet bağlantısını kontrol eder.

**Kontrol edebilecekleriniz:**
- Bağlantı var mı?
- WiFi mi, mobil veri mi?
- Bağlantı hızı ne kadar?

**Kullanım alanları:**
- Offline mod
- Video kalitesi ayarlama
- Veri kullanımı optimizasyonu

**Projenizde:**
- `bufferConfig.ts` - Buffer ayarları
- `VideoLayer.tsx` - Video kalitesi
- `VideoPlayerPool.tsx` - Video pool yönetimi

---

## 🎯 State Yönetimi

### **zustand** (v5.0.0)
**Ne işe yarar:** Global state (uygulama genelindeki durumlar) yönetir.

**Günlük hayattan örnek:** Bir şirketin merkez ofisi. Tüm şubelerin erişebileceği merkezi bilgiler burada tutulur.

**Redux vs Zustand:**
- Zustand daha basit
- Daha az kod
- Daha hızlı
- TypeScript desteği mükemmel

**State nedir:** Uygulamanın anlık durumu.

**Örnekler:**
- Kullanıcı giriş yapmış mı?
- Tema açık mı koyu mu?
- Sepette kaç ürün var?

**Projenizde:**
- `useActiveVideoStore.ts` - Aktif video state'i
- `useAuthStore.ts` - Kimlik doğrulama state'i
- `useBrightnessStore.ts` - Parlaklık state'i

**Zustand kullanım örneği:**
```javascript
const useStore = create((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 }))
}))
```

---

## 📱 React Native Temel Bileşenler

### **react-native-safe-area-context** (v5.6.0)
**Ne işe yarar:** Ekranın güvenli alanlarını (safe area) tespit eder.

**Günlük hayattan örnek:** iPhone'da üstteki çentik ve alttaki ev çubuğu alanını tespit eder. İçerik bu alanların altında kalmaz.

**Neden önemli:**
- Çentik olan telefonlarda içerik kaybolmaz
- Android'de navigation bar'ın üstüne çıkmaz
- Her cihazda doğru görünüm

**Projenizde:** Hemen hemen her sayfada kullanılıyor

---

### **react-native-screens** (v4.16.0)
**Ne işe yarar:** Ekran geçişlerini native olarak yönetir.

**Faydaları:**
- Daha hızlı geçişler
- Daha az bellek kullanımı
- Native his

---

### **@react-native-masked-view/masked-view** (v0.3.2)
**Ne işe yarar:** Görünümleri maskeleyerek özel şekiller oluşturur.

**Günlük hayattan örnek:** Bir fotoğrafı kalp şeklinde kesmek.

**Kullanım alanları:**
- Gradient text
- Custom şekilli görüntüler
- Özel avatar frame'leri

---

### **react-native-pager-view** (v6.9.1)
**Ne işe yarar:** Sayfa sayfa kaydırma (swipe) yapar.

**Günlük hayattan örnek:** Instagram'da story'leri kaydırma.

**Kullanım alanları:**
- Onboarding ekranları
- Story viewer
- Image gallery
- Tab görünümleri

**Projenizde:**
- `profile.tsx` - Profil tab'ları
- `user/[id].tsx` - Kullanıcı profil tab'ları
- `StoryViewer.tsx` - Story görüntüleyici

---

### **react-native-webview** (v13.15.0)
**Ne işe yarar:** Web sayfalarını uygulama içinde gösterir.

**Kullanım alanları:**
- Blog içeriği
- Ödeme sayfaları
- İçerik sayfaları
- External linkler

**Projenizde:** `InAppBrowserOverlay.tsx` - Uygulama içi tarayıcı

---

### **react-native-keyboard-controller** (v1.20.6)
**Ne işe yarar:** Klavyeyi gelişmiş şekilde kontrol eder.

**Özellikler:**
- Klavye yüksekliği tespit
- Klavye açılma/kapanma event'leri
- Smooth keyboard animations
- KeyboardAvoidingView alternatifi

**Neden önemli:**
- Input'lar klavyenin altında kalmaz
- Daha iyi kullanıcı deneyimi

---

## 🎮 Etkileşim ve Sosyal

### **react-native-controlled-mentions** (v3.1.0)
**Ne işe yarar:** Mention (@kullaniciadi) özelliği ekler.

**Günlük hayattan örnek:** Twitter'da @umit yazarak birini etiketlemek.

**Özellikler:**
- @ ile kullanıcı arama
- Otomatik tamamlama
- Mention listesi

---

### **rn-emoji-keyboard** (v1.7.0)
**Ne işe yarar:** Emoji klavyesi ekler.

**Özellikler:**
- Kategori bazlı emojiler
- Arama özelliği
- Son kullanılanlar
- Custom emojiler

---

### **react-native-qrcode-svg** (v6.3.21)
**Ne işe yarar:** QR kod oluşturur.

**Kullanım alanları:**
- Profil paylaşımı
- Link paylaşımı
- Ödeme kodları
- Etkinlik bileti

---

## 💳 Ödeme ve Satın Alma

### **react-native-purchases** (v9.7.0)
**Ne işe yarar:** RevenueCat ile uygulama içi satın alma (in-app purchase) yönetir.

**RevenueCat nedir:** Abonelik ve satın alma işlemlerini kolaylaştıran servis.

**Özellikler:**
- iOS ve Android satın alma entegrasyonu
- Abonelik yönetimi
- Ücretsiz deneme
- Promosyon kodları
- Analytics

**Kullanım alanları:**
- Premium üyelik
- Özel özellikler
- Reklamsız deneyim

---

## 🛠️ Geliştirici Araçları

### **typescript** (v5.9.2)
**Ne işe yarar:** JavaScript'e tip kontrolü ekler.

**JavaScript vs TypeScript:**
```javascript
// JavaScript (hata çalışma zamanında)
function topla(a, b) {
  return a + b
}
topla("5", 3) // "53" döner (beklenmedik)

// TypeScript (hata yazarken)
function topla(a: number, b: number): number {
  return a + b
}
topla("5", 3) // HATA: string number olamaz
```

**Faydaları:**
- Hataları önceden yakalar
- Kod editöründe otomatik tamamlama
- Daha iyi dokümantasyon
- Refactoring kolaylığı

---

### **babel-preset-expo** (v54.0.8)
**Ne işe yarar:** JavaScript kodunu React Native'in anlayacağı hale çevirir.

**Babel nedir:** Kod çevirici (transpiler).

**Ne çevirir:**
- Modern JavaScript → Eski JavaScript
- TypeScript → JavaScript
- JSX → JavaScript

---

### **babel-plugin-module-resolver** (v5.0.2)
**Ne işe yarar:** Import path'lerini kısaltır.

**Örnek:**
```javascript
// Önce
import Button from '../../../components/Button'

// Sonra (module resolver ile)
import Button from '@/components/Button'
```

---

### **react-native-svg-transformer** (v1.5.2)
**Ne işe yarar:** SVG dosyalarını React component'ine çevirir.

**Kullanım:**
```javascript
import Logo from './logo.svg'

<Logo width={100} height={100} />
```

---

### **@types/react** (v19.1.10)
**Ne işe yarar:** React için TypeScript tip tanımları.

**Neden gerekli:** TypeScript, React'i tanımıyor. Bu paket sayesinde tanıyor.

---

### **@expo/ngrok** (v4.1.3)
**Ne işe yarar:** Local geliştirme sunucusunu internet üzerinden erişilebilir yapar.

**Kullanım senaryosu:**
- Gerçek cihazda test
- Uzaktaki bir cihazda test
- Webhook test

---

## 📐 Stil ve Tema

### **tailwindcss** (v3.3.0)
**Ne işe yarar:** Utility-first CSS framework. NativeWind'in config dosyası.

**Tailwind felsefesi:** Önceden tanımlanmış CSS sınıfları kullanarak hızlı stil yazmak.

**Örnek:**
```html
<!-- Klasik CSS -->
<div style={{
  display: 'flex',
  backgroundColor: '#3B82F6',
  padding: 16,
  borderRadius: 8
}}>

<!-- Tailwind -->
<div className="flex bg-blue-500 p-4 rounded-lg">
```

---

### **@react-native-community/slider** (v5.0.1)
**Ne işe yarar:** Kaydırmalı slider component'i.

**Kullanım alanları:**
- Volume kontrolü
- Brightness kontrolü
- Progress bar
- Range seçici

---

## 📊 Analytics ve Monitoring

### **@react-native-firebase/analytics** (v23.7.0)
**Detaylı açıklama:** (Yukarıda Video ve Medya bölümünde açıklandı)

**Ek bilgi - Takip edilebilecek eventler:**
- screen_view (sayfa görüntüleme)
- select_content (içerik seçimi)
- search (arama)
- share (paylaşım)
- login (giriş)
- sign_up (kayıt)
- purchase (satın alma)
- add_to_cart (sepete ekleme)

---

### **@react-native-firebase/crashlytics** (v23.7.0)
**Detaylı açıklama:** (Yukarıda Video ve Medya bölümünde açıklandı)

**Ek bilgi - Crash raporu nasıl okunur:**
1. Stack trace (hata nereden kaynaklandı)
2. Device info (hangi cihaz)
3. OS version (hangi işletim sistemi)
4. App version (hangi uygulama versiyonu)
5. Custom logs (özel loglar)

---

## 🎨 UI Component Kütüphaneleri

### **@react-native-masked-view/masked-view** (v0.3.2)
**Detaylı açıklama:** (Yukarıda React Native Temel Bileşenler bölümünde açıklandı)

---

## 📝 Özet Tablo

| Kategori | Paket Sayısı | Ana Kullanım Amacı |
|----------|--------------|---------------------|
| Core | 4 | Temel React/React Native |
| Expo | 30+ | Hızlı geliştirme, native özellikler |
| UI/Animation | 10+ | Görsel efektler, animasyonlar |
| Video/Media | 8+ | Video oynatma, kamera, medya işleme |
| Backend | 1 | Veritabanı (Supabase) |
| Auth | 2 | Giriş yapma (Google, Apple) |
| Notifications | 4 | Bildirimler |
| Performance | 6+ | Hız optimizasyonu |
| State Management | 1 | Global state (Zustand) |
| Developer Tools | 6+ | Geliştirme araçları |

---

## 🎓 Yeni Başlayanlar İçin Öneriler

### Hangi paketleri önce öğrenmeliyim?

1. **Temel seviye (ilk hafta):**
   - react
   - react-native
   - expo
   - expo-router

2. **Orta seviye (2-4. hafta):**
   - zustand
   - react-native-reanimated
   - @supabase/supabase-js
   - expo-image-picker

3. **İleri seviye (1+ ay):**
   - @shopify/react-native-skia
   - react-native-vision-camera
   - react-native-worklets

---

## ❓ Sık Sorulan Sorular

### Neden bu kadar çok paket var?
Her paket özel bir işi yapar. Hepsini birleştirince profesyonel bir mobil uygulama oluşur. Sıfırdan her şeyi yazmaktansa hazır, test edilmiş paketler kullanmak hem daha hızlı hem daha güvenilirdir.

### Bu paketler ücretsiz mi?
Evet, hepsi açık kaynak ve ücretsiz. Ancak bazı servislerin (Firebase, Supabase, RevenueCat) kendi fiyatlandırmaları var.

### Paket güncellemeleri önemli mi?
Evet, çok önemli. Güvenlik açıklarını kapatır, performansı artırır ve yeni özellikler ekler.

### Tüm paketleri kullanmak zorunda mıyım?
Hayır. Projenize göre gerekli olanları kullanın. Kullanmadığınız paketler uygulamayı şişirir.

---

## 🔗 Faydalı Kaynaklar

- [React Native Dokümantasyon](https://reactnative.dev/)
- [Expo Dokümantasyon](https://docs.expo.dev/)
- [Supabase Dokümantasyon](https://supabase.com/docs)
- [React Native Directory](https://reactnative.directory/) - Paket arama
- [Can I Use?](https://caniuse.com/) - Tarayıcı desteği

---

## 📞 Destek

Bu dokümanda eksik veya hatalı bir bilgi bulursanız, lütfen GitHub'da issue açın veya pull request gönderin.

---

**Son Güncelleme:** 16 Ocak 2026
**Proje:** Mobile App
**Hazırlayan:** AI Assistant (Claude)
**Dil:** Türkçe 🇹🇷
