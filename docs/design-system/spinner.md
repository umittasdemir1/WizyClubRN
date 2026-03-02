# WizyClub - Aktif Spinner (Yükleme Belirteçleri) Envanteri

Bu belge, uygulamadaki "Infinite Feed" ve ilgili bileşenlerde kullanılan tüm spinner ve yükleme animasyonlarını listeler.

## 1. Pull-to-Refresh (Yenileme Denetimi)
- **Dosya:** `InfiniteFeedManager.tsx`
- **Bileşen:** `RefreshControl`
- **Yer:** `FlashList` bileşeninin `refreshControl` prop'u (Satır 1031).
- **Stil:** Native `RefreshControl` bileşeni kullanılır. Rengi tema bazlı `themeColors.textPrimary` (Koyu modda beyaz, açık modda siyah) ile belirlenir.
- **Tetikleyici:** Kullanıcı listeyi yukarıdan aşağıya çektiğinde aktif olur.

## 2. İlk Yükleme Spinner'ı (Empty State)
- **Dosya:** `InfiniteFeedManager.tsx`
- **Bileşen:** `ActivityIndicator` (size="large")
- **Yer:** `listEmpty` fonksiyonu içinde, liste boş ve `isLoading` true iken gösterilir (Satır 972).
- **Stil:** `themeColors.textPrimary` renginde, ekran ortasında büyük bir spinner.
- **Tetikleyici:** Uygulama veya sekme ilk açıldığında veriler gelene kadar gösterilir.

## 3. Daha Fazla Yükle Spinner'ı (Pagination)
- **Dosya:** `InfiniteFeedManager.tsx`
- **Bileşen:** `ActivityIndicator`
- **Yer:** `FlashList` bileşeninin `ListFooterComponent` prop'unda, `isLoadingMore` true iken gösterilir (Satır 1039).
- **Stil:** `themeColors.textPrimary` renginde, listenin en altında küçük bir spinner.
- **Tetikleyici:** Kullanıcı listenin sonuna yaklaştığında (pagination/onEndReached) aktif olur.

## 4. Carousel (Kaydırmalı Medya) Yükleme Spinner'ı
- **Dosya:** `InfiniteCarouselLayer.tsx`
- **Bileşen:** `ActivityIndicator`
- **Yer:** `InfiniteCarouselLayer` bileşeni içinde, medya henüz yüklenmemişken (`!activeImageLoaded`) overlay olarak gösterilir (Satır 367).
- **Stil:** Sabit `#FFFFFF` (beyaz) renginde, aktif medya kartının tam ortasında.
- **Tetikleyici:** Çoklu fotoğraf/video içeren kartlarda (carousel), aktif olan görsel veya video yükleme aşamasındayken gösterilir.

---
*Not: Pool Feed (TikTok modu) aktif edildiğinde `PoolFeedManager` benzer bir set kullanır ancak ana odak Infinite Feed yapısıdır.*
