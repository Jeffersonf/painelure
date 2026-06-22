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
const MODULE_FILES = ["search.js", "data-store.js", "access-scope.js", "render.js", "supervision-render.js"];

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
  P.displayUser = () => ({
    ...user,
    login: user.login || user.username || "",
    shortName: user.name || user.username || ""
  });
  P.contactForUser = () => ({
    id: user.contactId || user.contact_id || "",
    name: user.contactName || user.name || "",
    email: user.email || "",
    sector: user.sector || user.setor || "",
    category: user.category || user.categoria || ""
  });
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
    assert(Object.keys(scoped.networkData).length === magda.assignedSchools.length, "Supervisor deve receber redes/cameras das escolas vinculadas.");
    assert(!hasCredentials(scoped.networkData), "Supervisor nao deve receber credenciais de rede.");
    assert(scoped.schoolAssets.length === 0, "Supervisor nao deve receber inventario tecnico.");
    assert(scoped.cars.length === 0, "Supervisor nao deve receber agendamentos de carro.");
    assert(P.canViewSchool(magda.assignedSchools[0]), "Supervisor deve abrir escola propria.");
    assert(!P.canViewSchool("EE Bairro Boa Vista Intervales"), "Supervisor nao deve abrir escola fora da carteira.");
  });

  const adilson = data.supervisors.find(item => P.normalize(item.name).includes("adilson"));
  assert(adilson, "Supervisor Adilson precisa existir na base seed.");
  withUser(P, { name: "Adilson Fogaca", username: "adilson fogaca", role: "Supervisao", preferences: { supervisorName: "Adilson Fogaca" } }, scoped => {
    assert(scoped.schools.length === adilson.assignedSchools.length, "Adilson deve ver as escolas vinculadas mesmo com nome abreviado.");
    assert(scoped.supervisors.length === 1 && scoped.supervisors[0].name === adilson.name, "Adilson deve ver o proprio painel de supervisao.");
  });

  withUser(P, { name: "Consulta", role: "Consulta" }, scoped => {
    assert(scoped.schools.length === data.schools.length, "Consulta deve receber escolas.");
    assert(scoped.contacts.length === data.contacts.length, "Consulta deve receber contatos.");
    assert(Object.keys(scoped.networkData).length > 0, "Consulta deve receber redes/cameras sem credenciais.");
    assert(!hasCredentials(scoped.networkData), "Consulta nao deve receber credenciais de rede.");
    assert(scoped.users.length === 0, "Consulta nao deve receber usuarios.");
  });

  withUser(P, { name: "Tecnico", role: "Tecnicos CTC" }, scoped => {
    assert(Object.keys(scoped.networkData).length > 0, "Tecnicos CTC devem receber redes/cameras.");
    assert(scoped.schoolAssets.length > 0, "Tecnicos CTC devem receber inventario.");
    assert(scoped.cars.length === data.cars.length, "Tecnicos CTC devem receber agendamentos de carro.");
    assert(hasCredentials(scoped.networkData), "Tecnicos CTC devem receber credenciais.");
    assert(scoped.calls.length === data.calls.length, "Tecnicos CTC devem receber chamados.");
    assert(scoped.supervisors.length === data.supervisors.length, "Tecnicos CTC devem receber supervisao.");
    assert(scoped.reports.length === data.reports.length, "Tecnicos CTC devem receber relatorios.");
    assert(scoped.profiles.length === data.profiles.length, "Tecnicos CTC devem receber perfis.");
    assert(scoped.quality.length === data.quality.length, "Tecnicos CTC devem receber qualidade.");
    assert(scoped.users.length === 0, "Tecnicos CTC nao devem receber usuarios admin.");
    assert(!P.roleAccess("Tecnicos CTC").includes("admin"), "Tecnicos CTC nao deve acessar admin.");
  });

  withUser(P, { name: "SETEC", role: "SETEC" }, scoped => {
    assert(Object.keys(scoped.networkData).length > 0, "SETEC deve receber redes/cameras.");
    assert(scoped.schoolAssets.length > 0, "SETEC deve receber inventario.");
    assert(hasCredentials(scoped.networkData), "SETEC deve receber credenciais.");
    assert(scoped.calendar.length === data.calendar.length, "SETEC deve receber calendario compartilhado/pessoal.");
  });

  withUser(P, { name: "SEINTEC", role: "SEINTEC" }, scoped => {
    assert(Object.keys(scoped.networkData).length > 0, "SEINTEC deve receber redes/cameras.");
    assert(scoped.schoolAssets.length > 0, "SEINTEC deve receber inventario.");
    assert(scoped.cars.length === data.cars.length, "SEINTEC deve receber agendamentos de carro.");
    assert(hasCredentials(scoped.networkData), "SEINTEC deve receber credenciais.");
    assert(scoped.calls.length === data.calls.length, "SEINTEC deve receber chamados.");
    assert(scoped.supervisors.length === data.supervisors.length, "SEINTEC deve receber supervisao.");
    assert(scoped.users.length === 0, "SEINTEC nao deve receber usuarios admin.");
    assert(!P.roleAccess("SEINTEC").includes("admin"), "SEINTEC nao deve acessar admin.");
  });

  withUser(P, { name: "Gabinete", role: "Gabinete" }, scoped => {
    assert(scoped.calls.length === data.calls.length, "Gabinete deve receber chamados.");
    assert(scoped.cars.length === data.cars.length, "Gabinete deve receber agendamentos de carro.");
    assert(P.canViewAllCarBookings(), "Gabinete deve ver detalhes completos de carros.");
    assert(Object.keys(scoped.networkData).length > 0, "Gabinete deve receber redes/cameras sem credenciais.");
    assert(!hasCredentials(scoped.networkData), "Gabinete nao deve receber credenciais de rede.");
    assert(scoped.schoolAssets.length === 0, "Gabinete nao deve receber inventario tecnico.");
  });

  withUser(P, { name: "Dirigente", role: "Gabinete", contactRole: "Dirigente Regional de Ensino" }, () => {
    assert(P.canViewAllCarBookings(), "Dirigente deve ver detalhes completos de carros.");
  });

  withUser(P, { name: "SEOM", role: "SEOM" }, () => {
    assert(P.canViewAllCarBookings(), "SEOM deve ver detalhes completos de carros.");
  });

  withUser(P, { name: "Rodolfo", role: "Carros" }, scoped => {
    assert(scoped.cars.length === data.cars.length, "Perfil Carros deve receber agendamentos.");
    assert(scoped.schools.length === 0, "Perfil Carros nao deve receber escolas.");
    assert(scoped.contacts.length === 0, "Perfil Carros nao deve receber contatos.");
    assert(scoped.calendar.length === data.calendar.length, "Perfil Carros deve receber calendario compartilhado/pessoal.");
    assert(P.roleAccess("Carros").includes("dashboard") && P.roleAccess("Carros").includes("cars") && P.roleAccess("Carros").includes("calendar"), "Perfil Carros deve acessar painel, carros e calendario.");
  });

  withUser(P, { name: "Rodolfo", role: "Carros", sector: "SEAFIN", category: "SEAFIN" }, scoped => {
    const seafinBooking = { requestId: "1", sector: "SEAFIN", destination: "Reuniao financeira", requester: "SEAFIN" };
    const segreBooking = { requestId: "2", sector: "SEGRE", destination: "Documento interno", requester: "SEGRE" };
    assert(P.canViewCarBookingDetails(seafinBooking), "SEAFIN deve ver detalhes completos do proprio setor.");
    assert(!P.canViewCarBookingDetails(segreBooking), "SEAFIN nao deve ver detalhes completos de SEGRE.");
    const scopedSeafin = P.scopedData({ ...data, cars: [seafinBooking, segreBooking] }).cars;
    assert(scopedSeafin[0].destination === "Reuniao financeira", "Agendamento do proprio setor deve permanecer completo.");
    assert(scopedSeafin[1].restricted === true && !scopedSeafin[1].destination, "Agendamento de outro setor deve ficar mascarado.");
  });

  withUser(P, { name: "Nelson", role: "Carros", sector: "SEFIN", category: "SEFIN" }, () => {
    assert(P.canViewCarBookingDetails({ sector: "SEAFIN", requester: "SEAFIN" }), "SEFIN deve casar com agendamento marcado como SEAFIN.");
    assert(!P.canViewAllCarBookings(), "SEFIN nao deve ver todos os setores.");
  });

  withUser(P, { name: "Priscila", role: "Carros", sector: "SEGRE", category: "SEGRE" }, () => {
    assert(P.canViewCarBookingDetails({ sector: "SEVESC", requester: "SEVESC" }), "SEGRE deve ver detalhes do agrupamento Rede Escolar.");
    assert(P.canViewCarBookingDetails({ sector: "SEMAT", requester: "SEMAT" }), "SEGRE deve ver SEMAT dentro do mesmo agrupamento.");
    assert(!P.canViewCarBookingDetails({ sector: "SEFIN", requester: "SEFIN" }), "SEGRE nao deve ver detalhes de Financas.");
  });

  withUser(P, { name: "Hector", role: "Carros", sector: "SEPES", category: "SEPES" }, () => {
    assert(P.canViewCarBookingDetails({ sector: "SEAPE", requester: "SEAPE" }), "SEPES deve ver detalhes do agrupamento Recursos Humanos.");
    assert(P.canViewCarBookingDetails({ sector: "SEFREP", requester: "SEFREP" }), "SEPES deve ver SEFREP dentro do mesmo agrupamento.");
    assert(!P.canViewCarBookingDetails({ sector: "SEGRE", requester: "SEGRE" }), "SEPES nao deve ver detalhes de Rede Escolar.");
  });

  withUser(P, { name: "Daniel", role: "Carros", sector: "SEFISC", category: "SEFISC" }, () => {
    assert(P.canViewAllCarBookings(), "SEFISC deve ter visualizacao geral dos carros.");
  });

  withUser(P, { name: "Tecnologia", role: "Carros", sector: "CTC", category: "CTC" }, () => {
    assert(P.canViewAllCarBookings(), "Tecnologia deve ter visualizacao geral dos carros.");
  });

  withUser(P, { name: "Pedagogico", role: "Pedagogico" }, scoped => {
    assert(scoped.schools.length === data.schools.length, "Pedagogico deve receber escolas.");
    assert(scoped.supervisors.length === data.supervisors.length, "Pedagogico deve receber supervisao.");
    assert(scoped.cars.length === 0, "Pedagogico/PEC nao deve receber agendamentos de carro.");
    assert(Object.keys(scoped.networkData).length > 0, "Pedagogico deve receber redes/cameras sem credenciais.");
    assert(!hasCredentials(scoped.networkData), "Pedagogico nao deve receber credenciais de rede.");
    assert(scoped.schoolAssets.length === 0, "Pedagogico nao deve receber inventario tecnico.");
  });

  withUser(P, { name: "Admin", role: "Administrador" }, scoped => {
    assert(scoped.users.length === data.users.length, "Administrador deve receber usuarios.");
    assert(hasCredentials(scoped.networkData), "Administrador deve receber credenciais.");
  });

  withUser(P, { name: "Ana Silva", username: "ana.silva", email: "ana@educacao.sp.gov.br", role: "Pedagogico" }, () => {
    const calendar = [
      { label: "Compartilhado", value: "01/05/2026", note: "Evento geral" },
      { label: "Pessoal Ana", value: "2026-05-02", scope: "personal", owner: "Ana Silva" },
      { label: "Pessoal Bruno", value: "03/05/2026", scope: "personal", owner: "Bruno" },
      { label: "Pessoal sem dono", value: "04/05/2026", type: "personal" },
      { label: "Atribuido Ana", value: "05/05/2026", assignee: "ana.silva" },
      { label: "Compartilhado com dono", value: "06/05/2026", scope: "shared", owner: "Gabinete" },
      { label: "Email de outro usuario", value: "07/05/2026", scope: "personal", ownerEmail: "bruno@educacao.sp.gov.br" }
    ];
    const personalTitles = P.calendarByMode(calendar, "personal").map(item => item.label);
    const sharedTitles = P.calendarByMode(calendar, "shared").map(item => item.label);
    assert(personalTitles.includes("Pessoal Ana"), "Agenda pessoal deve mostrar evento proprio por nome.");
    assert(personalTitles.includes("Atribuido Ana"), "Agenda pessoal deve mostrar evento proprio por login/assignee.");
    assert(!personalTitles.includes("Pessoal Bruno"), "Agenda pessoal nao deve mostrar evento de outro usuario.");
    assert(!personalTitles.includes("Pessoal sem dono"), "Agenda pessoal nao deve mostrar evento pessoal sem dono.");
    assert(!personalTitles.includes("Email de outro usuario"), "Agenda pessoal nao deve casar apenas pelo dominio do email.");
    assert(sharedTitles.includes("Compartilhado"), "Agenda compartilhada deve mostrar evento sem dono pessoal.");
    assert(sharedTitles.includes("Compartilhado com dono"), "Agenda compartilhada deve respeitar escopo compartilhado mesmo com responsavel.");
    assert(!sharedTitles.includes("Pessoal Ana"), "Agenda compartilhada nao deve mostrar evento pessoal do usuario.");
  });

  assertAccess(P, "Administrador", ["admin", "network", "inventory", "bi-equipment", "profiles"], []);
  assertAccess(P, "Supervisao", ["dashboard", "schools", "network", "supervision", "satisfaction"], ["inventory", "bi-equipment", "cars", "reports", "admin"]);
  assertAccess(P, "Tecnicos CTC", ["network", "inventory", "ctc", "calls", "cars", "supervision", "calendar", "satisfaction", "reports", "profiles", "quality"], ["bi-equipment", "admin"]);
  assertAccess(P, "CTC", ["network", "inventory", "ctc", "calls", "cars", "supervision", "calendar", "satisfaction", "reports", "profiles", "quality"], ["bi-equipment", "admin"]);
  assertAccess(P, "SETEC", ["network", "inventory", "calendar", "satisfaction"], ["bi-equipment", "reports", "admin"]);
  assertAccess(P, "SEINTEC", ["network", "inventory", "ctc", "calls", "cars", "supervision", "calendar", "satisfaction", "reports", "profiles", "quality"], ["bi-equipment", "admin"]);
  assertAccess(P, "Gabinete", ["network", "calls", "calendar", "cars", "satisfaction"], ["reports", "inventory", "bi-equipment", "admin"]);
  assertAccess(P, "Pedagogico", ["schools", "network", "supervision", "calendar", "satisfaction"], ["reports", "inventory", "bi-equipment", "cars", "admin"]);
  assertAccess(P, "Consulta", ["schools", "network", "contacts", "calendar", "satisfaction"], ["reports", "inventory", "bi-equipment", "admin"]);
  assertAccess(P, "Carros", ["dashboard", "network", "cars", "calendar"], ["schools", "contacts", "inventory", "bi-equipment", "admin"]);
  assertAccess(P, "SEGRE", ["dashboard", "cars", "calendar"], ["schools", "contacts", "supervision", "admin"]);
  assertAccess(P, "SEPES", ["dashboard", "cars", "calendar"], ["schools", "contacts", "supervision", "admin"]);
  assertAccess(P, "SEFIN", ["dashboard", "cars", "calendar"], ["schools", "contacts", "supervision", "admin"]);
  assertAccess(P, "SEFISC", ["dashboard", "cars", "calendar"], ["schools", "contacts", "supervision", "admin"]);

  console.log("Escopo de acesso OK");
}

run();
