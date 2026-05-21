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
    const payload = key === "supervision"
      ? await supervisionPayload(source, rows)
      : rows;
    return {
      key,
      status: "loaded",
      rows,
      data: normalize(payload)
    };
  }

  function googleSheetGidCsvUrl(url, gid) {
    const text = String(url || "").trim();
    if (!gid) return text;
    const publishedMatch = text.match(/docs\.google\.com\/spreadsheets\/d\/e\/([^/]+)/i);
    if (publishedMatch) {
      return `https://docs.google.com/spreadsheets/d/e/${publishedMatch[1]}/pub?output=csv&single=true&gid=${encodeURIComponent(gid)}`;
    }
    const regularMatch = text.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);
    if (regularMatch) {
      return `https://docs.google.com/spreadsheets/d/${regularMatch[1]}/export?format=csv&gid=${encodeURIComponent(gid)}`;
    }
    return text;
  }

  async function supervisionPayload(source, visitRows) {
    const panelGid = source?.metadata?.panelGid;
    if (!panelGid) return visitRows;
    try {
      const panelRows = await P.fetchCsv(googleSheetGidCsvUrl(source.url, panelGid));
      return { visitRows, panelRows };
    } catch (error) {
      console.warn("[PainelURE] Painel oficial de supervisao nao carregado:", error);
      return { visitRows, panelRows: [] };
    }
  }

  async function refreshSource(key) {
    const appData = { ...P.getAppData() };
    const label = P.sources?.[key]?.label || key;
    P.showToast?.("Atualizando", `${label} em sincronizacao.`, "info", { delay: 2400 });
    const result = await loadSource(key);
    if (result.status === "loaded" && result.data) {
      applySourceData(appData, key, result.data);
      P.setAppData(appData);
    }
    P.sourceStatus = [
      ...(P.sourceStatus || []).filter(item => item.key !== key),
      result
    ];
    if (result.status === "loaded") P.showToast?.("Atualizado", `${label}: ${result.rows?.length || 0} linha(s) carregada(s).`, "ok");
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

  function applyLoadedSourceData(appData = P.getAppData()) {
    const nextData = { ...(appData || {}) };
    (P.sourceStatus || []).forEach(result => {
      if (result?.status === "loaded" && result.data) {
        applySourceData(nextData, result.key, result.data);
      }
    });
    P.setAppData(nextData);
    return nextData;
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
      P.showToast?.("Erro", `${P.sources?.[key]?.label || key}: ${error?.message || "falha na sincronizacao"}.`, "danger");
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
  P.applyLoadedSourceData = applyLoadedSourceData;
})();
