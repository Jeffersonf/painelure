(function () {
  const P = window.PainelURE;

  const PAGE_META = {
    dashboard: { icon: "📊", label: "Painel", note: "Visão inicial e atalhos", type: "Página" },
    schools: { icon: "🏫", label: "Escolas", note: "Unidades e detalhes", type: "Página" },
    network: { icon: "🌐", label: "Redes e câmeras", note: "Infraestrutura por escola", type: "Página" },
    inventory: { icon: "💻", label: "Inventário", note: "Equipamentos e alertas", type: "Página" },
    ctc: { icon: "🛠️", label: "Técnicos CTC", note: "Agenda técnica", type: "Página" },
    calls: { icon: "📥", label: "Chamados", note: "Fila operacional", type: "Página" },
    supervision: { icon: "🧭", label: "Supervisão", note: "Metas e vínculos", type: "Página" },
    contacts: { icon: "☎️", label: "Contatos", note: "Setores e ramais", type: "Página" },
    calendar: { icon: "📅", label: "Calendário URE", note: "Agenda institucional", type: "Página" },
    reports: { icon: "📈", label: "Relatórios", note: "Resumo operacional", type: "Página" },
    profiles: { icon: "🧩", label: "Perfis", note: "Matriz de acesso", type: "Página" },
    quality: { icon: "✅", label: "Qualidade", note: "Checklist do painel", type: "Página" },
    admin: { icon: "🔐", label: "Admin", note: "Fontes, backups e publicação", type: "Página" },
    user: { icon: "⚙️", label: "Conta", note: "Perfil e preferências", type: "Página" }
  };

  function pageMeta(page) {
    return PAGE_META[page] || { icon: "•", label: page, note: "Disponível para este perfil", type: "Página" };
  }

  function pageEntries(pages) {
    return pages.map(page => ({ page, ...pageMeta(page) }));
  }

  P.PAGE_META = PAGE_META;
  P.pageMeta = pageMeta;
  P.pageEntries = pageEntries;
})();
