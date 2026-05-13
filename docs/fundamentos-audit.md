# Auditoria de Fundamentos - PainelURE 1.0 x 2.0

Data: 2026-05-12

Objetivo: comparar os fundamentos da v1 com a v2 sem copiar o legado visual. A v2 deve manter o padrao Finanza, mas herdar as regras operacionais corretas da v1.

## Resumo Executivo

A v2 ja tem uma base melhor que a v1 em separacao de arquivos, visual, backend online, login e pagina de conta/admin. O ponto mais importante que faltava era escopo por usuario: na v1, supervisor so enxerga a propria carteira; na v2 isso ainda estava global. Essa parte foi corrigida com `modules/access-scope.js`.

Ainda existem fundamentos que precisam de fase propria:

- seguranca backend real, porque o frontend agora filtra, mas `/api/data` ainda entrega a base completa;
- paridade funcional fina das paginas de Supervisao e Escolas;
- fontes oficiais por dominio, com calendario ainda pendente;
- reducao de dados carregados antes da primeira interacao;
- polimento visual de tabelas, formularios de Admin e telas de detalhe.

## 1. Perfis e Escopo

### Como funciona na v1

A v1 possui funcoes de permissao e visibilidade espalhadas em `app.js`:

- `visibleNavigationPages`
- `assignedSchoolsForCurrentUser`
- `visibleSchools`
- `visibleSupervisors`
- `canViewSchool`
- `canViewSupervisor`

Com isso, supervisor:

- ve apenas escolas vinculadas;
- ve apenas o proprio registro na tela de supervisores;
- nao abre detalhes de escola fora da carteira;
- nao abre outro supervisor;
- busca e listas respeitam `visibleSchools()` e `visibleSupervisors()`.

### Como estava na v2

A v2 tinha `ROLE_ACCESS`, mas isso so escondia paginas e atalhos. Os dados renderizados ainda vinham de `P.getAppData()` inteiro.

### O que foi corrigido

Criado `modules/access-scope.js`:

- `activeIdentity`
- `isSupervisorUser`
- `supervisorForCurrentUser`
- `assignedSchoolsForCurrentUser`
- `visibleSchools`
- `visibleSupervisors`
- `canViewSchool`
- `canViewSupervisor`
- `scopedData`

Plugado em:

- `app.js`, para renderizar paginas com dados escopados;
- `modules/search.js`, para busca global nao sugerir dados fora do perfil;
- `modules/render.js`, para bloquear abertura de escola/supervisor fora do escopo;
- `modules/admin-tools.js`, para rerenderizar apos login/restauracao de sessao.

Teste logico feito com Magda:

- escolas visiveis: 4;
- supervisores visiveis: 1;
- `canViewSchool("EE Bairro Boa Vista Intervales")`: falso;
- `canViewSchool("PEI EE Idalicio Mendes Lima")`: verdadeiro;
- `canViewSupervisor("Marcio Nunes da Cruz")`: falso;
- `canViewSupervisor("Magda Gisele Silva Oliveira")`: verdadeiro.

### Status atual

O escopo passou a existir no frontend e no backend.

No frontend, `modules/access-scope.js` filtra os dados locais antes de renderizar.

No backend, `/api/data` passou a exigir sessao e a devolver o recorte permitido pelo perfil:

- Administrador: base completa.
- SETEC, SEINTEC e Tecnicos CTC: dados tecnicos e operacionais conforme matriz de acesso.
- Supervisao: apenas escolas vinculadas e o proprio registro de supervisao.
- Gabinete: escolas, chamados, contatos, calendario e relatorios.
- Pedagogico: escolas, supervisao, contatos e calendario.
- Consulta: escolas e contatos.

Dados de paginas sem permissao deixam de ser enviados no payload, incluindo `users`, `networkData`, `schoolAssets`, `adminChecks` e demais blocos fora do perfil.

### Pendente

Auditar se cada perfil acima esta exatamente como a regra institucional desejada. A base agora suporta recorte por categoria, tem teste automatico cobrindo os perfis atuais, mas a matriz final de negocio ainda pode ser refinada.

