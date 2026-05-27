"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sandbox = {
  console,
  window: {
    PainelURE: {
      seedData: { schools: [] },
      normalize(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
      }
    }
  }
};
sandbox.PainelURE = sandbox.window.PainelURE;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "modules", "normalizers.js"), "utf8"), sandbox, { filename: "normalizers.js" });

const [booking] = sandbox.window.PainelURE.normalizers.cars([{
  ID: "48",
  Setor: "SEAFIN",
  Data: "22/05/2026 16:00",
  DataDevolu_x00e7__x00e3_o: "22/05/2026 16:30",
  LocalExterno: "Empresa de transporte",
  MotivoVisita: "Reuniao administrativa",
  Nome_Condutor: "Maria Condutora",
  Condutor: [{ lookupId: 7, lookupValue: "" }],
  Status: "Aprovado",
  Ve_x00ed_culo: "Veiculo Utilitario"
}]);

assert(booking.requestId === "48", "Deve preservar numero da solicitacao.");
assert(booking.vehicle === "Veiculo Utilitario", "Deve ler veiculo com campo interno SharePoint.");
assert(booking.requester === "SEAFIN" && booking.sector === "SEAFIN", "Deve priorizar setor como solicitante.");
assert(booking.destination === "Empresa de transporte", "Deve priorizar local externo como destino.");
assert(booking.driver === "Maria Condutora", "Deve ler nome do condutor quando a planilha trouxer coluna propria.");
assert(booking.driverId === "7", "Deve preservar ID do condutor mesmo quando tambem houver nome.");
assert(booking.time === "16:00", "Deve extrair hora de retirada da data.");
assert(booking.returnTime === "16:30", "Deve extrair hora de devolucao.");

console.log("Normalizador de carros OK");
