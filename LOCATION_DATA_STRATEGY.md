# Location Data Strategy

## Goal

Google Places tek kaynak olarak kalsin, ancak uygulama zamanla kendi konum/veri katmanini olustursun.

Dogru orta vade model:

- DB-first
- Places-fallback

Bu sayede:

- Google Places maliyeti dusurulur
- Sonuclar hizlanir
- Ayni mekan adlari tutarli kalir
- Kullaniciya daha iyi tekrar kullanim deneyimi verilir
- Uygulamanin kendi "place memory" katmani olusur

## Core Principle

Google Places'i tamamen kaldirmak dogru degil.

En dogru model:

1. Once uygulamanin veritabani sorgulanir
2. Sonuc yeterliyse DB'den donulur
3. Sonuc zayifsa Google Places cagrilir
4. Google'dan gelen yeni / guncel veri DB'ye yazilir

Bu model:

- maliyeti kontrol eder
- kaliteyi korur
- zamanla Google bagimliligini azaltir

## Recommended Data Model

### 1. Canonical Places Table

Uygulamanin bildigi mekanlari saklayan ana tablo.

Onerilen alanlar:

- `id`
- `provider` (`google`)
- `provider_place_id` (unique)
- `name`
- `formatted_address`
- `latitude`
- `longitude`
- `city`
- `region`
- `country`
- `last_synced_at`
- `usage_count`
- `is_active`
- `metadata_json`

Bu tablo ne saglar:

- Ayni mekan her seferinde yeniden Google'dan cozulmez
- Bir kullanici secmisse, sonraki kullanicilar icin direkt DB'den servis edilir
- Uygulamanin kendi mekan havuzu olusur

### 2. User Recent / Saved Places Table

Kullanicinin sectigi ve tekrar kullanabilecegi yerleri saklar.

Onerilen alanlar:

- `id`
- `user_id`
- `place_id`
- `kind` (`recent`, `favorite`, `home`, `work`)
- `last_used_at`
- `use_count`

Bu tablo ne saglar:

- Kullaniciya once kendi sik kullandigi yerler gosterilir
- "Sabit konumlar" mantigi buradan calisir
- Google cagrisi daha da azalir

### 3. Content Location Snapshot

Iceriklere sadece `place_id` baglamak yeterli degil. Snapshot da tutulmali.

Onerilen alanlar:

- `place_id`
- `location_name`
- `location_address`
- `location_latitude`
- `location_longitude`

Bu neden gerekli:

- `places` tablosu ileride guncellense bile mevcut gonderi etiketi bozulmaz
- Feed'de ve detay sayfada paylasim anindaki konum bilgisi stabil kalir

## Query Strategy

### Nearby Flow

En buyuk tasarruf burada saglanir.

Dogru akis:

1. Kullanicinin koordinati alinir
2. Once DB'de bu koordinat cevresindeki bilinen yerler aranir
3. Yeterli sonuc varsa direkt DB'den donulur
4. Sonuc azsa Google Places Nearby cagrilir
5. Yeni gelen yerler `places` tablosuna yazilir
6. Sonraki kullanicilar artik DB'den servis edilir

Bu model tekrar eden lokasyonlarda maliyeti ciddi bicimde dusurur.

### Search Flow

Arama kutusunda da benzer model uygulanmali.

Dogru akis:

1. Once kullanicinin `recent` / `favorite` yerleri
2. Sonra DB'deki canonical places
3. Sonuc zayifsa Google Places Autocomplete
4. Kullanici secince Place Details
5. Secilen sonuc DB'ye yazilir veya guncellenir

Bu model:

- "sicak" aramalari DB'den cozer
- yeni veya nadir aramalari Google'dan alir
- maliyet ve hiz dengesini korur

## What Not To Do

Asagidaki yaklasimlar onerilmez:

- Her autocomplete sorgusunu satir satir loglamak
- Her Google cevabini kosulsuz kalici yazmak
- Kullanicinin her GPS koordinatini gecmis olarak saklamak

Bunlar:

- veriyi sisirir
- gereksiz karmasa yaratir
- gizlilik riskini arttirir

Dogru ilke:

- kullanicinin anlik GPS gecmisi tutulmaz
- sadece kullanicinin sectigi / kullandigi konumlar tutulur

## Cost Control Impact

Kisa vadede cache tasarruf getirir.

Orta vadede asil kalici kazanc DB katmanidir.

En dogru kombinasyon:

- Kisa sureli in-memory cache
- DB'de hot places
- DB'de user recents
- Google Places sadece cache miss ve yeni mekanlar icin

Bu model:

- Places istek sayisini azaltir
- maliyeti daha ongorulebilir hale getirir
- tekrar eden kullanimi ucuzlatir

## Product Impact

Bu mimari seni sadece API tuketen bir uygulamadan cikarir.

Seni su seviyeye tasir:

- kendi place graph / location memory katmani olan urun

Bu da su ozelliklerin onunu acar:

- hizli konum secimi
- kullaniciya ozel tekrar kullanilan konumlar
- bu konumda populer icerikler
- konuma gore oneriler
- konuma bagli analytics

## Recommended Rollout Order

En dogru sira:

1. Mevcut Places proxy + cache kalsin
2. `places` tablosu eklensin
3. `user_recent_places` tablosu eklensin
4. Iceriklere `place_id + snapshot` baglansin
5. `location-picker` once DB, sonra Google bakacak sekilde calissin

## Target Architecture

Nihai hedef:

- Mobile once backend'e sorar
- Backend once DB'ye bakar
- DB sonucu yeterliyse doner
- Yetmezse Google Places'e gider
- Gelen sonucu normalize eder
- DB'ye yazar
- Mobile'a doner

Kisa ifade ile:

- DB-first
- Places-fallback
- cache-supported
- product-owned place memory
