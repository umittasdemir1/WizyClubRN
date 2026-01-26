# React Native'de Yüksek Performanslı Video Akışı ve Önbelleğe Alma Stratejileri

## 1. Giriş

Modern mobil uygulamalarda video, müzakere edilemez bir unsurdur. Ancak React Native geliştiricileri için basit bir video akışı uygulamak, doğrudan performans iflasına giden bir yoldur. FlatList gibi standart bileşenler medyanın ağırlığı altında ezilir, saf önbelleğe alma stratejileri ağları felç eder ve yönetilmeyen kaynaklar kritik bellek sızıntılarına yol açar. Bu rapor, kütüphanelerin bir listesi değil; React Native'de sağlam, ölçeklenebilir ve yüksek performanslı video deneyimleri oluşturmak için mimari bir rehberdir. Liste sanallaştırma, ağ tıkanıklığı ve önbellek şişmesi gibi temel sorunları analiz edecek ve bu sorunları çözmek için modern kütüphanelerin ve gelişmiş stratejilerin nasıl kullanılacağını detaylandıracağız.

## 2. Temel Sorun Alanları: Video Yoğun Uygulamalardaki Performans Darboğazları

Verimli bir video akış mimarisi oluşturmanın ilk ve en önemli adımı, potansiyel performans darboğazlarını derinlemesine anlamaktır. Bu sorunlar, uygulamanın akıcılığını, tepkiselliğini ve genel kalitesini doğrudan etkileyerek son kullanıcı deneyimini olumsuz yönde şekillendirir.

### 2.1. FlatList ve SectionList ile Liste Sanallaştırma Sınırları

React Native'in standart liste bileşenleri FlatList ve SectionList, çok sayıda video veya resim gibi ağır medya içeriği barındıran listelerde ciddi performans sorunları yaşar. Yapılan analizler, bir SectionList'e sadece bir `<Image>` bileşeni eklendiğinde bile FPS (saniye başına kare sayısı) değerinin 10'un altına düşebildiğini göstermektedir; FlatList de benzer ağır medya bileşenleriyle benzer sorunlar yaşamaktadır. Bu durum, kaydırma sırasında belirgin takılmalara (janks) ve "artifacting" veya "weird glitches" olarak tanımlanan görsel bozulmalara yol açar. Temel sorun, bu bileşenlerin karmaşık video/resim bileşenlerinin yoğun mount/unmount döngülerinin JS iş parçacığını (JS thread) bloke etmesidir. Bu blokaj, uygulamanın kaydırma olaylarına yanıt vermesini engelleyerek takılmalara neden olur ve uygulamanın "sıkışmış ve hantal" hissedilmesine yol açar.

### 2.2. Ağ Tıkanıklığı ve Veri Yönetimi

Kullanıcıların listelerde hızla gezindiği senaryolar, saf veri yükleme stratejileriyle birleştiğinde ağ tıkanıklığına yol açar. "Önce yayınla, sonra önbelleğe al" (stream-first, cache-later) gibi basit bir yaklaşım, kullanıcının hızlı kaydırması sırasında aynı anda 30-50 arka plan indirmesini tetikleyebilir. Bu durum, hem cihazın ağ bant genişliğini hem de işlem gücünü aşırı zorlayarak genel performansı düşürür. Özellikle yavaş ağ koşullarında, indirmelerin tamamlanamaması nedeniyle videoların tekrar tekrar akış üzerinden yüklenmesi, veri kullanımını ve dolayısıyla maliyetleri önemli ölçüde artırır.

### 2.3. Depolama Yönetimi ve Önbellek Şişmesi (Cache Bloat)

Verimsiz önbelleğe alma stratejileri, kullanıcının hiç izlemediği veya sadece birkaç saniye gördüğü videoların bile cihaza indirilmesine neden olur. Bu durum, zamanla "yetim" önbellek dosyalarının (orphan cache) birikmesine ve uygulama tarafından kullanılan depolama alanının gereksiz yere şişmesine yol açar. Bu "depolama şişmesi" (storage bloat), yalnızca cihazda değerli alanı işgal etmekle kalmaz, aynı zamanda uzun vadede uygulamanın başlatma süresini ve genel tepkiselliğini de olumsuz etkileyebilir.

Bu temel sorunlar, standart çözümlerin ötesine geçerek daha gelişmiş kütüphanelere ve akıllı mimari stratejilerine olan ihtiyacı açıkça ortaya koymaktadır.

