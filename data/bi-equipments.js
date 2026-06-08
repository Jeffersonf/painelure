(function () {
  window.PainelURE = window.PainelURE || {};
  const P = window.PainelURE;

  const report = {
    title: "Painel de Inventario - URE Itapeva",
    sourceFile: "InventarioEquipamentosEscolas (2).csv",
    sourceType: "csv",
    sourceRows: 3255,
    skippedRows: 2,
    createdFrom: "Cloud",
    powerBiRelease: "2026.05",
    datasetId: "5c8b7bdf-134a-42c6-b729-972f71c0c9ce",
    reportId: "d7eb4eaa-b630-4474-8c01-12c7757f99f1",
    table: "InventarioEquipamentosEscolas",
    page: "Painel URE ITAPEVA",
    visuals: [
      { type: "clusteredBarChart", title: "Equipamentos por Escola", category: "Escola", measure: "Quantidade de Equipamentos" },
      { type: "donutChart", title: "Status do Equipamento", category: "Status do Equipamento", measure: "Contagem de ID" },
      { type: "donutChart", title: "Tipo Equipamento", category: "Tipo Equipamento", measure: "Contagem de ID" },
      { type: "cardVisual", title: "Total Equipamentos", measure: "Total Equipamentos" },
      { type: "cardVisual", title: "Escolas Inventariadas", measure: "Escolas Inventariadas" },
      { type: "cardVisual", title: "Funcionando", measure: "Funcionando" },
      { type: "cardVisual", title: "Em Manutencao", measure: "Em Manutencao" },
      { type: "cardVisual", title: "Baixa", measure: "Baixa" }
    ],
    fields: [
      "ID",
      "Escola",
      "Data da Coleta",
      "Equipamento",
      "Numero de Serie",
      "BlueMonitor",
      "Responsavel",
      "Status do Equipamento",
      "Patrimonio",
      "Observacao",
      "IMEI"
    ],
    statusMap: {
      ok: ["Funcionando"],
      manutencao: ["Manutencao", "Garantia", "Sem status"],
      defeito: ["Baixa"]
    }
  };
  P.biEquipmentReport = report;
  P.seedData = P.seedData || {};
  P.seedData.biEquipmentReport = report;
})();
