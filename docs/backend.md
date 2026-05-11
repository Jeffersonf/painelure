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

Use `PGSSL=false` apenas em banco local sem SSL. Em provedores online, deixe `PGSSL=true`.

Use `CORS_ORIGIN` quando o frontend estiver no GitHub Pages e o backend em outro dominio.

## Endpoints

- `GET /api/health`
- `GET /api/data`
- `PUT /api/data`
- `POST /api/import/:tipo`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/me`

Tipos de importacao iniciais:

- `contacts`
- `calendar`
- `inventory`

Outros tipos aceitam CSV bruto por enquanto e devem ganhar normalizadores no backend conforme a fonte oficial for definida.

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

Como o Render Free pode dormir e prejudicar a primeira abertura do painel, a direcao atual e priorizar Supabase antes de assumir uma API propria hospedada fora.

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
