# WizyClub Run Tasks (Local & Cloud)

Bu rehber **VS Code Tasks** ile projeyi bir bütün olarak (Backend + Frontend + UI Tools) çalıştırmak içindir.

## 1) Task Çalıştırma

VS Code içinde:
- **F1** veya **Ctrl+Shift+P**
- `Tasks: Run Task` yaz
- Aşağıdaki ana modlardan birini seç:
  - **EV: Backend + Expo + UI**: Yerel geliştirme için (Backend + Expo + UI Paneli)
  - **IS: Backend + Ngrok + Expo + UI**: Dış dünya testi için (Backend + Ngrok + Expo Tunnel + UI Paneli)

Her mod kendi içinde gerekli tüm servisleri ayrı terminal sekmelerinde paralel başlatır.

## 2) Modlar Neyi Çalıştırır?

**EV: Backend + Expo + UI**
- `backend/`: API Sunucusu (`npm start`)
- `mobile/`: Expo Geliştirici Sunucusu (`npx expo start`)
- Root: **UI Yönetim Paneli** (`node scripts/ui.js`)

**IS: Backend + Ngrok + Expo + UI**
- `backend/`: API Sunucusu
- Root: Ngrok Tüneli (`ngrok http 3000`)
- `mobile/`: Expo Tunnel Modu
- Root: **UI Yönetim Paneli** (`node scripts/ui.js`)

## 3) Yeni Cihaz / IDE Kurulumu

Eğer başka bir bilgisayara veya IDE'ye geçerseniz, `ui` kısayolunu aktif etmek için:

**Bash/Linux (Firebase Studio vb.):**
```bash
bash scripts/setup-ui-alias.sh
```

**PowerShell (Windows/VS Code):**
```powershell
.\scripts\setup-ui-alias.ps1
```

## 4) Dikkat Edilecekler

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
