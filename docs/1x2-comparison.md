# Comparativo PainelURE 1.0 x 2.0

## Regra

Funcionalidades da 1.0 podem entrar na 2.0, mas a interface precisa seguir a linguagem Finanza:

- cards escuros;
- navegação lateral;
- textos curtos;
- dados normalizados antes do render;
- sem formulários ou blocos administrativos pesados no fluxo principal;
- sem copiar CSS legado.

## Cobertura

| Área da 1.0 | Situação no 2.0 | Observação |
| --- | --- | --- |
| Dashboard | Implementado | Refeito como central de atalhos e métricas. |
| Escolas | Implementado | Cards, detalhe, inventário, redes e supervisor. |
| Dados da escola | Implementado parcial | Detalhe operacional sem formulário legado. |
| Redes e câmeras | Implementado | Consulta por escola, contexto e atalhos. |
| Supervisores | Implementado | Planilha oficial de abril, metas e vínculos. |
| Inventário | Implementado | 107 linhas sanitizadas, agrupamento por escola e tipo. |
| Contatos | Implementado | Categorias novas e cards limpos. |
| Agenda URE | Base criada | Fonte oficial ainda pendente. |
| Técnicos CTC | Implementado MVP | Agenda técnica em cards. |
| Chamados | Implementado MVP | Fila simples de status. |
| Relatórios | Implementado MVP | Indicadores e resumo operacional. |
| Configurações/Admin | Implementado MVP | Diagnóstico e decisões, sem banco/local pesado. |
| Usuários/perfis | Implementado como matriz | Autenticação real pendente. |
| Backup/Supabase/servidor local | Não migrado como função ativa | Mantido fora do MVP para evitar complexidade prematura. |
| Automação DOCX/PDF | Não migrada | Exige fluxo separado, não é essencial ao painel navegável. |

## Funcionalidades Criadas Após Comparação

- Página `Técnicos CTC`.
- Página `Chamados`.
- Página `Relatórios`.
- Página `Admin`.
- Seed `data/operations.js`.
- Renderizadores `renderCtc`, `renderCalls`, `renderReports` e `renderAdmin`.

## Pendências Reais

- Fonte oficial do calendário.
- Autenticação/permissão real por perfil.
- Decisão de publicação da pasta `painelure2`.
- Automação de documentos, se ainda for necessária no 2.0.
