"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
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
const MODULE_FILES = ["search.js", "data-store.js", "access-scope.js"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadPainel() {
  const sandbox = {
    console,
    window: {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.PainelURE = { seedData: {}, mockData: {}, $() { return null; }, $all() { return []; } };
  sandbox.PainelURE = sandbox.window.PainelURE;
  const context = vm.createContext(sandbox);

  for (const file of DATA_FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, "data", file), "utf8"), context, { filename: file });
  for (const file of MODULE_FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, "modules", file), "utf8"), context, { filename: file });

  const P = sandbox.window.PainelURE;
  P.setAppData({ ...(P.mockData || {}), ...(P.seedData || {}) });
  return P;
}

function withUser(P, user, callback) {
  P.onlineUser = () => user;
  P.activeUser = () => user;
  P.currentRole = () => user.role;
  callback(P.scopedData(P.getAppData()));
}

function hasCredentials(networkData) {
  return Object.values(networkData || {}).some(item => Array.isArray(item?.credentials) && item.credentials.length);
}

function assertAccess(P, role, expectedPages, blockedPages = []) {
  expectedPages.forEach(page => assert(P.canAccessData(page, role), `${role} deve acessar ${page}.`));
  blockedPages.forEach(page => assert(!P.canAccessData(page, role), `${role} nao deve acessar ${page}.`));
}

function run() {
  const P = loadPainel();
  const data = P.getAppData();
  const magda = data.supervisors.find(item => P.normalize(item.name).includes("magda"));
  assert(magda, "Supervisor Magda precisa existir na base seed.");

  withUser(P, { name: magda.name, supervisorName: magda.name, role: "Supervisao" }, scoped => {
    assert(scoped.schools.length === magda.assignedSchools.length, "Supervisor deve ver apenas escolas vinculadas.");
    assert(scoped.supervisors.length === 1 && scoped.supervisors[0].name === magda.name, "Supervisor deve ver apenas o proprio registro.");
    assert(Object.keys(scoped.networkData).length === 0, "Supervisor nao deve receber redes/cameras.");
    assert(scoped.schoolAssets.length === 0, "Supervisor nao deve receber inventario tecnico.");
    assert(P.canViewSchool(magda.assignedSchools[0]), "Supervisor deve abrir escola propria.");
    assert(!P.canViewSchool("EE Bairro Boa Vista Intervales"), "Supervisor nao deve abrir escola fora da carteira.");
  });

  withUser(P, { name: "Consulta", role: "Consulta" }, scoped => {
    assert(scoped.schools.length === data.schools.length, "Consulta deve receber escolas.");
    assert(scoped.contacts.length === data.contacts.length, "Consulta deve receber contatos.");
    assert(Object.keys(scoped.networkData).length === 0, "Consulta nao deve receber redes/cameras.");
    assert(scoped.users.length === 0, "Consulta nao deve receber usuarios.");
  });

  withUser(P, { name: "Tecnico", role: "Tecnicos CTC" }, scoped => {
    assert(Object.keys(scoped.networkData).length > 0, "Tecnicos CTC devem receber redes/cameras.");
    assert(scoped.schoolAssets.length > 0, "Tecnicos CTC devem receber inventario.");
    assert(hasCredentials(scoped.networkData), "Tecnicos CTC devem receber credenciais.");
    assert(scoped.users.length === 0, "Tecnicos CTC nao devem receber usuarios admin.");
  });

  withUser(P, { name: "SETEC", role: "SETEC" }, scoped => {
    assert(Object.keys(scoped.networkData).length > 0, "SETEC deve receber redes/cameras.");
    assert(scoped.schoolAssets.length > 0, "SETEC deve receber inventario.");
    assert(hasCredentials(scoped.networkData), "SETEC deve receber credenciais.");
    assert(scoped.calendar.length === 0, "SETEC nao deve receber calendario pela matriz atual.");
  });

  withUser(P, { name: "SEINTEC", role: "SEINTEC" }, scoped => {
    assert(Object.keys(scoped.networkData).length > 0, "SEINTEC deve receber redes/cameras.");
    assert(scoped.schoolAssets.length > 0, "SEINTEC deve receber inventario.");
    assert(hasCredentials(scoped.networkData), "SEINTEC deve receber credenciais.");
    assert(scoped.calls.length === 0, "SEINTEC nao deve receber chamados pela matriz atual.");
  });

  withUser(P, { name: "Gabinete", role: "Gabinete" }, scoped => {
    assert(scoped.calls.length === data.calls.length, "Gabinete deve receber chamados.");
    assert(Object.keys(scoped.networkData).length === 0, "Gabinete nao deve receber redes/cameras.");
    assert(scoped.schoolAssets.length === 0, "Gabinete nao deve receber inventario tecnico.");
  });

  withUser(P, { name: "Pedagogico", role: "Pedagogico" }, scoped => {
    assert(scoped.schools.length === data.schools.length, "Pedagogico deve receber escolas.");
    assert(scoped.supervisors.length === data.supervisors.length, "Pedagogico deve receber supervisao.");
    assert(Object.keys(scoped.networkData).length === 0, "Pedagogico nao deve receber redes/cameras.");
    assert(scoped.schoolAssets.length === 0, "Pedagogico nao deve receber inventario tecnico.");
  });

  withUser(P, { name: "Admin", role: "Administrador" }, scoped => {
    assert(scoped.users.length === data.users.length, "Administrador deve receber usuarios.");
    assert(hasCredentials(scoped.networkData), "Administrador deve receber credenciais.");
  });

  assertAccess(P, "Administrador", ["admin", "network", "inventory", "profiles"], []);
  assertAccess(P, "Supervisao", ["dashboard", "schools", "supervision"], ["network", "inventory", "admin"]);
  assertAccess(P, "Tecnicos CTC", ["network", "inventory", "ctc"], ["admin", "profiles"]);
  assertAccess(P, "SETEC", ["network", "inventory", "reports"], ["admin", "calendar"]);
  assertAccess(P, "SEINTEC", ["network", "inventory", "reports"], ["admin", "calls"]);
  assertAccess(P, "Gabinete", ["calls", "calendar", "reports"], ["network", "inventory", "admin"]);
  assertAccess(P, "Pedagogico", ["schools", "supervision", "calendar"], ["network", "inventory", "admin"]);
  assertAccess(P, "Consulta", ["schools", "contacts"], ["network", "inventory", "admin"]);

  console.log("Escopo de acesso OK");
}

run();
