# Checklist - PainelURE 2.0

Objetivo: deixar claro o que ainda falta para a v2 herdar o que importa da v1 sem perder o padrao visual e de usabilidade do Finanza.

## Prioridade 0 - Regra Geral

- [ ] Nao empilhar CSS novo por cima de CSS antigo.
- [ ] Nao copiar tela da v1 sem redesenhar no padrao Finanza.
- [ ] Toda pagina precisa abrir com uma decisao clara antes da lista.
- [ ] Toda lista grande precisa parecer leve, densa e escaneavel.
- [ ] Toda funcionalidade herdada da v1 precisa respeitar escopo por perfil.
- [ ] `npm run check` precisa passar antes de cada push.

## Pendencias Da V1 Que Ainda Nao Estao Boas Na V2

### Agenda

- [x] Criar agenda com calendario visual, nao apenas cards.
- [x] Separar calendario compartilhado da URE.
- [x] Criar calendario pessoal por usuario/perfil.
- [x] Permitir alternar entre agenda geral e agenda pessoal sem confundir o usuario.
- [ ] Definir fonte oficial do calendario em `data/sources.js`.
- [x] Garantir que eventos pessoais respeitem login e escopo.

### Supervisao

- [x] Refazer painel do supervisor para ficar equivalente ao valor operacional da v1.
- [x] Supervisor deve ver somente suas escolas, seus indicadores e seus registros.
- [x] Tela de supervisores precisa ficar mais proxima da v1 em utilidade, mas com visual Finanza.
- [x] Detalhe do supervisor precisa destacar meta semanal, meta mensal, escolas vinculadas, pendencias e avisos de dado errado/faltando.
- [x] Validar que busca global nao mostra outro supervisor para perfil Supervisao.
- [x] Validar que links internos nao abrem escola fora da carteira do supervisor.

### Tecnicos CTC

- [ ] Reavaliar tela CTC da v1 e listar o que ela fazia melhor.
- [ ] Criar visao CTC mais completa que a atual da v2.
- [ ] Mostrar agenda tecnica de forma mais util que cards soltos.
- [ ] Ligar visitas CTC a escola, inventario, redes e chamados.
- [ ] Criar filtros realmente operacionais: tecnico, escola, periodo, tipo de demanda e status.

### Escolas

- [x] Reformular primeira camada visual da tela de escolas, que ainda estava crua.
- [x] Melhorar cards de escola para parecerem produto Finanza, nao cadastro tecnico.
- [x] Separar melhor: ficha, inventario, supervisao, rede e chamados.
- [x] Reduzir texto secundario nos cards.
- [x] Criar estados visuais claros: ok, atencao, pendente, critico.
- [ ] Detalhe da escola precisa virar a principal pagina operacional da unidade.

### Inventario

- [x] Reformular primeira camada da tela de inventario, que ainda estava ruim visualmente.
- [ ] Melhorar seletor de escola e filtros.
- [x] Transformar categorias em blocos mais legiveis.
- [x] Separar resumo, alertas e lista de itens.
- [x] Destacar manutencao/defeito sem poluir a tela inteira.
- [x] Criar topo operacional com escola, prioridades, itens OK e categorias.
- [ ] Validar origem dos dados e normalizacao antes de crescer a interface.

## Proximo Foco Visual

- [x] QA visual fino em `school-card`.
- [x] QA visual fino em `contact-card`.
- [x] QA visual fino em `detail-widget`.
- [x] QA visual fino em `supervisor-row`.
- [x] Ajustar escala, espacamento, hierarquia e densidade desses componentes.
- [ ] Remover qualquer variacao que pareca fora do padrao Finanza.

## Fluxos Principais Para Testar

- [ ] Login com administrador.
- [ ] Login com supervisor usando primeiro nome e PIN.
- [ ] Troca obrigatoria de PIN inicial.
- [ ] Logoff.
- [ ] Restauracao de sessao.
- [ ] Navegar por todas as paginas do menu lateral.
- [ ] Testar busca global.
- [ ] Abrir escola pela busca.
- [ ] Abrir supervisor pela busca.
- [ ] Abrir contato pela busca.
- [ ] Abrir uma escola e navegar para redes, inventario e supervisor.
- [ ] Abrir supervisor e navegar para escola vinculada.
- [ ] Trocar perfil no Admin e confirmar escopo visual.

## Perfis E Escopo

- [x] Administrador ve base completa.
- [x] Supervisor ve apenas propria carteira.
- [x] Supervisor nao ve outro supervisor.
- [x] Supervisor nao abre escola fora da carteira.
- [x] SETEC/SEINTEC/CTC ve dados tecnicos liberados.
- [x] Gabinete nao recebe credenciais tecnicas.
- [x] Consulta ve apenas escolas e contatos.
- [x] Backend `/api/data` devolve payload recortado por perfil.
- [x] Busca global respeita o mesmo escopo.

## Dados Esperados

- [ ] Escolas: 21.
- [ ] Supervisores: 6.
- [ ] Inventario: 107 linhas ou valor oficial atualizado.
- [ ] Contatos: validar total atual da base.
- [ ] Redes e cameras: validar total de escolas mapeadas.
- [ ] Calendario: pendente de fonte oficial.

## Criterios De Aceite Visual

- [ ] A tela parece parte do Finanza em ate 3 segundos.
- [ ] Nao ha card grande sem funcao clara.
- [ ] Nao ha texto explicativo sobrando dentro da interface.
- [ ] Pills sao pequenas, alinhadas e uteis.
- [ ] Cards nao parecem empilhados ou remendados.
- [ ] Hover e foco sao discretos.
- [ ] Tema claro funciona sem quebrar contraste.
- [ ] Refresh nao mostra fonte/layout estranho por tempo perceptivel.
- [ ] Mobile nao quebra botoes, cards ou textos.

## Criterios De Aceite Tecnico

- [ ] `npm run check` passa.
- [ ] Nenhum erro no console ao navegar pelas paginas principais.
- [ ] Nao ha arquivo da v1 alterado por engano.
- [ ] Changelog do `ROADMAP.md` atualizado.
- [ ] `docs/fundamentos-audit.md` atualizado quando a mudanca mexer em fundamentos.
- [ ] Commit pequeno e com mensagem clara.
- [ ] Push em `main` depois de validar.
