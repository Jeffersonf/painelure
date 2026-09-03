"use strict";

const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.resolve(__dirname, "..", "server", "index.js"), "utf8").replace(/\r\n/g, "\n");
const androidRepository = fs.readFileSync(path.resolve(__dirname, "..", "android-kotlin", "app", "src", "main", "java", "com", "painelure", "app", "data", "PainelRepository.kt"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function routeBlock(marker) {
  const start = source.indexOf(marker);
  assert(start >= 0, `Rota nao encontrada: ${marker}`);
  const next = source.indexOf("\n\n  if (req.method", start + marker.length);
  return source.slice(start, next >= 0 ? next : source.indexOf("\n\n  send(res, 404", start));
}

[
  'if (req.method === "GET" && pathname === "/api/users")',
  'if (req.method === "POST" && pathname === "/api/users")',
  'if (req.method === "PUT" && pathname.startsWith("/api/users/"))',
  'if (req.method === "DELETE" && pathname.startsWith("/api/users/"))',
  'if (req.method === "PUT" && pathname === "/api/sources")',
  'if (req.method === "POST" && pathname === "/api/sources/refresh")',
  'if (req.method === "GET" && pathname === "/api/snapshots")',
  'if (req.method === "GET" && pathname === "/api/audit")',
  'if (req.method === "GET" && pathname === "/api/imports")',
  'if (req.method === "PUT" && pathname === "/api/data")',
  'if (req.method === "POST" && pathname.startsWith("/api/import/"))'
].forEach(marker => {
  assert(routeBlock(marker).includes("requireAdmin(req, res"), `${marker} precisa exigir administrador.`);
});

const readDataBlock = routeBlock('if (req.method === "GET" && pathname === "/api/data")');
assert(readDataBlock.includes("requireAuth(req, res"), "GET /api/data precisa exigir sessao.");
assert(readDataBlock.includes("scopedStoreForRequest(req)"), "GET /api/data precisa devolver dados escopados.");

const selfUserBlock = routeBlock('if (req.method === "PUT" && pathname === "/api/users/me")');
assert(selfUserBlock.includes("requireAuth(req, res"), "PUT /api/users/me precisa exigir sessao.");
assert(!selfUserBlock.includes("requireAdmin(req, res"), "PUT /api/users/me deve permitir atualizacao do proprio usuario.");

const supervisionJustificationBlock = routeBlock('if (req.method === "PUT" && pathname === "/api/supervision/justification")');
assert(supervisionJustificationBlock.includes("requireAuth(req, res"), "Justificativa da supervisao precisa exigir sessao.");
assert(supervisionJustificationBlock.includes("supervisorForUser(appData, user)"), "Supervisor deve poder alterar apenas a propria justificativa.");
assert(supervisionJustificationBlock.includes("supervisorEmail"), "Administrador deve localizar supervisor pelo email quando o nome da planilha variar.");
assert(source.includes('normalizeKey(session.role || "").includes("administrador")'), "Perfil administrador deve aceitar variacoes normalizadas na sessao.");
assert(source.includes('page === "supervision" && isVanessa'), "Backend deve liberar supervisao especificamente para Vanessa.");

const mobileActionsBlock = routeBlock('if (req.method === "POST" && pathname === "/api/mobile/actions")');
assert(mobileActionsBlock.includes("requireAuth(req, res)"), "Acoes moveis precisam exigir sessao.");
assert(mobileActionsBlock.includes("canAccessData(permission, user, appData)"), "Acoes moveis precisam respeitar o escopo do perfil.");
assert(mobileActionsBlock.includes("requiredByType"), "Acoes moveis precisam validar campos por tipo.");
assert(mobileActionsBlock.includes("audit(req, \"create\", `mobile_${type}`"), "Acoes moveis precisam gerar auditoria.");

["/api/users/me", "/api/users", "/api/sources", "/api/internal"].forEach(route => {
  assert(androidRepository.includes(route), `Repositorio Android sem operacao administrativa: ${route}`);
});
assert(androidRepository.includes("/api/sources/refresh"), "Repositorio Android sem atualizacao das fontes oficiais.");
assert(androidRepository.includes("refreshOfficialSourcesFallback"), "Repositorio Android sem fallback para API legada de fontes.");
assert(androidRepository.includes("/api/import/"), "Repositorio Android sem contrato de importacao.");
assert(androidRepository.includes("contacts") && androidRepository.includes("supervision"), "Repositorio Android sem tipos de importacao permitidos.");
assert(androidRepository.includes('"/api/data", "PUT"') && androidRepository.includes("baseUpdatedAt"), "Repositorio Android sem escrita versionada do estado.");

console.log("Rotas administrativas OK");
