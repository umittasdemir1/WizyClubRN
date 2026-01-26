# Backend Scripts Guide (Non-Technical)

Bu dokuman, backend tarafindaki bakim scriptlerini kolayca calistirabilmeniz icin hazirlandi.
Kodlama bilmeden, kopyala/yapistir ile ilerleyebilirsiniz.

## Neden Bu Yapi Var?

Daha once scriptler birden cok klasore dagilmisti. Simdi hepsi tek yerde toplandi:
`backend/scripts/`
Böylece:
- Hangi script nerede belli olur,
- Tek bir komutla listeleyip calistirabilirsiniz,
- Yanlis klasorden calistirma riski azalir.

## En Basit Yol (Onerilen)

1) Terminal acin.
2) Asagidaki komutu yazin:

```
cd /home/user/WizyClubRN/backend
```

3) Script listesini gorun:

```
npm run cli -- list
```

4) Calistirmak istediginiz scripti secin ve su sekilde calistirin:

```
npm run cli -- <komut>
```

Ornek:

```
npm run cli -- check-env
```

## Hangi Script Calisiyor?

`npm run cli -- list` size calisabilir komutlari listeler.
Her komut, `backend/scripts/` altindaki bir `.js` dosyasina karsilik gelir.

Ornek:
- `check-env` -> `backend/scripts/check-env.js`
- `list-tables` -> `backend/scripts/list-tables.js`

## Dikkat (Onemli)

Bazi scriptler silme/temizleme islemi yapabilir (ornegin purge, delete gibi).
Emin degilseniz, once sormadan calistirmayin.

## Sadece Server Calistirmak Istiyorsaniz

Bu degismedi:

```
npm start
```

Bu komut `node server.js` calistirir ve etkilenmemistir.

## Sorun Olursa

- `.env` eksikse scriptler hata verebilir. `backend/.env` dosyasinin varligini kontrol edin.
- Hata mesajini alin ve benimle paylasin.
