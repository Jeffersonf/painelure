# Matriz de paridade do novo app

Esta matriz é o checklist de migração do site para o Android. `Base` significa leitura já disponível pela API; `Próximo` exige tela/fluxo tipado; `Completo` só será marcado após teste com o perfil correspondente.

| Módulo | API/backend | App | Escrita | Critério de aceite |
|---|---|---|---|---|
| Login e sessão | Base | Base | Sim | login, logout, sessão expirada e troca de PIN |
| Dashboard | Base | Base | Não | métricas e atalhos carregam com cache |
| Escolas | Base | Implementado | Sim | lista, busca, cidade, detalhe e cadastro |
| Redes | Base | Implementado | Não | status por escola e credenciais protegidas |
| Inventário | Base | Implementado | Sim | filtros, detalhe, operação e triagem |
| Supervisão | Base | Implementado | Sim | supervisor, escolas, visitas e justificativas |
| Contatos | Base | Implementado | Não | busca, setor, telefone e e-mail |
| Chamados/CTC | Base | Implementado | Sim | listar, detalhe e registrar operação/visita |
| Carros | Base | Implementado | Sim | consultar, filtrar e reservar |
| Agenda/Redes 2026 | Base | Implementado | Sim | calendário, filtros, detalhes e atualização |
| Satisfação | Base | Implementado | Não | respostas e indicadores restritos |
| Relatórios/BI | Base | Implementado | Não | indicadores, filtros e exportação CSV |
| Administração | Base | Implementado | Sim | usuários, permissões, fontes, backup e auditoria |

## Regra de conclusão

Nenhum módulo é considerado migrado apenas por aparecer na tela. Ele precisa ter dados da API, escopo de acesso equivalente ao site, estado vazio/erro/offline e teste de aceite por perfil.

## Estado atual do Android

O catálogo Android representa os 18 módulos do site em telas nativas Compose. As operações usam as rotas móveis do backend, com fila offline para gravações, cache, escopo por perfil e exportação CSV nativa em Relatórios/BI. A aceitação final de cada item ainda exige execução com dados reais e um aparelho Android autorizado no ADB.
