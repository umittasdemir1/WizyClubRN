# Paket Kullanım Raporu

Bu rapor, /mobile projesindeki paketleri, amaçlarını ve nerede kullanıldıklarını listeler.

## Dependencies

| Paket | Versiyon | Ne işe yarar | Nerede kullanılıyor |
| --- | --- | --- | --- |
| @expo/vector-icons | ^15.0.3 | Expo ikon seti | `app/(tabs)/deals.tsx`, `package-lock.json`, `package.json`, `src/presentation/components/profile/SocialTags.tsx` |
| @gorhom/bottom-sheet | ^5.0.0 | Bottom sheet UI | `app/(tabs)/profile.tsx`, `app/_layout.tsx`, `app/drafts.tsx`, `app/user/[id].tsx`, `package-lock.json` |
| @qeepsake/react-native-images-collage | ^3.3.6 | Image collage | `package-lock.json`, `package.json` |
| @react-native-async-storage/async-storage | 2.2.0 | Async storage | `package-lock.json`, `package.json`, `src/core/services/PerformanceLogger.ts`, `src/core/supabase.ts`, `src/presentation/contexts/ThemeContext.tsx` |
| @react-native-community/netinfo | 11.4.1 | Network info | `package-lock.json`, `package.json`, `src/core/utils/bufferConfig.ts`, `src/presentation/components/feed/VideoLayer.tsx`, `src/presentation/components/feed/VideoPlayerPool.tsx` |
| @react-native-community/slider | 5.0.1 | Slider | `package-lock.json`, `package.json` |
| @react-native-firebase/analytics | ^23.7.0 | Firebase Analytics | `package-lock.json`, `package.json` |
| @react-native-firebase/app | ^23.7.0 | Firebase çekirdek | `package-lock.json`, `package.json` |
| @react-native-firebase/crashlytics | ^23.7.0 | Crashlytics | `package-lock.json`, `package.json` |
| @react-native-firebase/messaging | ^23.7.0 | FCM | `package-lock.json`, `package.json` |
| @react-native-google-signin/google-signin | ^16.0.0 | Google Sign-In | `package-lock.json`, `package.json` |
| @react-native-masked-view/masked-view | 0.3.2 | Masked view | `package-lock.json`, `package.json` |
| @shopify/flash-list | 2.0.2 | Performanslı liste | `declarations.d.ts`, `package-lock.json`, `package.json`, `src/presentation/components/feed/CarouselLayer.tsx`, `src/presentation/components/feed/FeedManager.tsx` |
| @shopify/react-native-skia | 2.2.12 | Skia grafik | `package-lock.json`, `package.json`, `src/presentation/components/shared/AdvancedStoryRing.tsx`, `src/presentation/components/shared/RectangularStoryRing.tsx` |
| @supabase/supabase-js | ^2.47.0 | Supabase istemcisi | `package-lock.json`, `package.json`, `src/core/supabase.ts`, `src/presentation/store/useAuthStore.ts` |
| expo | ~54.0.0 | Expo SDK runtime ve modüller | `app.json`, `package-lock.json`, `package.json` |
| expo-apple-authentication | ~8.0.0 | Apple Sign In | `package-lock.json`, `package.json` |
| expo-av | ~16.0.0 | Audio/Video API | `package-lock.json`, `package.json`, `src/presentation/components/feed/UploadModal.tsx` |
| expo-background-fetch | ~14.0.0 | Background fetch | `package-lock.json`, `package.json` |
| expo-blur | ~15.0.0 | Blur view | `package-lock.json`, `package.json`, `src/presentation/components/discovery/MorphBlurView.tsx`, `src/presentation/components/feed/DeleteConfirmationModal.tsx`, `src/presentation/components/story/StoryPage.tsx` |
| expo-build-properties | ^1.0.0 | Native build config | `app.json`, `package-lock.json`, `package.json` |
| expo-camera | ~17.0.0 | Kamera API | `app/upload.tsx`, `package-lock.json`, `package.json` |
| expo-clipboard | ~8.0.0 | Clipboard erişimi | `package-lock.json`, `package.json` |
| expo-constants | ~18.0.0 | Uygulama sabitleri | `package-lock.json`, `package.json` |
| expo-contacts | ~15.0.0 | Rehber erişimi | `package-lock.json`, `package.json` |
| expo-dev-client | ~6.0.0 | Custom dev client | `package-lock.json`, `package.json` |
| expo-device | ~8.0.0 | Cihaz bilgisi | `package-lock.json`, `package.json` |
| expo-file-system | ~19.0.0 | Dosya sistemi | `package-lock.json`, `package.json`, `src/presentation/components/profile/DraftsGrid.tsx` |
| expo-font | ~14.0.0 | Font yükleme | `package-lock.json`, `package.json` |
| expo-haptics | ~15.0.0 | Haptic feedback | `app/(tabs)/explore.tsx`, `package-lock.json`, `package.json`, `src/presentation/components/feed/FeedItemOverlay.tsx` |
| expo-image | ~3.0.0 | Image component | `app/(tabs)/explore.tsx`, `package-lock.json`, `package.json`, `src/presentation/components/deals/BrandAvatar.tsx`, `src/presentation/components/deals/CategoryCard.tsx` |
| expo-image-picker | ~17.0.0 | Medya seçici | `app/upload.tsx`, `package-lock.json`, `package.json`, `src/presentation/components/feed/UploadModal.tsx`, `src/presentation/components/profile/EditProfileSheet.tsx` |
| expo-keep-awake | ~15.0.0 | Uyumayı engelle | `app/_layout.tsx`, `package-lock.json`, `package.json` |
| expo-linear-gradient | ~15.0.0 | Linear gradient | `app/login.tsx`, `app/signup.tsx`, `app/upload.tsx`, `package-lock.json`, `package.json` |
| expo-linking | ~8.0.0 | Amaç net değil | `package-lock.json`, `package.json` |
| expo-local-authentication | ~17.0.0 | Biyometrik auth | `package-lock.json`, `package.json` |
| expo-location | ~19.0.0 | Konum servisleri | `package-lock.json`, `package.json` |
| expo-media-library | ~18.2.1 | Medya kütüphanesi | `app/upload.tsx`, `package-lock.json`, `package.json` |
| expo-navigation-bar | ~5.0.0 | Android navigation bar kontrolü | `package-lock.json`, `package.json` |
| expo-notifications | ~0.32.0 | Push bildirim | `package-lock.json`, `package.json` |
| expo-router | ~6.0.21 | Dosya tabanlı yönlendirme | `.expo/types/router.d.ts`, `app/(tabs)/_layout.tsx`, `app/(tabs)/deals.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/notifications.tsx` |
| expo-screen-orientation | ~9.0.0 | Orientation lock | `package-lock.json`, `package.json`, `src/presentation/components/feed/VideoLayer.tsx` |
| expo-secure-store | ~15.0.0 | Güvenli storage | `app.json`, `package-lock.json`, `package.json` |
| expo-sharing | ~14.0.0 | Paylaşım | `package-lock.json`, `package.json` |
| expo-splash-screen | ~31.0.0 | Splash kontrolü | `app/_layout.tsx`, `app.json`, `package-lock.json`, `package.json` |
| expo-status-bar | ~3.0.0 | Status bar kontrolü (edge-to-edge ile önerilmez) | `package-lock.json`, `package.json` |
| expo-task-manager | ~14.0.0 | Background task | `package-lock.json`, `package.json` |
| expo-tracking-transparency | ~6.0.0 | iOS tracking izni | `app.json`, `package-lock.json`, `package.json` |
| expo-video | ~3.0.0 | Expo video component | `package-lock.json`, `package.json` |
| expo-web-browser | ~15.0.0 | In-app browser | `app.json`, `package-lock.json`, `package.json` |
| lottie-react-native | ^7.3.5 | Lottie animasyonları | `package-lock.json`, `package.json` |
| lucide-react-native | ^0.471.0 | Lucide ikon seti | `app/(tabs)/deals.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/notifications.tsx`, `app/(tabs)/profile.tsx`, `app/login.tsx` |
| moti | ^0.30.0 | Animasyon ve skeleton | `package-lock.json`, `package.json`, `src/presentation/components/feed/FeedSkeleton.tsx` |
| nativewind | ^4.0.0 | Tailwind benzeri utility sınıfları | `babel.config.js`, `package-lock.json`, `package.json` |
| react | 19.1.0 | React çekirdeği | `app/(tabs)/_layout.tsx`, `app/(tabs)/deals.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/notifications.tsx` |
| react-dom | 19.1.0 | React DOM (web) | `package-lock.json`, `package.json` |
| react-native | 0.81.5 | React Native runtime | `app/(tabs)/_layout.tsx`, `app/(tabs)/deals.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/notifications.tsx`, `app/(tabs)/profile.tsx` |
| react-native-color-matrix-image-filters | ^8.0.2 | Görsel filtreleri | `package-lock.json`, `package.json` |
| react-native-compressor | ^1.16.0 | Medya sıkıştırma | `app.json`, `package-lock.json`, `package.json` |
| react-native-controlled-mentions | ^3.1.0 | Mention input yardımcıları | `package-lock.json`, `package.json` |
| react-native-edge-to-edge | ^1.7.0 | SystemBars ile edge-to-edge yönetimi | `app/(tabs)/deals.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/notifications.tsx`, `app/(tabs)/profile.tsx`, `app/_layout.tsx` |
| react-native-gesture-handler | ~2.28.0 | Gesture altyapısı | `app/_layout.tsx`, `package-lock.json`, `package.json`, `src/presentation/components/feed/BrightnessController.tsx`, `src/presentation/components/feed/SideOptionsSheet.tsx` |
| react-native-keyboard-controller | ^1.20.6 | Klavye yönetimi | `package-lock.json`, `package.json` |
| react-native-mmkv | ^3.3.0 | Hızlı key-value storage | `package-lock.json`, `package.json` |
| react-native-pager-view | 6.9.1 | Pager View | `app/(tabs)/profile.tsx`, `app/user/[id].tsx`, `package-lock.json`, `package.json`, `src/presentation/components/story/StoryViewer.tsx` |
| react-native-purchases | ^9.7.0 | RevenueCat purchases | `package-lock.json`, `package.json` |
| react-native-qrcode-svg | ^6.3.21 | QR kod render | `package-lock.json`, `package.json` |
| react-native-reanimated | ~4.1.1 | Animasyon ve gesture runtime | `app/(tabs)/profile.tsx`, `app/user/[id].tsx`, `package-lock.json`, `package.json`, `src/presentation/components/deals/HeroBannerCarousel.tsx` |
| react-native-safe-area-context | ~5.6.0 | Safe area insetleri | `app/(tabs)/_layout.tsx`, `app/(tabs)/deals.tsx`, `app/(tabs)/explore.tsx`, `app/(tabs)/notifications.tsx`, `app/(tabs)/profile.tsx` |
| react-native-screens | ~4.16.0 | Native screen optimizasyonu | `package-lock.json`, `package.json` |
| react-native-svg | 15.12.1 | SVG render | `app/(tabs)/profile.tsx`, `app/user/[id].tsx`, `declarations.d.ts`, `package-lock.json`, `package.json` |
| react-native-toast-message | ^2.0.0 | Toast bildirim | `app/_layout.tsx`, `package-lock.json`, `package.json` |
| react-native-video | ^6.0.0 | Video oynatma | `app/(tabs)/explore.tsx`, `app/(tabs)/profile.tsx`, `app/user/[id].tsx`, `package-lock.json`, `package.json` |
| react-native-vision-camera | ^4.7.3 | Kamera erişimi | `app.json`, `package-lock.json`, `package.json` |
| react-native-web | ~0.21.0 | Web hedefi | `package-lock.json`, `package.json` |
| react-native-webview | 13.15.0 | WebView | `package-lock.json`, `package.json`, `src/presentation/components/shared/InAppBrowserOverlay.tsx` |
| react-native-worklets | ^0.5.1 | Worklets runtime | `package-lock.json`, `package.json` |
| react-native-worklets-core | ^1.3.0 | Worklets core | `package-lock.json`, `package.json` |
| rn-emoji-keyboard | ^1.7.0 | Emoji klavye | `package-lock.json`, `package.json` |
| tailwindcss | ^3.3.0 | Tailwind config (nativewind için) | `package-lock.json`, `package.json`, `tailwind.config.js` |
| zustand | ^5.0.0 | State yönetimi | `package-lock.json`, `package.json`, `src/presentation/store/useActiveVideoStore.ts`, `src/presentation/store/useAuthStore.ts`, `src/presentation/store/useBrightnessStore.ts` |

## Dev Dependencies

| Paket | Versiyon | Ne işe yarar | Nerede kullanılıyor |
| --- | --- | --- | --- |
| @expo/ngrok | ^4.1.3 | Amaç net değil | `package-lock.json`, `package.json` |
| @types/react | ~19.1.10 | Amaç net değil | `package-lock.json`, `package.json` |
| babel-plugin-module-resolver | ^5.0.2 | Amaç net değil | `package-lock.json`, `package.json` |
| babel-preset-expo | ^54.0.8 | Amaç net değil | `babel.config.js`, `package-lock.json`, `package.json` |
| react-native-svg-transformer | ^1.5.2 | Amaç net değil | `metro.config.js`, `package-lock.json`, `package.json` |
| typescript | ~5.9.2 | Amaç net değil | `package-lock.json`, `package.json` |

Notlar:
- "Nerede kullanılıyor" alanı dosyalardaki metin eşleşmesine dayanır.
- Bazı paketlerde kullanım dinamik olabilir ve listede görünmeyebilir.