$ErrorActionPreference = "Stop"

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"
$apk = Join-Path $PSScriptRoot "build-output-v12\outputs\apk\debug\app-debug.apk"

if (!(Test-Path -LiteralPath $adb)) { throw "ADB não encontrado em: $adb" }
if (!(Test-Path -LiteralPath $apk)) { throw "APK não encontrado. Execute :app:assembleDebug primeiro." }

$lines = @(& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\S+\s+(device|unauthorized|offline)$" })
$ready = @($lines | Where-Object { $_ -match "\sdevice$" })
if ($ready.Count -eq 0) { throw "Nenhum celular autorizado no ADB. Ative Depuração USB e aceite a chave RSA." }
if ($ready.Count -gt 1) { throw "Mais de um dispositivo ADB conectado. Deixe apenas o celular de destino." }

Write-Host "Instalando no dispositivo: $($ready[0].Trim().Split()[0])"
& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw "A instalação do APK falhou." }
Write-Host "APK instalado com sucesso: $apk"
