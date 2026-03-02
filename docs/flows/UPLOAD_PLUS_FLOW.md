# `+` Akışı Diyagramı

Bu doküman, kullanıcı `+` butonuna bastığında açılan ekranları sırayla gösterir.

## 1) Feed Header `+` Akışı

1. `/(tabs)/index` (Home Feed)
2. `+` butonu
3. `/upload` sayfası açılır
4. `/upload` içinde `UploadModal` açılır  
   Not: `UploadModal` ayrı route değildir, aynı sayfa içindeki modal katmandır.
5. Kullanıcı `Paylaş` der
6. Upload arka planda başlar
7. `router.back()` ile önceki ekrana dönülür (genelde `/(tabs)/index`)

## 2) Story `+` Akışı (Hikayen)

1. `/(tabs)/index` (Home Feed)
2. Story bar üzerindeki `+`
3. `/storyUpload` sayfası açılır
4. `/storyUpload` içinde `UploadModal` açılır (`story` mode)
5. Kullanıcı `Paylaş` der
6. Upload arka planda başlar
7. `router.back()` ile önceki ekrana dönülür

## Hızlı Şema

```text
Feed +:
/(tabs)/index
  -> /upload
    -> UploadModal (inline modal)
      -> Paylaş
        -> router.back()
          -> /(tabs)/index

Story +:
/(tabs)/index
  -> /storyUpload
    -> UploadModal (inline modal, story mode)
      -> Paylaş
        -> router.back()
```

