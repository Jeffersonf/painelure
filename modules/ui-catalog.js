(function () {
  const P = window.PainelURE;

  const PAGE_META = {
    dashboard: { icon: "📊", label: "Painel", note: "Visao inicial e atalhos", type: "Pagina" },
    schools: { icon: "🏫", label: "Escolas", note: "Unidades e detalhes", type: "Pagina" },
    network: { icon: "🌐", label: "Redes e cameras", note: "Infraestrutura por escola", type: "Pagina" },
    inventory: { icon: "💻", label: "Inventario", note: "Equipamentos e status", type: "Pagina" },
    ctc: { icon: "🛠️", label: "Tecnicos CTC", note: "Agenda tecnica", type: "Pagina" },
    calls: { icon: "📥", label: "Chamados", note: "Fila operacional", type: "Pagina" },
    supervision: { icon: "🧭", label: "Supervisao", note: "Metas e vinculos", type: "Pagina" },
    contacts: { icon: "☎️", label: "Contatos", note: "Setores e ramais", type: "Pagina" },
    calendar: { icon: "📅", label: "Calendario URE", note: "Agenda institucional", type: "Pagina" },
    reports: { icon: "📈", label: "Relatorios", note: "Resumo operacional", type: "Pagina" },
    profiles: { icon: "🧩", label: "Perfis", note: "Matriz de acesso", type: "Pagina" },
    quality: { icon: "✅", label: "Qualidade", note: "Checklist do painel", type: "Pagina" },
    admin: { icon: "🔐", label: "Admin", note: "Fontes, backups e publicacao", type: "Pagina" },
    user: { icon: "⚙️", label: "Conta", note: "Perfil e preferencias", type: "Pagina" }
  };

  function pageMeta(page) {
    return PAGE_META[page] || { icon: "•", label: page, note: "Disponivel para este perfil", type: "Pagina" };
  }

  function pageEntries(pages) {
    return pages.map(page => ({ page, ...pageMeta(page) }));
  }

  P.PAGE_META = PAGE_META;
  P.pageMeta = pageMeta;
  P.pageEntries = pageEntries;
})();
