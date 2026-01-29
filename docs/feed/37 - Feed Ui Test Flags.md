# Feed UI Test Flags

Bu dokuman, feed ekraninda test icin UI katmanlarini kapatma/geri acma yapisini ozetler.

## Tek flag ile tum UI'yi kapatma

Feed icindeki tum UI katmanlarini tek bir flag ile kapatmak icin:

- Dosya: `mobile/src/presentation/components/feed/hooks/useFeedConfig.ts`
- Flag: `FEED_FLAGS.DISABLE_ALL` (master) veya `FEED_FLAGS.DISABLE_FEED_UI_FOR_TEST` (legacy)

### Kapali hale getirme

```ts
// Master kapatma
FEED_FLAGS.DISABLE_ALL = true;
// veya legacy flag
FEED_FLAGS.DISABLE_FEED_UI_FOR_TEST = true;
```

Bu durumda asagidakiler kapatilir:
- ActiveVideoOverlay (action buttons, metadata, seekbar, rate label, vb.)
- Global overlays (Header, StoryBar, Toast, Sheets, Modals)
- Tap/double-tap/long-press/press-in/out etkileşimleri
- Swipe ile profil/upload gezintisi

### Geri acma

```ts
FEED_FLAGS.DISABLE_ALL = false;
FEED_FLAGS.DISABLE_FEED_UI_FOR_TEST = false;
```

Bu degisiklikle tum UI katmanlari ve etkileşimler normale döner.

## Not

Bu flag sadece test amacli. Gercek kullanima donerken `false` yapmalisin.

## Not (Refactor Sonrasi)

Flag'ler artik `useFeedConfig.ts` icindeki `FEED_FLAGS` altinda toplanmistir.
