# Mobile Pull-to-Refresh Pattern (WizyClub)

Bu döküman, uygulamadaki (özellikle \`profile.tsx\` sayfasındaki) Pull-to-Refresh (Aşağı Çekerek Yenileme) tasarım deseninin standart kod yapısını içerir. Diğer listeleme veya sayfalarda da ortak ve uyumlu bir deneyim sunmak için buradaki kodu referans alın.

## İlgili Kütüphaneler

\`RefreshControl\` bileşeni doğrudan React Native'in kendisinden içe aktarılır. Liste bileşeni olarak \`ScrollView\`, \`FlatList\` veya Reanimated tabanlı \`Animated.ScrollView\` kullanılabilir.

\`\`\`tsx
import { RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
\`\`\`

## 1. State Tanımlaması (Durum Yönetimi)

Kullanıcı ekranı aşağı çektiğinde animasyonun başlayıp bitmesini kontrol edecek olan \`refreshing\` durumu:

\`\`\`tsx
const [refreshing, setRefreshing] = useState(false);
\`\`\`

## 2. OnRefresh Fonksiyonu

Yenileme işlemi başladığında tetiklenecek eylemleri tutar. Promise kullanarak tüm yenileme işlemlerinin arkada tamamlanmasını bekler.

\`\`\`tsx
const onRefresh = useCallback(async () => {
  // Animasyonu (ve çekilen spineri) göster
  setRefreshing(true);

  try {
    // Sayfanın ihtiyaç duyduğu tüm veri güncellemelerini eş zamanlı olarak çağırın
    // Örnek kullanım:
    await Promise.all([
      fetchUserData(),
      fetchFeeds(),
      // Eğer tekil işlemse: await reloadStore()
    ]);
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    // İşlem bittiğinde animasyonu kapat (spinner kaybolur)
    setRefreshing(false);
  }
}, [/* Bağımlılıklar (fetchUserData vb.) */]);
\`\`\`

## 3. UI Entegrasyonu

Liste ya da Scroll özellikli bileşeninizin \`refreshControl\` prop'una bu yapıyı verin. Renklendirme (\`tintColor\`) uygulama temasına (karanlık/aydınlık) göre adaptif olmalıdır.

* \`progressViewOffset\`: Spinner'ın en üstten başlama mesafesini ifade eder. Gerekirse header yüksekliğine göre (örn: \`insets.top\`) düzenlenebilir ancak standart değeri \`0\` dir. Android'de de animasyonu etkiler.

\`\`\`tsx
<ScrollView
  // ScrollView, FlatList veya Animated.ScrollView üzerinde kullanılabilir
  contentContainerStyle={{ flexGrow: 1 }}
  refreshControl={
    <RefreshControl 
      refreshing={refreshing} 
      onRefresh={onRefresh} 
      tintColor={isDark ? "#fff" : "#000"} 
      progressViewOffset={0} 
    />
  }
>
  {/* İçerik */}
</ScrollView>
\`\`\`

### Sınıf İsimlendirmeleri ve Özellikler:

- **\`tintColor={isDark ? "#fff" : "#000"}\`**: Sadece iOS'te çalışan spinner ikonunun rengini belirler. WizyClub temasında karanlık moddeyse spinner beyaz, aydınlık moddeyse siyahtır.
- **\`colors={[isDark ? "#fff" : "#000"]}\`**: (Opsiyonel olarak Android'te eklenebilir) Android'in Material Design dairesel yüklenme animasyonunun renk dizisini belirler.
- **\`progressBackgroundColor\`**: (Opsiyonel olarak Android'te eklenebilir) Android'teki yuvarlak topun arkaplan rengi.

**Örnek (Tam Çapraz Platform Adaptif):**
\`\`\`tsx
<RefreshControl 
  refreshing={refreshing} 
  onRefresh={onRefresh} 
  tintColor={isDark ? "#fff" : "#000"} // iOS
  colors={[isDark ? "#fff" : "#000"]}  // Android Top Rengi
  progressBackgroundColor={isDark ? "#2c2c2e" : "#ededf0"} // Android Arka Plan Yüzeyi
  progressViewOffset={0} 
/>
\`\`\`

## Neden Bu Yöntem? (Silent Refresh)
Kullanıcı aşağıya çekip bıraktığında, sayfanın içindeki Skeleton'lar yüklenmez. Arka planda data güncellenir ve eğer yeni data geldiyse sayfada re-render olur. Böylece yenileme hissi **akıcı (seamless)** ve performansı iyi olarak sunulur.
