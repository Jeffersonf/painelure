(function () {
  const P = window.PainelURE;
  const inflightSources = new Map();

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
      : key === "inventory"
        ? await inventoryPayload(source, rows)
        : rows;
    return {
      key,
      status: "loaded",
      rows,
      data: normalize(payload)
    };
  }

  async function loadSourceOnce(key) {
    if (inflightSources.has(key)) return inflightSources.get(key);
    const promise = loadSource(key).finally(() => inflightSources.delete(key));
    inflightSources.set(key, promise);
    return promise;
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
      console.warn("[PainelURE] Painel oficial de supervisão não carregado:", error);
      return { visitRows, panelRows: [] };
    }
  }

  async function refreshSource(key) {
    const appData = { ...P.getAppData() };
    const label = P.sources?.[key]?.label || key;
    P.showToast?.("Atualizando", `${label} em sincronização.`, "info", { delay: 7600 });
    const result = await loadSourceOnce(key);
    result.updatedAt = new Date().toISOString();
    if (result.status === "loaded" && result.data && hasMeaningfulSourceData(result.data)) {
      applySourceData(appData, key, result.data);
      P.setAppData(appData);
      P.saveAppData?.();
    } else if (result.status === "loaded" && !hasMeaningfulSourceData(result.data)) {
      result.status = "empty";
      result.warning = "Fonte retornou vazia; dados anteriores foram mantidos.";
    }
    P.sourceStatus = [
      ...(P.sourceStatus || []).filter(item => item.key !== key),
      result
    ];
    if (result.status === "loaded") P.showToast?.("Atualizado", `${label}: ${result.rows?.length || 0} linha(s) carregada(s).`, "ok", { delay: 7600 });
    if (result.status === "empty") P.showToast?.("Fonte vazia", `${label} não substituiu os dados atuais.`, "warn", { delay: 9000 });
    return result;
  }

  async function inventoryPayload(source, rows) {
    const schoolLookupUrl = source?.metadata?.schoolLookupUrl;
    if (!schoolLookupUrl) return rows;
    try {
      const schoolRows = await P.fetchSharePointList(schoolLookupUrl);
      return { rows, schoolRows };
    } catch (error) {
      console.warn("[PainelURE] Mapa de escolas do inventário não carregado:", error);
      return { rows, schoolRows: [] };
    }
  }

  function hasMeaningfulSourceData(data) {
    if (Array.isArray(data)) return data.length > 0;
    if (data && typeof data === "object") return Object.keys(data).length > 0;
    return Boolean(data);
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
      { key, status: "loading", updatedAt: new Date().toISOString() }
    ];
    try {
      return await refreshSource(key);
    } catch (error) {
      const result = { key, status: "error", error, updatedAt: new Date().toISOString() };
      P.sourceStatus = [
        ...(P.sourceStatus || []).filter(item => item.key !== key),
        result
      ];
      P.showToast?.("Erro", `${P.sources?.[key]?.label || key}: ${error?.message || "falha na sincronização"}.`, "danger", { delay: 10000 });
      throw error;
    }
  }

  async function loadConfiguredSources(options = {}) {
    const nextData = { ...P.getAppData() };
    const results = [];
    const includeManual = options.includeManual === true;
    const onlyKeys = Array.isArray(options.keys) && options.keys.length ? new Set(options.keys) : null;
    const orderedKeys = options.order || ["cars", "supervision", "satisfaction", "calendar", "contacts", "schools", "network", "inventory"];
    const keys = [
      ...orderedKeys.filter(key => P.sources?.[key]),
      ...Object.keys(P.sources || {}).filter(key => !orderedKeys.includes(key))
    ];

    for (const key of keys) {
      try {
        if (onlyKeys && !onlyKeys.has(key)) continue;
        if (!includeManual && P.sources[key]?.metadata?.autoLoad === false) {
          results.push({ key, status: "skipped", rows: [], data: null, reason: "manual", updatedAt: new Date().toISOString() });
          continue;
        }
        const result = await loadSourceOnce(key);
        result.updatedAt = new Date().toISOString();
        results.push(result);
        if (result.status === "loaded" && result.data && hasMeaningfulSourceData(result.data)) {
          applySourceData(nextData, key, result.data);
        } else if (result.status === "loaded" && !hasMeaningfulSourceData(result.data)) {
          result.status = "empty";
          result.warning = "Fonte retornou vazia; dados anteriores foram mantidos.";
        }
      } catch (error) {
        results.push({ key, status: "error", error, updatedAt: new Date().toISOString() });
        console.warn(`[PainelURE] Fonte ${key} falhou:`, error);
      }
    }

    P.setAppData(nextData);
    P.sourceStatus = results;
    if (results.some(result => result.status === "loaded" && result.data && hasMeaningfulSourceData(result.data))) {
      P.saveAppData?.();
    }
    return results;
  }

  P.loadSource = loadSource;
  P.refreshSource = refreshSource;
  P.ensureSource = ensureSource;
  P.sourceResult = sourceResult;
  P.loadConfiguredSources = loadConfiguredSources;
  P.applyLoadedSourceData = applyLoadedSourceData;
})();
