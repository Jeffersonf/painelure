"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "android-kotlin", "app", "src", "main", "assets", "seed-data.json");
const DATA_FILES = [
  "mock.js", "schools.js", "school-profiles.js", "school-operational.js",
  "inventory.js", "supervision.js", "contacts.js", "users.js", "governance.js",
  "operations.js", "calls-report.js", "sources.js", "rede-2026.js"
];

const sandbox = { window: {} };
sandbox.window.window = sandbox.window;
sandbox.window.PainelURE = { seedData: {}, mockData: {} };
sandbox.PainelURE = sandbox.window.PainelURE;
const context = vm.createContext(sandbox);
for (const file of DATA_FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "data", file), "utf8"), context, { filename: file });
}

const source = sandbox.window.PainelURE;
const merged = { ...(source.mockData || {}), ...(source.seedData || {}) };
const selectedKeys = [
  "schools", "schoolProfiles", "schoolAssets", "inventory", "schoolInventoryMetrics",
  "networkData", "supervisors", "contacts", "calendar", "satisfaction", "ctcVisits",
  "cars", "calls", "callsMeta", "reports", "biEquipmentReport", "rede2026", "quality"
];
const output = Object.fromEntries(selectedKeys.filter(key => merged[key] !== undefined).map(key => [key, merged[key]]));
if (Array.isArray(source.rede2026)) output.rede2026 = source.rede2026;
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), keys: Object.keys(output), bytes: fs.statSync(OUTPUT).size }));
