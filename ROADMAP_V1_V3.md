# Roadmap PainelURE V1 -> V3

Janela de entrega: quarta-feira, 6 de maio de 2026, até sexta-feira, 8 de maio de 2026.

## Objetivo

Chegar na V3 com uma experiência leve, focada e visualmente consistente com a referência Finanza, sem perder a operação real da URE: escolas, supervisores, inventário, agenda/CTC e administração.

## Princípios

- Finanza-first: menos ruído, menos cards simultâneos, hierarquia clara.
- V1 operacional antes de V3 completa: primeiro destravar uso, depois refinar.
- Uma tela, uma intenção principal.
- Detalhe sob demanda: listas grandes, matrizes e formulários só aparecem quando necessários.
- Performance é requisito visual: tela bonita que engasga não passa.
- Admin fora do fluxo diário: importação, edição manual e manutenção ficam escondidas para perfis comuns.

## Definição das Versões

### V1: Base Usável

Meta: app navegável, sem lag perceptível, com a home reduzida e fluxo principal claro.

Escopo:
- Dashboard leve.
- Navegação e permissões estáveis.
- Escolas e ficha escolar úteis.
- Inventário consultável.
- Supervisores acessíveis sem renderizar matriz pesada de cara.
- Admin preservado, mas escondido do fluxo normal.

### V2: Operação Refinada

Meta: telas principais com layout Finanza consistente e menos texto.

Escopo:
- Escolas redesenhada.
- Ficha da escola redesenhada.
- Inventário em formato operacional.
- Supervisores com painel compacto.
- Agenda/CTC simplificada.
- Busca global e atalhos com resposta rápida.

### V3: Entrega de Sexta

Meta: versão apresentável, estável e rápida para uso real.

Escopo:
- Home final V3.
- Design system consolidado.
- Performance medida e aceitável.
- Fluxos por perfil revisados.
- Importações/admin isolados.
- Checklist final de QA.

## Cronograma

### Quarta, 6 de maio de 2026: V1 Estável e Leve

1. Congelar direção visual
   - Manter `styles.css` + `setechub.css` como base Finanza.
   - Usar `setechub-theme.css` apenas como camada corretiva/aditiva.
   - Remover ou isolar experimentos `viewer-core.css` e `viewer-render.js`.

2. Home V1 enxuta
   - Manter no primeiro viewport: hero, 4 KPIs, módulos principais e 1 lista de atenção.
   - Tirar mini calendários, filas longas e blocos duplicados da primeira renderização.
   - Mover detalhes para páginas específicas.

3. Performance inicial
   - Medir tempo de `refreshAll`, `renderCurrentPage`, `renderDashboardHero`, `renderDashboardAccess`, `renderOperationsCenter`.
   - Remover renderizações redundantes.
   - Evitar escrita no `localStorage` durante navegação simples.
   - Desativar blur/animações pesadas no modo V1.

4. Critério de aceite V1
   - Abrir dashboard sem sensação de travamento.
   - Trocar entre Dashboard, Escolas, Inventário e Supervisores sem engasgo forte.
   - Login e permissões funcionando.
   - `npm run check` e `npm test` passando.

### Quinta, 7 de maio de 2026: V2 Design e Fluxo

1. Tela Escolas
   - Lista rápida com filtros claros.
   - Cards menores e mais densos.
   - Status, município, CIE e supervisor visíveis.
   - Sem métricas excessivas por card.

2. Ficha da Escola
   - Hero compacto com nome, município, CIE, status e ações.
   - Blocos: contato, inventário, rede/câmeras, histórico.
   - Detalhes técnicos sob demanda.
   - Ações rápidas sem formulário administrativo para perfil comum.

3. Inventário
   - Formato tabela/lista operacional.
   - Filtros fixos.
   - Limite de renderização e paginação simples.
   - Detalhe por escola/item ao clicar.

4. Supervisores
   - Painel compacto primeiro.
   - Detalhe do supervisor sob demanda.
   - Matriz pesada apenas quando solicitada.

5. Agenda/CTC
   - Agenda como leitura principal.
   - Formulários manuais só para admin.
   - CTC separado por responsável.

6. Critério de aceite V2
   - Todas as telas principais parecem do mesmo produto.
   - Texto reduzido e hierarquia clara.
   - Nenhuma tela renderiza lista grande desnecessária de primeira.

### Sexta, 8 de maio de 2026: V3 Pronta

1. Acabamento visual
   - Revisar espaçamento, cards, botões, chips e tabelas.
   - Remover emojis quebrados/mojibake visíveis.
   - Ajustar mobile.

