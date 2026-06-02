(function () {
  const P = window.PainelURE;
  const DEFAULT_ACCESS = {
    Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "satisfaction", "reports", "profiles", "quality", "admin"],
    Supervisao: ["dashboard", "schools", "supervision", "contacts", "calendar", "satisfaction"],
    "Tecnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar", "satisfaction"],
    SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar", "satisfaction"],
    SEINTEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "satisfaction", "reports", "profiles", "quality"],
    CTC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar", "satisfaction"],
    Gabinete: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "satisfaction"],
    Dirigente: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "satisfaction"],
    SEOM: ["dashboard", "schools", "contacts", "cars", "calendar", "satisfaction"],
    SEFISC: ["dashboard", "cars", "calendar", "satisfaction"],
    SEGRE: ["dashboard", "cars", "calendar", "satisfaction"],
    SEVESC: ["dashboard", "cars", "calendar", "satisfaction"],
    SEMAT: ["dashboard", "cars", "calendar", "satisfaction"],
    SEPES: ["dashboard", "cars", "calendar", "satisfaction"],
    SEFREP: ["dashboard", "cars", "calendar", "satisfaction"],
    SEAPE: ["dashboard", "cars", "calendar", "satisfaction"],
    SEAFIM: ["dashboard", "cars", "calendar", "satisfaction"],
    SEFIN: ["dashboard", "cars", "calendar", "satisfaction"],
    SECOMSE: ["dashboard", "cars", "calendar", "satisfaction"],
    Carros: ["dashboard", "cars", "calendar", "satisfaction"],
    Pedagogico: ["dashboard", "schools", "supervision", "contacts", "calendar", "satisfaction"],
    Consulta: ["dashboard", "schools", "contacts", "calendar", "satisfaction"]
  };
  const ACCESS = DEFAULT_ACCESS;
  const FULL_NON_ADMIN_ACCESS = DEFAULT_ACCESS.Administrador.filter(page => page !== "admin");
  const ROLE_EMOJI = {
    Administrador: "🛡️",
    Supervisao: "🧭",
    "Tecnicos CTC": "🛠️",
    SETEC: "🌐",
    SEINTEC: "📡",
    Gabinete: "📌",
    SEOM: "🏗️",
    Carros: "🚗",
    Pedagogico: "📚",
    Consulta: "👁️"
  };
  const ROLE_NAMES = {
    Administrador: "Administrador",
    Supervisao: "Supervisão",
    "Tecnicos CTC": "Técnicos CTC",
    SETEC: "SETEC",
    SEINTEC: "SEINTEC",
    CTC: "CTC",
    Gabinete: "Gabinete",
    Dirigente: "Dirigente",
    SEOM: "SEOM",
    SEFISC: "SEFISC",
    SEGRE: "SEGRE",
    SEVESC: "SEVESC",
    SEMAT: "SEMAT",
    SEPES: "SEPES",
    SEFREP: "SEFREP",
    SEAPE: "SEAPE",
    SEAFIM: "SEAFIM",
    SEFIN: "SEFIN",
    SECOMSE: "SECOMSE",
    Carros: "Carros",
    Pedagogico: "Pedagógico",
    Consulta: "Consulta"
  };

  function normalized(value) {
    if (P.normalize) return P.normalize(value);
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function activeIdentity() {
    return P.onlineUser?.() || P.activeUser?.() || null;
  }

  function isSupervisorRole(role = P.currentRole?.()) {
    return normalized(role).includes("supervis");
  }

  function roleAccess(role) {
    const target = normalized(role);
    const key = Object.keys(DEFAULT_ACCESS).find(name => normalized(name) === target);
    const customAccess = P.getAppData?.()?.accessRules?.roleAccess || {};
    if (key === "SEINTEC" || target.includes("seintec")) {
      const saved = Array.isArray(customAccess.SEINTEC) ? customAccess.SEINTEC : [];
      return [...new Set([...FULL_NON_ADMIN_ACCESS, ...saved])].filter(page => page !== "admin");
    }
    if (key && Array.isArray(customAccess[key])) return customAccess[key];
    if (key) return DEFAULT_ACCESS[key];
    if (target.includes("supervis")) return ACCESS.Supervisao;
    if (target.includes("ctc")) return ACCESS["Tecnicos CTC"];
    if (target.includes("seintec")) return ACCESS.SEINTEC;
    if (target.includes("setec")) return ACCESS.SETEC;
    if (target.includes("ctc")) return ACCESS.CTC;
    if (target.includes("gabinete") || target.includes("dirigente")) return ACCESS.Gabinete;
    if (target.includes("seom")) return ACCESS.SEOM;
    if (target.includes("sefisc")) return ACCESS.SEFISC;
    if (target.includes("segre")) return ACCESS.SEGRE;
    if (target.includes("sevesc")) return ACCESS.SEVESC;
    if (target.includes("semat")) return ACCESS.SEMAT;
    if (target.includes("sepes")) return ACCESS.SEPES;
    if (target.includes("sefrep")) return ACCESS.SEFREP;
    if (target.includes("seape")) return ACCESS.SEAPE;
    if (target.includes("seafim") || target.includes("seafin")) return ACCESS.SEAFIM;
    if (target.includes("sefin")) return ACCESS.SEFIN;
    if (target.includes("secomse")) return ACCESS.SECOMSE;
    if (target.includes("carro")) return ACCESS.Carros;
    if (target.includes("pedag") || target.includes("pec")) return ACCESS.Pedagogico;
    if (target.includes("admin")) return ACCESS.Administrador;
    return ACCESS.Consulta;
  }

  function pageMaintenanceConfig(page) {
    return P.getAppData?.()?.pageMaintenance?.[page] || {};
  }

  function isPageInMaintenance(page) {
    return pageMaintenanceConfig(page).enabled === true;
  }

  function roleKey(role) {
    const target = normalized(role);
    return Object.keys(ACCESS).find(name => normalized(name) === target)
      || (target.includes("supervis") && "Supervisao")
      || (target.includes("ctc") && "Tecnicos CTC")
      || (target.includes("seintec") && "SEINTEC")
      || (target.includes("setec") && "SETEC")
      || ((target.includes("gabinete") || target.includes("dirigente")) && "Gabinete")
      || (target.includes("seom") && "SEOM")
      || (target.includes("sefisc") && "SEFISC")
      || (target.includes("segre") && "SEGRE")
      || (target.includes("sevesc") && "SEVESC")
      || (target.includes("semat") && "SEMAT")
      || (target.includes("sepes") && "SEPES")
      || (target.includes("sefrep") && "SEFREP")
      || (target.includes("seape") && "SEAPE")
      || ((target.includes("seafim") || target.includes("seafin")) && "SEAFIM")
      || (target.includes("sefin") && "SEFIN")
      || (target.includes("secomse") && "SECOMSE")
      || (target.includes("carro") && "Carros")
      || ((target.includes("pedag") || target.includes("pec")) && "Pedagogico")
      || (target.includes("admin") && "Administrador")
      || "Consulta";
  }

  function roleEmoji(role) {
    return ROLE_EMOJI[roleKey(role)] || ROLE_EMOJI.Consulta;
  }

  function roleLabel(role) {
    const key = roleKey(role);
    return `${roleEmoji(key)} ${ROLE_NAMES[key] || key}`;
  }

  function canAccessData(page, role = P.currentRole?.()) {
    if (page === "network") return true;
    if (page === "calls" || page === "ctc") {
      const access = roleAccess(role);
      return access.includes("calls") || access.includes("ctc");
    }
    return roleAccess(role).includes(page);
  }

  function canViewCredentials(role = P.currentRole?.()) {
    const key = normalized(role);
    return ["administrador", "ctc", "setec", "seintec"].some(item => key.includes(item));
  }

  const SECTOR_GROUPS = {
    tecnologia: ["seintec", "setec", "ctc", "tecnologia"],
    redeEscolar: ["segre", "sevesc", "semat", "rede escolar", "pedagogico", "pedagogica", "pedagog"],
    recursosHumanos: ["sepes", "sefrep", "seape", "recursos humanos", "rh", "pessoas"],
    financas: ["seafim", "seafin", "sefin", "secomse", "financas", "financeiro", "compras", "pagamento"],
    obras: ["seom", "sefisc", "obras"]
  };

  function sectorGroup(values = []) {
    const text = values.map(normalized).filter(Boolean).join(" ");
    if (!text) return "";
    return Object.entries(SECTOR_GROUPS).find(([, aliases]) => aliases.some(alias => text.includes(alias)))?.[0] || "";
  }

  function canViewAllCarBookings(user = activeIdentity()) {
    const role = normalized(user?.role || P.currentRole?.());
    const contactRole = normalized(user?.contactRole || user?.cargo || user?.position);
    const contact = P.contactForUser?.(user) || {};
    const group = sectorGroup([user?.sector, user?.setor, user?.category, user?.categoria, contact.sector, contact.role, contactRole]);
    return role.includes("administrador")
      || role.includes("gabinete")
      || role.includes("dirigente")
      || contactRole.includes("dirigente")
      || group === "tecnologia"
      || group === "obras"
      || role.includes("seom")
      || role.includes("seintec")
      || role.includes("setec")
      || role.includes("ctc");
  }

  function carSectorKeys(values = []) {
    const keys = values.map(normalized).filter(Boolean);
    const group = sectorGroup(keys);
    if (group) keys.push(group);
    return [...new Set(keys)];
  }

  function canViewCarBookingDetails(booking = {}, user = activeIdentity()) {
    if (canViewAllCarBookings(user)) return true;
    const contact = P.contactForUser?.(user) || {};
    const display = P.displayUser?.(user) || {};
    const userKeys = carSectorKeys([
      user?.role,
      user?.sector,
      user?.setor,
      user?.contactRole,
      user?.category,
      user?.categoria,
      contact.sector,
      contact.setor,
      contact.category,
      contact.categoria,
      display.sector,
      display.setor,
      display.category,
      display.categoria
    ]);
    const bookingKeys = carSectorKeys([
      booking.requester,
      booking.sector,
      booking.setor,
      booking.category,
      booking.categoria,
      booking.owner
    ]);
    return userKeys.some(userKey => bookingKeys.some(bookingKey =>
      bookingKey === userKey || bookingKey.includes(userKey) || userKey.includes(bookingKey)
    ));
  }

  function publicCarBooking(item = {}) {
    return {
      requestId: item.requestId || item.id || "",
      vehicle: item.vehicle || item.car || item.recurso || "Carro oficial",
      date: item.date || item.value || "",
      time: item.time || item.hora || "",
      returnTime: item.returnTime || item.devolutionTime || item.devolucao || "",
      status: item.status || "reservado",
      restricted: true
    };
  }

  function isSupervisorUser(user = activeIdentity()) {
    return isSupervisorRole(user?.role);
  }

  function supervisorIdentityKey(user = activeIdentity()) {
    return normalized(user?.supervisorName || user?.preferences?.supervisorName || user?.contactName || user?.name || user?.login || user?.username);
  }

  function identityTokens(value) {
    return normalized(value).split(/\s+/).filter(Boolean);
  }

  function identityMatches(userValue, supervisorValue) {
    const userKey = normalized(userValue);
    const supervisorKey = normalized(supervisorValue);
    if (!userKey || !supervisorKey) return false;
    const cleanSupervisorKey = supervisorKey.includes("@") ? supervisorKey.split("@")[0].replace(/[._-]+/g, " ") : supervisorKey;
    const cleanUserKey = userKey.includes("@") ? userKey.split("@")[0].replace(/[._-]+/g, " ") : userKey;
    if (cleanSupervisorKey === cleanUserKey) return true;
    const userTokens = identityTokens(cleanUserKey);
    const supervisorTokens = identityTokens(cleanSupervisorKey);
    if (userTokens.length >= 2 && userTokens.every(token => supervisorTokens.includes(token))) return true;
    if (supervisorTokens.length >= 2 && supervisorTokens.every(token => userTokens.includes(token))) return true;
    return false;
  }

  function supervisorForCurrentUser(data = P.getAppData?.()) {
    const user = activeIdentity();
    if (!user || !isSupervisorUser(user)) return null;
    const userValues = [
      user?.supervisorName,
      user?.preferences?.supervisorName,
      user?.contactName,
      user?.name,
      user?.login,
      user?.username,
      user?.email
    ].filter(Boolean);
    if (!userValues.length && !supervisorIdentityKey(user)) return null;
    return (data?.supervisors || []).find(supervisor => {
      const values = [supervisor.name, supervisor.email, supervisor.login, supervisor.username, ...(supervisor.aliases || [])];
      return userValues.some(userValue => values.some(value => identityMatches(userValue, value)));
    }) || null;
  }

  function assignedSchoolsForCurrentUser(data = P.getAppData?.()) {
    const supervisor = supervisorForCurrentUser(data);
    if (!supervisor) return (data?.schools || []).map(school => school.name);
    return [...new Set((supervisor.assignedSchools || []).filter(Boolean))];
  }

  function allowedSchoolSet(data = P.getAppData?.()) {
    return new Set(assignedSchoolsForCurrentUser(data).map(normalized));
  }

  function canViewSchool(name, data = P.getAppData?.()) {
    if (!isSupervisorUser()) return true;
    return allowedSchoolSet(data).has(normalized(name));
  }

  function canViewSupervisor(name, data = P.getAppData?.()) {
    if (!isSupervisorUser()) return true;
    const supervisor = supervisorForCurrentUser(data);
    return Boolean(supervisor && normalized(supervisor.name) === normalized(name));
  }

  function visibleSchools(data = P.getAppData?.()) {
    if (!isSupervisorUser()) return data?.schools || [];
    const allowed = allowedSchoolSet(data);
    return (data?.schools || []).filter(school => allowed.has(normalized(school.name)));
  }

  function visibleSupervisors(data = P.getAppData?.()) {
    const supervisors = data?.supervisors || [];
    if (!isSupervisorUser()) return supervisors;
    const supervisor = supervisorForCurrentUser(data);
    return supervisor ? [supervisor] : [];
  }

  function filterObjectBySchool(source = {}, allowed) {
    return Object.fromEntries(Object.entries(source).filter(([name]) => allowed.has(normalized(name))));
  }

  function filterBySchoolField(items = [], allowed, field = "school") {
    return items.filter(item => allowed.has(normalized(item?.[field])));
  }

  function isCarLikeCalendarItem(item = {}) {
    const text = normalized([item.label, item.note, item.type, item.scope, item.category, item.categoria].join(" "));
    return ["carro", "veiculo", "motorista", "deslocamento"].some(term => text.includes(term));
  }

  function scopedData(data = P.getAppData?.()) {
    if (!data) return data;
    const user = activeIdentity();
    const role = user?.role || P.currentRole?.() || "Consulta";
    const supervisorScope = isSupervisorUser(user);
    const allowed = supervisorScope ? allowedSchoolSet(data) : null;
    const schools = supervisorScope ? visibleSchools(data) : (data.schools || []);
    const supervisors = supervisorScope ? visibleSupervisors(data) : (data.supervisors || []);
    const byAccess = {
      schools: canAccessData("schools", role),
      network: canAccessData("network", role),
      inventory: canAccessData("inventory", role),
      supervision: canAccessData("supervision", role),
      contacts: canAccessData("contacts", role),
      calendar: canAccessData("calendar", role),
      ctc: canAccessData("ctc", role),
      cars: canAccessData("cars", role),
      calls: canAccessData("calls", role),
      satisfaction: canAccessData("satisfaction", role),
      reports: canAccessData("reports", role),
      profiles: canAccessData("profiles", role),
      quality: canAccessData("quality", role),
      admin: canAccessData("admin", role)
    };
    const schoolScopedObject = source => supervisorScope ? filterObjectBySchool(source, allowed) : source;
    const networkScopedObject = source => {
      const scoped = schoolScopedObject(source || {});
      if (canViewCredentials(role)) return scoped;
      return Object.fromEntries(Object.entries(scoped).map(([school, item]) => {
        const { credentials, ...safeItem } = item || {};
        return [school, safeItem];
      }));
    };
    const schoolScopedItems = (items, field = "school") => supervisorScope ? filterBySchoolField(items, allowed, field) : items;
    return {
      ...data,
      schools: byAccess.schools ? schools : [],
      supervisors: byAccess.supervision ? supervisors : [],
      networkData: byAccess.network ? networkScopedObject(data.networkData || {}) : {},
      schoolInventoryMetrics: byAccess.inventory ? schoolScopedObject(data.schoolInventoryMetrics || {}) : {},
      schoolProfiles: byAccess.schools ? schoolScopedItems(data.schoolProfiles || []) : [],
      schoolAssets: byAccess.inventory ? schoolScopedItems(data.schoolAssets || []) : [],
      inventory: byAccess.inventory ? schoolScopedItems(data.inventory || []) : [],
      calls: (byAccess.calls || byAccess.ctc) ? schoolScopedItems(data.calls || []) : [],
      ctcVisits: byAccess.ctc
        ? (supervisorScope ? (data.ctcVisits || []).filter(visit => allowed.has(normalized(visit.place))) : (data.ctcVisits || []))
        : [],
      cars: byAccess.cars ? (canViewAllCarBookings() ? (data.cars || []) : (data.cars || []).map(item => canViewCarBookingDetails(item) ? item : publicCarBooking(item))) : [],
      contacts: byAccess.contacts ? (data.contacts || []) : [],
      calendar: byAccess.calendar ? (byAccess.cars ? (data.calendar || []) : (data.calendar || []).filter(item => !isCarLikeCalendarItem(item))) : [],
      satisfaction: byAccess.satisfaction ? (data.satisfaction || []) : [],
      reports: byAccess.reports ? (data.reports || []) : [],
      profiles: byAccess.profiles ? (data.profiles || []) : [],
      quality: byAccess.quality ? (data.quality || []) : [],
      users: byAccess.admin ? (data.users || []) : [],
      adminChecks: byAccess.admin ? (data.adminChecks || []) : []
    };
  }

  P.DATA_ACCESS = ACCESS;
  P.DEFAULT_ACCESS = DEFAULT_ACCESS;
  P.ROLE_EMOJI = ROLE_EMOJI;
  P.ROLE_NAMES = ROLE_NAMES;
  P.roleAccess = roleAccess;
  P.roleKey = roleKey;
  P.roleEmoji = roleEmoji;
  P.roleLabel = roleLabel;
  P.canAccessData = canAccessData;
  P.canViewCredentials = canViewCredentials;
  P.canViewAllCarBookings = canViewAllCarBookings;
  P.canViewCarBookingDetails = canViewCarBookingDetails;
  P.sectorGroup = sectorGroup;
  P.SECTOR_GROUPS = SECTOR_GROUPS;
  P.isSupervisorRole = isSupervisorRole;
  P.isSupervisorUser = isSupervisorUser;
  P.supervisorForCurrentUser = supervisorForCurrentUser;
  P.assignedSchoolsForCurrentUser = assignedSchoolsForCurrentUser;
  P.visibleSchools = visibleSchools;
  P.visibleSupervisors = visibleSupervisors;
  P.canViewSchool = canViewSchool;
  P.canViewSupervisor = canViewSupervisor;
  P.pageMaintenanceConfig = pageMaintenanceConfig;
  P.isPageInMaintenance = isPageInMaintenance;
  P.scopedData = scopedData;
})();
