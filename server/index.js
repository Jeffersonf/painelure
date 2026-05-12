"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Pool } = require("pg");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");

function loadEnvFile() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(line => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const index = clean.indexOf("=");
    if (index === -1) return;
    const key = clean.slice(0, index).trim();
    const value = clean.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile();

const STORAGE_DIR = path.join(__dirname, "storage");
const DATA_FILE = path.join(STORAGE_DIR, "app-data.json");
const SOURCES_FILE = path.join(STORAGE_DIR, "sources.json");
const USERS_FILE = path.join(STORAGE_DIR, "users.json");
const PORT = Number(process.env.PORT || 4173);
const ADMIN_KEY = process.env.PAINELURE_ADMIN_KEY || "";
const ADMIN_USER = process.env.PAINELURE_ADMIN_USER || "";
const ADMIN_PASSWORD = process.env.PAINELURE_ADMIN_PASSWORD || "";
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

function currentUsers() {
  return readJsonFile(USERS_FILE, []);
}

function currentSources() {
  return readJsonFile(SOURCES_FILE, {});
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
  await pool.query(`
    create table if not exists users (
      id text primary key,
      username text not null unique,
      name text not null,
      role text not null default 'Consulta',
      contact_id text,
      password_hash text not null,
      avatar text,
      preferences jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query("alter table users add column if not exists contact_id text");
  await pool.query(`
    create table if not exists official_sources (
      key text primary key,
      label text not null,
      type text not null default 'csv',
      url text not null default '',
      status text not null default 'pending',
      metadata jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists import_runs (
      id text primary key,
      source_key text,
      rows_count int not null default 0,
      status text not null default 'ok',
      detail text default '',
      created_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    create table if not exists audit_events (
      id text primary key,
      user_id text references users(id) on delete set null,
      actor_name text default '',
      actor_role text default '',
      action text not null,
      entity text not null,
      entity_id text,
      detail text default '',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await pool.query("create index if not exists idx_snapshots_created_at on app_snapshots(created_at desc)");
  await pool.query("create index if not exists idx_users_role on users(role)");
  await pool.query("create index if not exists idx_import_runs_created_at on import_runs(created_at desc)");
  await pool.query("create index if not exists idx_audit_user_time on audit_events(user_id, created_at desc)");
  await pool.query("create index if not exists idx_audit_entity on audit_events(entity, entity_id)");
  dbReady = true;
  dbError = "";
  await ensureBootstrapUser();
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

async function listSnapshots(limit = 20) {
  if (pool && dbReady) {
    const result = await pool.query(
      "select id, source, created_at from app_snapshots order by created_at desc limit $1",
      [Math.max(1, Math.min(Number(limit) || 20, 100))]
    );
    return result.rows.map(row => ({
      id: row.id,
      source: row.source,
      createdAt: row.created_at.toISOString()
    }));
  }
  const store = currentStore();
  return store ? [{ id: "local-current", source: store.source || "local", createdAt: store.updatedAt }] : [];
}

async function listOfficialSources() {
  if (pool && dbReady) {
    const result = await pool.query("select key, label, type, url, status, metadata, updated_at from official_sources order by key");
    return result.rows.map(row => ({
      key: row.key,
      label: row.label,
      type: row.type,
      url: row.url,
      status: row.status,
      metadata: row.metadata || {},
      updatedAt: row.updated_at.toISOString()
    }));
  }
  return Object.entries(currentSources()).map(([key, source]) => ({ key, ...source }));
}

async function saveOfficialSources(sources) {
  const entries = Object.entries(sources || {}).map(([key, source]) => ({
    key,
    label: String(source.label || key),
    type: String(source.type || "csv"),
    url: String(source.url || ""),
    status: String(source.status || (source.url ? "configured" : "pending")),
    metadata: source.metadata || {}
  }));
  if (pool && dbReady) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const source of entries) {
        await client.query(
          `
            insert into official_sources (key, label, type, url, status, metadata, updated_at)
            values ($1, $2, $3, $4, $5, $6, now())
            on conflict (key)
            do update set label = excluded.label, type = excluded.type, url = excluded.url,
              status = excluded.status, metadata = excluded.metadata, updated_at = now()
          `,
          [source.key, source.label, source.type, source.url, source.status, source.metadata]
        );
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  } else {
    writeJsonFile(SOURCES_FILE, entries.reduce((acc, source) => {
      acc[source.key] = {
        label: source.label,
        type: source.type,
        url: source.url,
        status: source.status,
        metadata: source.metadata
      };
      return acc;
    }, {}));
  }
  return listOfficialSources();
}

async function recordImportRun(sourceKey, rowsCount, status = "ok", detail = "") {
  if (pool && dbReady) {
    await pool.query(
      "insert into import_runs (id, source_key, rows_count, status, detail) values ($1, $2, $3, $4, $5)",
      [crypto.randomUUID(), sourceKey, rowsCount, status, detail]
    );
  }
}

async function audit(req, action, entity, entityId = "", detail = "", metadata = {}) {
  const session = currentSession(req);
  const user = session?.userId ? await findUserById(session.userId) : null;
  const event = {
    id: crypto.randomUUID(),
    user_id: user?.id || null,
    actor_name: user?.name || (session ? "Sessao admin" : ""),
    actor_role: user?.role || session?.role || "",
    action,
    entity,
    entity_id: entityId,
    detail,
    metadata
  };
  if (pool && dbReady) {
    await pool.query(
      `
        insert into audit_events
          (id, user_id, actor_name, actor_role, action, entity, entity_id, detail, metadata)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [event.id, event.user_id, event.actor_name, event.actor_role, action, entity, entityId, detail, metadata]
    );
  }
}

async function listAuditEvents(limit = 50) {
  if (!pool || !dbReady) return [];
  const result = await pool.query(
    "select id, actor_name, actor_role, action, entity, entity_id, detail, metadata, created_at from audit_events order by created_at desc limit $1",
    [Math.max(1, Math.min(Number(limit) || 50, 200))]
  );
  return result.rows.map(row => ({
    id: row.id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    detail: row.detail,
    metadata: row.metadata || {},
    createdAt: row.created_at.toISOString()
  }));
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

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    contactId: user.contact_id || user.contactId || "",
    avatar: user.avatar || "",
    preferences: user.preferences || {}
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [method, salt, hash] = String(storedHash || "").split("$");
  if (method !== "pbkdf2" || !salt || !hash) return false;
  const candidate = hashPassword(password, salt).split("$")[2];
  if (candidate.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

async function countUsers() {
  if (pool && dbReady) {
    const result = await pool.query("select count(*)::int as total from users");
    return result.rows[0].total;
  }
  return currentUsers().length;
}

async function listUsers() {
  if (pool && dbReady) {
    const result = await pool.query("select id, username, name, role, contact_id, avatar, preferences from users order by name");
    return result.rows.map(publicUser);
  }
  return currentUsers().map(publicUser);
}

async function findUserByUsername(username) {
  const cleanUsername = String(username || "").trim().toLowerCase();
  if (!cleanUsername) return null;
  if (pool && dbReady) {
    const result = await pool.query("select * from users where username = $1", [cleanUsername]);
    return result.rows[0] || null;
  }
  return currentUsers().find(user => user.username === cleanUsername) || null;
}

async function findUserById(id) {
  if (!id) return null;
  if (pool && dbReady) {
    const result = await pool.query("select * from users where id = $1", [id]);
    return result.rows[0] || null;
  }
  return currentUsers().find(user => user.id === id) || null;
}

async function saveLocalUsers(users) {
  writeJsonFile(USERS_FILE, users);
  return users;
}

async function createUser(input) {
  const user = {
    id: crypto.randomUUID(),
    username: String(input.username || "").trim().toLowerCase(),
    name: String(input.name || input.username || "Usuario").trim(),
    role: String(input.role || "Consulta").trim(),
    contact_id: String(input.contactId || input.contact_id || "").trim(),
    password_hash: hashPassword(input.password || crypto.randomBytes(12).toString("hex")),
    avatar: input.avatar || "",
    preferences: input.preferences || {}
  };
  if (!user.username) throw new Error("Usuario obrigatorio.");
  if (pool && dbReady) {
    const result = await pool.query(
      `
        insert into users (id, username, name, role, contact_id, password_hash, avatar, preferences)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id, username, name, role, contact_id, avatar, preferences
      `,
      [user.id, user.username, user.name, user.role, user.contact_id, user.password_hash, user.avatar, user.preferences]
    );
    return publicUser(result.rows[0]);
  }
  const users = currentUsers();
  if (users.some(item => item.username === user.username)) throw new Error("Usuario ja existe.");
  users.push(user);
  await saveLocalUsers(users);
  return publicUser(user);
}

async function updateUser(id, patch) {
  const current = await findUserById(id);
  if (!current) throw new Error("Usuario nao encontrado.");
  const next = {
    ...current,
    name: patch.name !== undefined ? String(patch.name).trim() : current.name,
    role: patch.role !== undefined ? String(patch.role).trim() : current.role,
    contact_id: patch.contactId !== undefined ? String(patch.contactId || "").trim() : current.contact_id || "",
    avatar: patch.avatar !== undefined ? String(patch.avatar || "") : current.avatar,
    preferences: patch.preferences !== undefined ? patch.preferences || {} : current.preferences || {}
  };
  if (patch.password) next.password_hash = hashPassword(patch.password);
  if (pool && dbReady) {
    const result = await pool.query(
      `
        update users
        set name = $2, role = $3, contact_id = $4, password_hash = $5, avatar = $6, preferences = $7, updated_at = now()
        where id = $1
        returning id, username, name, role, contact_id, avatar, preferences
      `,
      [id, next.name, next.role, next.contact_id, next.password_hash, next.avatar, next.preferences]
    );
    return publicUser(result.rows[0]);
  }
  const users = currentUsers().map(user => (user.id === id ? next : user));
  await saveLocalUsers(users);
  return publicUser(next);
}

async function ensureBootstrapUser() {
  if (!ADMIN_USER || !ADMIN_PASSWORD) return null;
  if (await countUsers()) return null;
  return createUser({
    username: ADMIN_USER,
    password: ADMIN_PASSWORD,
    name: "Administrador",
    role: "Administrador"
  });
}

function createSession(user = null) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { createdAt: Date.now(), userId: user ? user.id : null, role: user ? user.role : "Administrador" });
  return token;
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

function initialsFromName(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase() || "UR";
}

function numberFrom(row, keys, fallback = 0) {
  const raw = firstValue(row, keys, "");
  if (!raw) return fallback;
  const value = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : fallback;
}

function normalizeRows(type, rows) {
  if (type === "schools") {
    return rows.map(row => {
      const name = firstValue(row, ["escola", "nome", "unidade", "name"], "Escola sem nome");
      return {
        name,
        city: firstValue(row, ["municipio", "cidade", "city"], ""),
        cie: firstValue(row, ["cie", "codigo", "codigo_cie"], ""),
        initials: firstValue(row, ["iniciais", "initials"], initialsFromName(name)),
        fiche: numberFrom(row, ["ficha", "ficha_pct", "percentual"], 0),
        items: numberFrom(row, ["itens", "items", "inventario"], 0),
        status: firstValue(row, ["status"], "ok").toLowerCase().includes("aten") ? "warn" : "ok"
      };
    });
  }
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
  if (type === "network") {
    function pushUnique(target, value) {
      if (value && !target.includes(value)) target.push(value);
    }
    return rows.reduce((acc, row) => {
      const school = firstValue(row, ["escola", "unidade", "nome", "school"], "Escola sem nome");
      const entry = acc[school] || {
        network: [],
        ips: [],
        cameras: [],
        credentials: ["Acesso restrito", "Nao publicado no frontend estatico", "Solicitar ao CTC, SETEC ou SEINTEC"]
      };
      pushUnique(entry.network, firstValue(row, ["rede", "network", "gateway", "wifi"], ""));
      pushUnique(entry.ips, firstValue(row, ["ip", "ips", "cie", "banda"], ""));
      pushUnique(entry.cameras, firstValue(row, ["camera", "cameras", "dvr"], ""));
      acc[school] = entry;
      return acc;
    }, {});
  }
  if (type === "supervision") {
    const stats = new Map();
    rows.forEach(row => {
      const name = firstValue(row, ["nome_do_supervisor", "supervisor", "nome"], "Supervisor");
      const schools = Object.entries(row)
        .filter(([key]) => key.startsWith("escola_visitada") || key.startsWith("escolas_visitadas"))
        .map(([, value]) => String(value || "").trim())
        .filter(Boolean);
      const item = stats.get(name) || { name, visits: 0, schools: new Set() };
      schools.forEach(school => item.schools.add(school));
      item.visits += schools.length || 1;
      stats.set(name, item);
    });
    return [...stats.values()].map(item => {
      const schoolCount = item.schools.size;
      const monthlyGoal = Math.max(3, schoolCount * 3);
      return {
        name: item.name,
        email: "",
        phone: "",
        schools: schoolCount,
        assignedSchools: [...item.schools],
        week: "0/3",
        month: `${item.visits}/${monthlyGoal}`,
        pending: Math.max(0, monthlyGoal - item.visits),
        visits: item.visits,
        visitedSchools: schoolCount,
        source: "Importacao backend"
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

function currentSession(req) {
  const token = bearerToken(req);
  return token ? sessions.get(token) || null : null;
}

function deleteSession(req) {
  const token = bearerToken(req);
  if (token) sessions.delete(token);
}

function isAdminRequest(req) {
  if (!ADMIN_KEY) return true;
  const session = currentSession(req);
  return Boolean(session && session.role === "Administrador");
}

async function currentSessionUser(req) {
  const token = bearerToken(req);
  const session = token ? sessions.get(token) : null;
  if (!session || !session.userId) return null;
  return findUserById(session.userId);
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
  if (req.method === "GET" && (pathname === "/api/health" || pathname === "/health")) {
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
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username && password) {
      const user = await findUserByUsername(username);
      if (user && verifyPassword(password, user.password_hash)) {
        const token = createSession(user);
        send(res, 200, { ok: true, token, user: publicUser(user) });
      } else {
        send(res, 401, { ok: false, error: "Usuario ou senha invalidos." });
      }
    } else if (!ADMIN_KEY || body.key === ADMIN_KEY) {
      const token = createSession({ id: null, role: "Administrador" });
      send(res, 200, { ok: true, token, user: null });
    } else {
      send(res, 401, { ok: false, error: "Chave invalida." });
    }
    return;
  }

  if (req.method === "GET" && pathname === "/api/auth/me") {
    if (!requireAuth(req, res)) return;
    const user = await currentSessionUser(req);
    send(res, 200, { ok: true, user: publicUser(user), session: currentSession(req) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    deleteSession(req);
    send(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/users") {
    if (!requireAuth(req, res)) return;
    send(res, 200, { ok: true, users: await listUsers() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/users") {
    if (!requireAuth(req, res)) return;
    if (!isAdminRequest(req)) {
      send(res, 403, { ok: false, error: "Apenas administrador pode criar usuarios." });
      return;
    }
    const body = JSON.parse(await readBody(req) || "{}");
    send(res, 201, { ok: true, user: await createUser(body) });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/users/me") {
    if (!requireAuth(req, res)) return;
    const user = await currentSessionUser(req);
    if (!user) {
      send(res, 400, { ok: false, error: "Sessao sem usuario vinculado." });
      return;
    }
    const body = JSON.parse(await readBody(req) || "{}");
    send(res, 200, { ok: true, user: await updateUser(user.id, body) });
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/users/")) {
    if (!requireAuth(req, res)) return;
    if (!isAdminRequest(req)) {
      send(res, 403, { ok: false, error: "Apenas administrador pode editar usuarios." });
      return;
    }
    const id = decodeURIComponent(pathname.split("/").pop());
    const body = JSON.parse(await readBody(req) || "{}");
    const user = await updateUser(id, body);
    await audit(req, "update", "user", id, "Usuario atualizado.", { role: user.role });
    send(res, 200, { ok: true, user });
    return;
  }

  if (req.method === "GET" && pathname === "/api/sources") {
    send(res, 200, { ok: true, sources: await listOfficialSources() });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/sources") {
    if (!requireAuth(req, res)) return;
    if (!isAdminRequest(req)) {
      send(res, 403, { ok: false, error: "Apenas administrador pode alterar fontes." });
      return;
    }
    const body = JSON.parse(await readBody(req) || "{}");
    const sources = await saveOfficialSources(body.sources || body);
    await audit(req, "update", "sources", "official", "Fontes oficiais atualizadas.", { count: sources.length });
    send(res, 200, { ok: true, sources });
    return;
  }

  if (req.method === "GET" && pathname === "/api/snapshots") {
    if (!requireAuth(req, res)) return;
    send(res, 200, { ok: true, snapshots: await listSnapshots(new URL(req.url, `http://${req.headers.host}`).searchParams.get("limit")) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/audit") {
    if (!requireAuth(req, res)) return;
    send(res, 200, { ok: true, events: await listAuditEvents(new URL(req.url, `http://${req.headers.host}`).searchParams.get("limit")) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/data") {
    send(res, 200, { ok: true, data: await readStore(), storage: await storeStatus() });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/data") {
    if (!requireAuth(req, res)) return;
    const body = JSON.parse(await readBody(req) || "{}");
    const data = await saveStore(body.appData || body, "api");
    await audit(req, "update", "app_state", "main", "Estado do app atualizado.", {});
    send(res, 200, { ok: true, data, storage: await storeStatus() });
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
    else if (type === "network") appData.networkData = normalized;
    else if (type === "supervision") appData.supervisors = normalized;
    else appData[type] = normalized;
    await recordImportRun(type, rows.length, "ok", `${type} importado`);
    await audit(req, "import", type, type, "CSV importado pelo backend.", { rows: rows.length });
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
  const isApiRoute = url.pathname.startsWith("/api/") || url.pathname === "/health";
  if (req.method === "OPTIONS" && isApiRoute) {
    send(res, 204, "");
    return;
  }
  if (isApiRoute) {
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
  .then(() => ensureBootstrapUser())
  .finally(() => {
    server.listen(PORT, () => {
      const mode = pool && dbReady ? "postgres" : "arquivo-local";
      console.log(`PainelURE 2.0 rodando em http://localhost:${PORT} (${mode})`);
    });
  });
