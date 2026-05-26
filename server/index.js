"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");
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
const SESSIONS_FILE = path.join(STORAGE_DIR, "sessions.json");
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
let frontendSeedStore = null;
const DATA_ACCESS = {
  Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "reports", "profiles", "quality", "admin"],
  "Supervisao": ["dashboard", "schools", "supervision", "contacts", "calendar", "reports"],
  "Tecnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar"],
  SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "reports"],
  SEINTEC: ["dashboard", "schools", "network", "inventory", "contacts", "cars", "reports"],
  CTC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar"],
  Gabinete: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "reports"],
  Dirigente: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "reports"],
  SEOM: ["dashboard", "schools", "contacts", "cars", "calendar", "reports"],
  SEFISC: ["dashboard", "cars", "calendar"],
  SEGRE: ["dashboard", "cars", "calendar"],
  SEVESC: ["dashboard", "cars", "calendar"],
  SEMAT: ["dashboard", "cars", "calendar"],
  SEPES: ["dashboard", "cars", "calendar"],
  SEFREP: ["dashboard", "cars", "calendar"],
  SEAPE: ["dashboard", "cars", "calendar"],
  SEAFIM: ["dashboard", "cars", "calendar"],
  SEFIN: ["dashboard", "cars", "calendar"],
  SECOMSE: ["dashboard", "cars", "calendar"],
  Carros: ["dashboard", "cars", "calendar"],
  Pedagogico: ["dashboard", "schools", "supervision", "contacts", "calendar"],
  Consulta: ["dashboard", "schools", "contacts"]
};
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
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
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

function loadFrontendSeedData() {
  const files = [
    "data/mock.js",
    "data/schools.js",
    "data/school-profiles.js",
    "data/school-operational.js",
    "data/inventory.js",
    "data/supervision.js",
    "data/contacts.js",
    "data/users.js",
    "data/governance.js",
    "data/operations.js"
  ];
  const context = { window: { PainelURE: { seedData: {} } } };
  context.PainelURE = context.window.PainelURE;
  files.forEach(file => {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) return;
    vm.runInNewContext(fs.readFileSync(fullPath, "utf8"), context, { filename: file });
  });
  return context.window.PainelURE.seedData || {};
}