## 3. Video Oynatıcı Kütüphanelerinin Analizi

Doğru video oynatıcı kütüphanesini seçmek, projenin performans ve yeteneklerinin temelini oluşturur. Her kütüphane, farklı proje ihtiyaçlarına ve özelleştirme seviyelerine hitap eden benzersiz avantajlar ve mühendislik ödünleşimleri sunar.

### 3.1. react-native-video: Topluluk Standardı

react-native-video, React Native ekosisteminde "gündelik oynatma işlemlerinin omurgası" olarak kabul edilir. Geniş format desteği (MP4, HLS, DASH), esnekliği ve 28,000+ GitHub yıldızına sahip devasa topluluğu sayesinde en yaygın kullanılan çözümlerden biridir. Temel mühendislik ödünleşimi, daha yüksek başlangıç geliştirme çabası karşılığında maksimum kontrol ve özelleştirme sunmasıdır.

* **Güçlü Yönleri:**
    * Dahili bir kullanıcı arayüzü (UI) sunmaz, bu da geliştiricilere tamamen özelleştirilmiş kontroller oluşturma özgürlüğü tanır.
    * iOS, Android ve tvOS üzerinde yerel performans sağlar.
    * Büyük ve aktif bir topluluk tarafından desteklenir.
* **v7 Mimarisi:** Kütüphanenin 7. sürümü, önemli bir mimari değişikliği getirmiştir: durum ve ağ isteklerini yöneten "başsız" (headless) bir sınıf olan `VideoPlayer` ile bu oynatıcı örneği tarafından sağlanan kareleri render eden saf bir UI bileşeni olan `VideoView`'i birbirinden ayırmıştır. Bu ayrım, bir video ekranda görünmeden önce yüklemeye başlama (preloading) gibi gelişmiş yetenekleri mümkün kılar.

### 3.2. expo-video: Modern Expo Ekosistemi Çözümü

expo-video, eski expo-av kütüphanesinin yerine geçen, modern ve performans odaklı bir alternatiftir. Expo ekosistemi içinde geliştirme yapanlar için en güncel ve önerilen çözümdür.

* **Öne Çıkan Özellikleri:**
    * `useVideoPlayer` gibi hook tabanlı API'si ile kullanımı oldukça basittir.
    * **Ön Yükleme (Preloading):** Bir `VideoView` bileşenine bağlamadan önce bir `VideoPlayer` örneği oluşturarak videoları önceden belleğe yüklemeye olanak tanır.
    * **Dahili Önbelleğe Alma:** `VideoSource` nesnesinde `useCaching: true` prop'u kullanılarak videoların diske kalıcı olarak yazılmasını sağlar. Bu önbellek, en az kullanılan (LRU) öğelerin silinmesi prensibiyle çalışır.
* **Bilinen Sorunlar:**
    * GitHub üzerinde raporlanan vakalara göre, bileşen kaldırıldığında (unmount) oynatıcının düzgün serbest bırakılmaması ve buna bağlı bellek sızıntıları yaşanabilmektedir. Geliştiricilerin bu duruma dikkat etmesi kritik öneme sahiptir.

### 3.3. Dikkat Edilmesi Gerekenler: expo-av'ın Kullanımdan Kaldırılması

Geliştiricilerin, `expo-av` kütüphanesinin artık kullanımdan kaldırıldığını (deprecated) bilmesi hayati önem taşımaktadır. Bu kütüphane, SDK 54 ile birlikte tamamen kaldırılacaktır. Bu nedenle, yeni projelerde kesinlikle kullanılmamalıdır. Mevcut projelerde ise en kısa sürede `expo-video` ve `expo-audio` paketlerine geçiş planlaması yapılmalıdır. Bu, ileriye dönük eksiksiz ve eyleme geçirilebilir bir yol sunar.

Doğru oynatıcıyı seçmek mimarinin ilk ayağını oluşturur. Şimdi, bu oynatıcıları barındıracak yüksek performanslı bir liste bileşeni seçerek ikinci ayağı sağlamlaştırmalıyız.

## 4. Yüksek Performanslı Liste Bileşenleri

Video ağırlıklı bir uygulamada liste bileşeni seçimi, en az video oynatıcı seçimi kadar kritiktir. Standart FlatList'in JS iş parçacığını bloke ettiği durumlarda, daha verimli alternatifler devreye girer.

