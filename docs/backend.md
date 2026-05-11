# Backend PainelURE 2.0

Backend inicial sem dependencias externas.

## Rodar

```powershell
npm start
```

URL local:

```text
http://localhost:4173
```

Porta alternativa:

```powershell
$env:PORT='4174'; npm start
```

## Variaveis

```text
PORT=4173
PAINELURE_ADMIN_KEY=uma-chave-local
```

Se `PAINELURE_ADMIN_KEY` nao for definida, escrita fica liberada para desenvolvimento local.

## Endpoints

- `GET /api/health`
- `GET /api/data`
- `PUT /api/data`
- `POST /api/import/:tipo`
- `POST /api/auth/login`

Tipos de importacao iniciais:

- `contacts`
- `calendar`
- `inventory`

Outros tipos aceitam CSV bruto por enquanto e devem ganhar normalizadores no backend conforme a fonte oficial for definida.

## Armazenamento

O backend grava em:

```text
server/storage/app-data.json
```

Esse arquivo nao entra no Git.
