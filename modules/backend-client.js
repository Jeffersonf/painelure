(function () {
  const P = window.PainelURE;
  const API_TIMEOUT = 900;
  const API_BASE = String(window.PAINELURE_API_URL || "").replace(/\/+$/, "");

  function apiPath(path) {
    return API_BASE ? `${API_BASE}${path}` : `.${path}`;
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

  async function loadBackendData() {
    if (location.protocol === "file:") return null;
    try {
      const payload = await fetchJson(apiPath("/api/data"));
      const appData = payload?.data?.appData;
      if (appData) {
        P.setAppData({ ...(P.getAppData() || {}), ...appData });
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
    return fetchJson(apiPath("/api/data"), {
      method: "PUT",
      headers,
      body: JSON.stringify({ appData: P.getAppData() }),
      timeoutMs: 4000
    });
  }

  P.loadBackendData = loadBackendData;
  P.pushBackendData = pushBackendData;
})();
