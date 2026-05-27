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
    satisfaction: [],
    profiles: [],
    quality: [],
    ctcVisits: [],
    cars: [],
    calls: [],
    reports: [],
    users: [],
    accessRules: {},
    pageMaintenance: {},
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

  function schoolKey(school = {}) {
    return P.normalize?.(school.name || school.school || school.nome || "") || String(school.name || school.school || school.nome || "").toLowerCase().trim();
  }

  function staticSchoolCatalog() {
    return Array.isArray(P.seedData?.schools) ? P.seedData.schools : [];
  }

  function normalizeSchoolRecord(school = {}) {
    const fixed = staticSchoolCatalog().find(item => schoolKey(item) === schoolKey(school)) || {};
    const city = fixed.city || fixed.municipio || fixed.cidade || school.city || school.municipio || school.cidade || school.town || school.municipality || "";
    const cie = fixed.cie || fixed.codigoCie || fixed.codigo_cie || school.cie || school.codigoCie || school.codigo_cie || school.code || school.codigo || "";
    return {
      ...school,
      ...fixed,
      city,
      cie
    };
  }

  function normalizeSchools(source = {}) {
    const fixedSchools = staticSchoolCatalog();
    const incoming = Array.isArray(source.schools) ? source.schools : [];
    const incomingByKey = new Map(incoming.map(school => [schoolKey(school), school]));
    const mergedFixed = fixedSchools.map(fixed => normalizeSchoolRecord({ ...(incomingByKey.get(schoolKey(fixed)) || {}), ...fixed }));
    const fixedKeys = new Set(mergedFixed.map(schoolKey));
    const unknownIncoming = incoming.filter(school => schoolKey(school) && !fixedKeys.has(schoolKey(school))).map(normalizeSchoolRecord);
    return [...mergedFixed, ...unknownIncoming];
  }

  function userKey(user = {}) {
    return P.normalize?.(user.id || user.username || user.login || user.name || "") || String(user.id || user.username || user.login || user.name || "").toLowerCase().trim();
  }

  function mergeUsersWithSeed(users = []) {
    const incoming = Array.isArray(users) ? users : [];
    const seedUsers = Array.isArray(P.seedData?.users) ? P.seedData.users : [];
    const byKey = new Map(incoming.map(user => [userKey(user), user]));
    seedUsers.forEach(seed => {
      const key = userKey(seed);
      if (!key || byKey.has(key)) return;
      byKey.set(key, seed);
    });
    return [...byKey.values()];
  }

  function normalizeAppData(source = {}) {
    return {
      schools: normalizeSchools(source),
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
      satisfaction: Array.isArray(source.satisfaction) ? source.satisfaction : [],
      profiles: Array.isArray(source.profiles) ? source.profiles : [],
      quality: Array.isArray(source.quality) ? source.quality : [],
      ctcVisits: Array.isArray(source.ctcVisits) ? source.ctcVisits : [],
      cars: Array.isArray(source.cars) ? source.cars : [],
      calls: Array.isArray(source.calls) ? source.calls : [],
      reports: Array.isArray(source.reports) ? source.reports : [],
      users: mergeUsersWithSeed(source.users),
      accessRules: source.accessRules && typeof source.accessRules === "object" ? source.accessRules : {},
      pageMaintenance: source.pageMaintenance && typeof source.pageMaintenance === "object" ? source.pageMaintenance : {},
      adminChecks: Array.isArray(source.adminChecks) ? source.adminChecks : []
    };
  }

  function appDataForBackend(source = getAppData()) {
    const { schools, ...mutableData } = normalizeAppData(source);
    return mutableData;
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
          P.localCacheMeta = {
            savedAt: saved.savedAt || "",
            backendUpdatedAt: saved.backendUpdatedAt || ""
          };
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
      backendUpdatedAt: P.backendStatus?.updatedAt || P.localCacheMeta?.backendUpdatedAt || "",
      appData: getAppData()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      P.localCacheMeta = {
        savedAt: payload.savedAt,
        backendUpdatedAt: payload.backendUpdatedAt
      };
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
  P.appDataForBackend = appDataForBackend;
  P.setAppData = setAppData;
  P.getAppData = getAppData;
  P.saveAppData = saveAppData;
  P.importAppData = importAppData;
  P.STORAGE_VERSION = STORAGE_VERSION;
  P.STORAGE_KEY = STORAGE_KEY;
})();
