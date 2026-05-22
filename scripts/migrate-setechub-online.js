"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SETECHUB_DIR = "C:/Users/jeffe/setechub";
const STORAGE_DIR = path.join(ROOT, "server", "storage");
const APP_DATA_FILE = path.join(STORAGE_DIR, "app-data.json");
const USERS_FILE = path.join(STORAGE_DIR, "users.json");
const SOURCES_FILE = path.join(STORAGE_DIR, "sources.json");
const REPORT_FILE = path.join(STORAGE_DIR, "setechub-migration-report.json");

const RELATIONAL_TABLES = [
  ["users", "setechub_users"],
  ["municipalities", "setechub_municipalities"],
  ["sectors", "setechub_sectors"],
  ["directoryContacts", "setechub_directory_contacts"],
  ["officialLinks", "setechub_official_links"],
  ["checklist", "setechub_checklist_items"],
  ["tasks", "setechub_tasks"],
  ["calls", "setechub_calls"],
  ["schools", "setechub_schools"],
  ["supervisors", "setechub_supervisors"],
  ["supervisorVisits", "setechub_supervisor_visits"],
  ["schoolProfiles", "setechub_school_profiles"],
  ["schoolImports", "setechub_school_imports"],
  ["schoolAssets", "setechub_school_assets"],
  ["schoolNetworks", "setechub_school_networks"],
  ["assets", "setechub_assets"],
  ["notes", "setechub_notes"]
];

function arg(name) {
  const exact = process.argv.find(item => item === `--${name}`);
  if (exact) return "true";
  const prefix = `--${name}=`;
  return process.argv.find(item => item.startsWith(prefix))?.slice(prefix.length) || "";
}

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function backupFile(file) {
  if (!fs.existsSync(file)) return "";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = file.replace(/\.json$/i, `.${stamp}.bak.json`);
  fs.copyFileSync(file, backup);
  return backup;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return normalize(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}

function personKey(value) {
  const parts = normalize(value).split(/\s+/).filter(part => part && !["de", "da", "do", "das", "dos"].includes(part));
  return parts.length ? `${parts[0]} ${parts[parts.length - 1]}` : "";
}

function isPecUser(user) {
  return normalize(`${user?.role || ""} ${user?.area || ""} ${user?.id || ""}`).includes("pec");
}

function isSupervisorRole(role) {
  const key = normalize(role);
  return key.includes("supervisor") || key.includes("supervisao");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

function setechubConfig() {
  const configuredUrl = env("SETECHUB_SUPABASE_URL");
  const configuredAnon = env("SETECHUB_SUPABASE_ANON_KEY");
  if (configuredUrl && configuredAnon) return { url: configuredUrl.replace(/\/+$/, ""), anonKey: configuredAnon };

  const source = fs.readFileSync(path.join(env("SETECHUB_DIR", DEFAULT_SETECHUB_DIR), "frontend", "storage.js"), "utf8");
  const url = source.match(/url:\s*'([^']+)'/)?.[1];
  const anonKey = source.match(/anonKey:\s*'([^']+)'/)?.[1];
  if (!url || !anonKey) throw new Error("Config do Supabase do SETECHUB nao encontrada.");
  return { url: url.replace(/\/+$/, ""), anonKey };
}

