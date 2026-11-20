# snapshot.ps1 — crée une sauvegarde du code AVANT une modification testée.
# Usage :  powershell -File sauvegarde.ps1 "avant redesign accueil"
# Rollback : copier le contenu du dossier backups\<snapshot> par-dessus le projet.
param([string]$Message = "snapshot")

$root = $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $root ("backups\snapshot-" + $stamp)

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -Path (Join-Path $root "src") -Destination $dest -Recurse -Force
Copy-Item -Path (Join-Path $root "index.html") -Destination $dest -Force
Copy-Item -Path (Join-Path $root "vite.config.js") -Destination $dest -Force
Copy-Item -Path (Join-Path $root "package.json") -Destination $dest -Force
Copy-Item -Path (Join-Path $root "public") -Destination $dest -Recurse -Force
Copy-Item -Path (Join-Path $root "AGENTS.md") -Destination $dest -Force
Copy-Item -Path (Join-Path $root "PALETTES.md") -Destination $dest -Force -ErrorAction SilentlyContinue

"snapshot cree : $dest  ($Message)" | Out-File -FilePath (Join-Path $dest "LISEZMOI.txt") -Encoding utf8
Write-Host "SNAPSHOT OK -> $dest  ($Message)"
Write-Host "Pour revenir en arriere : copier tout le contenu de ce dossier par-dessus le projet."
