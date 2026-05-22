(function () {
  const P = window.PainelURE;

  const PAGE_META = {
    dashboard: { icon: "PN", label: "Painel", note: "Visão inicial e atalhos", type: "Página" },
    schools: { icon: "ES", label: "Escolas", note: "Unidades e detalhes", type: "Página" },
    network: { icon: "RD", label: "Redes e câmeras", note: "Infraestrutura por escola", type: "Página" },
    inventory: { icon: "IN", label: "Inventário", note: "Equipamentos e status", type: "Página" },
    ctc: { icon: "CT", label: "Técnicos CTC", note: "Agenda técnica", type: "Página" },
    calls: { icon: "CH", label: "Chamados", note: "Fila operacional", type: "Página" },
    cars: { icon: "CR", label: "Carros", note: "Agendamento oficial", type: "Página" },
    supervision: { icon: "SV", label: "Supervisão", note: "Metas e vínculos", type: "Página" },
    contacts: { icon: "CO", label: "Contatos", note: "Setores e ramais", type: "Página" },
    calendar: { icon: "AG", label: "Calendário URE", note: "Agenda institucional", type: "Página" },
    reports: { icon: "RL", label: "Relatórios", note: "Acesso administrativo", type: "Página" },
    profiles: { icon: "PF", label: "Perfis", note: "Matriz de acesso", type: "Página" },
    quality: { icon: "QA", label: "Qualidade", note: "Checklist do painel", type: "Página" },
    admin: { icon: "AD", label: "Admin", note: "Fontes, backups e publicação", type: "Página" },
    user: { icon: "US", label: "Conta", note: "Perfil e preferências", type: "Página" }
  };

  function pageMeta(page) {
    return PAGE_META[page] || { icon: "--", label: page, note: "Disponível para este perfil", type: "Página" };
  }

  function pageEntries(pages) {
    return pages.map(page => ({ page, ...pageMeta(page) }));
  }

  P.PAGE_META = PAGE_META;
  P.pageMeta = pageMeta;
  P.pageEntries = pageEntries;
})();
