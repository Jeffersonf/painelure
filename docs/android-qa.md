# QA do app Android

## Build local

Na pasta `android-kotlin`:

```powershell
.\gradlew.bat :app:assembleDebug
```

O APK atual é gerado em `build-output-v56/outputs/apk/debug/app-debug.apk` (versão 11.9.0, `versionCode` 138).

Com um celular autorizado no ADB, a instalação incremental pode ser feita com:

```powershell
.\install-latest.ps1
```

## Validação da API

Na raiz do projeto:

```powershell
npm start
Invoke-RestMethod http://localhost:4173/api/health
```

O resultado deve indicar `ok: true` e o modo de armazenamento ativo. O login precisa usar credenciais configuradas no ambiente; não usar credenciais de produção em testes locais.

## Gates automatizados

Na raiz do projeto, `npm run check` também executa `scripts/check-android-access.js`. Esse teste compara os perfis de `modules/access-scope.js` com `PermissionPolicy.kt` e falha se o site ganhar um perfil que não exista no Android.

## Checklist funcional

- Login válido, login inválido e sessão expirada.
- Dashboard com API disponível.
- Escolas: busca por nome/cidade, status e abertura do detalhe.
- Redes: busca, status e conteúdo vazio.
- Inventário, supervisão, contatos, agenda e carros carregam dados ou estado vazio.
- Backend indisponível: aviso de offline e leitura do último cache.
- Escrita sem conexão: operação pendente permanece na fila local e é reenviada no próximo carregamento online.
- Operações administrativas: o repositório Android cobre atualização do próprio perfil, CRUD de usuários, fontes oficiais e dados internos, respeitando a autenticação do backend.
- UI administrativa: o catálogo de módulos permite abrir o resumo administrativo e, para administradores, editar o próprio perfil e criar usuários.
- Importação: o repositório Android expõe CSV para contatos, agenda, inventário, escolas, redes e supervisão; o backend aplica a autorização administrativa e os normalizadores existentes.
- Sincronização geral: `saveData` envia `baseUpdatedAt`, preserva o controle de concorrência do backend e enfileira a escrita quando a rede falha.
- Conflito de versão: respostas `STALE_APP_STATE` não entram na fila offline; exigem nova leitura e decisão explícita do cliente.
- Backup: a administração permite exportar o estado em JSON pelo seletor de arquivo do Android, equivalente ao backup JSON do web.
- Administração de fontes: a UI Android permite salvar dados internos e fontes oficiais em JSON, com validação local e autorização no backend.
- Administração online: a UI Android permite verificar a API, consultar snapshots, auditoria, importações e fontes, pesquisar usuários, vincular contatos e resetar PIN com troca obrigatória.
- Teste instrumentado: `adb` está instalado, porém não há emulador ou dispositivo conectado neste ambiente; a validação fica pendente de execução em ambiente Android.
- Logout remove a sessão local.
- Perfil sem permissão não recebe dados protegidos da API.
- Tema claro/escuro e telas estreitas/largas.
- Links de documentos oficiais são abertos pelo navegador do Android.

## Gate de release

Uma versão só avança quando o build estiver verde, a API responder, o checklist for executado por pelo menos um perfil autorizado e nenhuma informação protegida aparecer no cache ou na interface de perfil sem acesso.
