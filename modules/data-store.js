(function () {
  const P = window.PainelURE;

  const EMPTY_DATA = {
    schools: [],
    networkData: {},
    schoolInventoryMetrics: {},
    schoolAssets: [],
    inventory: [],
    supervisors: [],
    contacts: [],
    calendar: [],
    profiles: [],
    quality: [],
    ctcVisits: [],
    calls: [],
    reports: [],
    adminChecks: []
  };
  const STORAGE_KEY = "painelure2_state_v1";

  function normalizeAppData(source = {}) {
    return {
      schools: Array.isArray(source.schools) ? source.schools : [],
      networkData: source.networkData && typeof source.networkData === "object" ? source.networkData : {},
      schoolInventoryMetrics: source.schoolInventoryMetrics && typeof source.schoolInventoryMetrics === "object" ? source.schoolInventoryMetrics : {},
      schoolAssets: Array.isArray(source.schoolAssets) ? source.schoolAssets : [],
      inventory: Array.isArray(source.inventory) ? source.inventory : [],
      supervisors: Array.isArray(source.supervisors) ? source.supervisors : [],
      contacts: Array.isArray(source.contacts) ? source.contacts : [],
      calendar: Array.isArray(source.calendar) ? source.calendar : [],
      profiles: Array.isArray(source.profiles) ? source.profiles : [],
      quality: Array.isArray(source.quality) ? source.quality : [],
      ctcVisits: Array.isArray(source.ctcVisits) ? source.ctcVisits : [],
      calls: Array.isArray(source.calls) ? source.calls : [],
      reports: Array.isArray(source.reports) ? source.reports : [],
      adminChecks: Array.isArray(source.adminChecks) ? source.adminChecks : []
    };
  }

  function setAppData(nextData) {
    P.appData = normalizeAppData({ ...EMPTY_DATA, ...nextData });
    return P.appData;
  }

  function getAppData() {
    if (!P.appData) {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved?.appData) return setAppData({ ...(P.mockData || EMPTY_DATA), ...(P.seedData || {}), ...saved.appData });
      } catch (error) {
        console.warn("[PainelURE] Estado local ignorado:", error);
      }
    }
    if (!P.appData) return setAppData({ ...(P.mockData || EMPTY_DATA), ...(P.seedData || {}) });
    return P.appData;
  }

  function saveAppData() {
    const payload = {
      savedAt: new Date().toISOString(),
      appData: getAppData()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function importAppData(payload) {
    const appData = payload?.appData || payload;
    setAppData(appData);
    saveAppData();
    return P.appData;
  }

  P.EMPTY_DATA = EMPTY_DATA;
  P.normalizeAppData = normalizeAppData;
  P.setAppData = setAppData;
  P.getAppData = getAppData;
  P.saveAppData = saveAppData;
  P.importAppData = importAppData;
  P.STORAGE_KEY = STORAGE_KEY;
})();
