Evet, kodu inceledim. Aşağıda takılmaya neden olabilecek noktaları öncelik sırasıyla listeliyorum.

  Bulgu 1 (Yüksek)

  - onProgress tetiklenme aralığı 33ms (≈30fps). Bu JS thread’e sürekli event yağdırıyor ve aynı anda scroll olduğu için “takılma” hissi yaratabilir.
    handleVideoProgress içinde her tick’te shared value güncelleniyor ve ek logic çalışıyor.
    Referans: mobile/src/presentation/components/feed/VideoPlayerPool.tsx:230, mobile/src/presentation/components/feed/hooks/
    useFeedVideoCallbacks.ts:121

  Bulgu 2 (Orta)

  - Aktif index değiştiğinde scroll sırasında disk/network işleri tetikleniyor (cacheVideo, Image.prefetch, FeedPrefetchService.queueVideos). Bu,
    hızlı swipe’larda JS tarafını meşgul edip akıcılığı bozabilir.
    Referans: mobile/src/presentation/components/feed/hooks/useFeedScroll.ts:200, mobile/src/presentation/components/feed/hooks/useFeedScroll.ts:210,
    mobile/src/presentation/components/feed/hooks/useFeedScroll.ts:219

  Bulgu 3 (Orta/Düşük)

  - FlashList render ayarları çok dar: maxToRenderPerBatch=1, windowSize=3, removeClippedSubviews=false. Bu, sık mount/unmount + overdraw üreterek
    takılma hissi yaratabilir (özellikle orta/alt seviye cihazlarda).

  Bulgu 4 (Düşük)

  - SwipeWrapper içinde dikey hareketi tespit etmek için touch.absoluteY - touch.y kullanılıyor; bu “hareket delta” değil. Her hareketi yanlışlıkla
    “dikey” sayıp gesture’ı fail edebilir ve scroll sırasında ekstra gesture churn yaratabilir.
    Referans: mobile/src/presentation/components/shared/SwipeWrapper.tsx:50

  Bulgu 5 (Düşük)

  - onViewableItemsChanged içinde scrollY.value JS thread’den okunuyor; bu Reanimated shared value sync okuyuşu olduğu için sık çağrılırsa ek
    overhead getirebilir.
    Referans: mobile/src/presentation/components/feed/hooks/useFeedScroll.ts:252

  Varsayımlar / sorular

  - Sorun daha çok Android’de mi, yoksa iOS’ta da var mı?
  - Takılma her zaman mı, yoksa hızlı swipe sırasında mı belirgin?
  - Carousel (foto) postlar varken mi daha kötü?

  İstersen şimdi şu yaklaşımı uygulayabilirim:

  1. progressUpdateInterval değerini düşürüp (ör. 100–250ms) scroll sırasında progress güncellemelerini askıya almak
  2. cacheVideo/prefetch işlemlerini scroll bitince tetiklemek
  3. FlashList batch/window ayarlarını biraz yükseltmek
  4. SwipeWrapper dikey hareket kontrolünü düzeltmek

  Hangisinden başlayayım?



• I'll suggest starting with throttling or pausing progress updates during scrolling, then deferring prefetch/caching until scrolling ends, followed
  by FlashList tweaks and SwipeWrapper fixes. I'll ask if this approach works before proceeding.

  Proposing detailed performance improvements

  I'll suggest starting by increasing the progress update interval to 100ms and pausing updates while scrolling, then deferring prefetch and caching
  until scroll momentum ends, followed by tuning FlashList settings and SwipeWrapper fixes. I'll ask the user to approve implementing steps 1 and 2

  Ben 1 + 2 ile başlayıp hızlı test etmenizi öneririm. Onay verirsen hemen uygulayayım.


› 1 başla


• I'm updating the progress update interval in the video component from 33ms to 100ms as the first step, without changing other intervals or adding
    230 -                progressUpdateInterval={33}
    230 +                progressUpdateInterval={100}
    231                  automaticallyWaitsToMinimizeStalling={false}

─ Worked for 8s ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Adım 1 tamam: progressUpdateInterval 33ms → 100ms yaptım.

  to pass scrolling state into video callbacks by updating hook signature accordingly.

• Edited mobile/src/presentation/components/feed/FeedManager.tsx (+1 -1)
    169          videosRef, activeIndex, activeVideoId, viewingMode, togglePause,
    170 -        setCleanScreen, videoPlayerRef, listRef,
    170 +        setCleanScreen, videoPlayerRef, listRef, isScrollingSV: scrollApi.isScrollingSV,
    171      });
  updates.

• Explored
  └ Search useFeedVideoCallbacks in feed

• İkinci adımı uyguladım: Scroll sırasında onProgress çağrısını azaltarak, isScrollingSV true iken currentTime/duration güncellemelerini atladım;
  böylece scroll esnasında JS yükü hafifliyor. Değişiklik yapılan dosyalar: (buraya dosya isimleri eklenecek). Lütfen test edin. Eğer sorun devam
  ederse, üçüncü adım olarak prefetch ve cache işlemlerini scroll momentum sonuna erteleyip FlashList batch ayarlarını düzenleyebiliriz.