### 4.1. @shopify/flash-list: Kolay Geçiş ve Anında Performans Artışı

`@shopify/flash-list`, FlatList ile neredeyse aynı API'yi sunarak mevcut projelere geçişi son derece kolaylaştıran, performans odaklı bir alternatiftir. Temel avantajı, anında performans artışı için neredeyse sıfır maliyetli bir geçiş sunmasıdır, ancak RecyclerListView'a kıyasla biraz daha az ince ayar kontrolü sağlar. Akıllı bileşen geri dönüşümü (component recycling) ve yerel görünümleri (native views) kullanarak, özellikle düşük donanımlı Android cihazlarda bile akıcı ve takılmasız bir kaydırma deneyimi sağlar. Optimum performans için, render edilecek her öğenin tahmini yüksekliğini belirten `estimatedItemSize` prop'unun kullanılması şiddetle tavsiye edilir.

### 4.2. RecyclerListView: Gelişmiş Geri Dönüşüm Mekanizması

RecyclerListView, performansını temelden farklı bir render mekaniği üzerine kurar ve geliştiriciden bir sözleşme talep eder: performans için React'in standart yaşam döngüsünü kırmak. Sadece ekranda o an görünen "Görünür Pencere" (Visible Window) ve pürüzsüz kaydırma için bu pencerenin hemen dışındaki küçük bir alanı kapsayan "Etkileşimli Pencere" (Engaged Window) içindeki öğeleri render eder.

Kullanıcı listeyi kaydırdığında ekran dışına çıkan bir bileşen, React'in standart unmount yaşam döngüsüne girmez. Bunun yerine, bu bileşen bir "Geri Dönüşüm Havuzuna" (RecyclerPool) alınır ve yeni bir öğe için yeniden kullanılır. Bu yaklaşım, React'in mount/unmount yükünü ortadan kaldırır, ancak geliştiricilerin liste öğeleri içindeki durumu dikkatli bir şekilde yönetmesini gerektirir, çünkü bileşen geri dönüştürüldüğünde durum sıfırlanmaz. Bu mekanizma en çok, homojen (aynı türde) öğelerden oluşan çok uzun listelerde muazzam bir performans artışı sağlar.

### 4.3. Karşılaştırmalı Değerlendirme

Aşağıdaki tablo, üç liste bileşeninin temel özelliklerini ve mühendislik ödünleşimlerini karşılaştırmaktadır:

| Özellik | FlatList | @shopify/flash-list | RecyclerListView |
| :--- | :--- | :--- | :--- |
| **Performans** | Büyük ve karmaşık listelerde zayıf, JS iş parçacığı takılmalarına açık. | Yüksek, özellikle düşük donanımlı Android cihazlarda akıcı. | Çok yüksek, özellikle homojen ve uzun listelerde en iyi performansı sunar. |
| **Kurulum Kolaylığı** | Çok kolay, React Native çekirdeğinde yerleşik. | Çok kolay, FlatList'ten geçiş genellikle sadece isim değiştirmektir. | Orta düzey, `LayoutProvider` ve `DataProvider` gibi ek yapılandırmalar gerektirir. |
| **API Benzerliği** | - | FlatList ile neredeyse aynı. | FlatList'ten farklı, kendine özgü bir API'ye sahip. |
| **En Uygun Kullanım Alanı** | Küçük ve basit listeler. | FlatList'in yavaş kaldığı çoğu senaryo için ideal, genel amaçlı bir iyileştirme. | Binlerce benzer öğe içeren ve maksimum performans gerektiren listeler. |

Doğru liste bileşenini seçmek, UI iş parçacığı darboğazını çözer. Ancak, en performanslı liste bile en ihtiyaç duyduğu veri mevcut değilse işe yaramaz. Bu da bizi mimarimizin bir sonraki kritik direğine getiriyor: sofistike bir önbelleğe alma ve veri yükleme stratejisi.

## 5. Gelişmiş Önbelleğe Alma ve Veri Yükleme Stratejileri

İyi bir kullanıcı deneyimini mükemmel bir deneyimden ayıran en önemli faktör, arka planda çalışan sofistike bir önbelleğe alma stratejisidir. Bu strateji, ağ kullanımını optimize eder, depolama alanını verimli kullanır ve videoların anında oynatılmasını sağlar.

### 5.1. Akıllı Önbelleğe Alma Mimarisi: "Stream-First, Cache-Later" Yaklaşımının Geliştirilmesi