async function supabaseRequest(config, pathname) {
  const response = await fetch(`${config.url}/rest/v1/${pathname}`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${text}`);
  return payload;
}

async function loadSetechubState() {
  const config = setechubConfig();
  const appRows = await supabaseRequest(config, "app_state?select=state,updated_at&id=eq.setechub_state&limit=1");
  const baseState = appRows?.[0]?.state && typeof appRows[0].state === "object" ? appRows[0].state : {};
  const state = { ...baseState };
  let relationalRowCount = 0;

  for (const [key, table] of RELATIONAL_TABLES) {
    const rows = await supabaseRequest(config, `${table}?select=id,payload&order=id.asc`);
    if (Array.isArray(rows) && rows.length) {
      relationalRowCount += rows.length;
      state[key] = rows.map(row => row.payload).filter(Boolean);
    }
  }

  const settingsRows = await supabaseRequest(config, "setechub_settings?select=id,payload&order=id.asc");
  if (Array.isArray(settingsRows) && settingsRows.length) {
    relationalRowCount += settingsRows.length;
    const settings = Object.fromEntries(settingsRows.map(row => [row.id, row.payload || {}]));
    Object.assign(state, {
      profile: settings.profile || state.profile,
      officialContacts: settings.officialContacts || state.officialContacts,
      histories: settings.histories || state.histories,
      ponto: settings.ponto || state.ponto,
      redes: settings.redes || state.redes,
      ...(settings.metadata || {})
    });
  }

  return {
    state,
    setechubUpdatedAt: appRows?.[0]?.updated_at || "",
    relationalRowCount
  };
}

function roleToPainel(role) {
  const key = normalize(role);
  if (key.includes("admin")) return "Administrador";
  if (key.includes("dirigente") || key.includes("gabinete")) return "Gabinete";
  if (key.includes("seintec")) return "SEINTEC";
  if (key.includes("seom")) return "SEOM";
  if (key.includes("ctc")) return "Técnicos CTC";
  if (key.includes("supervisor")) return "Supervisão";
  return "Consulta";
}

function contactId(contact) {
  return contact.id || `contact-${slug([contact.name, contact.role, contact.email].filter(Boolean).join("-"))}`;
}

function mapContact(contact = {}) {
  return {
    id: contactId(contact),
    name: contact.name || contact.label || "Contato",
    role: contact.role || contact.title || "Contato",
    sector: contact.sector || contact.ref || contact.area || "",
    email: contact.email || contact.sectorEmail || "",
    phone: contact.phone || contact.ramal || contact.whatsapp || "",
    photo: contact.photo || "",
    sourceUrl: contact.sourceUrl || ""
  };
}

function mapUsers(state, contacts) {
  const contactsByName = new Map(contacts.map(contact => [normalize(contact.name), contact]));
  return (state.users || [])
    .filter(user => user && !isPecUser(user) && user.active !== false)
    .map(user => {
      const pin = String(user.pin || "1234").trim() || "1234";
      const contact = contactsByName.get(normalize(user.name)) || null;
      return {
        id: user.id || `user-${slug(user.login || user.name)}`,
        username: String(user.login || user.username || user.name || "").trim().toLowerCase(),
        name: String(user.name || user.login || "Usuario").trim(),
        role: roleToPainel(user.role),
        contactId: contact?.id || "",
        avatar: user.photo || user.avatar || "",
        pin,
        preferences: {
          pin,
          setechubRole: user.role || "",
          supervisorName: user.supervisorName || "",
          migratedFromSetechubAt: new Date().toISOString(),
          forcePinChange: pin === "1234"
        }
      };
    })
    .filter(user => user.username);
}

function mapNetworkData(state) {
  if (state.networkData && typeof state.networkData === "object" && Object.keys(state.networkData).length) {
    return state.networkData;
  }
  return (state.schoolNetworks || []).reduce((acc, item = {}) => {
    const school = item.school || item.name || item.label;
    if (!school) return acc;
    acc[school] = {
      network: [
        item.adminNetwork && `Rede administrativa ${item.adminNetwork}`,
        item.pedNetwork && `Rede pedagógica ${item.pedNetwork}`,
        item.secretaryNetwork && `Secretaria ${item.secretaryNetwork}`,
        item.wifi && `Wi-Fi ${item.wifi}`
      ].filter(Boolean),
      ips: [
        item.cie && `CIE ${item.cie}`,
        item.gateway && `Gateway ${item.gateway}`,
        item.bandwidth && `Banda ${item.bandwidth}`,
        item.technician && `Técnico ${item.technician}`
      ].filter(Boolean),
      cameras: [
        item.cameras,
        item.dvr,
        item.cameraStatus
      ].filter(Boolean),
      credentials: [
        item.credentials,
        item.adminPassword,
        item.wifiPassword
      ].filter(Boolean)
    };
    return acc;
  }, {});
}

function taskToCalendar(task = {}) {
  return {
    id: task.id,
    label: task.title || task.text || task.label || "Evento",
    value: task.date || task.when || task.due || "",
    note: task.notes || task.description || task.place || "",
    type: task.category || task.scope || "",
    scope: task.scope || "",
    owner: task.owner || task.createdBy || "",
    ownerId: task.ownerId || "",
    contactId: task.contactId || ""
  };
}

function buildSources(state) {
  const sources = {
    ...loadDefaultSources(),
    ...readJsonFile(SOURCES_FILE, {})
  };
  const links = state.officialLinks || [];
  const car = links.find(link => normalize(`${link.category} ${link.label}`).includes("car"));
  const supervision = links.find(link => link.category === "supervisor-sheet" && link.url) || links.find(link => normalize(link.label).includes("supervisor") && link.url);
  return {
    ...sources,
    ...(car?.url ? {
      cars: {
        ...(sources.cars || {}),
        label: car.label || "Agendamento de carros",
        type: car.sourceType || "sharepoint-list",
        url: car.url,
        status: "official",
        metadata: { ...(sources.cars?.metadata || {}), migratedFromSetechub: true }
      }
    } : {}),
    ...(supervision?.url ? {
      supervision: {
        ...(sources.supervision || {}),
        label: supervision.label || "Supervisao",
        type: "csv",
        url: supervision.url,
        status: "official",
        monthKey: supervision.monthKey || sources.supervision?.monthKey,
        metadata: {
          ...(sources.supervision?.metadata || {}),
          migratedFromSetechub: true,
          monthKey: supervision.monthKey || sources.supervision?.metadata?.monthKey,
          panelGid: supervision.panelGid || sources.supervision?.metadata?.panelGid
        }
      }
    } : {})
  };
}

function loadDefaultSources() {
  const file = path.join(ROOT, "data", "sources.js");
  if (!fs.existsSync(file)) return {};
  const sandbox = { window: { PainelURE: {} } };
  sandbox.window.window = sandbox.window;
  sandbox.PainelURE = sandbox.window.PainelURE;
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox.window.PainelURE.sources || {};
}

function mapAppData(state, users, contacts) {
  const carTasks = (state.tasks || []).filter(task => normalize(`${task.scope} ${task.category} ${task.source}`).includes("carro"));
  const calendarTasks = (state.tasks || []).filter(task => !carTasks.includes(task)).map(taskToCalendar);
  return {
    schools: Array.isArray(state.schools) ? state.schools : [],
    networkData: mapNetworkData(state),
    schoolInventoryMetrics: state.schoolInventoryMetrics || {},
    schoolProfiles: Array.isArray(state.schoolProfiles) ? state.schoolProfiles : [],
    schoolAssets: Array.isArray(state.schoolAssets) ? state.schoolAssets : [],
    inventory: Array.isArray(state.inventory) ? state.inventory : [],
    supervisors: Array.isArray(state.supervisors) ? state.supervisors : [],
    contacts,
    calendar: calendarTasks,
    profiles: Array.isArray(state.profiles) ? state.profiles : [],
    quality: Array.isArray(state.quality) ? state.quality : [],
    ctcVisits: (state.tasks || []).filter(task => normalize(`${task.category} ${task.scope}`).includes("ctc")),
    cars: carTasks,
    calls: Array.isArray(state.calls) ? state.calls : [],
    reports: [
      ...(Array.isArray(state.reports) ? state.reports : []),
      ...(state.notes || []).map(note => ({ ...note, type: "Nota SETECHUB" }))
    ],
    users,
    adminChecks: Array.isArray(state.checklist) ? state.checklist.map(item => ({
      id: item.id,
      label: item.text || item.label || "Checklist",
      status: item.done ? "ok" : "pending",
      note: item.notes || ""
    })) : [],
    setechubArchive: {
      municipalities: state.municipalities || [],
      sectors: state.sectors || [],
      officialContacts: state.officialContacts || {},
      officialLinks: state.officialLinks || [],
      schoolImports: state.schoolImports || [],
      schoolNetworks: state.schoolNetworks || [],
      assets: state.assets || [],
      histories: state.histories || {},
      ponto: state.ponto || {},
      redes: state.redes || {}
    }
  };
}

function localBackendUsers(users) {
  return users.map(user => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    contact_id: user.contactId || "",
    password_hash: hashPassword(user.pin),
    avatar: user.avatar || "",
    preferences: user.preferences || { pin: user.pin }
  }));
}

function apiUrl(pathname) {
  return `${env("P2_API_URL", "https://painelure2-api.onrender.com").replace(/\/+$/, "")}${pathname}`;
}

async function apiRequest(pathname, options = {}) {
  const response = await fetch(apiUrl(pathname), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`PainelURE API HTTP ${response.status}: ${payload.error || text}`);
  return payload;
}

async function loginPainel() {
  const username = env("P2_ADMIN_USER");
  const password = env("P2_ADMIN_PASSWORD");
  const key = env("P2_ADMIN_KEY");
  const payload = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(username && password ? { username, password } : { key })
  });
  if (!payload.token) throw new Error("Login nao retornou token.");
  return payload.token;
}

async function pushOnline(appData, users, sources) {
  const token = await loginPainel();
  const headers = { Authorization: `Bearer ${token}` };
  const current = (await apiRequest("/api/users", { headers })).users || [];
  const desiredByUsername = new Map(users.map(user => [normalize(user.username), user]));
  const desiredByPerson = new Map(users.map(user => [personKey(user.name), user]));
  let deleted = 0;
  let created = 0;
  let updated = 0;

  for (const currentUser of current) {
    const shouldDelete = isPecUser(currentUser)
      || (!desiredByUsername.has(normalize(currentUser.username)) && desiredByPerson.has(personKey(currentUser.name)));
    if (!shouldDelete) continue;
    await apiRequest(`/api/users/${encodeURIComponent(currentUser.id)}`, { method: "DELETE", headers });
    deleted += 1;
  }

  const refreshed = (await apiRequest("/api/users", { headers })).users || [];
  const currentByUsername = new Map(refreshed.map(user => [normalize(user.username), user]));
  for (const user of users) {
    const existing = currentByUsername.get(normalize(user.username));
    const body = {
      name: user.name,
      username: user.username,
      role: user.role,
      contactId: user.contactId || "",
      password: user.pin,
      preferences: user.preferences || { pin: user.pin }
    };
    if (existing) {
      await apiRequest(`/api/users/${encodeURIComponent(existing.id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });
      updated += 1;
    } else {
      await apiRequest("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
      created += 1;
    }
  }

  await apiRequest("/api/data", {
    method: "PUT",
    headers,
    body: JSON.stringify({ appData, force: true })
  });
  await apiRequest("/api/sources", {
    method: "PUT",
    headers,
    body: JSON.stringify({ sources })
  });
  return { deleted, created, updated };
}

