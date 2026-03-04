# WizyClub Bildirim (Notification) Mimarisi 🔔

Büyük uygulamaların (Instagram, X, Amazon vb.) kullandığı, hem otomatik tetiklenen hem de pazarlama ekipleri tarafından yönetilen gelişmiş bildirim mimarisine dair genel bakış ve WizyClub için önerilen kurulum rehberi.

Genel olarak bildirimler iki ana kategoriye ayrılır:

---

## 1. İşlemsel (Transactional) Bildirimler
Kullanıcıların uygulama içindeki etkileşimleriyle tamamen kodsal olarak, **otomatik tetiklenen** bildirimlerdir.

- **Örnekler:** "Ahmet seni takip etti", "Ayşe fotoğrafına yorum yaptı", "Kargonuz yola çıktı."
- **Nereden Yönetilir?** Panelden veya insan eliyle gönderilmezler. Tamamen veritabanı olayları (Database Events) veya sunucu içi iş mantığı (Business Logic) tarafından tetiklenirler.
- **Nasıl Çalışır? (WizyClub - Supabase Örneği)**
  1. Bir kullanıcı gönderiyi beğendiğinde, Supabase `likes` tablosuna bir satır eklenir.
  2. Supabase'de kurulu bir **Database Webhook** (Tetikleyici) bu yeni eklemeyi yakalar ve bir Supabase Edge Function'a (veya Node.js / backend'e) haber verir.
  3. Backend, beğenen kullanıcının adını ve gönderi sahibinin FCM (Firebase Cloud Messaging) veya APNs (Apple Push Notification) Push Token'ını veritabanından çeker.
  4. Mesaj içeriğini hazırlar: *"@ahmet gönderini beğendi."*
  5. Bu mesajı toplu/hızlı dağıtıcı servis olan araçlara (örn: Expo Push Notifications servisine veya OneSignal'e) API aracılığıyla iletir.
  6. Sistem anında telefonu titretir ve ekrana bildirimi düşürür. Aynı anda bunu Supabase'deki uygulamaiçi `notifications` tablomuza yazar, böylece kullanıcı uygulamayı açtığında çan ikonunda görür.

---

## 2. Pazarlama ve Kampanya (Promotional) Bildirimleri
Growth, Pazarlama veya E-ticaret ekipleri tarafından **manuel olarak planlanan**, hedef kitle seçilerek toplu veya özel olarak atılan ticari bildirimlerdir.

- **Örnekler:** "Efsane Cuma Başladı! %50 İndirim fırsatı", "Kuponunuzun süresi doluyor", "Sana özel 50 TL bakiye yüklendi."
- **Nereden Yönetilir?** Geliştiriciler bu bildirimleri koda yazmazlar. Şirketler bunun için bir "Admin Paneli" kullanırlar. Genelde dev şirketler de tekerleği yeniden icat etmez ve sektör standardı **Marketing Automation (Pazarlama Otomasyonu)** platformlarını kullanırlar.
- **Popüler Platformlar:** OneSignal, Braze, CleverTap, Iterable, Firebase Cloud Messaging Console, Expo Push Panel.
- **Nasıl Çalışır? (Panel Yönetimi)**
  1. **Hedef Kitle Belirleme (Segmentation):** Pazarlama uzmanı OneSignal (veya özel yazdığımız WizyClub Admin Paneli) paneline girer. Veritabanındaki "Son 30 gündür girmeyenler" veya "Premium üyeler" gibi filtrelerle bir kitle seçer.
  2. **İçerik Oluşturma:** Mesaj başlığını, metnini, bildirim ikonunu, ve tıklandığında uygulamanın neresine gideceğini (Deep Link) panele girer. Seçilen resimleri yükler. Hatta A/B testi yapar (Başlığı X olan mı çok tıklanacak Y olan mı?).
  3. **Zamanlama (Scheduling):** "Bildirim hemen şimdi gitsin" veya "Yarın akşam 20:00'da gönderilsin" der.
  4. **Dağıtım (Broadcast):** Zamanı geldiğinde OneSignal gibi dev aracı servisler, Supabase'den veya kendi hafızalarından çektikleri yüz binlerce Push Token'ına saniyeler içinde devasa bir hızla şok baskın yapar ve hepsine aynanda yollar.

---

## WizyClub İçin Hangi Araçları Kurmalıyız?

Hem kolay, hem ucuz, hem de çok güçlü bir "Modern App" bildirim mimarisi için aşağıdaki 3'lüyü kurmamız en mantıklısıdır:

1. **Uygulama İçi (In-App) Bildirimler Sayfası:** Doğrudan Supabase'de bir `notifications` tablosu tutarız (`id, type, sender_id, receiver_id, content, is_read, created_at`). Çan ikonuna basınca buradan okuruz.
2. **Push Token Yönetimi:** Her kullanıcı giriş yaptığında uygulamanın o anki cihaz için ürettiği "Push Token" veritabanındaki (Supabase `profiles` tablosu) kullanıcının profiline kaydedilir.
3. **Expo Push Notifications & OneSignal:**
   - Expo bizim yerimize mobil kodlamaları çok kolaylaştırdığı için native iOS/Android bildirim izinlerini zahmetsizce almamızı sağlar.
   - Bildirim gönderme motoru olarak Expo'nun kendi Push API'si (Push ticket'lar gönderilir) başlangıçta çok iş görür.
   - Ancak pazarlama ekibinizin harika bir arayüzden hedefleme yapmasını isterseniz sisteme **OneSignal** SDK'sı kurabiliriz. OneSignal'in paneline girdiğinde hiçbir kod yazmadan "Türkiye'de yaşayan İngilizce telefonu olan kişilere şu bildirimi at" diyebilirsiniz.
4. **Backend (Otomatikler İçin):** Follow/Like gibi işlemlerde tetiklenecek mini Supabase Edge Functions yazarız (veya mevcut Node.js backend'e yeni bir endpoint). Bu fonksiyon, olay olduğunda OneSignal veya Expo Push API'ye bir `POST` isteği atar.

> [!WARNING]
> **Android & Firebase Zorunluluğu (Çok Önemli)**
> Android işletim sistemine sahip bir cihaza uzaktan (Remote) Push Notification göndermenin tek yolu teknik olarak Google'ın "Firebase Cloud Messaging (FCM)" altyapısıdır. Kodlarımızda Firebase kullanmayacak olsak da, uygulamayı yayınlarken veya Expo dev-client derlerken Firebase Console'dan alınmış bir `google-services.json` dosyasını projeye dahil etmek ZORUNLUDUR. Aksi takdirde Android cihazlar Push Token üretemez.

> [!TIP]
> **Supabase Realtime ile Canlı (Local) Test**
> Yukarıdaki Firebase mecburiyetine takılmadan geliştirme ortamında (Local Dev) paneli anında test edebilmeniz için `backend/scripts/notification-manager.js` aracına "App İçi Canlı Test" özelliği eklenmiştir. Bu özellik Expo API'yi es geçerek doğrudan Supabase veritabanına kayıt atar. Mobil uygulama bu tabloyu (Supabase Realtime WebSockets) anlık dinler ve yeni kayıt düştüğünde ekranda anında simüle edilmiş yerel (Local) bir bildirim gösterir!

Özetle, kodlayacağımız sistemde: **"İçeriğini biz (veritabanı) belirlersek arkaplanda API ile, Siz belirlemek isterseniz Panele girip Fare ile tık tık yaparak"** bildirimleri yönetebiliyor olacaksınız.
