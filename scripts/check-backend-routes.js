"use strict";

const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.resolve(__dirname, "..", "server", "index.js"), "utf8");

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
  'if (req.method === "PUT" && pathname === "/api/sources")',
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

console.log("Rotas administrativas OK");
