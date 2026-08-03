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
    P.showSyncProgress?.(8, "Atualizando dados oficiais", `Estamos buscando as informações mais recentes de ${label}. Você pode continuar usando o painel enquanto isso.`, "info", { id: `source-${key}` });
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
    if (result.status === "loaded") P.showSyncProgress?.(100, "Atualização concluída", `${label} foi conferida e ${result.rows?.length || 0} registro(s) foram carregados com sucesso.`, "ok", { id: `source-${key}` });
    if (result.status === "empty") P.showSyncProgress?.(100, "Nenhum dado novo encontrado", `${label} respondeu sem registros. Para sua segurança, as informações anteriores foram mantidas.`, "warn", { id: `source-${key}`, delay: 20000 });
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
    if (key === "supervision") {
      const currentByName = new Map((appData.supervisors || []).map(supervisor => [P.normalize(supervisor.name), supervisor]));
      appData.supervisors = data.map(supervisor => ({
        ...supervisor,
        justifications: { ...(currentByName.get(P.normalize(supervisor.name))?.justifications || {}) }
      }));
    }
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
    const progressKeys = keys.filter(key => (!onlyKeys || onlyKeys.has(key)) && (includeManual || P.sources[key]?.metadata?.autoLoad !== false));
    const progressStart = Number(options.progressStart ?? 0);
    const progressEnd = Number(options.progressEnd ?? 100);
    let progressDone = 0;
    if (progressKeys.length) {
      P.showSyncProgress?.(progressStart, "Sincronizando fontes oficiais", `O PainelURE vai conferir ${progressKeys.length} fonte(s) de informação. Isso pode levar alguns instantes.`, "info", { id: options.progressId || "official-sync" });
    }

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
      } finally {
        if (progressKeys.includes(key)) {
          progressDone += 1;
          const progress = progressStart + ((progressEnd - progressStart) * progressDone / progressKeys.length);
          const label = P.sources?.[key]?.label || key;
          P.showSyncProgress?.(progress, "Sincronizando fontes oficiais", `${label} foi conferida. Restam ${Math.max(0, progressKeys.length - progressDone)} fonte(s).`, "info", { id: options.progressId || "official-sync" });
        }
      }
    }

    P.setAppData(nextData);
    P.sourceStatus = results;
    if (results.some(result => result.status === "loaded" && result.data && hasMeaningfulSourceData(result.data))) {
      P.saveAppData?.();
    }
    if (progressKeys.length && progressEnd >= 100) {
      const failed = results.filter(result => result.status === "error");
      P.showSyncProgress?.(100,
        failed.length ? "Sincronização concluída com avisos" : "Sincronização concluída",
        failed.length
          ? `${failed.length} fonte(s) não responderam. Os dados anteriores foram mantidos e você pode tentar novamente mais tarde.`
          : "Todas as fontes disponíveis foram conferidas. O painel já mostra as informações mais recentes.",
        failed.length ? "warn" : "ok",
        { id: options.progressId || "official-sync", delay: failed.length ? 22000 : 18000 }
      );
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
