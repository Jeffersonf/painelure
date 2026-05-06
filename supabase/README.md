# Banco relacional do PainelURE

O PainelURE usa o Supabase como banco online. O Supabase ja e PostgreSQL, entao nao precisamos de Neon para ter um banco relacional.

## Como ativar

1. Abra o projeto no Supabase.
2. Va em SQL Editor.
3. Cole e execute o conteudo de `supabase/schema.sql`.
4. Abra o PainelURE.
5. Entre no admin, em Banco online, e clique em `Testar conexao`.

Depois disso, o app continua mantendo o registro legado `app_state` como backup de compatibilidade, mas tambem grava os dados em tabelas relacionais `setechub_*`.

## Tabelas principais

- `setechub_schools`
- `setechub_supervisors`
- `setechub_supervisor_visits`
- `setechub_school_assets`
- `setechub_school_imports`
- `setechub_school_networks`
- `setechub_tasks`
- `setechub_calls`
- `setechub_users`
- `setechub_official_links`
- `setechub_settings`

## Quando usar Render ou Neon

Use Render se o PainelURE precisar de uma API backend propria, jobs agendados, regras secretas ou integracoes que nao devem ficar no navegador.

Use Neon apenas se decidirmos separar o PostgreSQL do Supabase. Para o estado atual, Supabase e suficiente porque ja entrega PostgreSQL, REST API e policies.
