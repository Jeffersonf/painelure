"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Pool } = require("pg");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const STORAGE_DIR = path.join(__dirname, "storage");
const DATA_FILE = path.join(STORAGE_DIR, "app-data.json");
const PORT = Number(process.env.PORT || 4173);
const ADMIN_KEY = process.env.PAINELURE_ADMIN_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const PGSSL = process.env.PGSSL || "true";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
const sessions = new Map();
let dbReady = false;
let dbError = "";
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: PGSSL === "false" ? false : { rejectUnauthorized: false }
    })
  : null;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function ensureStorage() {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(CORS_ORIGIN
      ? {
          "Access-Control-Allow-Origin": CORS_ORIGIN,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS"
        }
      : {}),
    ...headers
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 8 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function readJsonFile(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJsonFile(file, data) {
  ensureStorage();
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function currentStore() {
  return readJsonFile(DATA_FILE, null);
}

function buildStore(appData, source = "api") {
  return {
    version: 1,
    source,
    updatedAt: new Date().toISOString(),
    appData
  };
}

function saveLocalStore(appData, source = "api") {
  const payload = {
    version: 1,
    source,
    updatedAt: new Date().toISOString(),
    appData
  };
  writeJsonFile(DATA_FILE, payload);
  return payload;
}

async function initDatabase() {
  if (!pool) return false;
  await pool.query(`
    create table if not exists app_state (
      id text primary key,
      payload jsonb not null,
      source text not null default 'api',
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists app_snapshots (
      id text primary key,
      payload jsonb not null,
      source text not null default 'api',
      created_at timestamptz not null default now()
    )
  `);
  dbReady = true;
  dbError = "";
  return true;
}

async function readStore() {
  if (!pool || !dbReady) return currentStore();
  const result = await pool.query("select payload from app_state where id = $1", ["main"]);
  return result.rows[0] ? result.rows[0].payload : null;
}

async function saveStore(appData, source = "api") {
  const payload = buildStore(appData, source);
  if (!pool || !dbReady) return saveLocalStore(appData, source);
  await pool.query(
    `
      insert into app_state (id, payload, source, updated_at)
      values ($1, $2, $3, now())
      on conflict (id)
      do update set payload = excluded.payload, source = excluded.source, updated_at = now()
    `,
    ["main", payload, source]
  );
  await pool.query(
    "insert into app_snapshots (id, payload, source) values ($1, $2, $3)",
    [crypto.randomUUID(), payload, source]
  );
  return payload;
}

async function storeStatus() {
  if (!pool) {
    const store = currentStore();
    return {
      mode: "arquivo-local",
      ready: true,
      updatedAt: store ? store.updatedAt : null,
      source: store ? store.source : null,
      error: null
    };
  }
  if (!dbReady) {
    return {
      mode: "postgres",
      ready: false,
      updatedAt: null,
      source: null,
      error: dbError || "Banco ainda nao inicializado."
    };
  }
  const result = await pool.query("select source, updated_at from app_state where id = $1", ["main"]);
  const row = result.rows[0];
  return {
    mode: "postgres",
    ready: true,
    updatedAt: row ? row.updated_at.toISOString() : null,
    source: row ? row.source : null,
    error: null
  };
}

function normalizeHeader(header) {
  return String(header || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseCsv(text) {
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const first = lines[0];
  const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
  const counts = {};
  const headers = parseCsvLine(first, delimiter).map(header => {
    const base = normalizeHeader(header) || "col";
    counts[base] = (counts[base] || 0) + 1;
    return counts[base] === 1 ? base : `${base}_${counts[base]}`;
  });
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line, delimiter);
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] || "";
      return row;
    }, {});
  });
}

function firstValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (row[key] !== undefined && String(row[key]).trim()) return String(row[key]).trim();
  }
  return fallback;
}

