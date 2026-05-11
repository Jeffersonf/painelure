(function () {
  window.PainelURE = window.PainelURE || {};

  window.PainelURE.sources = {
    contacts: {
      label: "Contatos",
      type: "csv",
      url: "",
      status: "pending"
    },
    schools: {
      label: "Escolas",
      type: "csv",
      url: "",
      status: "pending"
    },
    inventory: {
      label: "Inventário",
      type: "csv",
      url: "",
      status: "pending"
    },
    supervision: {
      label: "Supervisão",
      type: "csv",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4b4nZ79Ev8139wvRESOX9YNedCB4PwNiqU2i-UbYUI3c4oKYrmuXjuiMS742RTluOFv94eGK0qMwd/pub?output=csv",
      status: "official",
      monthKey: "2026-04"
    },
    network: {
      label: "Redes e Câmeras",
      type: "csv",
      url: "",
      status: "pending"
    },
    calendar: {
      label: "Calendário URE",
      type: "csv",
      url: "",
      status: "pending"
    }
  };
})();
