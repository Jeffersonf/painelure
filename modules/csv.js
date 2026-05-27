(function () {
  const P = window.PainelURE;

  function parseCsvLine(line, delimiter) {
    const cells = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === delimiter && !quoted) {
        cells.push(cell.trim());
        cell = "";
        continue;
      }

      cell += char;
    }

    cells.push(cell.trim());
    return cells;
  }

  function detectDelimiter(text) {
    const firstLine = text.split(/\r?\n/).find(line => line.trim()) || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ";" : ",";
  }

  function normalizeHeader(header) {
    return P.normalize(header)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeRowKeys(row) {
    const textFields = row?.FieldValuesAsText || row?.fieldvaluesastext || {};
    return Object.entries({ ...(row || {}), ...(textFields || {}) }).reduce((acc, [key, value]) => {
      const normalized = normalizeHeader(key);
      if (normalized) acc[normalized] = value;
      return acc;
    }, {});
  }

  function parseCsv(text, options = {}) {
    const delimiter = options.delimiter || detectDelimiter(text);
    const lines = String(text || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(line => line.trim());

    if (!lines.length) return [];

    const headerCounts = {};
    const headers = parseCsvLine(lines[0], delimiter).map(header => {
      const base = normalizeHeader(header) || "col";
      headerCounts[base] = (headerCounts[base] || 0) + 1;
      return headerCounts[base] === 1 ? base : `${base}_${headerCounts[base]}`;
    });
    return lines.slice(1).map(line => {
      const cells = parseCsvLine(line, delimiter);
      return headers.reduce((row, header, index) => {
        row[header || `col_${index}`] = cells[index] ?? "";
        return row;
      }, {});
    });
  }

  async function fetchCsv(url, options = {}) {
    if (!url) throw new Error("Fonte CSV não configurada.");
    const timeoutMs = options.timeoutMs || 6000;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { cache: "no-store", signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Erro ao carregar CSV: ${response.status}`);
    return parseCsv(await response.text());
  }

  function sharePointApiUrl(url) {
    const parsed = new URL(url, window.location.href);
    const match = parsed.pathname.match(/^(.*)\/Lists\/([^/]+)\/AllItems\.aspx$/i);
    if (!match) return url;
    const sitePath = match[1];
    const listName = decodeURIComponent(match[2]);
    const listPath = `${decodeURIComponent(sitePath)}/Lists/${listName}`.replace(/'/g, "''");
    const query = new URLSearchParams({
      "$top": "5000",
      "$expand": "FieldValuesAsText"
    });
    return `${parsed.origin}${sitePath}/_api/web/GetList('${listPath}')/items?${query}`;
  }

  function unwrapSharePointItems(payload) {
    if (Array.isArray(payload?.value)) return payload.value;
    if (Array.isArray(payload?.d?.results)) return payload.d.results;
    if (Array.isArray(payload?.d)) return payload.d;
    return [];
  }

  function sharePointProxyUrl(url) {
    const configured = String(window.PAINELURE_API_URL || "").replace(/\/+$/, "");
    const renderApi = "https://painelure2-api.onrender.com";
    const host = location.hostname;
    const localStatic = (host === "localhost" || host === "127.0.0.1") && location.port !== "4173";
    const base = configured || (host.endsWith("github.io") || localStatic || location.protocol === "file:" ? renderApi : "");
    const path = `/api/sharepoint-list?url=${encodeURIComponent(url)}`;
    return base ? `${base}${path}` : path;
  }

  async function fetchSharePointViaProxy(url, options = {}) {
    const timeoutMs = options.timeoutMs || 15000;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(sharePointProxyUrl(url), { cache: "no-store", signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Proxy SharePoint falhou: ${response.status}`);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "SharePoint não retornou dados.");
    return (payload.rows || []).map(normalizeRowKeys);
  }

  async function fetchSharePointList(url, options = {}) {
    if (!url) throw new Error("Fonte SharePoint não configurada.");
    try {
      return await fetchSharePointViaProxy(url, options);
    } catch (proxyError) {
      console.warn("[PainelURE] Proxy SharePoint falhou, tentando direto:", proxyError);
    }
    const timeoutMs = options.timeoutMs || 9000;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(sharePointApiUrl(url), {
        cache: "no-store",
        credentials: "include",
        headers: { Accept: "application/json;odata=nometadata" },
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeout);
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("SharePoint negou acesso. Entre na conta autorizada e tente Atualizar novamente.");
      }
      throw new Error(`Erro ao carregar SharePoint: ${response.status}`);
    }
    return unwrapSharePointItems(await response.json()).map(normalizeRowKeys);
  }

  P.parseCsv = parseCsv;
  P.fetchCsv = fetchCsv;
  P.fetchSharePointList = fetchSharePointList;
})();
