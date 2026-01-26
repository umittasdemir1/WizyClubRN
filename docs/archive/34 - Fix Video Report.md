# fix_video.md Analiz Raporu

Bu rapor, `fix_video.md` içeriğindeki konuşmaların analizi ile mevcut kodun (özellikle `VideoPlayerPool`, `FeedManager`, `ActiveVideoOverlay`) tutarsızlıklarını ve video geçişindeki siyah ekran/titreme kaynaklarını özetler. Herhangi bir kod değişikliği yapılmamıştır.

## Bulgular

1. **Slot Remount (Siyah ekran + titreme)**
   - Video `key` içinde `slotIndex` kullanılıyor:
     - `key={`video-${slotIndex}-${slot.videoId}-${slot.retryNonce}`}`
   - Video slot 1’den slot 0’a geçince key değişiyor ve React unmount/remount yapıyor → siyah ekran/flicker.
   - **Dosya:** `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`

2. **`isReadyForDisplay` her recycle’da sıfırlanıyor**
   - Preload edilmiş video bile `isReadyForDisplay: false` oluyor.
   - Bu, preload edilmiş videoda bile loading/black screen tetikleniyor.
   - **Dosya:** `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`

3. **`source` değişimi (network → cache) videoyu restart ediyor**
   - Video oynarken recycle sırasında `source` yeniden set ediliyor.
   - 1 sn sonra siyah ekran + video 0’dan başlama davranışı buradan geliyor.
   - **Dosya:** `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`

4. **Tüm slotlar her recycle’da yeniden oluşturuluyor**
   - `setSlots` her seferinde 3 slotu da yeni objeyle değiştiriyor.
   - Bu React’te gereksiz render + `onBuffer` tetiklenmesi → titreme.
   - **Dosya:** `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`

5. **Loading bar flicker**
   - `activeVideoId` değişince `setIsVideoLoading(true)` her zaman çalışıyor.
   - Preload edilmiş videoda bile yüklenme barı görünmesine neden oluyor.
   - **Dosya:** `mobile/src/presentation/components/feed/FeedManager.tsx`

## Özet

Konuşma loglarına göre asıl sorunlar **key remount**, **ready flag reset**, **source değişimi** ve **agresif recycle** davranışından kaynaklanıyor. Loading bar sorunu ise `FeedManager` tarafında aktif video değişiminde koşulsuz `isVideoLoading=true` yapılmasından geliyor.

## Sonraki Adım (onay bekleniyor)

- Bu raporu temel alarak net ve minimal değişiklik seti çıkarılıp uygulanabilir:
  - `key` stabilizasyonu
  - `isReadyForDisplay` korunması
  - `source` sabitlenmesi (cache path geldiğinde oynayan videoyu değiştirmeme)
  - recycle sırasında sadece değişen slotları güncelleme
  - `isVideoLoading` mantığını preload-aware hale getirme
