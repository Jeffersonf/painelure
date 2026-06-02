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
      type: "sharepoint-list",
      url: "https://seesp-my.sharepoint.com/:l:/g/personal/itv_seintec_educacao_sp_gov_br/JACUz84zfYrYRIadNAPXJvISAetLbQd40ptsKrcSMFs4TNQ?e=Ae9Qvg",
      status: "official",
      metadata: {
        domain: "Inventário",
        cadence: "sob demanda",
        owner: "SETEC/CTC",
        source: "InventarioEquipamentosEscolas",
        autoLoad: false,
        schoolLookupUrl: "https://seesp-my.sharepoint.com/:l:/g/personal/itv_seintec_educacao_sp_gov_br/JACZ5y0MlGBTQI4wlCbHtIPeASsrN5V7U1knW4j85cHF7tk?e=v1BVFU"
      }
    },
    supervision: {
      label: "Supervisão",
      type: "csv",
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSkqZydw5EWNLREBCXdG-VpqcoOfuOf-AI2gYawdaeEwDNitR2m37okLvurfscimlSQMtpbHg_H_bzz/pub?output=csv",
      status: "official",
      monthKey: "2026-05",
      metadata: { domain: "Supervisão", monthKey: "2026-05", cadence: "mensal", owner: "Gabinete", startsAt: "2026-05", panelGid: "1507846737" }
    },
    network: {
      label: "Redes e Câmeras",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Redes e Câmeras", cadence: "sob demanda", owner: "SETEC/SEINTEC/CTC", sensitive: "credentials" }
    },
    calendar: {
      label: "Calendario URE",
      type: "csv",
      url: "",
      status: "pending",
      metadata: { domain: "Calendario", cadence: "mensal", owner: "Gabinete" }
    },
    satisfaction: {
      label: "Pesquisa de satisfação",
      type: "sharepoint-list",
      url: "https://seesp-my.sharepoint.com/:l:/g/personal/itv_seintec_educacao_sp_gov_br/JADpBjs_DuTvSZyxa7kBWSezAaggBDoxC1kO4aT04Yv8SoA?e=iNCKJF",
      status: "official",
      metadata: { domain: "Pesquisa de satisfação", cadence: "por campanha", owner: "Gabinete", source: "PesquisaSatisfacao", locked: true }
    },
    cars: {
      label: "Agendamento de carros",
      type: "sharepoint-list",
      url: "https://seesp-my.sharepoint.com/:l:/g/personal/itv_seintec_educacao_sp_gov_br/JACaDeD8XkaHRaX2WSJPMXJ6AUCrQaodqExoAqBNE7w0JR4?e=LdJz8u",
      status: "official",
      metadata: { domain: "Carros", cadence: "sempre atualizado", owner: "Gabinete", source: "ReservasVeiculos", locked: true, autoLoad: false }
    }
  };
})();