Saf "önce yayınla, sonra önbelleğe al" yaklaşımı, kullanıcının hızlı kaydırma (high scroll velocity) yaptığı durumlarda ağ tıkanıklığına ve depolama şişmesine neden olur. Bu temel yaklaşımı daha akıllı hale getirmek için şu stratejiler uygulanmalıdır:

* **Kaydırma Hızına Duyarlılık:** Kullanıcı listeyi çok hızlı kaydırırken önbelleğe alma işlemini tamamen atlayın. Bu, gereksiz indirmeleri önler.
* **Odaklı Önbelleğe Alma:** Sadece o an görünür olan video ile bir sonraki 1-2 videoyu önbelleğe alma sırasına alın. Bu, kaynakları en olası izlenecek içeriklere odaklar.

### 5.2. LRU (Least Recently Used) Önbellek Yönetimi

LRU (En Son En Az Kullanılan), "yetim" önbellek sorununu çözen etkili bir algoritmadır. Bu stratejide, önbellek için ayrılan depolama alanı dolduğunda, en eski veya en az erişilen öğe otomatik olarak silinir ve yeni içerik için yer açılır. Bu, depolamanın sürekli olarak en alakalı içerikle dolu kalmasını sağlar ve gereksiz şişmeyi önler. `expo-video` kütüphanesinin dahili önbelleğe alma mekanizması da bu prensibe dayanarak çalışır.

### 5.3. Ön Yükleme (Preloading) ve Ön Belleğe Alma (Precaching) Teknikleri

Bu iki terim genellikle birbirinin yerine kullanılsa da, kıdemli bir mühendis aralarındaki kritik farkı bilmelidir.

* **Ön Yükleme (Preloading):** Bir `VideoPlayer` örneği oluşturup, `VideoView` henüz render edilmeden önce video arabelleğini bellekte doldurma eylemidir. Bu, mevcut oturumdaki videolar arası geçişlerin kesintisiz olmasını sağlar.
* **Ön Belleğe Alma (Precaching):** Video verilerini, gelecekteki oturumlar için kalıcı disk depolama birimine yazma eylemidir. Bu, gelecekteki uygulama başlatmalarını ve çevrimdışı oynatmayı optimize eder.

Örneğin, kullanıcı bir akıştaki mevcut videoyu izlerken, bir sonraki video arka planda belleğe yüklenebilir (preload) ve diske yazılabilir (precache). Kullanıcı bir sonraki videoya geçtiğinde, video anında ve bekleme olmaksızın oynamaya başlar, bu da TikTok benzeri akıcı bir deneyim yaratır.

### 5.4. İndirme Kuyruğu Yönetimi ve Önceliklendirme

Etkili bir veri yönetimi için merkezi bir indirme kuyruğu (download queue) oluşturmak esastır. Bu kuyruk, aşağıdaki sorumlulukları üstlenmelidir:

* **Sınırlama (Throttling):** Aynı anda devam eden indirme sayısını (örneğin, 2 veya 3 ile) sınırlayarak ağ ve cihaz kaynaklarının aşırı yüklenmesini önler.
* **Ağ Türüne Göre Ayarlama:** Kullanıcının bağlantı türüne göre (WiFi vs. Hücresel) davranışı ayarlar.
* **Önceliklendirme:** Ekranda görünür olan videolara her zaman en yüksek önceliği vererek, kullanıcının o an izlemek istediği içeriğin en hızlı şekilde yüklenmesini sağlar.

Bu gelişmiş stratejiler, tek başlarına güçlü olsalar da, en iyi sonuçları bütünsel bir mimari içinde bir araya getirildiklerinde verirler.

## 6. En İyi Uygulamalar ve Örnek Mimari

Bu bölümde, önceki bölümlerde tartışılan teorik kavramları bir araya getirerek, doğrudan uygulanabilir en iyi uygulamalar ve yapılandırma örnekleri sunulmaktadır.

### 6.1. TikTok Benzeri Akışlar için FlatList ve FlashList Yapılandırması

TikTok benzeri, tam ekran kaydırılabilir bir video akışı oluşturmak için FlatList veya FlashList bileşenlerinin görünürlük takibi özelliklerinden faydalanılabilir. Başarılı bir implementasyon için izlenmesi gereken adımlar şunlardır:

