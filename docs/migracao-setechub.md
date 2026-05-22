# Migracao Do SETECHUB Online

Status atual: preparada para execucao oficial. Antes de enviar online, rode `npm run cutover:today` e nao prossiga se aparecer `BLOQUEIO`.

O `painelure2` deve tratar o banco online como fonte oficial. Para migrar dados do SETECHUB sem depender de `localStorage`, use:

```powershell
npm run migrate:setechub
```

Esse comando le o Supabase online do SETECHUB, ignora usuarios PEC, preserva PINs visiveis, gera backups em `server/storage/*.bak.json` e atualiza:

- `server/storage/app-data.json`
- `server/storage/users.json`
- `server/storage/sources.json`
- `server/storage/setechub-migration-report.json`

Para enviar direto ao backend online do PainelURE:

```powershell
$env:P2_API_URL="https://painelure2-api.onrender.com"
$env:P2_ADMIN_USER="jefferson"
$env:P2_ADMIN_PASSWORD="SENHA_ADMIN"
npm run migrate:setechub:online
```

Tambem pode usar chave administrativa:

```powershell
$env:P2_API_URL="https://painelure2-api.onrender.com"
$env:P2_ADMIN_KEY="CHAVE_ADMIN"
npm run migrate:setechub:online
```

O modo online remove usuarios PEC e substitui usuarios antigos que tenham o mesmo nome dos usuarios oficiais migrados.
Essa gravacao usa `force: true` porque a migracao e uma acao administrativa explicita de substituicao da base oficial.

No uso normal do painel, o frontend envia `baseUpdatedAt` ao salvar. Se outra pessoa ja tiver gravado uma versao mais nova, o backend responde `409 STALE_APP_STATE` e o Admin precisa carregar o estado online antes de tentar novamente. Isso impede que cache/localStorage sobrescreva a base oficial.

Depois da migracao, confira:

```powershell
npm run check
```

O relatorio mostra contagens e PINs migrados. Se algum PIN esperado nao aparecer, ele nao esta salvo no Supabase online do SETECHUB; sera preciso sincronizar pelo navegador onde o usuario alterou o PIN ou obter um backup JSON desse navegador.