function hasAppData(appData = {}) {
  return Boolean(
    (Array.isArray(appData.schools) && appData.schools.length)
    || (Array.isArray(appData.contacts) && appData.contacts.length)
    || (Array.isArray(appData.schoolAssets) && appData.schoolAssets.length)
    || (appData.networkData && Object.keys(appData.networkData).length)
  );
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function schoolKey(school = {}) {
  return normalizeKey(school.name || school.school || school.nome || "");
}

function staticSchools() {
  return loadFrontendSeedData().schools || [];
}

function hydrateStaticSchools(appData = {}) {
  const fixedSchools = staticSchools();
  if (!fixedSchools.length) return appData || {};
  const incoming = Array.isArray(appData.schools) ? appData.schools : [];
  const incomingByKey = new Map(incoming.map(school => [schoolKey(school), school]));
  const fixedKeys = new Set(fixedSchools.map(schoolKey));
  const mergedFixed = fixedSchools.map(fixed => ({
    ...(incomingByKey.get(schoolKey(fixed)) || {}),
    ...fixed,
    city: fixed.city || fixed.municipio || fixed.cidade || "",
    cie: fixed.cie || fixed.codigoCie || fixed.codigo_cie || fixed.code || fixed.codigo || ""
  }));
  const unknownIncoming = incoming.filter(school => schoolKey(school) && !fixedKeys.has(schoolKey(school)));
  return {
    ...(appData || {}),
    schools: [...mergedFixed, ...unknownIncoming]
  };
}

function pruneStaticAppData(appData = {}) {
  const { schools, ...mutableData } = appData || {};
  return mutableData;
}

function hydrateStore(store) {
  if (!store?.appData) return store;
  return {
    ...store,
    appData: hydrateStaticSchools(store.appData)
  };
}

function frontendSeedStoreData() {
  if (!frontendSeedStore) {
    frontendSeedStore = {
      version: 1,
      source: "frontend-seed",
      updatedAt: null,
      appData: loadFrontendSeedData()
    };
  }
  return frontendSeedStore;
}

async function seedLocalUsersFromFrontend() {
  if (pool || currentUsers().length) return false;
  const seed = loadFrontendSeedData();
  const users = (seed.users || []).map(user => ({
    id: user.id || crypto.randomUUID(),
    username: String(user.username || user.login || user.name || "").trim().toLowerCase(),
    name: String(user.name || user.username || "Usuario").trim(),
    role: String(user.role || "Consulta").trim(),
    contact_id: String(user.contactId || user.contact_id || "").trim(),
    password_hash: hashPassword("1234"),
    avatar: user.avatar || "",
    preferences: { ...(user.preferences || {}), pin: "1234", forcePinChange: true, seededLocal: true }
  })).filter(user => user.username);
  if (!users.length) return false;
  await saveLocalUsers(users);
  return true;
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

function loadLocalSessions() {
  const saved = readJsonFile(SESSIONS_FILE, []);
  if (!Array.isArray(saved)) return;
  const now = Date.now();
  saved.forEach(entry => {
    if (!entry?.token || !entry?.session) return;
    if (now - Number(entry.session.createdAt || 0) > 1000 * 60 * 60 * 24 * 30) return;
    sessions.set(entry.token, entry.session);
  });
}

function saveLocalSessions() {
  if (pool) return;
  const entries = [...sessions.entries()].map(([token, session]) => ({ token, session }));
  writeJsonFile(SESSIONS_FILE, entries);
}

function buildStore(appData, source = "api") {
  return {
    version: 1,
    source,
    updatedAt: new Date().toISOString(),
    appData: pruneStaticAppData(appData)
  };
}

function apiError(statusCode, message, metadata = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.metadata = metadata;
  return error;
}

function assertStoreWriteIsFresh(current, baseUpdatedAt, options = {}) {
  if (options.force) return;
  const currentUpdatedAt = String(current?.updatedAt || "");
  if (!currentUpdatedAt) return;
  if (String(baseUpdatedAt || "") === currentUpdatedAt) return;
  throw apiError(409, "Estado online mais novo encontrado. Recarregue antes de salvar.", {
    code: "STALE_APP_STATE",
    currentUpdatedAt,
    baseUpdatedAt: baseUpdatedAt || ""
  });
}

function saveLocalStore(appData, source = "api") {
  const payload = buildStore(appData, source);
  writeJsonFile(DATA_FILE, payload);
  return payload;
}

function saveFreshLocalStore(appData, source = "api", options = {}) {
  assertStoreWriteIsFresh(currentStore(), options.baseUpdatedAt, options);
  return saveLocalStore(appData, source);
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
  if (!pool || !dbReady) {
    const store = currentStore();
    return hasAppData(store?.appData) ? hydrateStore(store) : frontendSeedStoreData();
  }
  const result = await pool.query("select payload from app_state where id = $1", ["main"]);
  const store = result.rows[0] ? result.rows[0].payload : null;
  return hasAppData(store?.appData) ? hydrateStore(store) : frontendSeedStoreData();
}

async function saveStore(appData, source = "api", options = {}) {
  const payload = buildStore(appData, source);
  if (!pool || !dbReady) return saveFreshLocalStore(appData, source, options);
  const current = await readStore();
  assertStoreWriteIsFresh(current, options.baseUpdatedAt, options);
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

async function listImportRuns(limit = 20) {
  if (!pool || !dbReady) return [];
  const result = await pool.query(
    "select id, source_key, rows_count, status, detail, created_at from import_runs order by created_at desc limit $1",
    [Math.max(1, Math.min(Number(limit) || 20, 100))]
  );
  return result.rows.map(row => ({
    id: row.id,
    sourceKey: row.source_key,
    rowsCount: Number(row.rows_count || 0),
    status: row.status,
    detail: row.detail,
    createdAt: row.created_at.toISOString()
  }));
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
  const preferences = user.preferences || {};
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    contactId: user.contact_id || user.contactId || "",
    avatar: user.avatar || "",
    pin: preferences.pin || "",
    preferences
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

function verifyUserPassword(password, user) {
  const visiblePin = user?.preferences?.pin;
  if (visiblePin) return String(password) === String(visiblePin);
  return verifyPassword(password, user?.password_hash);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isSupervisorRole(role) {
  return normalizeText(role).includes("supervis");
}

function accessForRole(role, appData = {}) {
  const target = normalizeText(role);
  const key = Object.keys(DATA_ACCESS).find(item => normalizeText(item) === target);
  const customAccess = appData?.accessRules?.roleAccess || {};
  if (key && Array.isArray(customAccess[key])) return customAccess[key];
  if (key) return DATA_ACCESS[key];
  if (target.includes("supervis")) return DATA_ACCESS.Supervisao;
  if (target.includes("ctc")) return DATA_ACCESS["Tecnicos CTC"];
  if (target.includes("seintec")) return DATA_ACCESS.SEINTEC;
  if (target.includes("setec")) return DATA_ACCESS.SETEC;
  if (target.includes("gabinete") || target.includes("dirigente")) return DATA_ACCESS.Gabinete;
  if (target.includes("seom")) return DATA_ACCESS.SEOM;
  if (target.includes("sefisc")) return DATA_ACCESS.SEFISC;
  if (target.includes("segre")) return DATA_ACCESS.SEGRE;
  if (target.includes("sevesc")) return DATA_ACCESS.SEVESC;
  if (target.includes("semat")) return DATA_ACCESS.SEMAT;
  if (target.includes("sepes")) return DATA_ACCESS.SEPES;
  if (target.includes("sefrep")) return DATA_ACCESS.SEFREP;
  if (target.includes("seape")) return DATA_ACCESS.SEAPE;
  if (target.includes("seafim") || target.includes("seafin")) return DATA_ACCESS.SEAFIM;
  if (target.includes("sefin")) return DATA_ACCESS.SEFIN;
  if (target.includes("secomse")) return DATA_ACCESS.SECOMSE;
  if (target.includes("carro")) return DATA_ACCESS.Carros;
  if (target.includes("pedag") || target.includes("pec")) return DATA_ACCESS.Pedagogico;
  if (target.includes("admin")) return DATA_ACCESS.Administrador;
  return DATA_ACCESS.Consulta;
}

function canAccessData(page, user = null, appData = {}) {
  return accessForRole(user?.role || "Consulta", appData).includes(page);
}

function canViewCredentials(user = null) {
  const role = normalizeText(user?.role || "Consulta");
  return ["administrador", "tecnicos ctc", "setec", "seintec"].some(item => role.includes(item));
}

const SECTOR_GROUPS = {
  tecnologia: ["seintec", "setec", "ctc", "tecnologia"],
  redeEscolar: ["segre", "sevesc", "semat", "rede escolar", "pedagogico", "pedagogica", "pedagog"],
  recursosHumanos: ["sepes", "sefrep", "seape", "recursos humanos", "rh", "pessoas"],
  financas: ["seafim", "seafin", "sefin", "secomse", "financas", "financeiro", "compras", "pagamento"],
  obras: ["seom", "sefisc", "obras"]
};

function sectorGroup(values = []) {
  const text = values.map(normalizeText).filter(Boolean).join(" ");
  if (!text) return "";
  return Object.entries(SECTOR_GROUPS).find(([, aliases]) => aliases.some(alias => text.includes(alias)))?.[0] || "";
}

function carSectorKeys(values = []) {
  const keys = values.map(normalizeText).filter(Boolean);
  const group = sectorGroup(keys);
  if (group) keys.push(group);
  return [...new Set(keys)];
}

function canViewAllCarBookings(user = null) {
  const role = normalizeText(user?.role || "Consulta");
  const contactRole = normalizeText(user?.contactRole || user?.cargo || user?.position || "");
  const group = sectorGroup([user?.sector, user?.setor, user?.category, user?.categoria, user?.contactRole, user?.contactName]);
  return role.includes("administrador")
    || role.includes("gabinete")
    || role.includes("dirigente")
    || contactRole.includes("dirigente")
    || group === "tecnologia"
    || group === "obras"
    || role.includes("seom")
    || role.includes("setec")
    || role.includes("seintec")
    || role.includes("ctc");
}

function canViewCarBookingDetails(booking = {}, user = null) {
  if (canViewAllCarBookings(user)) return true;
  const userKeys = carSectorKeys([
    user?.role,
    user?.sector,
    user?.setor,
    user?.contactRole,
    user?.category,
    user?.categoria,
    user?.contactName
  ]);
  const bookingKeys = carSectorKeys([
    booking.requester,
    booking.sector,
    booking.setor,
    booking.category,
    booking.categoria,
    booking.owner
  ]);
  return userKeys.some(userKey => bookingKeys.some(bookingKey =>
    bookingKey === userKey || bookingKey.includes(userKey) || userKey.includes(bookingKey)
  ));
}

function publicCarBooking(item = {}) {
  return {
    requestId: item.requestId || item.id || "",
    vehicle: item.vehicle || item.car || item.recurso || "Carro oficial",
    date: item.date || item.value || "",
    time: item.time || item.hora || "",
    returnTime: item.returnTime || item.devolutionTime || item.devolucao || "",
    status: item.status || "reservado",
    restricted: true
  };
}

function supervisorForUser(appData = {}, user = null) {
  if (!user || !isSupervisorRole(user.role)) return null;
  const userKeys = [user.name, user.username, user.contactName, user.supervisorName]
    .map(normalizeText)
    .filter(Boolean);
  return (appData.supervisors || []).find(supervisor => {
    const supervisorKeys = [supervisor.name, supervisor.email, supervisor.login, supervisor.username]
      .map(value => {
        const normalized = normalizeText(value);
        return normalized.includes("@") ? normalized.split("@")[0] : normalized;
      })
      .filter(Boolean);
    return supervisorKeys.some(key => userKeys.includes(key));
  }) || null;
}

function scopeAppDataForUser(appData = {}, user = null) {
  if (!user) return {};
  const supervisorScope = isSupervisorRole(user.role);
  const supervisor = supervisorScope ? supervisorForUser(appData, user) : null;
  const allowed = new Set((supervisor?.assignedSchools || []).map(normalizeText));
  const bySchoolField = (items = [], field = "school") => items.filter(item => allowed.has(normalizeText(item?.[field])));
  const objectBySchool = (source = {}) => Object.fromEntries(
    Object.entries(source).filter(([school]) => allowed.has(normalizeText(school)))
  );
  const schoolScopedItems = (items, field = "school") => supervisorScope ? bySchoolField(items, field) : items;
  const schoolScopedObject = source => supervisorScope ? objectBySchool(source) : source;
  const networkScopedObject = source => {
    const scoped = schoolScopedObject(source || {});
    if (canViewCredentials(user)) return scoped;
    return Object.fromEntries(Object.entries(scoped).map(([school, item]) => {
      const { credentials, ...safeItem } = item || {};
      return [school, safeItem];
    }));
  };
  const schools = supervisorScope
    ? (appData.schools || []).filter(school => allowed.has(normalizeText(school.name)))
    : (appData.schools || []);
  const supervisors = supervisorScope
    ? (supervisor ? [supervisor] : [])
    : (appData.supervisors || []);
  return {
    ...appData,
    schools: canAccessData("schools", user, appData) ? schools : [],
    supervisors: canAccessData("supervision", user, appData) ? supervisors : [],
    networkData: canAccessData("network", user, appData) ? networkScopedObject(appData.networkData || {}) : {},
    schoolInventoryMetrics: canAccessData("inventory", user, appData) ? schoolScopedObject(appData.schoolInventoryMetrics || {}) : {},
    schoolProfiles: canAccessData("schools", user, appData) ? schoolScopedItems(appData.schoolProfiles || []) : [],
    schoolAssets: canAccessData("inventory", user, appData) ? schoolScopedItems(appData.schoolAssets || []) : [],
    inventory: canAccessData("inventory", user, appData) ? schoolScopedItems(appData.inventory || []) : [],
    calls: canAccessData("calls", user, appData) ? schoolScopedItems(appData.calls || []) : [],
    ctcVisits: canAccessData("ctc", user, appData)
      ? (supervisorScope ? (appData.ctcVisits || []).filter(visit => allowed.has(normalizeText(visit.place))) : (appData.ctcVisits || []))
      : [],
    contacts: canAccessData("contacts", user, appData) ? (appData.contacts || []) : [],
    cars: canAccessData("cars", user, appData)
      ? (appData.cars || []).map(item => canViewCarBookingDetails(item, user) ? item : publicCarBooking(item))
      : [],
    calendar: canAccessData("calendar", user, appData) ? (appData.calendar || []) : [],
    reports: canAccessData("reports", user, appData) ? (appData.reports || []) : [],
    profiles: canAccessData("profiles", user, appData) ? (appData.profiles || []) : [],
    quality: canAccessData("quality", user, appData) ? (appData.quality || []) : [],
    users: canAccessData("admin", user, appData) ? (appData.users || []) : [],
    adminChecks: canAccessData("admin", user, appData) ? (appData.adminChecks || []) : []
  };
}

async function scopedStoreForRequest(req) {
  const store = await readStore();
  const session = currentSession(req);
  const user = await currentSessionUser(req)
    || (session ? { role: session.role || "Consulta", name: "Sessao admin" } : null)
    || (!ADMIN_KEY ? { role: "Administrador", name: "Desenvolvimento local" } : null);
  const appData = store?.appData || {};
  return {
    ...(store || { updatedAt: null, source: null }),
    appData: scopeAppDataForUser(appData, user)
  };
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
    if (result.rows[0]) return result.rows[0];
    const users = await pool.query("select * from users order by name");
    const matches = users.rows.filter(user => {
      const firstName = String(user.name || "").trim().split(/\s+/)[0]?.toLowerCase();
      return firstName === cleanUsername || String(user.username || "").toLowerCase().startsWith(`${cleanUsername}.`);
    });
    return matches[0] || null;
  }
  const exact = currentUsers().find(user => user.username === cleanUsername);
  if (exact) return exact;
  const matches = currentUsers().filter(user => {
    const firstName = String(user.name || "").trim().split(/\s+/)[0]?.toLowerCase();
    return firstName === cleanUsername || String(user.username || "").toLowerCase().startsWith(`${cleanUsername}.`);
  });
  return matches[0] || null;
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
  const password = String(input.password || crypto.randomBytes(12).toString("hex"));
  const user = {
    id: crypto.randomUUID(),
    username: String(input.username || "").trim().toLowerCase(),
    name: String(input.name || input.username || "Usuario").trim(),
    role: String(input.role || "Consulta").trim(),
    contact_id: String(input.contactId || input.contact_id || "").trim(),
    password_hash: hashPassword(password),
    avatar: input.avatar || "",
    preferences: {
      ...(input.preferences || {}),
      pin: input.pin || password
    }
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
  if (patch.password) {
    next.password_hash = hashPassword(patch.password);
    next.preferences = {
      ...(next.preferences || {}),
      pin: String(patch.password)
    };
  }
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

async function deleteUser(id) {
  const current = await findUserById(id);
  if (!current) throw new Error("Usuario nao encontrado.");
  for (const [token, session] of sessions.entries()) {
    if (session?.userId === id) sessions.delete(token);
  }
  saveLocalSessions();
  if (pool && dbReady) {
    await pool.query("delete from users where id = $1", [id]);
  } else {
    await saveLocalUsers(currentUsers().filter(user => user.id !== id));
  }
  return publicUser(current);
}

async function ensureBootstrapUser() {
  if (!pool && !ADMIN_USER && !ADMIN_PASSWORD && await seedLocalUsersFromFrontend()) return null;
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
  saveLocalSessions();
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

function setCookieJar(jar, response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : String(response.headers.get("set-cookie") || "").split(/,(?=\s*[^;,=\s]+=[^;,]+)/).filter(Boolean);
  setCookies.forEach(cookie => {
    const pair = String(cookie || "").split(";")[0];
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  });
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function fetchWithCookieJar(url, jar, options = {}, redirectLimit = 8) {
  const response = await fetch(url, {
    ...options,
    redirect: "manual",
    headers: {
      ...(options.headers || {}),
      ...(jar.size ? { Cookie: cookieHeader(jar) } : {})
    }
  });
  setCookieJar(jar, response);
  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location") && redirectLimit > 0) {
    const nextUrl = new URL(response.headers.get("location"), url).toString();
    return fetchWithCookieJar(nextUrl, jar, options, redirectLimit - 1);
  }
  return response;
}

function assertAllowedSharePointUrl(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== "seesp-my.sharepoint.com") {
    throw new Error("Apenas links seesp-my.sharepoint.com sao aceitos.");
  }
  return parsed;
}

function sharePointListApiFromPage(pageUrl, html = "") {
  const parsed = assertAllowedSharePointUrl(pageUrl);
  const contextListUrl = html.match(/"listUrl":"([^"]+)"/)?.[1]?.replace(/\\\//g, "/");
  const direct = parsed.pathname.match(/^(.*)\/Lists\/([^/]+)\/AllItems\.aspx$/i);
  const listPath = contextListUrl || (direct ? `${decodeURIComponent(direct[1])}/Lists/${decodeURIComponent(direct[2])}` : "");
  if (!listPath) throw new Error("Nao foi possivel identificar a lista do SharePoint.");
  const sitePath = listPath.split("/Lists/")[0];
  const escapedListPath = listPath.replace(/'/g, "''");
  const query = new URLSearchParams({ "$top": "5000", "$expand": "FieldValuesAsText" });
  return `${parsed.origin}${sitePath}/_api/web/GetList('${escapedListPath}')/items?${query}`;
}

async function fetchSharePointListRows(sourceUrl) {
  assertAllowedSharePointUrl(sourceUrl);
  const jar = new Map();
  const pageResponse = await fetchWithCookieJar(sourceUrl, jar, {
    headers: { Accept: "text/html,application/xhtml+xml" }
  });
  const pageHtml = await pageResponse.text();
  if (!pageResponse.ok) throw new Error(`SharePoint respondeu ${pageResponse.status} ao abrir o link.`);
  if (/Sign in to your account/i.test(pageHtml)) {
    throw new Error("O link do SharePoint abriu tela de login. Use um link compartilhado anonimo da lista.");
  }
  const apiUrl = sharePointListApiFromPage(pageResponse.url, pageHtml);
  const apiResponse = await fetchWithCookieJar(apiUrl, jar, {
    headers: { Accept: "application/json;odata=nometadata" }
  });
  const text = await apiResponse.text();
  if (!apiResponse.ok) {
    throw new Error(`SharePoint API respondeu ${apiResponse.status}: ${text.slice(0, 180)}`);
  }
  const payload = JSON.parse(text);
  return Array.isArray(payload.value) ? payload.value : [];
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
    return rows.map(row => {
      const eventType = firstValue(row, ["tipo", "type", "categoria"], "");
      const scope = firstValue(row, ["escopo", "scope", "visibilidade"], "");
      return {
        label: firstValue(row, ["titulo", "evento", "label", "nome"], "Evento"),
        value: firstValue(row, ["data", "quando", "date", "value"], "sem data"),
        note: firstValue(row, ["observacao", "descricao", "local", "note"], ""),
        tone: firstValue(row, ["status", "tone"], eventType || "info"),
        type: eventType,
        scope,
        owner: firstValue(row, ["responsavel", "dono", "owner", "usuario", "user"], ""),
        assignee: firstValue(row, ["atribuido", "assignee", "destinatario"], ""),
        contactId: firstValue(row, ["contact_id", "id_contato", "contato_id"], ""),
        ownerId: firstValue(row, ["owner_id", "user_id", "id_usuario", "usuario_id"], ""),
        ownerEmail: firstValue(row, ["owner_email", "email_usuario", "email"], "")
      };
    });
  }
  if (type === "cars") {
    return rows.map(row => {
      const driver = firstValue(row, ["motorista", "driver", "condutor"], "");
      return {
        vehicle: firstValue(row, ["carro", "veiculo", "ve_x00ed_culo", "vehicle", "recurso", "title"], "Carro oficial"),
        date: firstValue(row, ["data", "data_da_reserva", "data_x0020_da_x0020_reserva", "data_reserva", "date", "quando"], ""),
        time: firstValue(row, ["hora", "horario", "horario_da_reserva", "horario_x0020_da_x0020_reserva", "time"], ""),
        returnTime: firstValue(row, ["data_devolucao", "datadevolu_x005f_x00e7_x005f_x005f_x00e3_x005f_o", "data_devolu_x00e7__x00e3_o", "devolucao", "return_time"], ""),
        requester: firstValue(row, ["solicitante", "responsavel", "responsavel_pela_reserva", "requester", "owner", "author", "setor"], ""),
        destination: firstValue(row, ["localexterno", "local_externo", "destino", "local", "destination", "place", "local_destino"], ""),
        driver: /^\d+$/.test(driver) ? "" : driver,
        driverId: /^\d+$/.test(driver) ? driver : "",
        status: firstValue(row, ["status", "situacao", "situa_x00e7__x00e3_o", "tone"], "pendente"),
        note: firstValue(row, ["observacao", "observacoes", "descri_x00e7__x00e3_o", "descricao", "note", "motivo"], "")
      };
    });
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
  saveLocalSessions();
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

function requireAdmin(req, res, message = "Apenas administrador pode executar esta acao.") {
  if (!requireAuth(req, res)) return false;
  if (isAdminRequest(req)) return true;
  send(res, 403, { ok: false, error: message });
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
    "Cache-Control": "no-store"
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
      if (user && verifyUserPassword(password, user)) {
        const preferences = {
          ...(user.preferences || {}),
          lastLoginAt: new Date().toISOString()
        };
        const updatedUser = await updateUser(user.id, { preferences });
        const token = createSession({ ...user, preferences });
        send(res, 200, { ok: true, token, user: updatedUser });
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
    const session = currentSession(req) || (!ADMIN_KEY ? { role: "Administrador", name: "Desenvolvimento local" } : null);
    send(res, 200, { ok: true, user: publicUser(user), session });
    return;
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    deleteSession(req);
    send(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/users") {
    if (!requireAdmin(req, res, "Apenas administrador pode listar usuarios.")) return;
    send(res, 200, { ok: true, users: await listUsers() });
    return;
  }

  if (req.method === "POST" && pathname === "/api/users") {
    if (!requireAdmin(req, res, "Apenas administrador pode criar usuarios.")) return;
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
    if (!requireAdmin(req, res, "Apenas administrador pode editar usuarios.")) return;
    const id = decodeURIComponent(pathname.split("/").pop());
    const body = JSON.parse(await readBody(req) || "{}");
    const user = await updateUser(id, body);
    await audit(req, "update", "user", id, "Usuario atualizado.", { role: user.role });
    send(res, 200, { ok: true, user });
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/users/")) {
    if (!requireAdmin(req, res, "Apenas administrador pode remover usuarios.")) return;
    const id = decodeURIComponent(pathname.split("/").pop());
    const user = await deleteUser(id);
    await audit(req, "delete", "user", id, "Usuario removido.", { role: user.role });
    send(res, 200, { ok: true, user });
    return;
  }

  if (req.method === "GET" && pathname === "/api/sources") {
    send(res, 200, { ok: true, sources: await listOfficialSources() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/sharepoint-list") {
    const sourceUrl = new URL(req.url, `http://${req.headers.host}`).searchParams.get("url") || "";
    const rows = await fetchSharePointListRows(sourceUrl);
    send(res, 200, { ok: true, rows, rowsCount: rows.length });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/sources") {
    if (!requireAdmin(req, res, "Apenas administrador pode alterar fontes.")) return;
    const body = JSON.parse(await readBody(req) || "{}");
    const sources = await saveOfficialSources(body.sources || body);
    await audit(req, "update", "sources", "official", "Fontes oficiais atualizadas.", { count: sources.length });
    send(res, 200, { ok: true, sources });
    return;
  }

  if (req.method === "GET" && pathname === "/api/snapshots") {
    if (!requireAdmin(req, res, "Apenas administrador pode listar snapshots.")) return;
    send(res, 200, { ok: true, snapshots: await listSnapshots(new URL(req.url, `http://${req.headers.host}`).searchParams.get("limit")) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/audit") {
    if (!requireAdmin(req, res, "Apenas administrador pode listar auditoria.")) return;
    send(res, 200, { ok: true, events: await listAuditEvents(new URL(req.url, `http://${req.headers.host}`).searchParams.get("limit")) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/imports") {
    if (!requireAdmin(req, res, "Apenas administrador pode listar importacoes.")) return;
    send(res, 200, { ok: true, imports: await listImportRuns(new URL(req.url, `http://${req.headers.host}`).searchParams.get("limit")) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/data") {
    if (!requireAuth(req, res)) return;
    send(res, 200, { ok: true, data: await scopedStoreForRequest(req), storage: await storeStatus() });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/data") {
    if (!requireAdmin(req, res, "Apenas administrador pode gravar o estado online.")) return;
    const body = JSON.parse(await readBody(req) || "{}");
    const data = await saveStore(body.appData || body, "api", {
      baseUpdatedAt: body.baseUpdatedAt || "",
      force: body.force === true
    });
    await audit(req, "update", "app_state", "main", "Estado do app atualizado.", {});
    send(res, 200, { ok: true, data, storage: await storeStatus() });
    return;
  }

  if (req.method === "POST" && pathname.startsWith("/api/import/")) {
    if (!requireAdmin(req, res, "Apenas administrador pode importar CSV.")) return;
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
      data: await saveStore(appData, `import:${type}`, { force: true }),
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
      send(res, error.statusCode || 500, {
        ok: false,
        error: error.message,
        ...(error.metadata || {})
      });
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
    loadLocalSessions();
    server.listen(PORT, () => {
      const mode = pool && dbReady ? "postgres" : "arquivo-local";
      console.log(`PainelURE 2.0 rodando em http://localhost:${PORT} (${mode})`);
    });
  });
