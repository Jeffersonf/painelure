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

  function preserveSupervisorScope(existing, incoming) {
    if (!P.isSupervisorUser?.() || !incoming) return incoming;
    const scopedLocal = P.scopedData?.(existing);
    if (!scopedLocal?.supervisors?.length) return incoming;
    const needsSupervisor = !Array.isArray(incoming.supervisors) || incoming.supervisors.length === 0;
    const needsSchools = !Array.isArray(incoming.schools) || incoming.schools.length === 0;
    if (!needsSupervisor && !needsSchools) return incoming;
    return {
      ...incoming,
      schools: needsSchools ? scopedLocal.schools || [] : incoming.schools,
      supervisors: needsSupervisor ? scopedLocal.supervisors || [] : incoming.supervisors,
      schoolProfiles: needsSchools ? scopedLocal.schoolProfiles || [] : incoming.schoolProfiles
    };
  }

  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || API_TIMEOUT);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
        const existing = P.getAppData() || {};
        P.setAppData({ ...existing, ...preserveSupervisorScope(existing, appData) });
        P.backendStatus = { ok: true, updatedAt: payload.data.updatedAt || "" };
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
    return fetchApi("/api/data", {
      method: "PUT",
      headers,
      body: JSON.stringify({ appData: P.getAppData() }),
      timeoutMs: 12000
    });
  }

  async function loginBackend(credentials) {
    return fetchApi("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials || {}),
      timeoutMs: 15000
    });
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
  P.loadBackendHealth = loadBackendHealth;
  P.loadBackendSources = loadBackendSources;
  P.saveBackendSources = saveBackendSources;
  P.loadBackendSnapshots = loadBackendSnapshots;
  P.loadBackendAudit = loadBackendAudit;
  P.loadBackendImports = loadBackendImports;
})();
