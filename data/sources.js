(function () {
  window.PainelURE = window.PainelURE || {};

  window.PainelURE.sources = {
    contacts: {
      label: "Contatos",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Contatos", cadence: "sob demanda", owner: "Gabinete/SETEC" }
    },
    schools: {
      label: "Escolas",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Escolas", cadence: "mensal", owner: "URE" }
    },
    inventory: {
      label: "Inventario",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Inventario", cadence: "sob demanda", owner: "SETEC/CTC" }
    },
    supervision: {
      label: "Supervisao",
      type: "csv",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSkqZydw5EWNLREBCXdG-VpqcoOfuOf-AI2gYawdaeEwDNitR2m37okLvurfscimlSQMtpbHg_H_bzz/pub?output=csv",
      status: "official",
      monthKey: "2026-05",
      metadata: { domain: "Supervisao", monthKey: "2026-05", cadence: "mensal", owner: "Gabinete", startsAt: "2026-05" }
    },
    network: {
      label: "Redes e Cameras",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Redes e Cameras", cadence: "sob demanda", owner: "SETEC/SEINTEC/CTC", sensitive: "credentials" }
    },
    calendar: {
      label: "Calendario URE",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Calendario", cadence: "mensal", owner: "Gabinete" }
    },
    cars: {
      label: "Agendamento de carros",
      type: "sharepoint-list",
      url: "https://seesp-my.sharepoint.com/:l:/g/personal/itv_seintec_educacao_sp_gov_br/JACaDeD8XkaHRaX2WSJPMXJ6AUCrQaodqExoAqBNE7w0JR4?e=LkPfD3",
      status: "official",
      metadata: { domain: "Carros", cadence: "sempre atualizado", owner: "Gabinete", source: "ReservasVeiculos", locked: true }
    }
  };
})();