async function main() {
  const mode = arg("push") === "true" || arg("online") === "true" ? "online" : "local";
  const { state, setechubUpdatedAt, relationalRowCount } = await loadSetechubState();
  const contacts = (state.directoryContacts || []).map(mapContact);
  const users = mapUsers(state, contacts);
  const appData = mapAppData(state, users, contacts);
  const sources = buildSources(state);
  const backups = {};

  backups.appData = backupFile(APP_DATA_FILE);
  backups.users = backupFile(USERS_FILE);
  backups.sources = backupFile(SOURCES_FILE);

  writeJsonFile(APP_DATA_FILE, {
    version: 1,
    source: "setechub-online-migration",
    updatedAt: new Date().toISOString(),
    appData
  });
  writeJsonFile(USERS_FILE, localBackendUsers(users));
  writeJsonFile(SOURCES_FILE, sources);

  let online = null;
  if (mode === "online") online = await pushOnline(appData, users, sources);

  const report = {
    ok: true,
    mode,
    generatedAt: new Date().toISOString(),
    setechubUpdatedAt,
    relationalRowCount,
    backups,
    counts: {
      users: users.length,
      schools: appData.schools.length,
      contacts: appData.contacts.length,
      supervisors: appData.supervisors.length,
      schoolAssets: appData.schoolAssets.length,
      networkData: Object.keys(appData.networkData || {}).length,
      officialLinks: appData.setechubArchive.officialLinks.length
    },
    pins: users.map(user => ({ username: user.username, name: user.name, role: user.role, pin: user.pin })),
    online
  };
  writeJsonFile(REPORT_FILE, report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
