(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  const inventoryMetrics = {
    "EE Bairro Boa Vista Intervales": { items: 12, alerts: 1 },
    "EE Bairro Ferreira dos Matos": { items: 10, alerts: 3 },
    "EE Bairro Turvo dos Almeidas": { items: 1, alerts: 0 },
    "EE Doutor Antonio Deffune": { items: 11, alerts: 2 },
    "EE Professor Gerson de Barros Margarido": { items: 17, alerts: 5 },
    "EE Professor Silverio Monteiro": { items: 4, alerts: 2 },
    "PEI EE Idalicio Mendes Lima": { items: 9, alerts: 4 },
    "PEI EE Jeminiano David Muzel": { items: 2, alerts: 0 },
    "PEI EE Oscar Kurtz Camargo": { items: 12, alerts: 4 },
    "PEI EE Otavio Ferrari": { items: 4, alerts: 0 },
    "PEI EE Padre Arlindo Vieira": { items: 1, alerts: 0 },
    "PEI EE Professor Joao Baptista do Amaral Vasconcellos": { items: 8, alerts: 1 },
    "PEI EE Professor Jose Vasques Ferrari": { items: 6, alerts: 0 },
    "PEI EE Professora Cinira Daniel da Silva": { items: 2, alerts: 1 },
    "PEI EE Professora Francelina Franco": { items: 4, alerts: 1 },
    "PEI EE Ricardo Campolim de Almeida Neto": { items: 4, alerts: 0 }
  };

  const networkData = {
    "PEI EE Idalicio Mendes Lima": {
      network: ["Rede administrativa 10.109.41.0", "Gateway ADM 10.109.41.1", "Rede pedagógica 10.121.7.0"],
      ips: ["CIE 905227", "Banda 8 Mbps", "Técnico: Jefferson"],
      cameras: ["Câmeras informadas", "dvr16-16 câmeras funcionando"]
    },
    "EE Doutor Antonio Deffune": {
      network: ["Rede administrativa 10.109.41.32", "Gateway ADM 10.109.41.33", "Rede pedagógica 10.113.9.128"],
      ips: ["CIE 49323", "Banda 8 Mbps", "Status técnico com defeito"],
      cameras: ["DVR 16 canais", "Cabos de vídeo/dados precisam revisão"]
    },
    "PEI EE Professora Celia Vasques Ferrari Duch": {
      network: ["Rede administrativa 10.109.42.224", "Gateway ADM 10.109.42.225", "Rede pedagógica 10.119.127.128"],
      ips: ["CIE 39731", "Banda 8 Mbps", "Técnico: JeffersonM"],
      cameras: ["DVRs informados", "Há ponto de rede pendente em sala"]
    },
    "PEI EE Professora Cinira Daniel da Silva": {
      network: ["Rede administrativa 10.109.41.224", "Gateway ADM 10.109.41.225", "Rede pedagógica 10.113.10.128"],
      ips: ["CIE 35348", "Banda 8 Mbps", "Firewall Fortinet"],
      cameras: ["DVR1 8 câmeras OK", "DVR2 16 câmeras, 14 OK"]
    },
    "EE Bairro Ferreira dos Matos": {
      network: ["Rede administrativa 10.109.42.160", "Gateway ADM 10.109.42.161", "Rede pedagógica 10.121.243.128"],
      ips: ["CIE 915087", "Banda 8 Mbps", "Status em manutenção"],
      cameras: ["32 câmeras instaladas", "23 câmeras em funcionamento"]
    },
    "PEI EE Professora Francelina Franco": {
      network: ["Rede administrativa 10.109.40.96", "Gateway ADM 10.109.40.97", "Rede pedagógica 10.119.128.0"],
      ips: ["CIE 15568", "Banda 8 Mbps", "Técnicos: Jefferson M/Jefferson F"],
      cameras: ["DVR1 16-15 OK", "DVR2 32 câmeras, 25 OK"]
    },
    "EE Professor Gerson de Barros Margarido": {
      network: ["Rede administrativa 10.109.41.128", "Gateway ADM 10.109.41.129", "Rede pedagógica 10.113.136.0"],
      ips: ["CIE 43412", "Banda 10 Mbps", "Técnicos: JeffersonF/Elcio"],
      cameras: ["15/16 câmeras", "DVR2 sem vídeo"]
    },
    "EE Bairro Boa Vista Intervales": {
      network: ["Rede administrativa 10.109.42.128", "Gateway ADM 10.109.42.129", "Rede pedagógica 10.121.243.0"],
      ips: ["CIE 915075", "Banda 2 Mbps", "Rede importada do inventário técnico"],
      cameras: ["29 câmeras instaladas", "29 câmeras em funcionamento"]
    },
    "PEI EE Jeminiano David Muzel": {
      network: ["Rede administrativa 10.109.41.64", "Gateway ADM 10.109.41.65", "Rede pedagógica 10.113.11.0"],
      ips: ["CIE 15477", "Banda 8 Mbps", "Técnico: JeffersonM"],
      cameras: ["DVR1 36 câmeras OK", "DVR2 16 câmeras OK"]
    },
    "PEI EE Professor Joao Baptista do Amaral Vasconcellos": {
      network: ["Rede administrativa 10.109.40.224", "Gateway ADM 10.109.40.225", "Rede pedagógica 10.119.127.0"],
      ips: ["CIE 910077", "Banda 100 Mbps", "Técnico: Jefferson M"],
      cameras: ["DVR1 25-18", "DVR2 25-18", "DVR3 15-19"]
    },
    "PEI EE Professor Jose Vasques Ferrari": {
      network: ["Rede administrativa 10.109.41.160", "Gateway ADM 10.109.41.161", "Rede pedagógica 10.173.48.0"],
      ips: ["CIE 15519", "Banda 34 Mbps", "Técnico: JeffersonM"],
      cameras: ["DVR 16 câmeras OK"]
    },
    "PEI EE Professora Nicota Soares": {
      network: ["Rede administrativa 10.109.42.0", "Gateway ADM 10.109.42.1", "Rede pedagógica 10.173.46.0"],
      ips: ["CIE 15489", "Banda 34 Mbps", "Técnicos: JeffersonF/Elcio"],
      cameras: ["DVR1 11 de 16", "DVR2 13 de 16", "DVR3 15 de 16 OK"]
    },
    "PEI EE Oscar Kurtz Camargo": {
      network: ["Rede administrativa 10.109.42.192", "Gateway ADM 10.109.42.193", "Rede pedagógica 10.119.161.0"],
      ips: ["CIE 15076", "Banda 8 Mbps", "Rede importada do inventário técnico"],
      cameras: ["DVR1 16-9", "DVR2 16-16", "DVR3 16-16"]
    },
    "PEI EE Otavio Ferrari": {
      network: ["Rede administrativa 10.109.41.96", "Gateway ADM 10.109.41.97", "Rede pedagógica 10.119.159.0"],
      ips: ["CIE 15404", "Banda 8 Mbps", "Status técnico com defeito"],
      cameras: ["DVR1 16/12", "DVR2 16-10", "DVR3 16-10", "DVR4 sem HD"]
    },
    "PEI EE Padre Arlindo Vieira": {
      network: ["Rede administrativa 10.109.40.192", "Gateway ADM 10.109.40.193", "Rede pedagógica 10.173.40.0"],
      ips: ["CIE 15118", "Banda 34 Mbps", "Status técnico com defeito"],
      cameras: ["DVR1 16-15", "DVR2/DVR3 removidos por destelhamento"]
    },
    "EE Doutor Raul Venturelli": {
      network: ["Rede administrativa 10.109.40.160", "Gateway ADM 10.109.40.161", "Rede pedagógica 10.113.11.128"],
      ips: ["CIE 15222", "Banda 8 Mbps", "Status técnico com defeito"],
      cameras: ["DVR1 16-10", "Quadra com monitoramento interno", "Bloco em reforma sem energia"]
    },
    "PEI EE Ricardo Campolim de Almeida Neto": {
      network: ["Rede administrativa 10.109.42.64", "Gateway ADM 10.109.42.65", "Rede pedagógica 10.120.162.128"],
      ips: ["CIE 915117", "Banda 8 Mbps", "Status em manutenção"],
      cameras: ["16 câmeras instaladas", "15 câmeras em funcionamento"]
    },
    "EE Professor Silverio Monteiro": {
      network: ["Rede administrativa 10.109.41.192", "Gateway ADM 10.109.41.193", "Rede pedagógica 10.121.245.0"],
      ips: ["CIE 35336", "Banda 2 Mbps", "Rede importada do inventário técnico"],
      cameras: ["Dados de câmera não informados"]
    },
    "PEI EE Simpliciano Campolim de Almeida": {
      network: ["Rede administrativa 10.109.42.96", "Gateway ADM 10.109.42.97", "Rede pedagógica 10.121.242.128"],
      ips: ["CIE 15428", "Banda 8 Mbps", "Status em manutenção"],
      cameras: ["30 câmeras instaladas", "16 câmeras em funcionamento"]
    },
    "EE Bairro Turvo dos Almeidas": {
      network: ["Rede administrativa 10.109.40.128", "Gateway ADM 10.109.40.129", "Rede pedagógica 10.120.218.0"],
      ips: ["CIE 926036", "Banda 100mbps", "Wi-Fi SIM"],
      cameras: ["16 câmeras instaladas", "4 câmeras em funcionamento"]
    },
    "PEI EE Professora Zulmira de Oliveira": {
      network: ["Rede administrativa 10.109.42.32", "Gateway ADM 10.109.42.33", "Rede pedagógica 10.119.160.128"],
      ips: ["CIE 15544", "Banda 8 Mbps", "Técnicos: JeffersonF/Elcio"],
      cameras: ["DVR1 9 de 18", "DVR2 12 de 16"]
    }
  };

  Object.values(networkData).forEach(data => {
    data.credentials = [
      "Acesso restrito",
      "Nao publicado no frontend estatico",
      "Solicitar ao CTC, SETEC ou SEINTEC"
    ];
  });

  const schools = (P.seedData.schools || []).map(school => {
    const metrics = inventoryMetrics[school.name] || { items: 0, alerts: 0 };
    return {
      ...school,
      items: metrics.items,
      status: metrics.alerts > 0 ? "warn" : "ok",
      alerts: metrics.alerts
    };
  });

  const inventoryTotals = Object.values(inventoryMetrics).reduce((acc, item) => {
    acc.lines += item.items;
    acc.alerts += item.alerts;
    if (item.items > 0) acc.schools += 1;
    if (item.alerts > 0) acc.alertSchools += 1;
    return acc;
  }, { lines: 0, alerts: 0, schools: 0, alertSchools: 0 });

  P.seedData.schools = schools;
  P.seedData.schoolInventoryMetrics = inventoryMetrics;
  P.seedData.networkData = networkData;
  P.seedData.inventory = [
    {
      label: "Escolas com inventário",
      value: String(inventoryTotals.schools),
      note: "unidades com dados operacionais herdados do 1.0",
      tone: "ok"
    },
    {
      label: "Linhas de inventário",
      value: String(inventoryTotals.lines),
      note: "grupos de equipamentos consolidados por escola",
      tone: "info"
    },
    {
      label: "Escolas com alerta",
      value: String(inventoryTotals.alertSchools),
      note: "unidades com manutenção ou defeito registrado",
      tone: inventoryTotals.alertSchools ? "warn" : "ok"
    },
    {
      label: "Alertas operacionais",
      value: String(inventoryTotals.alerts),
      note: "itens marcados para acompanhamento técnico",
      tone: inventoryTotals.alerts ? "warn" : "ok"
    }
  ];
})();
