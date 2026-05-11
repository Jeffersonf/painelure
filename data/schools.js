(function () {
  function initials(name) {
    return String(name || "")
      .replace(/\b(PEI|EE)\b/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "UR";
  }

  const officialSchools = [
    { name: "PEI EE Idalicio Mendes Lima", cie: "905227", city: "Itapeva" },
    { name: "EE Doutor Antonio Deffune", cie: "49323", city: "Itapeva" },
    { name: "PEI EE Professora Celia Vasques Ferrari Duch", cie: "39731", city: "Taquarivai" },
    { name: "PEI EE Professora Cinira Daniel da Silva", cie: "35348", city: "Itapeva" },
    { name: "EE Bairro Ferreira dos Matos", cie: "915087", city: "Ribeirão Grande" },
    { name: "PEI EE Professora Francelina Franco", cie: "15568", city: "Buri" },
    { name: "EE Professor Gerson de Barros Margarido", cie: "43412", city: "Itapeva" },
    { name: "EE Bairro Boa Vista Intervales", cie: "915075", city: "Ribeirão Grande" },
    { name: "PEI EE Jeminiano David Muzel", cie: "15477", city: "Itapeva" },
    { name: "PEI EE Professor Joao Baptista do Amaral Vasconcellos", cie: "910077", city: "Capão Bonito" },
    { name: "PEI EE Professor Jose Vasques Ferrari", cie: "15519", city: "Itapeva" },
    { name: "PEI EE Professora Nicota Soares", cie: "15489", city: "Itapeva" },
    { name: "PEI EE Oscar Kurtz Camargo", cie: "15076", city: "Ribeirão Grande" },
    { name: "PEI EE Otavio Ferrari", cie: "15404", city: "Itapeva" },
    { name: "PEI EE Padre Arlindo Vieira", cie: "15118", city: "Capão Bonito" },
    { name: "EE Doutor Raul Venturelli", cie: "15222", city: "Capão Bonito" },
    { name: "PEI EE Ricardo Campolim de Almeida Neto", cie: "915117", city: "Nova Campina" },
    { name: "EE Professor Silverio Monteiro", cie: "35336", city: "Itapeva" },
    { name: "PEI EE Simpliciano Campolim de Almeida", cie: "15428", city: "Nova Campina" },
    { name: "EE Bairro Turvo dos Almeidas", cie: "926036", city: "Capão Bonito" },
    { name: "PEI EE Professora Zulmira de Oliveira", cie: "15544", city: "Itapeva" }
  ];

  window.PainelURE = window.PainelURE || {};
  window.PainelURE.seedData = window.PainelURE.seedData || {};
  window.PainelURE.seedData.schools = officialSchools.map(school => ({
    ...school,
    initials: initials(school.name),
    fiche: 0,
    items: 0,
    status: "ok"
  }));
})();
