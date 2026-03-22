# fix-temp-path.ps1
# Claude Code bash ortamindaki Windows kisayol adi sorununu cözer
# TEMP ve TMP'yi ASCII bir yola yönlendirir

$newTemp = "C:\Temp"

# Klasörü oluştur
if (-not (Test-Path $newTemp)) {
    New-Item -ItemType Directory -Path $newTemp | Out-Null
    Write-Host "Olusturuldu: $newTemp" -ForegroundColor Green
} else {
    Write-Host "Zaten mevcut: $newTemp" -ForegroundColor Yellow
}

# Kullanici ortam degiskenlerini guncelle
[System.Environment]::SetEnvironmentVariable("TEMP", $newTemp, "User")
[System.Environment]::SetEnvironmentVariable("TMP",  $newTemp, "User")

Write-Host ""
Write-Host "Kullanici TEMP = $newTemp" -ForegroundColor Cyan
Write-Host "Kullanici TMP  = $newTemp" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bitti! VS Code ve terminali yeniden baslat." -ForegroundColor Green
