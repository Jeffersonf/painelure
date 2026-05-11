# Decisões Técnicas Do PainelURE 2.0

Este documento registra decisões para evitar que o projeto volte a virar um conjunto de remendos.

## 001 - PainelURE 2.0 Fica Separado Do 1.0

Decisão: a versão 2.0 fica em `C:\Users\jeffe\painelure2`, fora da publicação oficial atual.

Motivo:

- Preservar a versão 1.0 para apresentação/publicação.
- Permitir reconstrução visual e técnica sem medo de quebrar produção.
- Evitar migração parcial e código misturado.

## 002 - Visual Inspirado No Finanza

Decisão: o PainelURE 2.0 segue o vocabulário visual do Finanza, sem copiar o projeto Finanza diretamente.

Motivo:

- O Finanza tem uma linguagem coesa.
- O PainelURE 1.0 sofreu com estilos acumulados.
- A versão 2.0 precisa parecer produto novo, não correção incremental.

Regras:

- Sidebar escura fixa.
- Cards escuros com borda sutil.
- Lime/teal como acentos principais.
- Poucos efeitos.
- Performance acima de decoração.

## 003 - Modularização Sem `type="module"`

Decisão: os arquivos JS são separados, mas carregados via `<script>` comum em ordem.

Motivo:

- O HTML precisa funcionar abrindo direto pelo arquivo.
- `type="module"` pode falhar via `file://`.
- Ainda conseguimos manter separação por responsabilidade.

Ordem atual:

1. `data/mock.js`
2. `modules/dom.js`
3. `modules/data-store.js`
4. `modules/search.js`
5. `modules/render.js`
6. `modules/navigation.js`
7. `app.js`

## 004 - Namespace Global Controlado

Decisão: módulos compartilham funções pelo namespace `window.PainelURE`.

Motivo:

- Evitar bundler nesta fase.
- Evitar `import/export`.
- Manter compatibilidade com arquivo local.

Regra:

- Nada deve ser jogado direto em `window` fora de `window.PainelURE`.
- Cada módulo deve registrar apenas funções necessárias.
- Dados oficiais futuros devem entrar via camada de dados, não direto nos renderizadores.

## 005 - Camada De Dados Antes Das Planilhas

Decisão: o app consome dados via `P.getAppData()` e `P.setAppData()`.

Motivo:

- Preparar troca de mocks por planilhas.
- Evitar que renderizadores dependam da origem dos dados.
- Facilitar normalização e validação.

Regra:

- Renderizadores recebem arrays/objetos já normalizados.
- Planilhas futuras devem ser convertidas para o formato interno antes de renderizar.
- Mock é fallback temporário, não fonte oficial.

## 006 - Busca Leve Por Página

Decisão: a busca da sidebar usa `data-search` nos itens renderizados.

Motivo:

- Evita rerender a cada tecla.
- Funciona com qualquer página que renderize itens buscáveis.
- É simples e rápida.

Regra:

- Cards e linhas consultáveis devem receber `data-search`.
- Busca não deve conhecer a estrutura de cada página.

## 007 - Performance Como Regra De Design

Decisão: efeitos visuais são limitados.

Motivo:

- O PainelURE 1.0 ficou pesado e visualmente irregular.
- A versão 2.0 deve abrir e navegar rápido.

Regras:

- Não usar blur em listas grandes.
- Não aplicar pseudo-elemento em todo card.
- Evitar animações de entrada.
- Hover deve mudar borda/fundo, não layout.
- Cards repetidos usam `contain: layout paint`.

## 008 - Fontes Oficiais Entram Por Registro Central

Decisão: URLs de planilhas e CSVs ficam em `data/sources.js`.

Motivo:

- Evitar URLs espalhadas pelo código.
- Trocar fonte sem mexer em renderização.
- Permitir fallback para mock enquanto a fonte oficial não está configurada.

Regra:

- Cada domínio tem uma chave: `contacts`, `schools`, `inventory`, `supervision`, `network`, `calendar`.
- Fonte sem URL é ignorada.
- Erro de fonte não deve derrubar o painel.

## 009 - Normalização Antes De Renderizar

Decisão: dados externos passam por normalizadores antes de entrar em `setAppData()`.

Motivo:

- Planilhas podem mudar nomes de colunas.
- A interface precisa receber sempre o mesmo formato.
- Renderizadores não devem conhecer detalhes de planilha.

Regra:

- Normalizadores ficam em `modules/normalizers.js`.
- CSV bruto nunca vai direto para componente visual.
- Cada nova planilha precisa de mapeamento explícito.

## 010 - Dados Herdados Do 1.0 Entram Como Seed Data

Decisão: dados já existentes no PainelURE 1.0 podem entrar no 2.0 como `seedData`, em arquivos próprios dentro de `data/`.

Motivo:

