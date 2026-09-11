"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("../modules/network-import-core");
const data = { schools: [{ name: "Escola A", cie: "123" }, { name: "Escola B", cie: "456" }], networkData: { "Escola A": { credentials: ["original-A"] }, "Escola B": { network: ["Manter"], credentials: ["original"] } } };
const rows = [{ "ESCOLA ESTADUAL": "Nome diferente", "CODIGO CIE ": "00123", "Quantidade de câmeras instaladas": "16", "Quantidade de câmeras funcionando": "0", SENHA: "never-forward", "Usuário DVR": "never-forward", "REDE ADM": "<img src=x onerror=alert(1)>" }];
assert(!JSON.stringify(core.selectRows(rows)).includes("never-forward"));
const normalized = core.normalize(rows, data);
assert.equal(normalized.issues.length, 0);
assert.equal(normalized.updates["Escola A"].cameraMetrics.working, 0);
assert.equal(core.summary(normalized.updates).stopped, 16);
assert.equal(core.normalize([...rows, ...rows], data).issues.length, 1);
assert.equal(core.normalize([{ ...rows[0], "CODIGO CIE ": "999" }], data).issues.length, 1);
assert.equal(core.normalize([{ ...rows[0], "CODIGO CIE ": "", "ESCOLA ESTADUAL": "Escola A" }], data).issues.length, 0);
for (const value of ["", "dvr1 16-15", "-1", "1.5", "17"]) {
  const result = core.normalize([{ ...rows[0], "Quantidade de câmeras funcionando": value }], data);
  assert.equal(core.summary(result.updates).valid, 0);
}
assert.equal(core.normalize([{ "ESCOLA ESTADUAL": "DIRETORIA" }], data).ignored, 1);
assert.throws(() => core.normalize([], data));
assert.throws(() => core.normalize(Array(2001).fill(rows[0]), data));

// Execute the actual route with in-memory persistence; never touch a real store.
const source = fs.readFileSync(require.resolve("../server/index.js"), "utf8");
const start = source.indexOf('  if (req.method === "POST" && pathname === "/api/network/import")');
const end = source.indexOf('  if (req.method === "POST" && pathname.startsWith("/api/import/"))', start);
async function route(body, authorized = true) {
  let saved = null, response = null;
  const context = { networkImport: core, req: { method: "POST" }, res: {}, pathname: "/api/network/import", requireAdmin: () => authorized,
    readBody: async () => JSON.stringify(body), readStore: async () => ({ appData: structuredClone(data) }),
    saveStore: async app => { saved = app; return { updatedAt: "2026-09-11T12:00:00Z" }; },
    recordImportRun: async () => {}, audit: async () => {}, send: (_, status, payload) => { response = { status, payload }; } };
  await vm.runInNewContext(`(async () => {${source.slice(start, end)}})()`, context);
  return { saved, response };
}
(async () => {
  assert.equal((await route({ rows }, false)).saved, null);
  const ok = await route({ rows });
  assert.equal(ok.response.status, 200);
  assert.deepEqual(ok.saved.networkData["Escola A"].credentials, ["original-A"]);
  assert.deepEqual(ok.saved.networkData["Escola B"], data.networkData["Escola B"]);
  assert(!JSON.stringify(ok.saved).includes("never-forward"));
  assert.equal(ok.saved.networkImportMeta.schools, 1);
  const again = await route({ rows: [rows[0], rows[0]] });
  assert.equal(again.response.status, 400);
  assert.equal(again.saved, null);
  assert.equal((await route({ rows: [null] })).response.status, 400);
  console.log("Importação de redes: normalização, privacidade, validação e gravação OK.");
})().catch(error => { console.error(error); process.exitCode = 1; });
