# QA Checklist - PainelURE 2.0 MVP

## Fluxos principais

- Abrir `index.html`.
- Confirmar que o painel inicia sem erro visual.
- Navegar por todas as páginas do menu lateral.
- Testar busca com `Ctrl+K`.
- Abrir uma escola e conferir o detalhe.
- Na escola, abrir redes, inventário e supervisor.
- Em redes, voltar para escola e supervisor.
- Em supervisão, abrir uma escola vinculada.
- Em inventário, trocar escola no seletor.

## Perfis

- Em Admin, trocar perfil ativo.
- Confirmar que o menu muda conforme o perfil.
- Tentar abrir uma página bloqueada pelo hash, por exemplo `#admin`, usando perfil Consulta.
- Confirmar retorno para `#dashboard`.

## Backup

- Clicar em `Salvar local`.
- Exportar backup JSON.
- Importar o JSON exportado.
- Confirmar que a interface continua navegável.

## Dados esperados

- Escolas: 21.
- Inventário: 107 linhas.
- Supervisores: 6.
- Contatos: 41.
- Perfis: 8.

## Pontos de atenção antes de publicar

- Calendário oficial ainda depende de URL em `data/sources.js`.
- Autenticação real exige backend ou camada privada.
- Automação DOCX/PDF deve ficar em ferramenta externa.
- 2.0 ainda está fora do repositório oficial por decisão.
