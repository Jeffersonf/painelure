# Melhorias Incorporadas Do Finanza E Do SETECHUB

Este documento registra o que ja foi trazido para o novo PainelURE e o que ainda falta antes de considerar a base pronta para virar oficial.

## Ja Feito

- Backend com Postgres: o PainelURE novo ja tem backend Node com suporte a `DATABASE_URL`, fallback local e tabelas principais de `users`, `app_state`, `app_snapshots`, `official_sources`, `import_runs` e `audit_events`.
- Auditoria: acoes administrativas e alteracoes relevantes ja registram eventos no backend.
- Snapshots: antes/depois das gravacoes do estado consolidado ficam preservados em `app_snapshots` ou no armazenamento local.
- Usuarios no backend: usuarios, papel, contato, avatar e preferencias ficam no backend.
- PIN visivel para Admin: o PIN fica em `preferences.pin` e tambem e exposto como `pin` no usuario publico retornado ao admin.
- Login por PIN salvo: o login usa `preferences.pin` quando existe, mantendo fallback para hash.
- Remocao de acesso PEC: usuarios PEC foram removidos da seed do PainelURE novo e o SETECHUB local tambem deixou de recria-los por padrao.
- Exclusao de usuarios: o Admin ja pode remover usuarios pelo backend.
- Migracao do SETECHUB online: existe script para puxar Supabase online do SETECHUB, ignorar PECs, preservar PINs disponiveis, gerar backup local e opcionalmente enviar para a API nova.
- Protecao contra sobrescrita antiga: `PUT /api/data` exige `baseUpdatedAt` e retorna `409 STALE_APP_STATE` quando o navegador tenta salvar sobre uma versao online mais nova.
- Cache local sem autoridade definitiva: o frontend guarda metadados do estado online e usa o localStorage como cache, nao como fonte oficial de gravacao.
- Fontes oficiais: o backend tem estrutura para `official_sources` e tela/admin para editar fontes.
- Checks automatizados: `npm run check` valida JS, escopo de acesso, rotas administrativas e pre-condicoes da transicao oficial.
- Documentacao de virada: existem roteiros para migracao do SETECHUB e transicao para o repositorio oficial.

## Parcialmente Feito

- Modelo online-first: a protecao contra sobrescrita ja existe para `app_state`, mas ainda ha telas que dependem de estado consolidado grande em vez de endpoints por dominio.
- Importacao SharePoint/Excel: o PainelURE novo tem fontes oficiais e proxy/importacao inicial, mas ainda falta transformar isso em rotina completa de backend com normalizacao, historico e agendamento.
- Auditoria detalhada: eventos principais existem, mas ainda nao ha auditoria fina para cada escola, ativo, contato ou importacao linha a linha.
- Permissoes: ha escopo por perfil e rotas admin protegidas, mas ainda nao esta no mesmo nivel granular do Finanza para papeis como `read`, `editor`, `admin`.
- Testes: existem checks proprios, mas ainda faltam testes `node:test` mais completos como no Finanza.
- API oficial renomeada: o projeto ja se identifica como `painelure`, mas a URL `painelure2-api.onrender.com` pode continuar ate a virada.

## Ainda Falta

- Migracao oficial: a migracao esta pronta para execucao, mas deve ser bloqueada se `npm run cutover:today` apontar falta de API, credenciais ou Postgres oficial.
- Banco Postgres oficial: confirmar Supabase/Neon/Render env e garantir `storage.mode = postgres` antes de qualquer `migrate:setechub:online`.
- Tabelas por dominio: criar tabelas dedicadas para escolas, supervisores, inventario, redes, contatos, agenda e chamados, em vez de depender so de `app_state`.
- Endpoints por dominio: `GET/PUT` especificos para escolas, inventario, redes, contatos e fontes.
- Rotina robusta de SharePoint/Excel: cadastro de fonte, importacao backend, normalizacao, snapshot, log em `import_runs`, auditoria e relatorio de erros.
- Fila offline real: marcar alteracoes pendentes no navegador e sincronizar com comparacao de versao quando voltar online.
- Tela de conflitos: quando houver `409 STALE_APP_STATE`, oferecer comparar/recarregar em vez de apenas avisar.
- Congelamento do legado: antes da virada, o SETECHUB precisa ficar somente leitura ou claramente marcado como historico.
- Checklist de validacao com usuarios reais: conferir PINs, perfis, escolas, supervisao, inventario, redes, contatos e links antes de trocar GitHub Pages.

## Comparacao Rápida

| Tema | Finanza | SETECHUB atual | PainelURE novo |
| --- | --- | --- | --- |
| Backend online | Sim, Postgres | Parcial, Supabase/local | Sim, Postgres/fallback local |
| Dados em tabelas por dominio | Sim | Sim no Supabase relacional | Parcial |
| LocalStorage como fonte oficial | Nao ideal, mas ainda usado | Foi um risco real | Nao deve ser fonte oficial |
| Auditoria | Sim | Parcial | Sim, ainda basica |
| Snapshots | Backup/importacao | Sim no local | Sim |
| Protecao contra overwrite antigo | Nao claramente | Nao suficiente | Sim em `app_state` |
| Usuarios/PINs no backend | Senha/hash/API key | PIN pode ficar local se nao sincronizar | PIN visivel em `preferences.pin` |
| Sync SharePoint/Excel | Nao e foco | Tem rotinas e fontes | Parcial, precisa consolidar |
| Testes | Bons `node:test` | Tem testes/checks | Checks bons, testes ainda faltam |

## Conclusao

As melhorias essenciais de seguranca operacional ja comecaram: backend oficial, PIN no backend, auditoria, snapshots, migracao preparada e trava contra sobrescrita velha.

Ainda nao esta no mesmo nivel de maturidade do Finanza em modelagem por dominio e testes. Tambem ainda nao substitui toda a capacidade de importacao/sincronizacao do SETECHUB. O proximo bloco de trabalho deve focar em SharePoint/Excel online, tabelas por dominio e testes de conflito/migracao.
