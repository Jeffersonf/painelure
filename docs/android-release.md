# Android — build e validação

## APK debug

Na raiz do projeto Android:

```powershell
cd android-kotlin
.\gradlew.bat :app:assembleDebug
```

Artefato gerado:

`android-kotlin/build-output-v12/outputs/apk/debug/app-debug.apk`

## Testes locais

```powershell
.\gradlew.bat :app:testDebugUnitTest
```

O teste instrumentado depende de um emulador ou dispositivo conectado:

```powershell
adb devices -l
```

## Gate do projeto

Na raiz:

```powershell
npm run check
```

O APK debug é assinado com a configuração debug do Android e serve para homologação. Uma publicação exige uma chave release própria.
