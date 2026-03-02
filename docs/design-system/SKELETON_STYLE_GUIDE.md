# Skeleton Style Guide

Bu doküman, WizyClub uygulamasında kullanılacak tüm skeleton ekranlar için ortak görsel ve davranış standardını tanımlar.

## 1) Amaç

Skeleton, "hata" veya "boş ekran" hissi vermeden kullanıcıya içeriğin yüklendiğini göstermelidir.
Spinner yerine layout'a benzeyen placeholder + yumuşak, tek timeline animasyonu kullanılmalıdır.

## 2) Temel Prensipler

1. Final layout'a sadık kal.
2. Header alanı mümkünse anında render edilsin.
3. Skeleton, header üstünü kapatmasın.
4. Kart bazlı ayrı animasyon yerine tek global animasyon kullan.
5. Animasyon sakin olmalı; göz yormamalı.
6. Tema uyumlu renkler (dark/light) zorunlu.

## 3) Keşfet Referansı (Altın Örnek)

Referans implementasyon:

- `mobile/src/presentation/components/explore/ExploreSkeleton.tsx`
- `mobile/app/(tabs)/explore.tsx`

Bu referansın temel kararları:

1. Header loading anında görünür.
2. Skeleton sadece içerik/grid alanını doldurur.
3. 3 kolon grid ve gap değerleri gerçek layout ile eşlenir.
4. Shimmer tek band olarak tüm grid üzerinde akar.

## 4) Motion Standardı

1. Tek `Animated.Value` + `Animated.loop`.
2. `Easing.linear` ile kesintisiz akış.
3. Band hareketi soldan sağa.
4. Gradient band (solid beyaz değil).
5. Kart başına bağımsız animasyon kullanılmaz.

## 5) Görsel Tokenlar (Mevcut Referans)

1. Dark tile: `#222222`
2. Light tile: `#D4D4D4`
3. Dark shimmer center: `rgba(255,255,255,0.08)`
4. Light shimmer center: `rgba(255,255,255,0.42)`
5. Grid gap: `2`
6. Grid columns: `3`

Not: Bu değerler ürün geri bildirimiyle güncellenebilir; ama güncelleme tek noktadan (bu dosya + referans bileşen) yapılmalıdır.

## 6) Uygulama Checklist

1. Header skeleton altında kalmıyor, üstte net görünüyor mu?
2. Skeleton kart ölçüleri final kartlarla aynı mı?
3. Tüm satır/sütun gap'leri eşit mi?
4. Animasyon tek timeline mı (performans)?
5. Animasyon görünür ama sakin mi?
6. Dark ve light temada kontrast dengesi iyi mi?
7. Düşük cihazlarda takılma/jank var mı?

## 7) Geçici Test Modu Kuralı

Skeleton tasarım iterasyonu sırasında geçici "kalıcı göster" flag'i açılabilir.
İş bitince normal akışa geri dönülmeli.

Örnek kullanım: `FORCE_SKELETON_PREVIEW = true` (sadece geçici).

## 8) Yapılmaması Gerekenler

1. Sadece spinner bırakmak.
2. Header'ı skeleton overlay ile kapatmak.
3. Her karta ayrı shimmer/pulse animasyon vermek.
4. Aşırı parlak veya hızlı animasyon kullanmak.
5. Final layout ile alakasız placeholder geometrisi çizmek.
