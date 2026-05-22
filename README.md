# PainelURE

Base oficial nova do PainelURE, preparada para substituir o SETECHUB/PainelURE atual sem depender de dados definitivos no navegador.

## Norte do projeto

O Finanza e a referencia principal de usabilidade, ritmo visual, densidade e polimento.

## Status

- Interface estatica pronta para GitHub Pages.
- Backend online-first com Postgres, snapshots, auditoria e protecao contra sobrescrita antiga.
- Migracao do SETECHUB online disponivel por script.
- PINs ficam no backend em `preferences.pin` para administracao.
- Credenciais reais nao sao publicadas no frontend.

## Execucao local

Abra `index.html` no navegador ou sirva a pasta com um servidor estatico.

## Backend local

```powershell
npm start
```

Depois abra:

```text
http://localhost:4173
```

Se a porta estiver ocupada:

```powershell
$env:PORT='4174'; npm start
```

Documentacao principal:

- `docs/backend.md`
- `docs/melhorias-finanza-setechub.md`
- `docs/migracao-setechub.md`
- `docs/passo-a-passo-virada-hoje.md`
- `docs/transicao-oficial.md`
