# Transicao Oficial Do PainelURE

Este roteiro cobre a troca de nomes:

- `Jeffersonf/painelure` atual: SETECHUB/PainelURE em uso hoje.
- `Jeffersonf/painelure2` atual: nova base.
- destino desejado: nova base vira `Jeffersonf/painelure`; antigo vira `Jeffersonf/painelurelegado`.

## Resposta Curta

Status atual: preparado para virada hoje, mas a execucao online depende de `P2_API_URL` e credenciais admin do backend oficial.

Nao deve haver perda de dados se a virada for feita nesta ordem:

1. congelar escrita no SETECHUB atual;
2. rodar a migracao online do SETECHUB para o novo PainelURE;
3. validar usuarios, PINs, escolas, supervisao, inventario, redes, contatos e links;
4. publicar a nova base como `painelure`;
5. renomear o antigo para `painelurelegado`;
6. manter o antigo somente leitura por um periodo de conferencia.

A mudanca grande nao e no codigo em si. A mudanca grande e operacional: URLs, GitHub Pages, Render, variaveis de ambiente e comunicacao aos usuarios.

## O Que Pode Dar Perda

- Alteracoes feitas no SETECHUB depois da migracao e antes do congelamento.
- PIN alterado somente no navegador e nunca sincronizado no Supabase online.
- GitHub Pages apontando para o repositorio errado durante a virada.
- API nova apontando para banco vazio ou diferente.
- Cache antigo do navegador abrindo dados locais velhos.

## Como Evitar

- Rodar `npm run migrate:setechub` antes da virada e guardar o relatorio.
- Rodar `npm run migrate:setechub:online` somente depois que a API nova estiver com Postgres real.
- Rodar `npm run cutover:today` antes da virada publica. Se ele mostrar `BLOQUEIO`, nao trocar GitHub Pages ainda.
- Confirmar `GET /api/health` com `storage.mode = postgres`.
- Conferir no Admin do novo PainelURE a lista de usuarios e PINs.
- Deixar o legado sem botao/fluxo de salvamento ativo ou marcar claramente como historico.
- Orientar usuarios a abrir a URL oficial nova e, se necessario, limpar cache/localStorage antigo.

## Execucao Hoje

No terminal do novo PainelURE:

```powershell
cd C:\Users\jeffe\painelure2
$env:P2_API_URL="https://painelure2-api.onrender.com"
$env:P2_ADMIN_USER="jefferson"
$env:P2_ADMIN_PASSWORD="SENHA_ADMIN"
npm run cutover:today
```

Se o check passar:

```powershell
npm run migrate:setechub:online
```

Depois conferir:

```powershell
Invoke-RestMethod "$env:P2_API_URL/api/health"
```

O esperado e `storage.mode = postgres`.

## Ordem Recomendada No GitHub

1. No repositorio atual `Jeffersonf/painelure`, criar ultimo backup/tag, por exemplo `legacy-before-official-cutover`.
2. Renomear `Jeffersonf/painelure` para `Jeffersonf/painelurelegado`.
3. Renomear `Jeffersonf/painelure2` para `Jeffersonf/painelure`.
4. Conferir GitHub Pages do novo `painelure`.
5. Atualizar remotes locais:

```powershell
git -C C:\Users\jeffe\setechub remote set-url origin https://github.com/Jeffersonf/painelurelegado.git
git -C C:\Users\jeffe\painelure2 remote set-url origin https://github.com/Jeffersonf/painelure.git
```

Opcionalmente, depois da virada local:

```powershell
Rename-Item C:\Users\jeffe\painelure2 painelure
Rename-Item C:\Users\jeffe\setechub painelurelegado
```

## Render/API

Pode manter `painelure2-api.onrender.com` no primeiro momento para reduzir risco. O nome da API nao precisa mudar junto com o GitHub.

Depois que tudo estiver estavel, pode criar ou renomear o servico para `painelure-api` e ajustar:

- `P2_API_URL`
- `CORS_ORIGIN`
- `window.PAINELURE_API_URL`, se usado
- documentacao de deploy

## Checklist Final

- [ ] SETECHUB atual congelado.
- [ ] `npm run cutover:today` passou sem `BLOQUEIO`.
- [ ] `npm run migrate:setechub` passou.
- [ ] Relatorio de migracao salvo.
- [ ] API nova online com Postgres.
- [ ] `npm run migrate:setechub:online` passou.
- [ ] Admin novo mostra usuarios e PINs.
- [ ] PECs sem acesso.
- [ ] GitHub `painelure` antigo renomeado para `painelurelegado`.
- [ ] GitHub `painelure2` renomeado para `painelure`.
- [ ] GitHub Pages abre a nova base.
- [ ] Legado acessivel somente para consulta.
