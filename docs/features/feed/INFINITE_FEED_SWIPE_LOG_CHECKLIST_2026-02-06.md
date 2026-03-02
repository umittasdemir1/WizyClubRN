# Infinite Feed Swipe + Log Checklist (February 6, 2026)

## Goal
Hızlı scroll ve geri dönüş senaryolarında siyah ekran/regresyonu doğrulamak; autoplay commit, first-frame reveal ve cache zincirini log ile ölçmek.

## Preconditions
- Dev build logları açık olmalı.
- Infinite feed ekranı temiz başlatılmalı (uygulama açılışından sonra feed ilk kez açılmalı).
- Ağ tipi not edilmeli (`wifi` / `cellular`).

## 25 Swipe Scenario
1. Aşağı doğru 10 hızlı swipe yap.
2. Yukarı doğru 10 hızlı swipe ile geri dön.
3. Aynı 5 videoda ileri-geri (revisit) geçiş yap.

Toplam: 25 swipe.

## Expected Logs (Codes)
- `2004 (VIDEO_PLAYBACK_START)`: Scroll settle sonrası aktif video commit logu.
- `2001 (VIDEO_LOAD_START)`: Aktif video mount/load başlangıcı.
- `2002 (VIDEO_LOAD_SUCCESS)`: İlk frame görünür olduğu an (`ready|progress|fallback`).
- `2007/2008 (VIDEO_BUFFER_START/END)`: Buffer state geçişleri.
- `3002/3003/3004 (CACHE_HIT/MISS/SET)`: Aktif video cache hit/miss ve zorunlu cache sonucu.
- `6010 (PREFETCH_START)`: Komşu video prefetch queue tetiklenmesi.
- `6001/6002 (PERF_MEASURE_START/END)`: Scroll başlangıcı ve settle commit ölçümü.

## PASS Criteria
1. Scroll settle sonrası kalıcı siyah ekran olmamalı (aynı kartta takılı siyah görüntü yok).
2. Her `2004` commit için kısa süre içinde `2001` veya doğrudan `2002` görülmeli.
3. Revisit (geri dönülen videolar) sırasında `3002 (CACHE_HIT)` oranı artmalı.
4. `2003 (VIDEO_LOAD_ERROR)` tekrar eden bir pattern oluşturmamalı.
5. `reason` alanı yalnızca `viewable-immediate`, `momentum-end` veya `drag-end-no-momentum` olmalı.

## FAIL Criteria
1. Kart settle olduktan sonra siyah ekran devam ediyor ve video geç başlamıyorsa.
2. Aynı videoya geri dönüldüğünde sürekli `CACHE_MISS` alınıyorsa.
3. Commit logu var ama first-frame success (`2002`) üretilmiyorsa.
4. Scroll sırasında aktif video id/index commit’leri kararsız şekilde zıplıyorsa.

## Quick Triage Notes
- `2004` var, `2002` yok: first-frame event zinciri veya native render surface problemi.
- `3003` sürekli, `3002` düşük: cache warmup/resolve zinciri etkisiz.
- `2007` uzun, `2008` geç: bufferConfig veya ağ koşulu baskın.
