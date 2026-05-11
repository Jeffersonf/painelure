(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  const assignments = [
    {
      name: "Adilson Manoel Fogaça",
      email: "adilson.fogaca@educacao.sp.gov.br",
      phone: "(15) 3526-6224",
      schools: [
        "PEI EE Jeminiano David Muzel",
        "PEI EE Professora Cinira Daniel da Silva",
        "EE Doutor Raul Venturelli"
      ]
    },
    {
      name: "Daiane Aparecida de Oliveira Ribeiro",
      email: "daiane.ribeiro@educacao.sp.gov.br",
      phone: "(15) 3526-6227",
      schools: [
        "PEI EE Oscar Kurtz Camargo",
        "EE Bairro Ferreira dos Matos",
        "PEI EE Professora Nicota Soares",
        "EE Professor Gerson de Barros Margarido"
      ]
    },
    {
      name: "Edilene Silva Almeida Oliveira",
      email: "edilene.oliveira@educacao.sp.gov.br",
      phone: "(15) 3526-6217",
      schools: [
        "PEI EE Otavio Ferrari",
        "PEI EE Professora Francelina Franco",
        "PEI EE Professor Joao Baptista do Amaral Vasconcellos"
      ]
    },
    {
      name: "Magda Gisele Silva Oliveira",
      email: "magda.oliveira@educacao.sp.gov.br",
      phone: "(15) 3526-6232",
      schools: [
        "PEI EE Professora Celia Vasques Ferrari Duch",
        "PEI EE Idalicio Mendes Lima",
        "PEI EE Padre Arlindo Vieira",
        "EE Doutor Antonio Deffune"
      ]
    },
    {
      name: "Marcio Nunes da Cruz",
      email: "marcio.cruz@educacao.sp.gov.br",
      phone: "(15) 3526-6208",
      schools: [
        "PEI EE Ricardo Campolim de Almeida Neto",
        "PEI EE Simpliciano Campolim de Almeida",
        "EE Professor Silverio Monteiro",
        "PEI EE Professora Zulmira de Oliveira"
      ]
    },
    {
      name: "Maria Luiza Brisolla de Queiroz",
      email: "maria.queiroz14@educacao.sp.gov.br",
      phone: "(15) 3526-6216",
      schools: [
        "EE Bairro Boa Vista Intervales",
        "EE Bairro Turvo dos Almeidas",
        "PEI EE Professor Jose Vasques Ferrari"
      ]
    }
  ];

  P.seedData.supervisors = assignments.map(supervisor => {
    const schoolCount = supervisor.schools.length;
    return {
      ...supervisor,
      schools: schoolCount,
      assignedSchools: supervisor.schools,
      week: `0/3`,
      month: `0/${schoolCount * 3}`,
      pending: schoolCount * 3
    };
  });
})();