function normalizeRows(type, rows) {
  if (type === "contacts") {
    return rows.map(row => ({
      name: firstValue(row, ["nome", "name", "contato", "responsavel"], "Sem nome"),
      role: firstValue(row, ["cargo", "funcao", "role", "descricao"], "Contato"),
      sector: firstValue(row, ["setor", "categoria", "departamento", "area"], "Tecnologia"),
      email: firstValue(row, ["email", "e_mail", "mail"], ""),
      phone: firstValue(row, ["ramal", "telefone", "whatsapp", "celular"], "")
    }));
  }
  if (type === "calendar") {
    return rows.map(row => ({
      label: firstValue(row, ["titulo", "evento", "label", "nome"], "Evento"),
      value: firstValue(row, ["data", "quando", "date", "value"], "sem data"),
      note: firstValue(row, ["observacao", "descricao", "local", "note"], ""),
      tone: firstValue(row, ["status", "tipo", "tone"], "info")
    }));
  }
  if (type === "inventory") {
    return rows.map(row => {
      const status = firstValue(row, ["status", "situacao", "estado"], "ok").toLowerCase();
      return {
        school: firstValue(row, ["escola", "school", "unidade"], "Escola sem nome"),
        name: firstValue(row, ["tipo", "equipamento", "item", "nome"], "Item"),
        sourceName: firstValue(row, ["nome_original", "descricao", "patrimonio", "modelo"], ""),
        notes: firstValue(row, ["observacao", "observacoes", "nota", "quantidade", "qtd"], ""),
        status: status.includes("defeito") ? "defeito" : status.includes("manut") ? "manutencao" : "ok"
      };
    });
  }
  return rows;
}

function bearerToken(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function isAuthorized(req) {
  if (!ADMIN_KEY) return true;
  const token = bearerToken(req);
  return token && sessions.has(token);
}

function requireAuth(req, res) {
  if (isAuthorized(req)) return true;
  send(res, 401, { ok: false, error: "Nao autorizado." });
  return false;
}

function safeStaticPath(urlPath) {
  const requested = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const file = path.resolve(ROOT, `.${requested}`);
  if (!file.startsWith(ROOT)) return null;
  return file;
}

function serveStatic(req, res, urlPath) {
  const file = safeStaticPath(urlPath);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    send(res, 404, "Nao encontrado.");
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=120"
  });
  fs.createReadStream(file).pipe(res);
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    send(res, 200, {
      ok: true,
      name: "PainelURE API",
      time: new Date().toISOString(),
      storage: await storeStatus()
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = JSON.parse(await readBody(req) || "{}");
    if (!ADMIN_KEY || body.key === ADMIN_KEY) {
      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { createdAt: Date.now() });
      send(res, 200, { ok: true, token });
    } else {
      send(res, 401, { ok: false, error: "Chave invalida." });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/data") {
    send(res, 200, { ok: true, data: await readStore(), storage: await storeStatus() });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/data") {
    if (!requireAuth(req, res)) return;
    const body = JSON.parse(await readBody(req) || "{}");
    send(res, 200, { ok: true, data: await saveStore(body.appData || body, "api"), storage: await storeStatus() });
    return;
  }

  if (req.method === "POST" && pathname.startsWith("/api/import/")) {
    if (!requireAuth(req, res)) return;
    const type = pathname.split("/").pop();
    const rows = parseCsv(await readBody(req));
    const normalized = normalizeRows(type, rows);
    const store = await readStore() || { appData: {} };
    const appData = { ...(store.appData || {}) };
    if (type === "inventory") appData.schoolAssets = normalized;
    else appData[type] = normalized;
    send(res, 200, {
      ok: true,
      rows: rows.length,
      data: await saveStore(appData, `import:${type}`),
      storage: await storeStatus()
    });
    return;
  }

  send(res, 404, { ok: false, error: "Endpoint nao encontrado." });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    send(res, 204, "");
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url.pathname).catch(error => {
      send(res, 500, { ok: false, error: error.message });
    });
    return;
  }
  serveStatic(req, res, url.pathname);
});

initDatabase()
  .catch(error => {
    dbReady = false;
    dbError = error.message;
    console.warn(`Banco online indisponivel: ${error.message}`);
  })
  .finally(() => {
    server.listen(PORT, () => {
      const mode = pool && dbReady ? "postgres" : "arquivo-local";
      console.log(`PainelURE 2.0 rodando em http://localhost:${PORT} (${mode})`);
    });
  });
