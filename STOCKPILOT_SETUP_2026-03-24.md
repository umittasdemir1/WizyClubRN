# StockPilot Ortam Kurulum Rehberi — 24 Mart 2026

## Mevcut Durum (Bu Tarih İtibarıyla)

Transcript çeviri sistemi (en → tr) tam çalışır durumda.
Aşağıdaki her ortam için tek seferlik kurulum adımları yeterli.
Sonraki oturumlarda sadece `npm run dev` yeterli.

---

## Firebase Studio (Linux / Cloud IDE)

### Disk Durumu (24 Mart 2026 itibarıyla)

- `/home` %79 dolu, ~3GB boş — venv için yeterli alan mevcut
- Gereksiz cache'ler temizlendi (pip, playwright, huggingface home cache)
- `.venv` artık gerçek dizin: `stockpilot/backend/.venv/` (symlink değil)
- Model cache kalıcı: `stockpilot/backend/model-cache/`

### Bu Ortamda İlk Açılışta Tek Sefer Yapılacaklar

Bu adımlar sadece **yeni bir clone** veya **venv elle silinmişse** gereklidir.

```bash
cd stockpilot/backend
npm install
npm run academia:setup
```

### Sonraki Her Oturumda

```bash
cd stockpilot/backend
npm run dev        # academia:setup'ı otomatik kontrol eder, gerekirse kurar
```

`npm run dev` şimdi şunu yapar:
1. `.venv` ve paketler sağlıklıysa: **~50ms** kontrol, direkt başlar
2. Venv eksikse veya paketler yoksa: otomatik `academia:setup` çalışır (~60s), sonra başlar

### `/home` Dolmaya Başlarsa

```bash
# Güvenli temizlenebilecekler (projeler bozulmaz):
rm -rf ~/.cache/pip
rm -rf ~/.cache/ms-playwright
rm -rf ~/.cache/huggingface     # model-cache artık proje içinde
npm cache clean --force         # ~/.npm/_cacache temizler
```

---

## Windows (Lokal Makine)

### Mevcut Durum

- Venv kalıcı bir dizinde — oturumlar arası korunur
- `npm run dev` otomatik kontrol yapar, bozulursa setup'ı kendisi çalıştırır

### İlk Kurulum (Yeni Makine veya Yeni Clone)

```bash
cd stockpilot/backend
npm install
npm run academia:setup
```

Python bulunamazsa `backend/.env` dosyasına ekle:

```
STOCKPILOT_PYTHON_BOOTSTRAP_BIN=C:\Users\<kullanici>\AppData\Local\Programs\Python\Python311\python.exe
```

### Sonraki Her Oturumda

```bash
cd stockpilot/backend
npm run dev        # her şeyi otomatik kontrol eder
```

---

## Genel: `npm run dev` Nasıl Çalışıyor

```
npm run dev
  └─> ensure-academia-worker.mjs (hızlı kontrol)
        ├─ .venv mevcut + paketler kurulu → "worker ready." (~50ms) → tsx watch başlar
        └─ eksik/bozuk → academia:setup otomatik çalışır → tsx watch başlar
```

Yani artık `academia:setup`'ı elle çalıştırmak **gerekmez**.

---

## Önemli Dosyalar

| Dosya | Açıklama |
|---|---|
| `stockpilot/backend/.env` | `STOCKPILOT_MODEL_CACHE_DIR` burada tanımlı |
| `stockpilot/backend/.venv/` | Python venv (gitignore'da) |
| `stockpilot/backend/model-cache/` | Helsinki-NLP çeviri modeli (gitignore'da) |
| `stockpilot/backend/scripts/ensure-academia-worker.mjs` | Hızlı venv kontrol scripti |
| `stockpilot/backend/scripts/setup-academia-worker.mjs` | Tam kurulum scripti |
| `stockpilot/backend/python/translate_academia.py` | Python çeviri worker'ı |
| `stockpilot/backend/python/requirements.txt` | Python bağımlılıkları |

---

## `stockpilot/backend/.env` İçeriği (Firebase Studio)

```
STOCKPILOT_MODEL_CACHE_DIR=/home/user/WizyClubRN/stockpilot/backend/model-cache
```

Windows'ta bu satıra gerek yok (varsayılan cache konumu yeterli).

---

## Yeni Bir Makinede Sıfırdan Kurulum

```bash
# 1. Node bağımlılıkları
cd stockpilot/frontend && npm install
cd ../backend && npm install

# 2. Python ortamı ve model kurulumu
npm run academia:setup
# (model ilk çeviride indirilir, ~300-500MB)

# 3. Çalıştır
npm run dev
```

---

## Çeviri Smoke Test

```bash
cd stockpilot/backend
tmp=$(mktemp)
echo '{"model":"Helsinki-NLP/opus-tatoeba-en-tr","texts":["Welcome to StockPilot."]}' > "$tmp"
.venv/bin/python3 python/translate_academia.py --input "$tmp"
# Beklenen çıktı: {"model": "...", "translations": ["StockPilot'a hoş geldiniz."]}
```

---

## Çeviri Özelliği Nasıl Çalışır (Kısa Özet)

- Kaynak dil İngilizce olan bir transcript yüklendiğinde UI'da **Türkçe** toggle görünür
- Toggle'a tıklanınca frontend `POST /api/academia/translate` çağırır
- Backend Python worker'ı çalıştırır, cue başına çeviri yapar
- Sonuç frontend'de cache'lenir, tekrar istek atılmaz
- Çevrilmiş transcript'te word-level timing yoktur (cue seviyesi yeterli)

---

## Bilinen Sınırlamalar (Phase 1)

- Sadece `en → tr` destekleniyor
- Çeviri word-level highlighting içermiyor
- Kaynak dil İngilizce değilse toggle görünmüyor
