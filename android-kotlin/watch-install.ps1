param(
    [int]$TimeoutSeconds = 900,
    [int]$PollSeconds = 5
)

$ErrorActionPreference = "Stop"

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"
$apk = Join-Path $PSScriptRoot "build-output-v12\outputs\apk\debug\app-debug.apk"
if (!(Test-Path -LiteralPath $adb)) { throw "ADB não encontrado em: $adb" }
if (!(Test-Path -LiteralPath $apk)) { throw "APK não encontrada. Execute :app:assembleDebug primeiro." }

$started = Get-Date
Write-Host "Aguardando um dispositivo Android autorizado por até $TimeoutSeconds segundo(s)..."
while (((Get-Date) - $started).TotalSeconds -lt $TimeoutSeconds) {
    $ready = @(& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\S+\s+device$" })
    if ($ready.Count -eq 1) {
        $serial = $ready[0].Trim().Split()[0]
        Write-Host "Instalando no dispositivo: $serial"
        & $adb -s $serial install -r $apk
        if ($LASTEXITCODE -ne 0) { throw "A instalação do APK falhou." }
        Write-Host "APK instalada com sucesso: $apk"
        exit 0
    }
    if ($ready.Count -gt 1) { Write-Host "Mais de um dispositivo conectado; deixe apenas o aparelho de destino." }
    Start-Sleep -Seconds $PollSeconds
}
throw "Tempo esgotado sem encontrar um dispositivo Android autorizado."
