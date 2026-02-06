# Auto-setup TEMA command for PowerShell

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$localBin = Join-Path $HOME ".local\bin"
$temaScript = Join-Path $projectRoot "scripts\tema.js"

if (!(Test-Path $PROFILE)) {
    New-Item -Path $PROFILE -Type File -Force | Out-Null
}

if (!(Test-Path $localBin)) {
    New-Item -Path $localBin -ItemType Directory -Force | Out-Null
}

$temaCmd = "@echo off`r`nnode `"$temaScript`" %*`r`n"
Set-Content -Path (Join-Path $localBin "tema.cmd") -Value $temaCmd -Encoding ASCII
Set-Content -Path (Join-Path $localBin "TEMA.cmd") -Value $temaCmd -Encoding ASCII
Write-Host "✅ Launchers created: $localBin\tema.cmd, $localBin\TEMA.cmd" -ForegroundColor Green

if (!(Select-String -Path $PROFILE -Pattern '\.local\\bin' -Quiet)) {
    Add-Content $PROFILE "`n# Ensure local bin is available"
    Add-Content $PROFILE '$env:PATH = "$HOME\.local\bin;$env:PATH"'
    Write-Host "✅ Added ~/.local/bin PATH to $PROFILE" -ForegroundColor Green
} else {
    Write-Host "✅ ~/.local/bin PATH already exists in $PROFILE" -ForegroundColor Green
}

$functionTema = "function tema { node `"$temaScript`" `$args }"
$functionTEMA = "function TEMA { tema `$args }"

if (!(Select-String -Path $PROFILE -Pattern "function tema" -Quiet)) {
    Add-Content $PROFILE "`n# WizyClub Theme Manager"
    Add-Content $PROFILE $functionTema
    Write-Host "✅ tema function added to $PROFILE" -ForegroundColor Green
} else {
    Write-Host "✅ tema function already exists in $PROFILE" -ForegroundColor Green
}

if (!(Select-String -Path $PROFILE -Pattern "function TEMA" -Quiet)) {
    Add-Content $PROFILE $functionTEMA
    Write-Host "✅ TEMA function added to $PROFILE" -ForegroundColor Green
} else {
    Write-Host "✅ TEMA function already exists in $PROFILE" -ForegroundColor Green
}

if ($env:PATH -notlike "*$localBin*") {
    $env:PATH = "$localBin;$env:PATH"
}

Invoke-Expression $functionTema
Invoke-Expression $functionTEMA
Write-Host "✅ Kurulum tamamlandı. Bu oturumda 'tema' veya 'TEMA' kullanabilirsiniz." -ForegroundColor Green
