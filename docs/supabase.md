# Supabase - PainelURE 2.0

Status: preparado, mas pausado para uma etapa futura.

## Decisao

O PainelURE 2.0 deve seguir uma rota Supabase-first quando formos ativar DB online oficial:

```text
Frontend estatico
  -> Supabase Auth / Storage
  -> Supabase PostgreSQL
```

Render fica fora do caminho principal por enquanto, porque o plano gratuito pode dormir e piorar a primeira abertura do painel.

## O que ja ficou pronto

- Backend atual aceita `DATABASE_URL` e fala com PostgreSQL via `pg`.
- Schema inicial esta em `db/init.sql`.
- O backend tambem cria as tabelas automaticamente ao iniciar com `DATABASE_URL`.
- Usuarios, estado do app e snapshots ja possuem estrutura inicial.
- Usuarios agora possuem `contact_id` para vincular perfil de acesso a uma pessoa da base de Contatos.
- Avatar/foto deve ser tratado como dado do contato vinculado: quando o usuario troca a foto no perfil, a foto do contato tambem muda.
- Fontes oficiais podem ser persistidas via `official_sources`.
- Importacoes ficam registradas em `import_runs`.
- Operacoes administrativas ficam preparadas em `audit_events`.
- Endpoints de snapshots, auditoria e fontes ja estao expostos pela API Node.

## Quando retomarmos

1. Criar projeto no Supabase.
2. Rodar `db/init.sql` no SQL Editor.
3. Definir como sera a autenticacao final:
   - Supabase Auth direto no frontend; ou
   - API propria mantendo `pg`.
4. Definir Storage para avatar.
5. Migrar Conta/Admin para usuario online.
6. Ligar o painel Admin aos endpoints `/api/sources`, `/api/snapshots` e `/api/audit`.
7. So depois publicar como fluxo oficial.

## Regra

Nenhum segredo entra no Git.

Variaveis como `DATABASE_URL`, senhas e chaves ficam apenas no painel do provedor ou em `.env` local.