1.  **Görünürlüğü Yapılandırma:** `viewabilityConfig` prop'unu kullanarak bir öğenin ne zaman "görünür" sayılacağını tanımlayın (örneğin, `viewAreaCoveragePercentThreshold: 50`).
2.  **Görünür Öğeyi Takip Etme:** `onViewableItemsChanged` callback'i içinde, o an ekranda odaklanmış olan videonun indeksini bir state'e (`currentViewableItemIndex`) kaydedin.
3.  **Otomatik Oynatma/Durdurma:** Her video öğesine, görünür olup olmadığını belirten bir `shouldPlay` prop'u (`index === currentViewableItemIndex`) geçirin. Video bileşeni içinde, bu prop'u bir `useEffect` ile dinleyerek videoyu oynatın veya durdurun. Video bileşeninin imperatif API'sine (`video.current`) erişmek için `useRef` kullanırız. Bu, referans oluşturulduğunda yeniden render tetiklemeden video bileşenine kararlı bir referans tutmak için kritik bir desendir ve durumu React'in bildirimsel sistemi dışında yönetilen yerel bileşenleri kontrol etmek için esastır.

### 6.2. Ağ Durumuna Göre Dinamik Stratejiler

Uygulamanın performansı ve veri tüketimi, kullanıcının ağ durumuna dinamik olarak adapte olmalıdır.

* **WiFi Bağlantısında:** Daha agresif önbelleğe alma stratejileri uygulayın (örneğin, görünürdeki + sonraki 3-4 videoyu önbelleğe alın) ve mümkünse daha yüksek kaliteli video versiyonlarını sunun.
* **Hücresel Veri (4G/5G):** Önbelleğe almayı daha sınırlı tutun (örneğin, sadece görünürdeki + sonraki 1 video) ve veri tasarrufu için varsayılan olarak daha düşük çözünürlüklü videolara öncelik verin.
* **Yavaş Ağ (3G):** Ön belleğe almayı tamamen durdurup yalnızca akışa (streaming) güvenin. Kullanıcıya daha düşük kaliteli videolar sunarak takılmaları en aza indirin.

### 6.3. Depolama ve Bellek Sızıntılarının Önlenmesi

expo-video kütüphanesiyle ilgili olarak GitHub üzerinde bellek sızıntıları raporlanmıştır. Geliştiricilerin bu konuda proaktif olmaları gerekir:

* **Kaynakları Serbest Bırakma:** Standart `useVideoPlayer` hook'u kaynak temizliğini otomatik olarak yönetse de, raporlanan bellek sızıntıları geliştiricilerin ekstra dikkatli olması gerektiğini göstermektedir. Gelişmiş yaşam döngüsü kontrolü için manuel `createVideoPlayer` fonksiyonunu tercih ederseniz, garantili bellek sızıntılarını önlemek için bir `useEffect` temizleme fonksiyonu içinde `release()` metodunu çağırma sorumluluğu tamamen size aittir.
* **Önbelleği Yönetme:** expo-video, önbelleği yönetmek için `clearVideoCacheAsync` ve `setVideoCacheSizeAsync` gibi yardımcı fonksiyonlar sunar. Uygulamanın ayarlar menüsüne bir "Önbelleği Temizle" seçeneği eklemek veya belirli aralıklarla eski verileri otomatik olarak temizlemek, depolama şişmesini önlemek için iyi bir pratiktir.

En iyi sonuçlar, yalnızca bu uygulamaları takip etmekle değil, aynı zamanda Android Profiler ve Xcode Instruments gibi araçlarla sürekli test ve profil oluşturma ile elde edilir.

## 7. Sonuç

Bu rapor, React Native'de yüksek performanslı bir video deneyimi oluşturmanın, yalnızca tek bir kütüphane seçmekten çok daha fazlası olduğunu ortaya koymuştur. Bu, video oynatıcı, liste sanallaştırma bileşeni ve akıllı bir önbelleğe alma stratejisinin bir bütün olarak düşünülmesini gerektiren kapsamlı bir mimari karardır. Başarılı bir video uygulaması, bu üç temel direğin (oynatıcı, liste, önbellek) uyum içinde çalışmasıyla mümkündür. Geliştiriciler, bu raporda sunulan ilkeleri ve teknikleri uygulayarak, ağ koşulları ne olursa olsun kullanıcılarına akıcı, verimli ve keyifli bir video deneyimi sunabilirler.

---

## Örnek Çalışma

