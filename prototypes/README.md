# WizyClub Deals & Coupons Prototypes

Bu klasörde iki adet pixel-perfect HTML prototipi bulunmaktadır.

## Dosyalar

### 1. deals-page.html
**Enhanced Deals Page** - Ana deals sayfası

**Özellikler:**
- ✅ Search bar + ticket icon (coupons page'e geçiş)
- ✅ Hero banner (Summer Sale Finale)
- ✅ Shop by Brand (Nike, Adidas, Starbucks, Netflix)
- ✅ Discount badges
- ✅ Horizontal scroll categories
- ✅ Back to School banner
- ✅ Mobil responsive tasarım
- ✅ Touch/click animasyonlar

### 2. coupons-page.html
**My Coupons Page** - Kupon ikonuna tıklandığında açılan sayfa

**Özellikler:**
- ✅ Split layout (Sol: Carousel, Sağ: Grid)
- ✅ Carousel indicators (scrollable)
- ✅ Category filters (All, Food, Shopping, Sports Ticket)
- ✅ Colorful coupon cards (6 farklı renk)
- ✅ Popular Now section
- ✅ Redeem buttons
- ✅ Brand logos (Netflix, Nike, McDonald's)
- ✅ Interactive filter chips

## Nasıl Test Edilir?

### Yöntem 1: Tarayıcıda Doğrudan Açma
```bash
# Deals page
open prototypes/deals-page.html

# Coupons page
open prototypes/coupons-page.html
```

### Yöntem 2: Local Server ile (Önerilen)
```bash
cd prototypes
python3 -m http.server 8000
# Tarayıcıda: http://localhost:8000/deals-page.html
```

### Yöntem 3: VS Code Live Server
1. VS Code'da HTML dosyasına sağ tıklayın
2. "Open with Live Server" seçin

## Navigasyon

**deals-page.html** → Sağ üstteki ticket icon'a tıklayın → **coupons-page.html** açılır

## Tasarım Detayları

### Renkler
- **Nike/Netflix/Adidas**: Black (#000)
- **Starbucks**: Green (#00704A)
- **Netflix Badge**: Red (#E50914)
- **Discount Badges**: Red (#FF6B6B)
- **Backgrounds**: Pastel colors (pink, green, blue, orange, purple)

### Fontlar
- System font stack (iOS: SF Pro, Android: Roboto)
- Weights: 400 (normal), 600 (semibold), 700 (bold), 900 (black)

### Animasyonlar
- Scale down on active (:active pseudo-class)
- Smooth transitions (0.2s)
- Touch-friendly tap targets (min 44x44px)

### Responsive
- Max width: 428px (iPhone 14 Pro Max boyutu)
- Horizontal scroll sections (brands, categories)
- Vertical scroll (carousel, grid)

## React Native'e Dönüştürme Notları

### Kullanılacak Componentler
```
deals-page.html → app/(tabs)/deals.tsx
├── ScrollView (main container)
├── TextInput (search bar)
├── TouchableOpacity (ticket icon, buttons)
├── Image (hero banner)
├── FlatList (brands horizontal)
├── FlatList (categories horizontal)
└── LinearGradient (banners)

coupons-page.html → CouponsModal.tsx (veya yeni route)
├── View (split layout)
├── ScrollView (left carousel)
├── FlatList (right grid)
├── TouchableOpacity (filter chips, coupon cards)
└── Animated (carousel indicators)
```

### Gerekli Kütüphaneler
- `expo-linear-gradient` - Gradient backgrounds ✅ (zaten yüklü)
- `@shopify/flash-list` - Performant lists ✅ (zaten yüklü)
- `react-native-reanimated` - Smooth animations ✅ (zaten yüklü)

### NativeWind Classları
HTML'deki CSS stilleri kolayca NativeWind/Tailwind classlarına dönüştürülebilir.

## Sonraki Adımlar

1. ✅ HTML prototipleri tamamlandı
2. ⏭️ Kullanıcı onayı bekliyor
3. ⏭️ React Native implementasyonu
4. ⏭️ API entegrasyonu
5. ⏭️ Backend bağlantısı

---

**Not:** Bu prototiplerdesktop tarayıcıda test ederken Developer Tools'u açın (F12) ve mobil görünüme geçin (Responsive Design Mode - Ctrl+Shift+M).
