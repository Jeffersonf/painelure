(function () {
  const P = window.PainelURE;

  const EMPTY_DATA = {
    schools: [],
    networkData: {},
    schoolInventoryMetrics: {},
    schoolProfiles: [],
    schoolAssets: [],
    inventory: [],
    supervisors: [],
    contacts: [],
    calendar: [],
    profiles: [],
    quality: [],
    ctcVisits: [],
    cars: [],
    calls: [],
    reports: [],
    users: [],
    adminChecks: []
  };
  const STORAGE_VERSION = 2;
  const STORAGE_KEY = "painelure2_state_v2";

  function hasMeaningfulAppData(source = {}) {
    return Boolean(
      (Array.isArray(source.schools) && source.schools.length)
      || (Array.isArray(source.contacts) && source.contacts.length)
      || (Array.isArray(source.schoolAssets) && source.schoolAssets.length)
      || (source.networkData && Object.keys(source.networkData).length)
    );
  }

  function cleanContactPhoto(photo) {
    const value = String(photo || "").trim();
    if (value.startsWith("data:image/") || value.startsWith("blob:")) return value;
    return "";
  }

  function normalizeAppData(source = {}) {
    return {
      schools: Array.isArray(source.schools) ? source.schools : [],
      networkData: source.networkData && typeof source.networkData === "object" ? source.networkData : {},
      schoolInventoryMetrics: source.schoolInventoryMetrics && typeof source.schoolInventoryMetrics === "object" ? source.schoolInventoryMetrics : {},
      schoolProfiles: Array.isArray(source.schoolProfiles) ? source.schoolProfiles : [],
      schoolAssets: Array.isArray(source.schoolAssets) ? source.schoolAssets : [],
      inventory: Array.isArray(source.inventory) ? source.inventory : [],
      supervisors: Array.isArray(source.supervisors) ? source.supervisors : [],
      contacts: Array.isArray(source.contacts) ? source.contacts.map(contact => ({
        ...contact,
        photo: cleanContactPhoto(contact.photo)
      })) : [],
      calendar: Array.isArray(source.calendar) ? source.calendar : [],
      profiles: Array.isArray(source.profiles) ? source.profiles : [],
      quality: Array.isArray(source.quality) ? source.quality : [],
      ctcVisits: Array.isArray(source.ctcVisits) ? source.ctcVisits : [],
      cars: Array.isArray(source.cars) ? source.cars : [],
      calls: Array.isArray(source.calls) ? source.calls : [],
      reports: Array.isArray(source.reports) ? source.reports : [],
      users: Array.isArray(source.users) ? source.users : [],
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
        if (saved?.version === STORAGE_VERSION && saved?.appData) {
          if (!hasMeaningfulAppData(saved.appData) && hasMeaningfulAppData(P.seedData)) {
            localStorage.removeItem(STORAGE_KEY);
            return setAppData({ ...(P.mockData || EMPTY_DATA), ...(P.seedData || {}) });
          }
          const merged = { ...(P.mockData || EMPTY_DATA), ...(P.seedData || {}), ...saved.appData };
          if (!saved.appData.schoolProfiles?.length && P.seedData?.schoolProfiles?.length) {
            merged.schoolProfiles = P.seedData.schoolProfiles;
          }
          return setAppData(merged);
        }
      } catch (error) {
        console.warn("[PainelURE] Estado local ignorado:", error);
      }
    }
    if (!P.appData) return setAppData({ ...(P.mockData || EMPTY_DATA), ...(P.seedData || {}) });
    return P.appData;
  }

  function saveAppData() {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      appData: getAppData()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("[PainelURE] Estado local não salvo:", error);
    }
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
  P.STORAGE_VERSION = STORAGE_VERSION;
  P.STORAGE_KEY = STORAGE_KEY;
})();