## 2. Seguranca Backend

### Estado atual da v2

O backend tem login, sessao, usuarios e papeis. Endpoints sensiveis de escrita exigem autenticacao/admin em varios casos.

Risco principal ja tratado:

- `GET /api/data` deixou de ser publico e agora exige sessao.
- O payload passa por recorte de perfil antes de sair do backend.
- Credenciais de redes/cameras deixam de sair no payload para perfis fora de Administrador, SETEC, SEINTEC e Tecnicos CTC.

Isso era aceitavel enquanto a v2 era prototipo estatico, mas agora que temos login por perfil, o ideal e:

- definir se dados de credenciais/redes ficam totalmente liberados para SETEC/SEINTEC/CTC ou se terao uma permissao menor separada;
- ampliar os testes quando a matriz institucional mudar;
- manter no Admin a leitura clara de dominio, responsavel, mes, cadencia e sensibilidade de cada fonte.

### Recomendacao

Criar uma funcao de escopo tambem no backend:

- `scopeAppDataForUser(appData, user)`
- `canViewSchoolBackend(user, school)`
- `canViewSupervisorBackend(user, supervisor)`

Depois alterar:

- `GET /api/data`;
- `GET /api/sources`, se necessario;
- imports e snapshots, mantendo escrita apenas admin.

## 3. Paridade de Paginas

### Dashboard

V1:

- adapta copy, metricas e acoes ao perfil;
- usa `visibleSchools()` e `supervisorStats()`;
- para supervisor, painel vira visao da propria carteira.

V2:

- ja usa `scopedData`;
- passou a adaptar copy, aviso principal e atalhos ao perfil ativo;
- supervisor recebe linguagem de carteira propria;
- perfis tecnicos, gabinete e pedagogico recebem contexto operacional diferente.

Pendente:

- validar a matriz institucional final antes de travar as mensagens de cada perfil;
- manter testes automaticos atualizados sempre que um perfil mudar.

### Escolas

V1:

- filtros por municipio, status, inventario, rede e chamados;
- lista respeita `visibleSchools()`;
- detalhe de escola tem operacional, inventario, rede, supervisao e importacoes.

V2:

- lista e detalhe existem;
- agora recebem escopo;
- detalhe ganhou fila de proximos acompanhamentos com ficha, inventario, rede e chamados conforme permissao.
- detalhe ganhou mapa rapido operacional com ficha/contato, supervisao, rede, inventario e chamados.

Pendente:

- revisar campos que realmente importam para apresentacao e uso diario;
- garantir que escolas fora do escopo nao aparecam em selects de inventario/redes.

### Supervisao

V1:

- painel de supervisores;
- detalhe do supervisor;
- metas semanais/mensais;
- escola visitada/faltante;
- aviso de divergencia de visita;
- planilhas mensais oficiais.

V2:

- lista, detalhe e metas basicas existem;
- escopo do supervisor entrou;
- detalhe ganhou progresso semanal/mensal, lista de atencoes da carteira e aviso de divergencia/gabinete.

Pendente:

- ajustar indicadores por mes selecionado;
- ligar fonte oficial de meses sem reintroduzir travamento.

### Redes e Cameras

V1:

- dados tecnicos por escola;
- credenciais e IPs em texto bruto;
- acesso era pensado para CTC/SEINTEC/SETEC.

V2:

- consulta por escola em widgets;
- paginas existem;
- credenciais agora ficam separadas do bloco tecnico e sao mascaradas fora de Administrador, SETEC, SEINTEC e Tecnicos CTC.

Pendente:

- validar se todos os perfis tecnicos devem ver credenciais ou se sera criada permissao separada.

### Inventario

V1:

- importacao e agrupamento complexos;
- qualidade de dados;
- alertas por escola;
- muita interface administrativa.

V2:

- ja tem resumo por escola, filtro e agrupamento;
- visual melhor, mas ainda com menos profundidade.

