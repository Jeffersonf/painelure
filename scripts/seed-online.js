"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const STORAGE_DIR = path.join(ROOT, "server", "storage");
const CREDENTIALS_FILE = path.join(STORAGE_DIR, "online-users-seed.json");

const DATA_FILES = [
  "mock.js",
  "schools.js",
  "school-profiles.js",
  "school-operational.js",
  "inventory.js",
  "supervision.js",
  "contacts.js",
  "users.js",
  "governance.js",
  "operations.js",
  "sources.js"
];

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function apiUrl(pathname) {
  const base = env("P2_API_URL", "https://painelure2-api.onrender.com").replace(/\/+$/, "");
  return `${base}${pathname}`;
}

function loadSeedData() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  sandbox.window.PainelURE = { seedData: {}, mockData: {} };
  sandbox.PainelURE = sandbox.window.PainelURE;
  const context = vm.createContext(sandbox);

  DATA_FILES.forEach(file => {
    const source = fs.readFileSync(path.join(ROOT, "data", file), "utf8");
    vm.runInContext(source, context, { filename: file });
  });

  return {
    appData: {
      ...(sandbox.window.PainelURE.mockData || {}),
      ...(sandbox.window.PainelURE.seedData || {})
    },
    sources: sandbox.window.PainelURE.sources || {}
  };
}

async function request(pathname, options = {}) {
  const response = await fetch(apiUrl(pathname), {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(`${response.status} ${payload.error || response.statusText}`);
  return payload;
}

async function login() {
  const username = env("P2_ADMIN_USER");
  const password = env("P2_ADMIN_PASSWORD");
  const key = env("P2_ADMIN_KEY");
  const body = username && password ? { username, password } : { key };
  const payload = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body)
  });
  if (!payload.token) throw new Error("Login nao retornou token.");
  return payload.token;
}

function initialPin() {
  return env("P2_INITIAL_PIN", "1234");
}

async function seedUsers(token, users) {
  const headers = { Authorization: `Bearer ${token}` };
  const current = await request("/api/users", { headers });
  const byUsername = new Map((current.users || []).map(user => [String(user.username || "").toLowerCase(), user]));
  const credentials = [];
  let created = 0;
  let updated = 0;

  for (const seed of users) {
    const username = String(seed.username || seed.login || seed.name || "").trim().toLowerCase();
    if (!username) continue;
    const existing = byUsername.get(username);
    if (existing) {
      await request(`/api/users/${encodeURIComponent(existing.id)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: seed.name,
          role: seed.role,
          contactId: seed.contactId || ""
        })
      });
      updated += 1;
      continue;
    }

    const password = initialPin();
    const payload = await request("/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify({
        username,
        password,
        name: seed.name,
        role: seed.role,
        contactId: seed.contactId || "",
        preferences: {
          ...(seed.preferences || {}),
          pin: password,
          forcePinChange: true,
          initialPinIssuedAt: new Date().toISOString()
        }
      })
    });
    created += 1;
    credentials.push({
      username,
      password,
      name: payload.user?.name || seed.name,
      role: payload.user?.role || seed.role
    });
  }

  return { created, updated, credentials };
}

async function main() {
  const { appData, sources } = loadSeedData();
  const token = await login();
  const headers = { Authorization: `Bearer ${token}` };

  const userResult = await seedUsers(token, appData.users || []);

  await request("/api/data", {
    method: "PUT",
    headers,
    body: JSON.stringify({ appData, force: true })
  });

  await request("/api/sources", {
    method: "PUT",
    headers,
    body: JSON.stringify({ sources })
  });

  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    api: env("P2_API_URL", "https://painelure2-api.onrender.com"),
    usersCreated: userResult.created,
    usersUpdated: userResult.updated,
    credentials: userResult.credentials
  };
  fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    ok: true,
    usersCreated: userResult.created,
    usersUpdated: userResult.updated,
    credentialsFile: CREDENTIALS_FILE,
    schools: appData.schools?.length || 0,
    contacts: appData.contacts?.length || 0,
    users: appData.users?.length || 0
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
