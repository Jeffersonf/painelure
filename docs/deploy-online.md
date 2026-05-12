# Deploy Online Do PainelURE 2.0

O Finanza atual usa este desenho:

```text
Frontend estatico / app
        |
        v
API Node no Render
        |
        v
PostgreSQL externo
```

No Finanza, o guia principal recomenda Supabase PostgreSQL com a API no Render. A v3 tambem documenta Neon como alternativa. O ponto importante: o Render hospeda a API, mas nao deve ser o banco.

## Decisao Para O PainelURE 2.0

Vamos usar:

- GitHub: codigo e historico.
- GitHub Pages: frontend estatico quando quisermos manter a pagina leve.
- Render Web Service: API Node (`painelure2-api`).
- Supabase PostgreSQL: banco inicial recomendado.
- Neon PostgreSQL: alternativa se o Supabase der limite, pausa ou problema de conexao.

Nao vamos usar Render Database no plano gratuito, porque banco gratuito do Render nao e a base certa para producao.

## Por Que Assim

- Render pode dormir no plano gratuito, mas a API volta quando recebe requisicao.
- Os dados ficam no PostgreSQL externo, entao nao somem se a API dormir.
- Supabase e Neon aceitam connection string PostgreSQL normal, que o backend ja entende por `DATABASE_URL`.
- O PainelURE 2.0 ja tem fallback local para desenvolvimento e PostgreSQL para online.

## Variaveis No Render

```text
DATABASE_URL=postgresql://...
PGSSL=true
PAINELURE_ADMIN_KEY=uma-chave-admin-grande
PAINELURE_ADMIN_USER=jefferson
PAINELURE_ADMIN_PASSWORD=uma-senha-forte
CORS_ORIGIN=https://jeffersonf.github.io
NODE_ENV=production
PORT=10000
```

Se o frontend e a API ficarem no mesmo servico Render, `CORS_ORIGIN` pode ficar vazio.

Se o frontend ficar no GitHub Pages e a API no Render, `CORS_ORIGIN` precisa apontar para a URL do Pages.

## Passo A Passo

1. Criar banco no Supabase.
2. Copiar a connection string PostgreSQL.
3. Rodar `db/init.sql` no SQL Editor, ou deixar a API criar as tabelas no primeiro start.
4. Criar Blueprint no Render usando `render.yaml`.
5. Preencher as variaveis secretas.
6. Abrir `https://painelure2-api.onrender.com/api/health`.
7. Conferir `storage.mode = postgres` e `storage.ready = true`.
8. Entrar no painel com `PAINELURE_ADMIN_USER` e `PAINELURE_ADMIN_PASSWORD`.
9. Criar os usuarios reais no Admin.
10. Definir se a publicacao oficial abre pelo GitHub Pages ou pelo proprio Render.

## Frontend No GitHub Pages

O arquivo `config.js` aponta automaticamente para:

```text
https://painelure2-api.onrender.com
```

quando o painel estiver rodando em `github.io`.

Em desenvolvimento local, `config.js` deixa `PAINELURE_API_URL` vazio. Assim o frontend usa a API do mesmo servidor local (`./api/...`) quando voce roda:

```powershell
npm start
```

Se o nome do servico no Render mudar, atualize `config.js`.

## Plano De Migracao

Fase 1:

- API no Render.
- Banco no Supabase.
- GitHub Pages continua exibindo frontend.
- Painel aponta para API via `window.PAINELURE_API_URL`.

Fase 2:

- Admin cria e edita usuarios online.
- Fontes oficiais ficam salvas no banco.
- Imports passam a gerar auditoria.

Fase 3:

- Sessao online vira padrao.
- Troca local de perfil vira ferramenta de desenvolvimento.
- Backups/exportacoes ficam no Admin.