Pendente:

- decidir quais telas da v1 realmente voltam;
- manter importacao no Admin, nao na tela principal;
- incluir qualidade/resumo sem virar tabela pesada.

### Contatos

V1:

- categorias mais amplas e filtros herdados;
- regras especiais para PEC;
- diretorio de contatos e usuario vinculados.

V2:

- categorias novas estao melhores;
- avatar do usuario pode sincronizar com contato;
- ainda precisa regra fina por perfil.

Pendente:

- Pedagogico/PEC talvez precise escopo de contatos especifico;
- contatos devem virar fonte oficial editavel/importavel no Admin.

## 4. Fontes Oficiais e Dados

V1:

- varias fontes e planilhas;
- muita logica local para supervisor, inventario e escolas;
- carregamento podia ficar pesado.

V2:

- `data/sources.js` existe;
- carregamento em segundo plano existe;
- backend tem `official_sources`;
- Supabase/Postgres online ja esta ativo.

Pendente:

- calendario oficial;
- fluxo unico de "fonte -> normalizador -> estado";
- painel admin para status de cada fonte com ultima leitura;
- evitar que fonte externa bloqueie primeira pintura.

## 5. Performance

Melhorias ja presentes na v2:

- render sob demanda por pagina;
- fontes em segundo plano;
- menos CSS legado;
- modularizacao;
- `contain` e reducao de blur em areas repetidas.

Gargalos ainda provaveis:

- todos os dados locais carregam no primeiro HTML;
- todos os scripts ainda carregam no inicio;
- busca global monta itens de muitas entidades;
- Admin e fontes podem fazer chamadas pesadas;
- Admin ja mostra diagnostico principal de API, fontes oficiais, escopo ativo e bases carregadas;
- Admin tambem lista snapshots, auditoria e importacoes online em linguagem mais operacional;
- render de listas grandes ainda usa `innerHTML` completo.

Recomendacao:

- adiar modulos nao essenciais;
- cachear `scopedData` por usuario/versao de dados;
- paginar listas longas;
- transformar busca global em indice leve;
- medir com Performance panel antes de otimizar no escuro.

## 6. Visual e Usabilidade

V2 esta mais proxima do Finanza que a v1, mas ainda existem riscos:

- paginas internas ainda misturam densidade de dashboard com detalhe operacional;
- Admin reduziu excesso visual com secoes dobraveis, mas ainda precisa decidir quais formularios devem nascer fechados por padrao em apresentacao;
- algumas tabelas e filtros ainda parecem sistema tecnico;
- o login esta melhor, mas ainda nao e copia perfeita da v1 nem tao refinado quanto Finanza;
- headings e tamanhos precisam ser consistentes por tipo de tela.

Regras para proximas mudancas:

- nao criar estilo novo se `box`, `detail-widget`, `data-row`, `status-pill`, `selector-panel` resolvem;
- telas de consulta devem ser densas e limpas;
- formularios administrativos ficam no Admin;
- detalhes devem ter widgets objetivos e uma lista principal, nao varias secoes competindo.

## Ordem Recomendada de Execucao

1. Backend scoped data.
2. Dashboard por perfil.
3. Supervisao rica da v1 no visual Finanza.
4. Escola detalhe com blocos realmente uteis da v1.
5. Redes/cameras com camada de credenciais protegida.
6. Inventario: qualidade e alertas sem interface pesada.
7. Contatos: regras por perfil e importacao oficial.
8. Calendario oficial.
9. Performance: lazy loading real de modulos/dados.
10. QA visual pagina por pagina.

## Checklist de Aceite

Antes de considerar uma area pronta:

- O usuario ve apenas o que seu perfil deve ver.
- A busca global respeita o mesmo escopo.
- Detalhes nao abrem dados fora do escopo.
- A fonte oficial esta documentada.
- A tela funciona com dados vazios.
- A tela parece parte do Finanza.
- O render nao trava em listas grandes.
- Nao foi criado CSS paralelo desnecessario.
