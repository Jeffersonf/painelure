param(
  [switch]$Execute,
  [switch]$RenameLocalFolders
)

$ErrorActionPreference = "Stop"

$owner = "Jeffersonf"
$legacyRepo = "painelure"
$legacyNewName = "painelurelegado"
$newRepo = "painelure2"
$newOfficialName = "painelure"
$newPath = "C:\Users\jeffe\painelure2"
$legacyPath = "C:\Users\jeffe\setechub"

function Run($Command, $Arguments) {
  Write-Host "> $Command $($Arguments -join ' ')"
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Comando falhou: $Command $($Arguments -join ' ')"
  }
}

Write-Host "Virada GitHub PainelURE"
Write-Host "Legado:  $owner/$legacyRepo -> $owner/$legacyNewName"
Write-Host "Novo:    $owner/$newRepo -> $owner/$newOfficialName"
Write-Host ""

Run "gh" @("auth", "status")

if (-not $Execute) {
  Write-Host ""
  Write-Host "Modo ensaio. Nada foi alterado."
  Write-Host "Quando o cutover estiver verde, rode:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\finalizar-virada-github.ps1 -Execute"
  Write-Host ""
  Write-Host "Para tambem renomear as pastas locais apos o GitHub:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\finalizar-virada-github.ps1 -Execute -RenameLocalFolders"
  exit 0
}

Write-Host ""
Write-Host "Renomeando repositorios no GitHub..."
Run "gh" @("api", "-X", "PATCH", "repos/$owner/$legacyRepo", "-f", "name=$legacyNewName")
Run "gh" @("api", "-X", "PATCH", "repos/$owner/$newRepo", "-f", "name=$newOfficialName")

Write-Host ""
Write-Host "Atualizando remotes locais..."
Run "git" @("-C", $legacyPath, "remote", "set-url", "origin", "https://github.com/$owner/$legacyNewName.git")
Run "git" @("-C", $newPath, "remote", "set-url", "origin", "https://github.com/$owner/$newOfficialName.git")

if ($RenameLocalFolders) {
  $officialPath = "C:\Users\jeffe\painelure"
  $legacyFinalPath = "C:\Users\jeffe\painelurelegado"

  if (Test-Path $officialPath) { throw "Ja existe: $officialPath" }
  if (Test-Path $legacyFinalPath) { throw "Ja existe: $legacyFinalPath" }

  Write-Host ""
  Write-Host "Renomeando pastas locais..."
  Rename-Item -LiteralPath $newPath -NewName "painelure"
  Rename-Item -LiteralPath $legacyPath -NewName "painelurelegado"
}

Write-Host ""
Write-Host "Virada GitHub concluida. Confira GitHub Pages e Render antes de avisar os usuarios."
