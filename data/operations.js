(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  P.seedData.ctcVisits = [
    { owner: "Bruno", date: "2026-05-11", time: "09:00", place: "EE Bairro Boa Vista Intervales", objective: "Conferir rede, inventário e câmeras." },
    { owner: "Danilo", date: "2026-05-11", time: "13:30", place: "EE Bairro Ferreira dos Matos", objective: "Validar pontos de rede e equipamentos em atenção." },
    { owner: "Bruno", date: "2026-05-12", time: "10:00", place: "PEI EE Oscar Kurtz Camargo", objective: "Revisão técnica de câmeras." }
  ];

  P.seedData.calls = [
    { title: "Inventário com itens em manutenção", school: "EE Professor Gerson de Barros Margarido", status: "aberto", note: "Priorizar itens críticos antes da próxima visita." },
    { title: "Câmeras abaixo do previsto", school: "EE Bairro Turvo dos Almeidas", status: "em_rota", note: "Verificar DVR e pontos de energia." },
    { title: "Rede mapeada para consulta", school: "PEI EE Jeminiano David Muzel", status: "resolvido", note: "Dados técnicos disponíveis no painel." }
  ];

  P.seedData.reports = [
    { label: "Escolas", value: "21", note: "base mestre carregada" },
    { label: "Inventário", value: "107", note: "linhas sanitizadas por escola" },
    { label: "Supervisores", value: "6", note: "metas conectadas à planilha de abril" },
    { label: "Contatos", value: "41", note: "contatos categorizados" }
  ];

  P.seedData.adminChecks = [
    { label: "1.0 preservada", status: "ok", note: "A versão oficial continua fora do fluxo de edição do 2.0." },
    { label: "2.0 fora do repositório", status: "ok", note: "Pasta separada em C:\\Users\\jeffe\\painelure2." },
    { label: "Backup/publicação", status: "ok", note: "Exportação/importação JSON e persistência local implementadas." },
    { label: "Perfis locais", status: "ok", note: "Filtro de navegação por perfil ativo implementado no MVP." },
    { label: "Automação DOCX/PDF", status: "ok", note: "Mantida como fluxo externo documentado; não entra no frontend estático." }
  ];
})();
