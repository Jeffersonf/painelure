# Passo A Passo Mastigado Da Virada

Este e o roteiro operacional para substituir o PainelURE atual pelo novo.

## 0. Regra Principal

Nao renomeie GitHub nem avise usuarios enquanto `npm run cutover:today` mostrar `BLOQUEIO`.

## 1. Configurar A API Oficial

No Render, o servico atual pode continuar como `painelure2-api`.

Configure as variaveis:

```text
DATABASE_URL=postgresql://...
PGSSL=true
PAINELURE_ADMIN_KEY=uma-chave-admin-grande
PAINELURE_ADMIN_USER=jefferson
PAINELURE_ADMIN_PASSWORD=senha-admin
CORS_ORIGIN=https://jeffersonf.github.io
NODE_ENV=production
PORT=10000
```

Abra:

```powershell
Invoke-RestMethod "https://painelure2-api.onrender.com/api/health"
```

Tem que aparecer:

```text
storage.mode = postgres
storage.ready = true
```

Se aparecer `arquivo-local`, pare aqui.

## 2. Rodar O Check De Corte

No PowerShell:

```powershell
cd C:\Users\jeffe\painelure2
$env:P2_API_URL="https://painelure2-api.onrender.com"
$env:P2_ADMIN_USER="jefferson"
$env:P2_ADMIN_PASSWORD="SENHA_ADMIN"
npm run cutover:today
```

Se aparecer qualquer `BLOQUEIO`, resolva antes de continuar.

## 3. Migrar SETECHUB Online Para PainelURE Novo

Ainda no mesmo terminal:

```powershell
npm run migrate:setechub:online
```

Depois confira no Admin do PainelURE novo:

- usuarios;
- PINs;
- PECs sem acesso;
- escolas;
- supervisao;
- inventario;
- redes;
- contatos;
- links oficiais.

## 4. Congelar O Legado

O SETECHUB ja tem modo somente leitura automatico quando estiver em URL com `painelurelegado`.

Para forcar no navegador, rode no console:

```js
localStorage.setItem('setechub_legacy_readonly', '1')
```

## 5. Virar GitHub

Primeiro rode em modo ensaio:

```powershell
cd C:\Users\jeffe\painelure2
powershell -ExecutionPolicy Bypass -File scripts\finalizar-virada-github.ps1
```

Se estiver tudo certo, execute:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\finalizar-virada-github.ps1 -Execute
```

Isso faz:

- `Jeffersonf/painelure` -> `Jeffersonf/painelurelegado`;
- `Jeffersonf/painelure2` -> `Jeffersonf/painelure`;
- atualiza os remotes locais.

Para tambem renomear as pastas locais:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\finalizar-virada-github.ps1 -Execute -RenameLocalFolders
```

## 6. Conferir GitHub Pages

No GitHub:

1. Abra `Jeffersonf/painelure`.
2. Va em `Settings > Pages`.
3. Confirme branch `main` e pasta `/root`.
4. Aguarde publicar.
5. Abra a URL publica.

## 7. Teste Final No Navegador

No PainelURE novo:

1. abrir em janela anonima;
2. logar com admin;
3. abrir Admin;
4. carregar estado online;
5. conferir PINs;
6. navegar por escolas, inventario, redes, supervisao e contatos.

## 8. Mensagem Para Usuarios

Texto curto:

```text
O PainelURE foi atualizado hoje. Usem a URL oficial normalmente.
Quem estiver com a tela antiga aberta deve fechar e abrir novamente.
O sistema antigo ficou como PainelURE Legado apenas para consulta.
```

## O Que Eu Nao Consigo Fazer Sem Credenciais

- configurar variaveis secretas no Render;
- confirmar senha/admin do backend;
- garantir `storage.mode = postgres` na API oficial;
- publicar a migracao online sem `P2_ADMIN_KEY` ou `P2_ADMIN_USER/P2_ADMIN_PASSWORD`;
- validar o login real no navegador com a senha oficial.
