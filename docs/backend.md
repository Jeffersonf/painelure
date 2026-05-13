# Backend PainelURE 2.0

Backend inicial do PainelURE 2.0.

Ele funciona em dois modos:

- `arquivo-local`: padrao para desenvolvimento, usando JSON fora do Git.
- `postgres`: banco online quando `DATABASE_URL` estiver configurada.

## Rodar

```powershell
npm start
```

URL local:

```text
http://localhost:4173
```

Porta alternativa:

```powershell
$env:PORT='4174'; npm start
```

## Variaveis

```text
PORT=4173
PAINELURE_ADMIN_KEY=uma-chave-local
PAINELURE_ADMIN_USER=jefferson
PAINELURE_ADMIN_PASSWORD=uma-senha-forte
DATABASE_URL=postgres://usuario:senha@host:5432/banco
PGSSL=true
CORS_ORIGIN=https://seu-site.github.io
```

Se `PAINELURE_ADMIN_KEY` nao for definida, escrita fica liberada para desenvolvimento local.

Se `PAINELURE_ADMIN_USER` e `PAINELURE_ADMIN_PASSWORD` forem definidos, o backend cria o primeiro usuario administrador quando a base ainda estiver vazia.

Se `DATABASE_URL` nao for definida, o backend usa arquivo local automaticamente.

Em desenvolvimento local sem `DATABASE_URL` e sem usuario salvo, o backend cria automaticamente os usuarios seed da v2 com PIN inicial `1234` e troca obrigatoria de PIN. Isso deixa `npm start` testavel localmente sem depender do banco online.

Use `PGSSL=false` apenas em banco local sem SSL. Em provedores online, deixe `PGSSL=true`.

Use `CORS_ORIGIN` quando o frontend estiver no GitHub Pages e o backend em outro dominio.

## Endpoints

- `GET /api/health`
- `GET /health`
- `GET /api/data`
- `PUT /api/data`
- `POST /api/import/:tipo`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PUT /api/users/me`
- `GET /api/sources`
- `PUT /api/sources`
- `GET /api/snapshots`
- `GET /api/audit`

Tipos de importacao iniciais:

- `contacts`
- `calendar`
- `inventory`
- `schools`
- `network`
- `supervision`

Esses tipos ja possuem normalizadores minimos no backend. A regra continua: fonte oficial entra como CSV, e o backend normaliza antes de salvar o estado.

## Armazenamento

### Local

O backend grava em:

```text
server/storage/app-data.json
```

Esse arquivo nao entra no Git.

### Online

Com `DATABASE_URL`, o backend cria as tabelas automaticamente:

```sql
app_state
app_snapshots
```

`app_state` guarda o estado atual do painel.

`app_snapshots` guarda historico simples de cada gravacao/importacao para facilitar recuperacao futura.

`users` guarda usuarios, perfis, avatar e preferencias sincronizaveis.

`official_sources` guarda URLs oficiais e metadados de fontes CSV.

`import_runs` registra importacoes executadas pelo backend.

`audit_events` registra operacoes administrativas, como importacao, alteracao de fonte e gravacao do estado.

## Supabase/Postgres

Para preparar um banco online:

1. Copie `.env.example` para `.env` local, sem commitar.
2. Crie o projeto no Supabase ou Neon.
3. Rode `db/init.sql` no SQL Editor, ou deixe o backend criar as tabelas ao iniciar.
4. Configure `DATABASE_URL`, `PAINELURE_ADMIN_KEY`, `PAINELURE_ADMIN_USER` e `PAINELURE_ADMIN_PASSWORD`.
5. Rode `npm start` e confira `GET /api/health`.

O primeiro usuario administrador e criado automaticamente se `PAINELURE_ADMIN_USER` e `PAINELURE_ADMIN_PASSWORD` estiverem definidos e ainda nao houver usuarios.

O servidor carrega `.env` automaticamente em desenvolvimento local. Em hospedagem online, prefira variaveis configuradas no painel do provedor.

Para deploy no mesmo desenho do Finanza, use o guia [`deploy-online.md`](./deploy-online.md): API Node no Render e banco PostgreSQL externo, preferencialmente Supabase ou Neon.

O endpoint `GET /api/health` informa o modo ativo:

```json
{
  "storage": {
    "mode": "postgres",
    "ready": true
  }
}
```

## Publicacao

O backend ja esta pronto para PostgreSQL online, mas a ativacao oficial fica para uma etapa futura.

Como o Render Free pode dormir e prejudicar a primeira abertura do painel, a direcao e usar Render apenas como API e manter os dados em Supabase ou Neon.

Para publicar com banco online quando retomarmos:

1. Criar um Postgres em um provedor como Supabase, Render, Railway ou Neon.
2. Copiar a connection string para `DATABASE_URL`.
3. Definir `PAINELURE_ADMIN_KEY` para proteger gravacoes.
4. Subir o backend em um host Node.
5. Apontar o frontend para esse backend quando a versao publica deixar de ser apenas GitHub Pages.

Tambem defina `PAINELURE_ADMIN_USER` e `PAINELURE_ADMIN_PASSWORD` no primeiro deploy para criar o administrador inicial.

O GitHub Pages continua servindo bem a interface estatica, mas nao executa o backend Node. Para DB online real com API propria, precisamos de um host de backend separado.

Ver tambem: `docs/supabase.md`.

Se o frontend continuar no Pages, defina no HTML publicado:

```html
<script>
  window.PAINELURE_API_URL = "https://sua-api.example.com";
</script>
```

Quando o frontend for servido pelo proprio backend, deixe `PAINELURE_API_URL` vazio.