Kaynaklara dayanarak, özellikle TikTok veya Reels benzeri yüksek performanslı dikey video akışları oluşturmak için kullanmanız gereken modern teknoloji yığını ve kod örnekleri aşağıdadır.

### 1. Önerilen Teknoloji Yığını

Yüksek performanslı ve "native" hissiyatı veren bir video deneyimi için standart bileşenler yerine aşağıdaki özelleşmiş kütüphaneler önerilmektedir:

* **Video Motoru:** `expo-video` veya `react-native-video` (v7)
    * Standart `expo-av` kütüphanesi yerine, daha modern ve performanslı olan `expo-video` kullanılması önerilmektedir. Bu kütüphane, video oynatıcı mantığını (logic) UI'dan ayırır ve ön yükleme (preloading) yapmanıza olanak tanır.
    * Alternatif olarak, React Native'in yeni mimarisini ve "Nitro Modules" yapısını destekleyen `react-native-video` v7 tercih edilebilir.
* **Liste Bileşeni:** FlashList (Shopify)
    * Standart FlatList video akışlarında bellek sorunlarına ve kare düşüşlerine (FPS drops) neden olur. Bunun yerine, `@shopify/flash-list` kullanılmalıdır. Bu kütüphane "cell recycling" (hücre geri dönüşümü) yöntemiyle bileşenleri yok etmek yerine yeniden kullanarak çok daha yüksek performans sağlar.
* **Önbellekleme ve Ön Yükleme (Caching & Preloading)**
    * Videoların anında açılması için bir sonraki videoyu arka planda yükleyen (preloading) ve izlenenleri saklayan (caching) bir yapı kurulmalıdır. `expo-video` yerel LRU (Least Recently Used) önbellekleme desteği sunar.

---

### 2. Kod Örnekleri

Aşağıdaki örnekler, modern `expo-video` ve `FlashList` kütüphanelerinin nasıl entegre edileceğini göstermektedir.

#### A. Video Oynatıcı Bileşeni (VideoItem.tsx)

Bu bileşen, `expo-video` kullanarak oynatıcıyı oluşturur. Oynatma durumu (play/pause) `useEvent` hook'u ile dinlenir.

```tsx
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { StyleSheet, View, Button } from 'react-native';
import { useEffect } from 'react';

export default function VideoItem({ videoSource, shouldPlay }) {
  // Video oynatıcıyı oluştur ve kaynağı bağla
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true; // Videonun döngüye girmesi için [6]
    // shouldPlay prop'una göre başlat veya durdur
    if (shouldPlay) {
      player.play();
    }
  });

  // shouldPlay değiştiğinde oynatıcıyı güncelle
  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
      player.currentTime = 0; // İsteğe bağlı: Başa sar [7]
    }
  }, [shouldPlay, player]);

  return (
    <View style={styles.container}>
      <VideoView 
        style={styles.video} 
        player={player} 
        allowsFullscreen 
        allowsPictureInPicture // PiP desteği [6]
        nativeControls={false} // TikTok tarzı için native kontrolleri kapat [8]
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

## FeedScreen.tsx

Aşağıdaki kod, `FlashList` kullanarak yüksek performanslı dikey video akışını (TikTok benzeri) sağlayan ana ekran bileşenidir.

```tsx
import React, { useState, useRef } from 'react';
import { View, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import VideoItem from './VideoItem';

// Örnek veri seti
const videos = [
  "[https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4](https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4)",
  "[https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4](https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4)",
  // ... diğer videolar
];

export default function FeedScreen() {
  const [currentViewableIndex, setCurrentViewableIndex] = useState(0);
  const height = Dimensions.get('window').height;

  // Hangi öğenin ekranda olduğunu tespit etme konfigürasyonu
  const viewabilityConfig = {
    viewAreaCoveragePercentThreshold: 50 // %50'si görünüyorsa odaklanmış say
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentViewableIndex(viewableItems.index ?? 0);
    }
  }).current;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <FlashList
        data={videos}
        renderItem={({ item, index }) => (
          <View style={{ height: height, width: '100%' }}>
            <VideoItem 
              videoSource={item} 
              shouldPlay={index === currentViewableIndex} // Sadece görünen videoyu oynat
            />
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
        estimatedItemSize={height} // Performans için kritik: Ekran yüksekliği kadar
        pagingEnabled // Sayfa sayfa kaydırma efekti (TikTok tarzı)
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}