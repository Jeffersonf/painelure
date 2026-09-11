(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  P.seedData.ctcVisits = [
    { owner: "Bruno", date: "2026-05-11", time: "09:00", place: "EE Bairro Boa Vista Intervales", objective: "Conferir rede, inventário e câmeras." },
    { owner: "Danilo", date: "2026-05-11", time: "13:30", place: "EE Bairro Ferreira dos Matos", objective: "Validar pontos de rede e equipamentos em atenção." },
    { owner: "Bruno", date: "2026-05-12", time: "10:00", place: "PEI EE Oscar Kurtz Camargo", objective: "Revisao tecnica de câmeras." }
  ];

  P.seedData.cars = [
    { vehicle: "Carro oficial 1", date: "2026-05-15", time: "08:00", requester: "Gabinete", destination: "Itapeva", driver: "A definir", status: "reservado", note: "Reserva operacional para deslocamento institucional." },
    { vehicle: "Carro oficial 2", date: "2026-05-15", time: "13:30", requester: "SETEC", destination: "Ribeirão Grande", driver: "A definir", status: "pendente", note: "Aguardando confirmação de motorista." },
    { vehicle: "Carro oficial 1", date: "2026-05-16", time: "09:00", requester: "Supervisão", destination: "Capao Bonito", driver: "A definir", status: "reservado", note: "Agenda de visita e acompanhamento escolar." }
  ];

  P.seedData.calls = [
    { title: "Inventário com itens em manutenção", school: "EE Professor Gerson de Barros Margarido", status: "aberto", note: "Priorizar itens críticos antes da próxima visita." },
    { title: "Câmeras abaixo do previsto", school: "EE Bairro Turvo dos Almeidas", status: "em_rota", note: "Verificar DVR e pontos de energia." },
    { title: "Rede mapeada para consulta", school: "PEI EE Jeminiano David Muzel", status: "resolvido", note: "Dados técnicos disponíveis no painel." }
  ];

  P.seedData.reports = [
    { label: "Escolas", value: "21", note: "base mestre carregada" },
    { label: "Inventário", value: "107", note: "linhas sanitizadas por escola" },
    { label: "Supervisores", value: "6", note: "visitas conectadas a planilha oficial de maio" },
    { label: "Contatos", value: "46", note: "contatos categorizados" }
  ];

  P.seedData.adminChecks = [
    { label: "1.0 preservada", status: "ok", note: "A versao oficial continua fora do fluxo de edicao do 2.0." },
    { label: "Base oficial preparada", status: "ok", note: "Projeto pronto para assumir Jeffersonf/painelure após migração, validação e virada no GitHub." },
    { label: "Backup/publicação", status: "ok", note: "GitHub Pages ativo, exportação/importação JSON e persistência local implementadas." },
    { label: "Perfis locais", status: "ok", note: "Filtro de navegação por perfil ativo implementado no MVP." },
    { label: "Automação DOCX/PDF", status: "ok", note: "Mantida como fluxo externo documentado; não entra no frontend estático." }
  ];
})();