─ Worked for 50s ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Scroll sırasında onProgress işini kısacak şekilde 2. adımı uyguladım. Artık scroll aktifken progress güncellemeleri ve auto‑advance hesapları
  çalışmıyor; sadece minimal state tutuluyor. Bu, kaydırma esnasındaki JS yükünü azaltır.

  Değişiklikler

  - mobile/src/presentation/components/feed/hooks/useFeedVideoCallbacks.ts
  - mobile/src/presentation/components/feed/FeedManager.tsx

  Şimdi test eder misin? Hâlâ takılma varsa sıradaki adım:

  1. Prefetch/cache çağrılarını scroll bitimine ertelemek
  2. FlashList batch/window ayarlarını biraz yükseltmek


› hala var


• I see the user reports the issue persists, so I’ll proceed with step 3 by moving prefetch/cache calls to the scroll end handler to reduce jitter,
  informing them of the change. I'll confirm this approach but avoid excessive changes unless explicitly requested.

  Refactoring prefetch to run after scroll end

  I'm planning to move prefetch and caching logic out of active index updates and instead trigger them in the scroll end handler using a new helper.
  This will reduce overhead during scroll and defer heavy work until scrolling stops, potentially using setTimeout or InteractionManager for smoother
  performance.

• Edited mobile/src/presentation/components/feed/hooks/useFeedScroll.ts (+38 -32)
    198          setIsCarouselInteracting(false);
    199 +    }, [
    200 +        videosRef,
    201 +        setActiveVideo,
    202 +        setCleanScreen,
    203 +        setActiveTab,
    204 +        setIsCarouselInteracting,
    205 +        lastActiveIdRef,
    206 +        lastInternalIndex,
    207 +    ]);
    208
    200 -        // Cache next video
    201 -        if (!isActiveCarousel) {
    202 -            const nextVideo = videosRef.current[newIndex + 1];
    203 -            const nextUrl = isFeedVideoItem(nextVideo) ? getVideoUrl(nextVideo) : null;
    204 -            if (nextUrl) {
    205 -                VideoCacheService.cacheVideo(nextUrl).catch(() => { });
    206 -            }
    209 +    const prefetchAroundIndex = useCallback((baseIndex: number) => {
    210 +        // Skip if scroll handling is disabled
    211 +        if (isDisabled('DISABLE_SCROLL_HANDLING')) return;
    212 +
    213 +        if (baseIndex < 0 || baseIndex >= videosRef.current.length) return;
    214 +
    215 +        const baseVideo = videosRef.current[baseIndex];
    216 +        if (!baseVideo || baseVideo.postType === 'carousel') return;
    217 +
    218 +        const nextVideo = videosRef.current[baseIndex + 1];
    219 +        const nextUrl = isFeedVideoItem(nextVideo) ? getVideoUrl(nextVideo) : null;
    220 +        if (nextUrl) {
    221 +            VideoCacheService.cacheVideo(nextUrl).catch(() => { });
    222          }
        ⋮
    224          // Prefetch next thumbnails for faster poster display
    210 -        [newIndex + 1, newIndex + 2].forEach((idx) => {
    225 +        [baseIndex + 1, baseIndex + 2].forEach((idx) => {
    226              const video = videosRef.current[idx];
        ⋮
    231
    217 -        // Defer prefetch to avoid blocking scroll
    218 -        if (!isActiveCarousel) {
    219 -            setTimeout(() => {
    220 -                const prefetchIndices = getPrefetchIndices(newIndex).filter((idx) =>
    221 -                    isFeedVideoItem(videosRef.current[idx])
    222 -                );
    223 -                if (prefetchIndices.length === 0) return;
    224 -                FeedPrefetchService.getInstance().queueVideos(
    225 -                    videosRef.current,
    226 -                    prefetchIndices,
    227 -                    newIndex
    228 -                );
    229 -            }, 0);
    230 -        }
    231 -    }, [
    232 -        videosRef,
    233 -        setActiveVideo,


  Lütfen tekrar dener misin?
  Hâlâ takılıyorsa sıradaki adım olarak FlashList ayarlarını (batch/window) gevşetmeyi ve removeClippedSubviews ayarını denemeyi öneririm.


› evet hala takılıyor. devam edelim


• Edited mobile/src/presentation/components/feed/FeedManager.tsx (+4 -4)
    326                          keyExtractor={(item: Video) => item.id}
    327 -                        updateCellsBatchingPeriod={16}
    327 +                        updateCellsBatchingPeriod={32}
    328                          snapToInterval={ITEM_HEIGHT}
        ⋮
    342                          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color="#FFF" /> : null}
    343 -                        removeClippedSubviews={false}
    344 -                        maxToRenderPerBatch={1}
    345 -                        windowSize={3}
    343 +                        removeClippedSubviews={true}
    344 +                        maxToRenderPerBatch={3}
    345 +                        windowSize={5}
    346                          drawDistance={ITEM_HEIGHT * 1.5}

─ Worked for 5s ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• FlashList ayarlarını biraz gevşettim:

  - updateCellsBatchingPeriod 16 → 32
  - maxToRenderPerBatch 1 → 3
  - windowSize 3 → 5
  - removeClippedSubviews false → true

  Değişiklik: mobile/src/presentation/components/feed/FeedManager.tsx

  Tekrar dener misin?
• Edited mobile/src/presentation/components/shared/SwipeWrapper.tsx (+0 -7)
    49          })
    50 -        .onTouchesMove((e, state) => {
    53 -            if (Math.abs(touch.absoluteY - touch.y) > 10) {
    54 -                state.fail();
    55 -            }
    56 -        })
    50          .onEnd((e) => {

• Edited mobile/src/presentation/components/feed/VideoPlayerPool.tsx (+1 -1)
    229                  disableFocus={isMuted}
    230 -                progressUpdateInterval={100}
    230 +                progressUpdateInterval={150}
    231                  automaticallyWaitsToMinimizeStalling={false}

─ Worked for 17s ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Uyguladım:

  - SwipeWrapper içindeki hatalı dikey hareket kontrolünü kaldırdım (zaten failOffsetY var).
    Dosya: mobile/src/presentation/components/shared/SwipeWrapper.tsx
  - progressUpdateInterval 100 → 150ms’e çekildi.
    Dosya: mobile/src/presentation/components/feed/VideoPlayerPool.tsx
  FeedManager.

• Edited mobile/src/presentation/components/feed/VideoPlayerPool.tsx (+1 -1)
    229                  disableFocus={isMuted}
    230 -                progressUpdateInterval={150}
    230 +                progressUpdateInterval={200}
    231                  automaticallyWaitsToMinimizeStalling={false}

• Edited mobile/src/presentation/components/feed/FeedManager.tsx (+3 -3)
    326                          keyExtractor={(item: Video) => item.id}
    327 -                        updateCellsBatchingPeriod={32}
    327 +                        updateCellsBatchingPeriod={48}
    328                          snapToInterval={ITEM_HEIGHT}
    329                          snapToAlignment="start"
    330 -                        decelerationRate="fast"
    330 +                        decelerationRate={0.98}
    331                          disableIntervalMomentum={true}
        ⋮
    345                          windowSize={5}
    346 -                        drawDistance={ITEM_HEIGHT * 1.5}
    346 +                        drawDistance={ITEM_HEIGHT * 2}
    347                          scrollEnabled={!isCarouselInteracting}

─ Worked for 18s ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

• Evet, estimatedItemSize zaten var: mobile/src/presentation/components/feed/FeedManager.tsx içinde estimatedItemSize={ITEM_HEIGHT} olarak
  Şimdi tekrar dener misin?
  Hâlâ takılıyorsa, bir sonraki adım olarak scrollEventThrottle’ı 16 → 32 yapmayı ve viewabilityConfig eşiklerini biraz artırmayı öneririm.


› tutuk tutuk kayıyor neden böyle


  Diagnosing stutter as scroll and JS update conflict

  The "tutuk" likely comes from frequent active video updates triggered by onViewableItemsChanged during scrolling, causing heavy re-renders and
  jank, combined with snap, decelerationRate, and gesture handler conflicts. Propose to skip active index updates while scrolling using shared scroll
  state, add onScrollEndDrag to update active video after slow drags, and consider reverting decelerationRate to "fast" to improve smoothness.

• Edited mobile/src/presentation/components/feed/hooks/useFeedScroll.ts (+2 -0)
    250
    251 +            if (isScrollingSV.value) return;
    252 +
    253              if (viewableItems.length === 0) return;
    349                          scrollEventThrottle={16}
    350 +                        onScrollEndDrag={(e: any) => scrollApi.handleScrollEnd(e, videos.length, listRef)}
    351                          onMomentumScrollEnd={(e: any) => scrollApi.handleScrollEnd(e, videos.length, listRef)}


  - mobile/src/presentation/components/feed/hooks/useFeedScroll.ts
  - mobile/src/presentation/components/feed/FeedManager.tsx

  Lütfen tekrar dene.
  Hâlâ takılıyorsa bir sonraki adım olarak:

• Edited mobile/src/presentation/components/feed/FeedManager.tsx (+2 -2)
    330                          decelerationRate={0.98}
    332                          showsVerticalScrollIndicator={false}
        ⋮
    348                          onScroll={scrollApi.scrollHandler}
    349 -                        scrollEventThrottle={16}
    349 +                        scrollEventThrottle={32}
    350                          onScrollEndDrag={(e: any) => scrollApi.handleScrollEnd(e, videos.length, listRef)}

─ Worked for 10s ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

  - mobile/src/presentation/components/feed/hooks/useFeedConfig.ts
  - mobile/src/presentation/components/feed/FeedManager.tsx

  öneririm.
