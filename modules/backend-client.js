(function () {
  const P = window.PainelURE;
  const API_TIMEOUT = 3000;
  const RENDER_API = "https://painelure2-api.onrender.com";

  function defaultApiBase() {
    const configured = String(window.PAINELURE_API_URL || "").replace(/\/+$/, "");
    if (configured) return configured;
    if (location.hostname.endsWith("github.io")) return RENDER_API;
    if ((location.hostname === "localhost" || location.hostname === "127.0.0.1") && location.port !== "4173") return RENDER_API;
    if (location.protocol === "file:") return RENDER_API;
    return "";
  }

  const API_BASE = defaultApiBase();
  const LOCAL_API = "http://localhost:4173";

  function isLocalPreview() {
    return (location.hostname === "localhost" || location.hostname === "127.0.0.1") && location.port !== "4173";
  }

  function shouldTryLocalFallback(error) {
    const message = String(error?.message || error || "");
    return isLocalPreview() && API_BASE !== LOCAL_API && /HTTP 405|aborted|network|failed to fetch/i.test(message);
  }

  function apiPath(path, base = API_BASE) {
    return base ? `${base}${path}` : `.${path}`;
  }

  function delay(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function looksTransient(error) {
    return /aborted|network|failed to fetch|HTTP 502|HTTP 503|HTTP 504/i.test(String(error?.message || error || ""));
  }

  function progressDone(text) {
    const [done] = String(text || "0/0").split("/").map(value => Number(value) || 0);
    return done || 0;
  }

  function supervisionDataScore(supervisors = []) {
    if (!Array.isArray(supervisors) || !supervisors.length) return 0;
    return supervisors.reduce((score, supervisor) => {
      const monthlyVisits = Number(supervisor?.monthlyVisits || 0);
      const records = Array.isArray(supervisor?.visitRecords) ? supervisor.visitRecords.length : 0;
      const monthDone = progressDone(supervisor?.month);
      const weekDone = progressDone(supervisor?.week);
      return score + monthlyVisits + records + monthDone + weekDone;
    }, 0);
  }

  function sourceDataCount(items = []) {
    return Array.isArray(items) ? items.length : 0;
  }

  function mergeBackendAppData(currentData = {}, backendData = {}) {
    const merged = { ...(currentData || {}), ...(backendData || {}) };
    const currentSupervisionScore = supervisionDataScore(currentData?.supervisors);
    const backendSupervisionScore = supervisionDataScore(backendData?.supervisors);
    if (currentSupervisionScore > backendSupervisionScore) {
      merged.supervisors = currentData.supervisors;
    }
    if (sourceDataCount(currentData?.satisfaction) > sourceDataCount(backendData?.satisfaction)) {
      merged.satisfaction = currentData.satisfaction;
    }
    if (sourceDataCount(currentData?.schoolAssets) > sourceDataCount(backendData?.schoolAssets)) {
      merged.schoolAssets = currentData.schoolAssets;
      merged.schoolInventoryMetrics = currentData.schoolInventoryMetrics;
      merged.inventory = currentData.inventory;
      merged.inventoryImportMeta = currentData.inventoryImportMeta;
    }
    return merged;
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || API_TIMEOUT);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch (error) {
          payload = null;
        }
        const message = payload?.error || `HTTP ${response.status}`;
        const fetchError = new Error(message);
        fetchError.status = response.status;
        fetchError.payload = payload;
        throw fetchError;
      }
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function fetchApi(path, options = {}) {
    try {
      return await fetchJson(apiPath(path), options);
    } catch (error) {
      if (!shouldTryLocalFallback(error)) throw error;
      try {
        return await fetchJson(apiPath(path, LOCAL_API), options);
      } catch (fallbackError) {
        fallbackError.message = /HTTP 405/i.test(String(fallbackError.message || ""))
          ? "HTTP 405 - reinicie o servidor local do PainelURE 2.0"
          : fallbackError.message;
        throw fallbackError;
      }
    }
  }

  async function loadBackendData(token = "") {
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const payload = await fetchApi("/api/data", { headers, timeoutMs: 12000 });
      const appData = payload?.data?.appData;
      if (appData) {
        P.setAppData(mergeBackendAppData(P.getAppData() || {}, appData));
        P.applyLoadedSourceData?.();
        P.backendStatus = { ok: true, updatedAt: payload.data.updatedAt || "" };
        P.saveAppData?.();
      }
      return payload;
    } catch (error) {
      P.backendStatus = { ok: false, error: error.message };
      return null;
    }
  }

  async function pushBackendData(token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const payload = await fetchApi("/api/data", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        appData: P.appDataForBackend ? P.appDataForBackend() : P.getAppData(),
        baseUpdatedAt: P.backendStatus?.updatedAt || P.localCacheMeta?.backendUpdatedAt || ""
      }),
      timeoutMs: 12000
    });
    if (payload?.data?.updatedAt) {
      P.backendStatus = { ok: true, updatedAt: payload.data.updatedAt };
      P.saveAppData?.();
    }
    return payload;
  }

  async function loginBackend(credentials) {
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials || {}),
      timeoutMs: 60000
    };
    try {
      return await fetchApi("/api/auth/login", options);
    } catch (error) {
      if (!looksTransient(error)) throw error;
      await delay(1600);
      return fetchApi("/api/auth/login", options);
    }
  }

  async function loadBackendUser(token) {
    if (!token) return null;
    return fetchApi("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 15000
    });
  }

  async function logoutBackend(token) {
    if (!token) return { ok: true };
    return fetchApi("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 12000
    });
  }

  async function updateBackendUser(token, patch) {
    if (!token) return null;
    return fetchApi("/api/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(patch || {}),
      timeoutMs: 12000
    });
  }

  async function loadBackendUsers(token) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi("/api/users", { headers, timeoutMs: 4000 });
  }

  async function createBackendUser(token, user) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi("/api/users", {
      method: "POST",
      headers,
      body: JSON.stringify(user || {}),
      timeoutMs: 4000
    });
  }

  async function updateBackendUserById(token, id, patch) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi(`/api/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch || {}),
      timeoutMs: 4000
    });
  }

  async function deleteBackendUser(token, id) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi(`/api/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
      timeoutMs: 4000
    });
  }

  async function loadBackendHealth() {
    return fetchApi("/api/health", { timeoutMs: 15000 });
  }

  async function loadBackendSources() {
    return fetchApi("/api/sources", { timeoutMs: 4000 });
  }

  async function saveBackendSources(token, sources) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi("/api/sources", {
      method: "PUT",
      headers,
      body: JSON.stringify({ sources }),
      timeoutMs: 4000
    });
  }

  async function saveInternalData(token, internal) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload = null;
    try {
      payload = await fetchApi("/api/internal", {
        method: "PUT",
        headers,
        body: JSON.stringify({ internal: internal || {} }),
        timeoutMs: 12000
      });
    } catch (error) {
      if (!/HTTP 404|HTTP 405|Endpoint/i.test(String(error?.message || error || ""))) throw error;
      const appData = P.getAppData?.() || {};
      P.setAppData?.({ ...appData, internal: internal || {} });
      payload = await pushBackendData(token);
    }
    if (payload?.data?.updatedAt) {
      P.backendStatus = { ok: true, updatedAt: payload.data.updatedAt };
      P.saveAppData?.();
    }
    return payload;
  }

  async function loadBackendSnapshots(token, limit = 20) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi(`/api/snapshots?limit=${encodeURIComponent(limit)}`, { headers, timeoutMs: 4000 });
  }

  async function loadBackendAudit(token, limit = 50) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi(`/api/audit?limit=${encodeURIComponent(limit)}`, { headers, timeoutMs: 4000 });
  }

  async function loadBackendImports(token, limit = 20) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetchApi(`/api/imports?limit=${encodeURIComponent(limit)}`, { headers, timeoutMs: 4000 });
  }

  P.loadBackendData = loadBackendData;
  P.pushBackendData = pushBackendData;
  P.loginBackend = loginBackend;
  P.logoutBackend = logoutBackend;
  P.loadBackendUser = loadBackendUser;
  P.updateBackendUser = updateBackendUser;
  P.loadBackendUsers = loadBackendUsers;
  P.createBackendUser = createBackendUser;
  P.updateBackendUserById = updateBackendUserById;
  P.deleteBackendUser = deleteBackendUser;
  P.loadBackendHealth = loadBackendHealth;
  P.loadBackendSources = loadBackendSources;
  P.saveBackendSources = saveBackendSources;
  P.saveInternalData = saveInternalData;
  P.loadBackendSnapshots = loadBackendSnapshots;
  P.loadBackendAudit = loadBackendAudit;
  P.loadBackendImports = loadBackendImports;
})();
