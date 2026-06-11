(function () {
  const P = window.PainelURE;

  const PAGE_META = {
    dashboard: { icon: "\uD83D\uDCCA", label: "Painel", note: "Vis\u00E3o inicial e atalhos", type: "P\u00E1gina" },
    schools: { icon: "\uD83C\uDFEB", label: "Escolas", note: "Unidades e detalhes", type: "P\u00E1gina" },
    network: { icon: "\uD83C\uDF10", label: "Redes e c\u00E2meras", note: "Infraestrutura por escola", type: "P\u00E1gina" },
    inventory: { icon: "\uD83D\uDCBB", label: "Invent\u00E1rio", note: "Equipamentos e status", type: "P\u00E1gina" },
    "bi-equipment": { icon: "\uD83D\uDCCA", label: "BI Equipamentos", note: "Power BI administrativo", type: "P\u00E1gina" },
    ctc: { icon: "\uD83D\uDCE5", label: "Chamados CTC", note: "Fila operacional e agenda t\u00E9cnica", type: "P\u00E1gina" },
    calls: { icon: "\uD83D\uDCE5", label: "Chamados CTC", note: "Atalho legado para a fila CTC", type: "P\u00E1gina" },
    cars: { icon: "\uD83D\uDE97", label: "Carros", note: "Agendamento oficial", type: "P\u00E1gina" },
    supervision: { icon: "\uD83E\uDDED", label: "Supervis\u00E3o", note: "Metas e v\u00EDnculos", type: "P\u00E1gina" },
    contacts: { icon: "\u260E\uFE0F", label: "Contatos", note: "Setores e ramais", type: "P\u00E1gina" },
    calendar: { icon: "\uD83D\uDCC5", label: "Calend\u00E1rio URE", note: "Agenda institucional", type: "P\u00E1gina" },
    satisfaction: { icon: "\uD83D\uDCDD", label: "Pesquisa de satisfa\u00E7\u00E3o", note: "Formul\u00E1rios, respostas e devolutivas", type: "P\u00E1gina" },
    internal: { icon: "\u2615", label: "Caf\u00E9", note: "Rifa e vaquinha", type: "P\u00E1gina" },
    reports: { icon: "\uD83D\uDCC8", label: "Relat\u00F3rios", note: "Acesso administrativo", type: "P\u00E1gina" },
    profiles: { icon: "\uD83E\uDDE9", label: "Perfis", note: "Matriz de acesso", type: "P\u00E1gina" },
    quality: { icon: "\u2705", label: "Qualidade", note: "Checklist do painel", type: "P\u00E1gina" },
    admin: { icon: "\uD83D\uDD10", label: "Admin", note: "Fontes, backups e publica\u00E7\u00E3o", type: "P\u00E1gina" },
    user: { icon: "\u2699\uFE0F", label: "Conta", note: "Perfil e prefer\u00EAncias", type: "P\u00E1gina" }
  };

  function pageMeta(page) {
    return PAGE_META[page] || { icon: "\u2022", label: page, note: "Dispon\u00EDvel para este perfil", type: "P\u00E1gina" };
  }

  function pageEntries(pages) {
    return pages.map(page => ({ page, ...pageMeta(page) }));
  }

  P.PAGE_META = PAGE_META;
  P.pageMeta = pageMeta;
  P.pageEntries = pageEntries;
})();
