(function () {
  const P = window.PainelURE;

  async function loadSource(key) {
    const source = P.sources?.[key];
    const normalize = P.normalizers?.[key];

    if (!source?.url || !normalize) {
      return { key, status: "skipped", rows: [], data: null };
    }

    const rows = await P.fetchCsv(source.url);
    return {
      key,
      status: "loaded",
      rows,
      data: normalize(rows)
    };
  }

  async function loadConfiguredSources() {
    const nextData = { ...P.getAppData() };
    const results = [];

    for (const key of Object.keys(P.sources || {})) {
      try {
        const result = await loadSource(key);
        results.push(result);
        if (result.status === "loaded" && result.data) {
          if (key === "supervision") nextData.supervisors = result.data;
          else if (key === "network") nextData.networkData = result.data;
          else nextData[key] = result.data;
        }
      } catch (error) {
        results.push({ key, status: "error", error });
        console.warn(`[PainelURE] Fonte ${key} falhou:`, error);
      }
    }

    P.setAppData(nextData);
    P.sourceStatus = results;
    return results;
  }

  P.loadSource = loadSource;
  P.loadConfiguredSources = loadConfiguredSources;
})();
