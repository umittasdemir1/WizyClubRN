# WizyClubRN: HLS Altyapısı ve "Neden MP4?" Teknik Raporu

Bu rapor, proje kod tabanında tespit edilen HLS (.m3u8) yapılarının dökümünü, bu sistemin çalışma mantığını ve ana feed akışında neden MP4 stratejisine geçildiğini teknik verilerle açıklar.

## 1. Kod Tabanında HLS İzleri (Bulgular)

Yapılan derin tarama sonucunda HLS protokolünün projenin "mutfak" (backend) ve "servis" (mobile) katmanlarına derinlemesine işlendiği görülmüştür:

### A. Backend (İşleme Merkezi)
*   **HlsService.js:** Videoları `.m3u8` playlistleri ve `.ts` segmentlerine (parçalarına) bölen ana motor.
*   **server.js:** `/upload-hls` endpoint'i üzerinden gelen videoların otomatik olarak HLS'ye dönüştürülmesi için kurgulanmış mimari.
*   **SQL Şeması:** Supabase üzerinde `hls_url` kolonu ve `hls_videos` depolama alanı (bucket) tanımlı.

### B. Mobile (İstemci Tarafı)
*   **Video Entity:** Kod içerisinde her video nesnesinin bir `hlsUrl` opsiyonu mevcut.
*   **Cache İstisnası:** `VideoCacheService.ts` içerisinde `.m3u8` uzantılı dosyaların indirilmesini engelleyen ("HLS ise cache yapma, direkt stream et") özel bir kural seti var.
*   **Upload Mantığı:** Yükleme modülünde videoların standart MP4 yerine HLS endpoint'ine gönderilmesi için hazır bir yol haritası kurgulanmış.

---

## 2. HLS Neden "Yavaş" Olarak Teşhis Edildi?

Proje dökümanlarında (PROJECT_KNOWLEDGE_BASE.md) HLS videolarının **5 saniyeden fazla** açılış gecikmesine sahip olduğu not edilmiştir. Bunun teknik nedenleri şunlardır:

1.  **Playlist Parsing (Liste Okuma):** Oynatıcı önce ana `.m3u8` dosyasını indirir, içindeki alt listeleri okur, bant genişliğine göre hangi kaliteyi seçeceğine karar verir.
2.  **Segment Fetching (Parça Çekme):** Kalite seçildikten sonra ilk 6 saniyelik `.ts` parçasını indirmeye başlar.
3.  **Handshake Latency:** Bu ardışık ağ istekleri, özellikle mobil ağlarda videonun ilk karesinin ekrana düşmesini 2-3 saniye zorunlu olarak geciktirir.

---

## 3. TikTok Stratejisi: MP4'ün Üstünlüğü

Senin belirttiğin `master.mp4` yapısı, HLS'nin tüm bu hantal süreçlerini devre dışı bırakır:

- **Atomic Start:** MP4 dosyasının başındaki "moov atom" bilgisi okunduğu an (yaklaşık 50ms), telefonun ekran kartı videoyu çözmeye başlar.
- **Sıfır Liste Beklemesi:** Arada bir playlist dosyası olmadığı için oynatıcı doğrudan veriye saldırır.
- **Yerel Cache Uyumu:** HLS parçalı yapısı nedeniyle kolay cache edilemezken, MP4 tek parça olarak yerel hafızaya alınabilir ve bir sonraki sefer **0ms** gecikmeyle oynatılır.

---

## 4. Sonuç ve Mevcut Durum

WizyClubRN projesinde HLS altyapısı **hazır ve kurulu** durumdadır. Ancak, feed akışındaki o "anlık başlama" (instant play) hissini yakalamak için sistem şu an:
1.  Hantallık yaratan HLS yollarını bypass etmekte,
2.  Doğrudan ham MP4 bağlantılarını kullanmakta,
3.  "Immortal Player" mimarisiyle bu MP4'leri native decoder'da her an sıcak tutmaktadır.

**Özet:** HLS projenin içinde bir "seçenek" olarak duruyor, ancak biz "hız" için MP4 otobanını seçtik.

---
*Tarih: 5 Ocak 2026 - Teknik Araştırma Sonuçları*
