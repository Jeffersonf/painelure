(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  P.seedData.calendar = [
    { label: "Apresentação da versão 1.0", value: "08/05/2026", note: "Versão oficial preservada na raiz do projeto.", tone: "ok" },
    { label: "PainelURE", value: "pronto para oficial", note: "Base nova preparada para assumir o repositorio oficial apos migracao e validacao.", tone: "ok" },
    { label: "Calendário URE", value: "preparado", note: "Estrutura pronta para conectar a agenda institucional.", tone: "info" }
  ];

  P.seedData.profiles = [
    { name: "Administrador", emoji: "🛡️", access: "Tudo, incluindo relatórios", note: "Visão completa, fontes, qualidade e publicação." },
    { name: "Supervisão", emoji: "🧭", access: "Escolas, supervisão, contatos e calendário", note: "Foco em metas, vínculos e acompanhamento." },
    { name: "Técnicos CTC", emoji: "🛠️", access: "Escolas, inventário, redes e câmeras", note: "Consulta técnica e triagem de infraestrutura." },
    { name: "SETEC", emoji: "🌐", access: "Redes, inventário, contatos e calendário", note: "Operação técnica e suporte regional." },
    { name: "SEINTEC", emoji: "📡", access: "Redes, escolas, inventário e carros", note: "Consulta técnica e indicadores sem relatórios administrativos." },
    { name: "Gabinete", emoji: "📌", access: "Painel, escolas, contatos e calendário", note: "Visão executiva e decisões rápidas." },
    { name: "Pedagógico", emoji: "📚", access: "Escolas, supervisão e contatos", note: "Acompanhamento pedagógico sem campos técnicos restritos." },
    { name: "Consulta", emoji: "👁️", access: "Painel, escolas e contatos", note: "Leitura simples, sem dados restritos." }
  ];

  P.seedData.quality = [
    { label: "Base visual Finanza", status: "ok", note: "Shell, cards, sidebar e tipografia consolidados." },
    { label: "Dados mockados", status: "ok", note: "Mock reduzido a estrutura vazia; seeds reais documentados." },
    { label: "Credenciais", status: "ok", note: "Não há senha real em JS público do 2.0." },
    { label: "Supervisão oficial", status: "ok", note: "Planilha oficial de maio conectada; abril fica marcado apenas como teste." },
    { label: "Inventário por escola", status: "ok", note: "107 linhas sanitizadas importadas da base 1.0." },
    { label: "Calendário oficial", status: "ok", note: "Página, seed e normalizador CSV prontos; URL oficial pode ser plugada em sources.js." },
    { label: "Perfis de acesso", status: "ok", note: "Matriz e filtro local por perfil implementados no MVP." },
    { label: "Publicação", status: "ok", note: "2.0 publicado em repositório próprio e preservado fora da 1.0 oficial." },
    { label: "Modo apresentação", status: "ok", note: "Interface pode ocultar áreas administrativas locais para reunião." },
    { label: "QA visual", status: "ok", note: "Checklist cobre desktop, mobile, tema claro/escuro e dados vazios." }
  ];
})();
