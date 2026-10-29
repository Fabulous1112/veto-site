# VETO token launcher setup (Windows). Downloads everything, installs, and starts the launcher.
$ErrorActionPreference = 'Stop'
Write-Host ""
Write-Host "== VETO launcher setup ==" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Node.js (approve the prompt if Windows asks)..."
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Node.js didn't install. Get it from https://nodejs.org (LTS), close this window, open a new PowerShell and run the command again." -ForegroundColor Red; return }
$dir = Join-Path $HOME 'veto-launch'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir
foreach ($f in 'launch.mjs','token.json','verify-input.json','package.json') {
  Write-Host "Downloading $f"
  Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/Fabulous1112/veto-site/main/launch-kit/$f" -OutFile $f
}
Write-Host "Installing (about 30 seconds)..."
npm.cmd install --no-fund --no-audit --loglevel=error
$net = Read-Host "Type mainnet for the real launch, or testnet to practise"
if ($net -ne 'testnet') { $net = 'mainnet' }
node launch.mjs $net