2. Performance final
   - Medir render por página.
   - Cortar gargalos restantes.
   - Cachear agregações pesadas.
   - Evitar re-render global quando só uma lista mudou.

3. Fluxos por perfil
   - Admin.
   - SEINTEC.
   - CTC.
   - Supervisor.
   - SEOM.
   - Dirigente.
   - PEC.

4. QA final
   - Login.
   - Navegação.
   - Busca.
   - Escola -> ficha.
   - Inventário.
   - Supervisores.
   - Agenda/CTC.
   - Admin/importações.

5. Critério de aceite V3
   - App rápido o suficiente para uso diário.
   - Visual coerente com Finanza.
   - Fluxo comum sem admin poluído.
   - Sem telas quebradas ou texto corrompido no caminho principal.
   - `npm run check` e `npm test` passando.

## Ordem de Implementação

1. Instrumentar performance.
2. Reduzir dashboard.
3. Aplicar shell Finanza limpo.
4. Refatorar Escolas.
5. Refatorar Ficha da Escola.
6. Refatorar Inventário.
7. Refatorar Supervisores.
8. Refatorar Agenda/CTC.
9. Isolar Admin.
10. QA V3.

## Backlog Técnico

- Criar helper de medição simples com `performance.now`.
- Criar `renderDashboardPrimary` e `renderDashboardSecondary`.
- Remover renderizações legadas do dashboard V1.
- Criar classes de layout base: shell, toolbar, list-row, metric-card, detail-panel.
- Substituir blocos grandes por listas limitadas.
- Remover ou arquivar `viewer-core.css` e `viewer-render.js`.
- Revisar cache-bust dos assets a cada entrega.

## Riscos

- Estado local muito grande causa escrita lenta no navegador.
- CSS legado com blur/sombra/animação ainda pode pesar.
- Dashboard tentar ser relatório completo em vez de entrada operacional.
- Alterar muito HTML de uma vez pode quebrar IDs usados pelos scripts.

## Decisão Atual

Fechar V1: dashboard reduzido, navegação principal estável, admin isolado do fluxo comum e performance sem gargalos óbvios de primeira renderização. Depois aplicar o padrão nas telas principais para V2.

## Status V1

- [x] Base visual Finanza restaurada.
- [x] `viewer-core.css` e `viewer-render.js` isolados do HTML principal.
- [x] Escrita no `localStorage` evitada quando o estado não muda.
- [x] Sincronizações online movidas para segundo plano.
- [x] Blurs/animações pesadas desativados no modo V1.
- [x] Dashboard reduzido para hero, KPIs, módulos e uma fila de atenção.
- [x] Calendários, recortes, atalhos secundários e listas longas removidos da primeira renderização do dashboard.
- [x] Log de performance disponível sob demanda via `localStorage.setItem('setechub_perf', '1')`.
- [ ] QA manual final em Dashboard, Escolas, Inventário e Supervisores.

## Status V2

- [x] Modo `app-stage-v2` ativado para aplicar a camada operacional refinada.
- [x] CSS pesado de rolagem reduzido: sombras profundas, blur, animações e transições globais desativados no modo V2.
- [x] `content-visibility:auto` removido das listas principais para evitar saltos perceptíveis durante a rolagem.
- [x] Dashboard mantido curto como entrada operacional, sem calendários e listas longas na primeira tela.
- [x] Escolas convertidas para lista operacional compacta com sinais de supervisor, chamados, inventário e rede.
- [x] Inventário limitado por renderização inicial: grupos por escola e no máximo 12 itens por escola antes do refinamento por filtro.
- [x] Calendário pesado da agenda e matriz semanal pesada de supervisor escondidos da renderização inicial.
- [x] Cache-bust atualizado para `20260506-v2-close-1`.
- [ ] QA manual de sensação de rolagem em 60/120 Hz no navegador real.

## Status V3

- [x] Modo `app-stage-v3` ativado sobre a base V2.
- [x] Emojis mantidos no padrão Finanza, usando entidades estáveis para evitar mojibake.
- [x] Textos quebrados visíveis no HTML principal removidos.
- [x] Navegação, cards de módulo e estados vazios receberam polimento final.
- [x] Mobile reforçado para evitar textos espremidos em cards, botões e grids.
- [x] Cache-bust atualizado para `20260506-v3-final-1`.
- [x] `npm run check` passando.
- [x] `npm test` passando.
- [ ] QA manual final no navegador real: Dashboard, Escolas, Ficha, Inventário, Supervisores, Agenda/CTC e Admin.
