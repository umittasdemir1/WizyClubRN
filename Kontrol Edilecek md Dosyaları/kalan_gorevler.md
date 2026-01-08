# WizyClub - Kalan Görevler ve Yol Haritası

Bu belge, WizyClub projesinin tamamlanması gereken görevlerini ve gelecek geliştirmelerini özetler.

---

## ✅ Tamamlanan Görevler

### Cloudflare R2 Entegrasyonu
- [x] R2 bucket yapılandırması (`wizyclub-assets`)
- [x] Backend `.env` güncellemesi
- [x] Video yükleme pipeline'ı (HLS/MP4)
- [x] Thumbnail yükleme
- [x] Sprite sheet oluşturma
- [x] Avatar yükleme endpoint'i (`/upload-avatar`)
- [x] R2 MCP Server kurulumu (D: sürücüsü)

### Supabase Database
- [x] Profiles tablosu (14 sütun)
- [x] Videos tablosu
- [x] Social_links tablosu
- [x] Soft delete RPC fonksiyonları

### Profile Sistemi
- [x] EditProfileSheet component
- [x] Profil güncelleme mantığı (`useProfile` hook)
- [x] Avatar yükleme frontend entegrasyonu
- [x] Database'den yeniden yükleme (reload) mekanizması

---

## 🔄 Devam Eden / Planlanan Görevler

### 1. Supabase Auth Entegrasyonu (Öncelik: YÜKSEK)
**Açıklama:** Şu an profil ID'si sabit kodlanmış (`wizyclub-official`). Gerçek uygulama için Supabase Auth ile kimlik doğrulama gerekli.

**Yapılacaklar:**
- [ ] Login/Register ekranları tasarımı
- [ ] `supabase.auth.signUp()` ve `signIn()` implementasyonu
- [ ] Session yönetimi (`onAuthStateChange`)
- [ ] Protected routes (auth gerektiren sayfalar)
- [ ] Profile ID'sinin `supabase.auth.getUser()?.id` ile dinamik alınması
- [ ] RLS (Row Level Security) politikalarının aktifleştirilmesi

**Dosyalar:**
- `app/(auth)/login.tsx` [YENİ]
- `app/(auth)/register.tsx` [YENİ]
- `src/core/auth.ts` [YENİ]
- `src/presentation/hooks/useAuth.ts` [YENİ]
- `app/_layout.tsx` [GÜNCELLE]

---

### 2. Stories (Hikayeler) Sistemi (Öncelik: ORTA)
**Açıklama:** Instagram tarzı 24 saat sonra kaybolan hikaye sistemi.

**Yapılacaklar:**
- [ ] Stories tablosu zaten mevcut, frontend entegrasyonu
- [ ] Hikaye oluşturma UI
- [ ] Hikaye görüntüleme (StoryViewer bileşeni zaten var)
- [ ] 24 saat sonra otomatik silme (Supabase cron job veya Edge Function)
- [ ] İzlenme sayacı

---

### 3. Follows (Takip) Sistemi (Öncelik: ORTA)
**Açıklama:** Kullanıcıların birbirini takip etmesi.

**Yapılacaklar:**
- [ ] `follows` tablosu zaten mevcut
- [ ] Takip et/Takibi bırak butonları
- [ ] Takipçi sayısı güncelleme (trigger veya RPC)
- [ ] Takip eden/Takip edilen listeleri

---

### 4. Likes & Saves Sistemi (Öncelik: ORTA)
**Yapılacaklar:**
- [ ] `likes` tablosu entegrasyonu
- [ ] `saves` tablosu entegrasyonu
- [ ] Çift tıklama ile beğenme animasyonu (zaten var, backend bağlantısı)
- [ ] Beğeni/Kaydetme sayacı güncelleme

---

### 5. Brand Deals (İş Birlikleri) (Öncelik: DÜŞÜK)
**Yapılacaklar:**
- [ ] `brands` ve `brand_deals` tablolarının frontend entegrasyonu
- [ ] Deals ekranı içerik doldurma
- [ ] Marka profil sayfaları

---

### 6. Notifications (Bildirimler) (Öncelik: DÜŞÜK)
**Yapılacaklar:**
- [ ] Bildirim tablosu oluşturma
- [ ] Push notification entegrasyonu (Expo Push)
- [ ] In-app bildirim listesi UI

---

## 🛠 Teknik İyileştirmeler

### Performans
- [ ] Video prefetch stratejisi optimizasyonu
- [ ] Image caching (expo-image)
- [ ] FlashList fine-tuning

### Kod Kalitesi
- [ ] TypeScript strict mode etkinleştirme
- [ ] `any` tiplerini kaldırma
- [ ] Unit testler (Jest)
- [ ] E2E testler (Detox veya Maestro)

### DevOps
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging ortamı
- [ ] Production deployment checklist

---

## 📱 UI/UX İyileştirmeleri
- [ ] Dark mode toggle (zaten var, tutarlılık kontrolü)
- [ ] Skeleton loaders
- [ ] Error boundary'ler
- [ ] Haptic feedback tüm etkileşimlere

---

## 🚀 Önerilen Öncelik Sırası

1. **Supabase Auth** - Tüm diğer özelliklerin temeli
2. **Follows Sistemi** - Profil sayfasında kullanıcı etkileşimi
3. **Likes & Saves** - Video etkileşimleri
4. **Stories** - Yeni içerik tipi
5. **Brand Deals** - Monetizasyon
6. **Notifications** - Kullanıcı bağlılığı

---

*Bu belge 2025-12-27 tarihinde oluşturulmuştur.*
