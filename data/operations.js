(function () {
  const P = window.PainelURE = window.PainelURE || {};
  P.seedData = P.seedData || {};

  P.seedData.ctcVisits = [
    { owner: "Bruno", date: "2026-05-11", time: "09:00", place: "EE Bairro Boa Vista Intervales", objective: "Conferir rede, inventario e cameras." },
    { owner: "Danilo", date: "2026-05-11", time: "13:30", place: "EE Bairro Ferreira dos Matos", objective: "Validar pontos de rede e equipamentos em atencao." },
    { owner: "Bruno", date: "2026-05-12", time: "10:00", place: "PEI EE Oscar Kurtz Camargo", objective: "Revisao tecnica de cameras." }
  ];

  P.seedData.cars = [
    { vehicle: "Carro oficial 1", date: "2026-05-15", time: "08:00", requester: "Gabinete", destination: "Itapeva", driver: "A definir", status: "reservado", note: "Reserva operacional para deslocamento institucional." },
    { vehicle: "Carro oficial 2", date: "2026-05-15", time: "13:30", requester: "SETEC", destination: "Ribeirao Grande", driver: "A definir", status: "pendente", note: "Aguardando confirmacao de motorista." },
    { vehicle: "Carro oficial 1", date: "2026-05-16", time: "09:00", requester: "Supervisao", destination: "Capao Bonito", driver: "A definir", status: "reservado", note: "Agenda de visita e acompanhamento escolar." }
  ];

  P.seedData.calls = [
    { title: "Inventario com itens em manutencao", school: "EE Professor Gerson de Barros Margarido", status: "aberto", note: "Priorizar itens criticos antes da proxima visita." },
    { title: "Cameras abaixo do previsto", school: "EE Bairro Turvo dos Almeidas", status: "em_rota", note: "Verificar DVR e pontos de energia." },
    { title: "Rede mapeada para consulta", school: "PEI EE Jeminiano David Muzel", status: "resolvido", note: "Dados tecnicos disponiveis no painel." }
  ];

  P.seedData.reports = [
    { label: "Escolas", value: "21", note: "base mestre carregada" },
    { label: "Inventario", value: "107", note: "linhas sanitizadas por escola" },
    { label: "Supervisores", value: "6", note: "metas conectadas a planilha de abril" },
    { label: "Contatos", value: "46", note: "contatos categorizados" }
  ];

  P.seedData.adminChecks = [
    { label: "1.0 preservada", status: "ok", note: "A versao oficial continua fora do fluxo de edicao do 2.0." },
    { label: "2.0 em repositorio proprio", status: "ok", note: "Pasta separada em C:\\Users\\jeffe\\painelure2 e repo Jeffersonf/painelure2." },
    { label: "Backup/publicacao", status: "ok", note: "GitHub Pages ativo, exportacao/importacao JSON e persistencia local implementadas." },
    { label: "Perfis locais", status: "ok", note: "Filtro de navegacao por perfil ativo implementado no MVP." },
    { label: "Automacao DOCX/PDF", status: "ok", note: "Mantida como fluxo externo documentado; nao entra no frontend estatico." }
  ];
})();
