# Infinite Feed Opus 4.6 Action Plan (February 6, 2026)

## Scope
- Hedef: Infinite feed tarafındaki scroll jank ve siyah ekran sorunlarını sistematik olarak kapatmak.
- Kaynak: `06.02.26 Opus 4.6 Check.md`
- Not: Bu plan sadece uygulama yol haritası ve task listesidir.

## Success Criteria
- Hızlı scroll sırasında görünür takılma hissi belirgin şekilde azalır.
- 5-6+ post hızlı geçişte siyah ekran oranı kabul edilebilir seviyeye iner.
- Cache hit oranı artar, gereksiz network fallback azalır.
- Regressionsız rollout yapılır.

## Workstream 1 - Scroll Jank (P0)
1. `resolvedVideoSources` kaynaklı tam liste re-render zincirini kır.
2. `FlashList extraData` içinde gereksiz global scroll state bağımlılıklarını çıkar.
3. Viewability commit akışındaki çoklu setState etkisini azalt.
4. `renderItem` bağımlılıklarını stabilize et ve yalnız değişen kartların güncellenmesini hedefle.
5. Ölçüm: scroll FPS/drop-frame ve commit/render sayısı karşılaştırması.

## Workstream 2 - Black Screen (P0)
1. Video mount penceresini hızlı scroll senaryosuna göre genişlet.
2. First-frame fallback süresini agresif ve güvenli bir seviyeye çek.
3. `playbackSource` reset politikasını, tekrar girişte yeniden network zinciri başlatmayacak şekilde düzenle.
4. Thumbnail/video katman geçişini, blank frame oluşmadan yönet.
5. Ölçüm: 25 swipe testinde siyah ekran görülme oranı.

## Workstream 3 - Cache & Prefetch (P1)
1. `PREFETCH_AHEAD_COUNT` değerini hızlı swipe kullanımına göre artırıp doğrula.
2. Bir sonraki hedef kart için eager cache stratejisi uygula.
3. Komşu video resolve/cache set akışını idempotent hale getir.
4. Carousel image cache key stabilizasyonunu takip et.
5. Ölçüm: memory/disk hit oranı, network source fallback sayısı.

## Workstream 4 - Safe Rollout (P1)
1. Değişiklikleri feature flag ile kontrollü aç.
2. Önce internal test, ardından sınırlı kullanıcı segmentinde kademeli yayınla.
3. Fail-safe: kritik metrikte bozulma olursa eski davranışa hızlı dönüş planı hazır tut.

## Task Breakdown
- [ ] P0-A: `renderItem` ve `extraData` re-render kaynaklarını minimize et.
- [ ] P0-B: Active/pending commit setState akışını sadeleştir.
- [ ] P0-C: Mount window + fallback timer + source reset politikasını güncelle.
- [ ] P0-D: Hızlı swipe test senaryolarında black-screen regresyon kontrolü yap.
- [ ] P1-A: Prefetch ahead/behind değerlerini optimize et.
- [ ] P1-B: Next-item eager cache davranışını stabilize et.
- [ ] P1-C: Cache telemetry ve log dashboard çıktısını güncelle.
- [ ] P1-D: Controlled rollout planını uygulayıp ölçümleri topla.

## Verification Matrix
- [ ] Test 1: Normal scroll (video + carousel mixed feed)
- [ ] Test 2: Fast 5-6+ swipe burst
- [ ] Test 3: Weak network (throttled)
- [ ] Test 4: Cache warm app reopen
- [ ] Test 5: 25 swipe checklist PASS threshold

## Definition of Done
- [ ] P0 maddeler tamamlandı.
- [ ] Tip kontrolü ve temel build doğrulaması geçti.
- [ ] Runtime test matrisi tamamlandı.
- [ ] Rollout ve rollback notları dokümante edildi.
