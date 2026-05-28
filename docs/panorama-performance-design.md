# Panorama de performance e design

Atualizado em 28/05/2026.

## Estado geral

O PainelURE está em bom caminho para uso oficial: já tem base online, controle por perfil, fontes oficiais, cache local e telas principais em funcionamento. O cuidado agora é reduzir risco de regressão. Mudanças grandes em CTC, carros, supervisão e permissões precisam entrar em blocos pequenos, sempre com versão de cache nova e validação antes de publicar.

## Performance

Pontos fortes:

- A aplicação já evita bloquear a primeira renderização com `requestIdleCallback` para cargas em segundo plano.
- O login online-first está melhor encaminhado: busca backend antes de abrir dados sensíveis.
- Dados críticos já têm backend e snapshots, o que diminui risco de perda.

Gargalos atuais:

- Muitos scripts e dados entram no carregamento inicial, mesmo quando o usuário só vai usar uma categoria.
- `styles.css` está grande e concentra estilos antigos e novos, o que dificulta manter consistência.
- Algumas renderizações recalculam filtros e listas inteiras ao trocar seleção.
- Fontes externas ainda podem atrasar a sensação de prontidão se várias sincronizações ocorrerem juntas.

Próximas melhorias seguras:

- Carregar dados pesados por categoria: inventário, redes e relatórios só quando a página abrir.
- Separar CSS por áreas principais ou, pelo menos, consolidar blocos duplicados.
- Manter CTC sem paginação nova até validarmos o layout atual em produção.
- Adicionar indicadores discretos de "sincronizando", "online" e "modo local" sem toasts em excesso.

## Design

Pontos fortes:

- A identidade visual está consistente: fundo escuro, acento verde/teal, cards densos e foco operacional.
- Carros, escolas e CTC já caminham para o padrão de painel interno, sem cara de landing page.
- A navegação por categoria e atalhos está clara para uso diário.

Pontos a lapidar:

- Algumas páginas ainda parecem de fases diferentes do projeto, especialmente relatórios, inventário e partes administrativas.
- Tabelas e filtros precisam seguir uma régua única de espaçamento, altura e alinhamento.
- Estados vazios e mensagens de erro precisam ser mais institucionais e menos técnicos.
- Textos devem manter acentuação, pontuação e termos oficiais da URE.

Regra de design daqui para frente:

- Filtros sempre em uma faixa compacta e alinhada.
- Widgets pequenos para resumo; lista/tabela abaixo para detalhe.
- Botões só para ação real; navegação principal fica em sidebar/atalhos.
- Nada de mudança visual grande sem antes comparar com CTC, carros e escolas.

## Permissões

Regra operacional atual:

- Administrador, dirigente, gabinete, SEINTEC, SETEC e CTC têm acesso amplo conforme suas funções.
- Chamados e CTC são tratados como áreas acopladas: quem pode abrir chamados precisa conseguir abrir a CTC, porque a fila de T.I. está dentro dela.
- Dados sensíveis continuam restritos por perfil.

Risco principal:

- Permissões existem no frontend e no backend. Toda alteração de acesso precisa ser feita nos dois lados.

## Critérios antes de publicar

- `npm run check`
- `git diff --check`
- Nova versão em `PAINELURE_BUILD` e nos assets `?v=`
- Teste manual mínimo: login admin, abrir CTC, abrir carros, abrir escolas, trocar mês, usar busca.
