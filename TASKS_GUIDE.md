# WizyClub Run Tasks (Cloud IDE)

Bu rehber sadece **VS Code Tasks** ile calistirma icindir. Terminalden manuel komut yoktur.

## 1) Task Calistirma

Cloud IDE (Firebase Studio / IDX) icinde:
- **F1** veya **Ctrl+Shift+P**
- `Tasks: Run Task` yaz
- Asagidaki task'lardan birini sec:
  - **EV: Backend + Expo**
  - **IS: Backend + Ngrok + Expo**

Her biri ayri terminal panelinde paralel calisir.

## 2) Task'lar Neyi Calistirir?

**EV: Backend + Expo**
- `backend/` icinde: `npm start`
- `mobile/` icinde: `npx expo start --dev-client --clear`

**IS: Backend + Ngrok + Expo**
- `backend/` icinde: `npm start`
- repo root'ta: `./ngrok http 3000`
- `mobile/` icinde: `npx expo start --dev-client --tunnel --clear`

## 3) Dikkat Edilecekler

- `mobile/.env` her ortamda ayarlanmali (ozellikle iste ngrok URL).
- Bazen `./ngrok` calismayabilir ya da guncelleme gerekebilir.
- Task gorunmuyorsa:
  - Workspace root'un `~/WizyClubRN` oldugundan emin ol
  - **Developer: Reload Window** dene
- Task'lar **split** olmadan, terminal tab'lari olarak acilacak sekilde ayarlandi.
  - Eger daha once split layout varsa, bir kere **Terminal: Unsplit** veya **Terminal: Reset Terminal Layout** kullan.

### Ngrok Yenileme (gerekirse)

Task olarak eklendi:
- `Tasks: Run Task` → **Ngrok: refresh binary**

Bu task su adimlari otomatik yapar:
- `./ngrok` siler
- en guncel ngrok binary indirir ve acar

## 4) Dosya Konumu

Task ayarlari: `.vscode/tasks.json`
