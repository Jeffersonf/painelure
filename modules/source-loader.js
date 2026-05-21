(function () {
  const P = window.PainelURE;

  async function loadSource(key) {
    const source = P.sources?.[key];
    const normalize = P.normalizers?.[key];

    if (!source?.url || !normalize) {
      return { key, status: "skipped", rows: [], data: null };
    }

    const rows = source.type === "sharepoint-list"
      ? await P.fetchSharePointList(source.url)
      : await P.fetchCsv(source.url);
    return {
      key,
      status: "loaded",
      rows,
      data: normalize(rows)
    };
  }

  async function refreshSource(key) {
    const appData = { ...P.getAppData() };
    const result = await loadSource(key);
    if (result.status === "loaded" && result.data) {
      applySourceData(appData, key, result.data);
      P.setAppData(appData);
    }
    P.sourceStatus = [
      ...(P.sourceStatus || []).filter(item => item.key !== key),
      result
    ];
    return result;
  }

  function applySourceData(appData, key, data) {
    if (key === "supervision") appData.supervisors = data;
    else if (key === "network") appData.networkData = data;
    else if (key === "inventory") {
      if (Array.isArray(data) && data.some(item => item?.school)) appData.schoolAssets = data;
      else appData.inventory = data;
    } else appData[key] = data;
    return appData;
  }

  function sourceResult(key) {
    return (P.sourceStatus || []).find(item => item.key === key) || null;
  }

  async function ensureSource(key) {
    const current = sourceResult(key);
    if (current?.status === "loaded" || current?.status === "loading") return current;
    P.sourceStatus = [
      ...(P.sourceStatus || []).filter(item => item.key !== key),
      { key, status: "loading" }
    ];
    try {
      return await refreshSource(key);
    } catch (error) {
      const result = { key, status: "error", error };
      P.sourceStatus = [
        ...(P.sourceStatus || []).filter(item => item.key !== key),
        result
      ];
      throw error;
    }
  }

  async function loadConfiguredSources() {
    const nextData = { ...P.getAppData() };
    const results = [];

    for (const key of Object.keys(P.sources || {})) {
      try {
        if (P.sources[key]?.metadata?.autoLoad === false) {
          results.push({ key, status: "skipped", rows: [], data: null, reason: "manual" });
          continue;
        }
        const result = await loadSource(key);
        results.push(result);
        if (result.status === "loaded" && result.data) {
          applySourceData(nextData, key, result.data);
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
  P.refreshSource = refreshSource;
  P.ensureSource = ensureSource;
  P.sourceResult = sourceResult;
  P.loadConfiguredSources = loadConfiguredSources;
})();
