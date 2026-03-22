# Auto-setup UI alias for PowerShell

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath

# Create profile if doesn't exist
if (!(Test-Path $PROFILE)) {
    New-Item -Path $PROFILE -Type File -Force | Out-Null
}

# Add function if not already present
$functionDef = "function ui { node `"$projectRoot\scripts\ui.js`" `$args }"

if (!(Select-String -Path $PROFILE -Pattern "function ui" -Quiet)) {
    Add-Content $PROFILE "`n# WizyClub UI Manager"
    Add-Content $PROFILE $functionDef
    Write-Host "✅ UI function added to $PROFILE" -ForegroundColor Green
} else {
    Write-Host "✅ UI function already exists in $PROFILE" -ForegroundColor Green
}

# Load it immediately
Invoke-Expression $functionDef
Write-Host "✅ Done! You can now use 'ui' command." -ForegroundColor Green