- Permite aproveitar dados reais sem copiar renderização antiga.
- Mantém mock como fallback.
- Evita misturar dados oficiais temporários com componentes visuais.

Regra:

- Seed data deve ter formato final do 2.0.
- Seed data pode ser substituído por fonte oficial depois.
- Nenhum componente deve saber se o dado veio de mock, seed ou planilha.

Primeiro uso:

- `data/contacts.js` com contatos oficiais herdados do PainelURE 1.0.
- `data/schools.js` com a lista mestre de escolas herdada do PainelURE 1.0.

## 011 - Credenciais Nao Ficam No Frontend Publico

Decisao: a versao estatica do PainelURE 2.0 pode indicar que existe credencial restrita, mas nao grava usuario, senha ou segredo real em arquivo JavaScript.

Motivo:

- Arquivo estatico pode ser publicado no GitHub Pages.
- Qualquer pessoa com acesso ao site consegue ler o JS pelo navegador.
- Credenciais reais precisam ficar em fonte privada, backend ou armazenamento protegido.

Regra:

- Cards de rede podem mostrar `Credenciais: restrito`.
- O modelo de dados aceita campo de credenciais, mas a versao publica usa placeholder.
- Quando houver backend/autenticacao, os segredos entram por camada protegida, nunca por `data/*.js` publico.

## 012 - Supervisao Usa Vinculos Oficiais Travados Como Seed

Decisao: enquanto a fonte oficial de visitas/metas nao estiver conectada no 2.0, a lista de supervisores usa os vinculos oficiais travados herdados do PainelURE 1.0.

Motivo:

- Evitar nomes ficticios na tela de supervisao.
- Preservar a distribuicao oficial de escolas por supervisor.
- Permitir que a pagina evolua visualmente antes de puxar visitas e historico.

Regra:

- `data/supervision.js` guarda apenas dados de identificacao e escolas vinculadas.
- Metas e visitas reais continuam sendo responsabilidade da fonte oficial.
- Quando a planilha entrar, ela substitui `seedData.supervisors` via `source-loader`.

## 013 - Planilha De Abril Enriquecer Supervisao

Decisao: a planilha oficial de abril de 2026 entra pelo registro `data/sources.js` e enriquece os supervisores oficiais em vez de criar uma segunda lista.

Motivo:

- O vinculo supervisor-escola continua vindo da base oficial travada.
- A planilha de visitas deve alimentar contadores, metas e pendencias.
- A tela nao deve conhecer formato de CSV nem nomes de colunas.

Regra:

- `modules/csv.js` preserva colunas repetidas usando sufixo numerico.
- `modules/normalizers.js` normaliza a planilha antes de atualizar a app data.
- `modules/source-loader.js` substitui somente `supervisors` quando a fonte `supervision` carrega corretamente.

## 014 - Inventario 2.0 Usa Seed Sanitizado

Decisao: o inventario do 2.0 usa apenas `schoolAssets` sanitizados da base 1.0, sem carregar `schoolImports` nem previews brutos.

Motivo:

- Alguns previews antigos podem conter dados tecnicos sensiveis.
- A pagina de inventario precisa de item, escola, status e observacao, nao do arquivo bruto inteiro.
- Mantem o 2.0 leve e evita expor informacao desnecessaria.

Regra:

- `data/inventory.js` contem somente escola, nome, nome de origem, status e notas do item.
- Dados de credencial ou previews completos nao entram no seed publico.
- Futuras importacoes devem passar por normalizador antes de entrar em `schoolAssets`.

## 015 - Dez Fases Fechadas Como MVP

Decisao: as 10 fases do roadmap foram fechadas como MVP funcional, com pendencias explicitas onde dependem de fonte externa, autenticacao ou publicacao.

Motivo:

- Evitar fingir maturidade onde ainda falta fonte oficial.
- Permitir demonstrar o 2.0 como produto navegavel.
- Separar base pronta de integracoes futuras.

Regra:

- Calendario existe como pagina e modelo, mas fonte oficial segue pendente.
- Perfis existem como matriz, mas ocultacao real depende de autenticacao.
- Qualidade existe como checklist, mas publicacao do 2.0 depende de decisao posterior.

## 016 - Pendencias Fechadas No Limite Do Frontend Estatico

Decisao: backup, perfis e calendario foram completados como funcionalidades locais do MVP; automacao DOCX/PDF permanece fora do frontend.

Motivo:

- Exportar/importar JSON e filtrar perfil local cabem bem em app estatico.
- Calendario pode receber CSV por `sources.js` e normalizador sem depender de backend.
- Processamento DOCX/PDF exige ambiente de arquivo/servidor e nao deve pesar o painel de consulta.

Regra:

- Backup local usa `painelure2_state_v1`.
- Perfil ativo fica em `painelure2_role`.
- Calendario oficial entra por `sources.calendar.url`.
- Automacoes de documento devem virar ferramenta separada ou servico local, nao card pesado dentro do painel.
