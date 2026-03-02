# Feed Modüler Mimari (Katmanlı Yapı) Dokümantasyonu

> **Tarih:** 28 Ocak 2026
> **Sürüm:** 1.0
> **Durum:** Tamamlandı (Refactoring Sonrası)

Bu doküman, WizyClub uygulamasının kalbi olan `FeedManager` bileşeninin yeni modüler mimarisini açıklar. Refactoring sürecinde devasa ve karmaşık tek bir dosyadan, yönetilebilir ve uzmanlaşmış parçalara geçilmiştir.

---

## 🏗️ Neden Bu Değişikliği Yaptık?

Eski yapıda `FeedManager.tsx` 1500 satıra yaklaşmış, video oynatma, kullanıcı etkileşimi, veri yükleme ve UI çizimi gibi her şeyi tek başına yapmaya çalışıyordu. Bu durum:
1.  **Hata Ayıklamayı Zorlaştırıyordu:** Bir scroll hatasını bulmak için 1000 satır kodu taramak gerekiyordu.
2.  **Geliştirmeyi Yavaşlatıyordu:** Küçük bir değişiklik bile tüm dosyayı etkileyebiliyordu.
3.  **Performans Sorunları Yaratıyordu:** Gereksiz render süreçleri tetikleniyordu.

Yeni yapıda ise "Orkestrasyon" (Yönetim) ile "Uygulama" (İşçilik) birbirinden ayrılmıştır.

---

## 🧩 Yeni Modüler Mimari

Aşağıdaki şema, bileşenlerin birbirleriyle nasıl konuştuğunu özetler:

```mermaid
graph TD
    FM[FeedManager.tsx (Orkestratör)] -->|Ayarlar| HookConfig[useFeedConfig]
    FM -->|Scroll Yönetimi| HookScroll[useFeedScroll]
    FM -->|Etkileşimler| HookInteract[useFeedInteractions]
    FM -->|Aksiyonlar| HookAction[useFeedActions]
    FM -->|Video Olayları| HookVideo[useFeedVideoCallbacks]
    FM -->|Yaşam Döngüsü| HookLifecycle[useFeedLifecycleSync]
    
    FM -->|Görünüm| UI_Pool[VideoPlayerPool]
    FM -->|Görünüm| UI_List[FlashList]
    FM -->|Görünüm| UI_Overlays[FeedOverlays]
    FM -->|Görünüm| UI_Status[FeedStatusViews]
```

---

## 📚 Bileşen ve Hook Rehberi

### 1. 🎬 Orkestratör: `FeedManager.tsx`
**Görevi:** Sadece yönetmek. Hangi verinin nereye gideceğini söyler ama işi kendisi yapmaz.
- **Satır Sayısı:** ~360 (Eskiden ~1500)
- **Ne Yapar?** Hook'ları çağırır, çıkan verileri UI bileşenlerine (Overlay, List, Player) dağıtır.

### 2. 🧠 Beyin Takımı (Hooks)

| Hook Adı | Görevi | Örnek Kullanım |
|:---|:---|:---|
| **`useFeedConfig`** | Sabit ayarları tutar. | Video boyutları, performans bayrakları. |
| **`useFeedScroll`** | Kaydırma mantığını yönetir. | Hangi video ekranda? Otomatik kaydırma. |
| **`useFeedInteractions`** | Kullanıcı dokunuşlarını yönetir. | Çift tıkla beğeni, tek tıkla durdurma. |
| **`useFeedActions`** | İşlevsel butonları yönetir. | Paylaş, Kaydet, Sil, Takip Et butonları. |
| **`useFeedVideoCallbacks`** | Video oynatıcı olaylarını dinler. | Video yüklendi, bitti, hata verdi. |
| **`useFeedLifecycleSync`** | Uygulama durumunu senkronize eder. | Uygulama alta atılınca videoyu durdur. |

### 3. 🎨 Görünüm Katmanı (UI)

| Bileşen Adı | Görevi |
|:---|:---|
| **`VideoPlayerPool`** | Videoları oynatan havuz sistemi. Aynı anda max 3 video render eder. |
| **`FeedOverlays`** | Videonun üzerindeki tüm butonlar ve yazılar (Like, Açıklama, Profil). |
| **`FeedStatusViews`** | Yükleniyor, Hata ve Boş Liste ekranları. |
| **`FeedUtils`** | Yardımcı küçük fonksiyonlar (Örn: Video URL kontrolü). |
| **`FeedManager.styles`** | Renkler ve boyutlandırma kuralları (StyleSheet). |

---

## 🚀 Bize Ne Kazandırdı?

1.  **Kolay Okunabilirlik:** Artık "Scroll ile ilgili bir sorun var" dendiğinde direkt `useFeedScroll.ts` dosyasına bakıyoruz.
2.  **Güvenli Geliştirme:** Bir hook üzerinde çalışırken diğerlerini bozma riskimiz yok denecek kadar az.
3.  **Performans:** Gereksiz render'lar azaldı, çünkü state'ler parçalandı.
4.  **Test Edilebilirlik:** Her hook tek başına test edilebilir hale geldi.

---

## 🛠️ Geliştirici İçin İpuçları

- **Yeni bir buton mu eklenecek?**
    1. `FeedOverlays.tsx` içine UI kodunu ekle.
    2. Mantığını `useFeedActions.ts` içine yaz.
    3. `FeedManager.tsx` üzerinden bağla.

- **Video oynatma kuralı mı değişecek?**
    - Direkt `useFeedVideoCallbacks.ts` veya `useFeedLifecycleSync.ts` dosyasına git.

Bu mimari, WizyClub'ın büyümesi ve yeni özelliklerin eklenmesi için sağlam bir temel oluşturmaktadır.
