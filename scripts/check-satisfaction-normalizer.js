"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const sandbox = { console, window: { PainelURE: { seedData: { schools: [] }, normalize } } };
sandbox.PainelURE = sandbox.window.PainelURE;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "modules", "normalizers.js"), "utf8"), sandbox, { filename: "normalizers.js" });

const [answer] = sandbox.window.PainelURE.normalizers.satisfaction([{
  ID: "81",
  "Data da resposta": "04/08/2026",
  Setor: "SEAPE",
  Assunto: "Entrega de documentos",
  "Atendimento Resolvido": "Sim",
  "Avaliação Atendimento": "Ótimo",
  Cordialidade: "Sim",
  "Tempo Espera": "Imediato",
  Observações: "Atendimento excelente"
}]);

assert(answer.id === "satisfaction-81", "Deve gerar um identificador estável.");
assert(answer.sector === "SEAPE" && answer.audience === "SEAPE", "Deve preservar o setor.");
assert(answer.subject === "Entrega de documentos", "Deve preservar o assunto.");
assert(answer.resolved === "Sim", "Deve preservar a resolução.");
assert(answer.rating === "Ótimo", "Deve preservar a avaliação.");
assert(answer.cordial === "Sim" && answer.wait === "Imediato", "Deve preservar cordialidade e espera.");
assert(answer.observation === "Atendimento excelente", "Deve preservar a observação.");
assert(answer.period === "04/08/2026" && answer.year === "2026", "Deve normalizar a data.");

console.log("Normalizador da pesquisa OK");
