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
      label: "Inventário",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Inventario", cadence: "sob demanda", owner: "SETEC/CTC" }
    },
    supervision: {
      label: "Supervisão",
      type: "csv",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4b4nZ79Ev8139wvRESOX9YNedCB4PwNiqU2i-UbYUI3c4oKYrmuXjuiMS742RTluOFv94eGK0qMwd/pub?output=csv",
      status: "official",
      monthKey: "2026-04",
      metadata: { domain: "Supervisao", monthKey: "2026-04", cadence: "mensal", owner: "Gabinete" }
    },
    network: {
      label: "Redes e Câmeras",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Redes e Cameras", cadence: "sob demanda", owner: "SETEC/SEINTEC/CTC", sensitive: "credentials" }
    },
    calendar: {
      label: "Calendário URE",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Calendario", cadence: "mensal", owner: "Gabinete" }
    }
  };
})();
