# Story Components Architecture

## Active Flow
- `StoryViewer.tsx`: Story ekranının tek orchestrator'ı.
  - Story listesini slide item'lara açar.
  - Medya tipini belirler (`carousel -> image/video`, `video -> video`).
  - Progress state'ini üretir.
  - Foto için 5sn timer, video için gerçek süre bazlı progress hesaplar.
  - Swipe/tap/pause/play ve page geçişlerini yönetir.
- `StoryHeader.tsx`: Üst overlay.
  - Progress barları çizer.
  - Kullanıcı bilgisi ve close aksiyonu.
- `StoryActions.tsx`: Alt overlay.
  - Like/share/shop/emoji aksiyonları.
- `FlyingEmoji.tsx`: Emoji animasyon görselleştirme bileşeni.

## Removed Components
- `StoryPage.tsx`: Eski paralel viewer akışıydı, route tarafından kullanılmıyordu.
- `ProgressBar.tsx`: Eski bağımsız progress bileşeni, aktif akışta kullanılmıyordu.

## Data Flow
1. Route `app/story/[id].tsx` sadece `StoryViewer` render eder.
2. `StoryViewer` progress değerini üretir (`SharedValue<number>`).
3. `StoryHeader` bu progress'i sadece görselleştirir.
4. `StoryActions` kullanıcı etkileşimlerini `StoryViewer` callback'leriyle tetikler.
