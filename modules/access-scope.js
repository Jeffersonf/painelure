(function () {
  const P = window.PainelURE;
  const ACCESS = {
    Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "reports", "profiles", "quality", "admin"],
    Supervisao: ["dashboard", "schools", "supervision", "contacts", "calendar"],
    "Tecnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar"],
    SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars"],
    SEINTEC: ["dashboard", "schools", "network", "inventory", "contacts", "cars"],
    Gabinete: ["dashboard", "schools", "calls", "contacts", "cars", "calendar"],
    SEOM: ["dashboard", "schools", "contacts", "cars", "calendar"],
    Carros: ["cars"],
    Pedagogico: ["dashboard", "schools", "supervision", "contacts", "calendar"],
    Consulta: ["dashboard", "schools", "contacts"]
  };
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
    Gabinete: "Gabinete",
    SEOM: "SEOM",
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
    const key = Object.keys(ACCESS).find(name => normalized(name) === target);
    if (key) return ACCESS[key];
    if (target.includes("supervis")) return ACCESS.Supervisao;
    if (target.includes("ctc")) return ACCESS["Tecnicos CTC"];
    if (target.includes("seintec")) return ACCESS.SEINTEC;
    if (target.includes("setec")) return ACCESS.SETEC;
    if (target.includes("gabinete") || target.includes("dirigente")) return ACCESS.Gabinete;
    if (target.includes("seom")) return ACCESS.SEOM;
    if (target.includes("carro")) return ACCESS.Carros;
    if (target.includes("pedag") || target.includes("pec")) return ACCESS.Pedagogico;
    if (target.includes("admin")) return ACCESS.Administrador;
    return ACCESS.Consulta;
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
    return roleAccess(role).includes(page);
  }

  function canViewCredentials(role = P.currentRole?.()) {
    const key = normalized(role);
    return ["administrador", "ctc", "setec", "seintec"].some(item => key.includes(item));
  }

  function canViewAllCarBookings(user = activeIdentity()) {
    const role = normalized(user?.role || P.currentRole?.());
    const contactRole = normalized(user?.contactRole || user?.cargo || user?.position);
    return role.includes("administrador")
      || role.includes("gabinete")
      || role.includes("dirigente")
      || contactRole.includes("dirigente")
      || role.includes("seom")
      || role.includes("seintec")
      || role.includes("ctc");
  }

  function canViewCarBookingDetails(booking = {}, user = activeIdentity()) {
    if (canViewAllCarBookings(user)) return true;
    const userKeys = [
      user?.role,
      user?.sector,
      user?.setor,
      user?.contactRole,
      user?.category,
      user?.categoria
    ].map(normalized).filter(Boolean);
    const bookingKeys = [
      booking.requester,
      booking.sector,
      booking.setor,
      booking.category,
      booking.categoria,
      booking.owner
    ].map(normalized).filter(Boolean);
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
      status: item.status || "reservado",
      restricted: true
    };
  }

  function isSupervisorUser(user = activeIdentity()) {
    return isSupervisorRole(user?.role);
  }

  function supervisorIdentityKey(user = activeIdentity()) {
    return normalized(user?.supervisorName || user?.contactName || user?.name || user?.login || user?.username);
  }

  function supervisorForCurrentUser(data = P.getAppData?.()) {
    const user = activeIdentity();
    if (!user || !isSupervisorUser(user)) return null;
    const userKey = supervisorIdentityKey(user);
    if (!userKey) return null;
    return (data?.supervisors || []).find(supervisor => {
      const values = [supervisor.name, supervisor.email, supervisor.login, supervisor.username];
      return values.some(value => {
        const key = normalized(value);
        return key === userKey || (key && userKey && key.split("@")[0] === userKey);
      });
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
      calls: byAccess.calls ? schoolScopedItems(data.calls || []) : [],
      ctcVisits: byAccess.ctc
        ? (supervisorScope ? (data.ctcVisits || []).filter(visit => allowed.has(normalized(visit.place))) : (data.ctcVisits || []))
        : [],
      cars: byAccess.cars ? (canViewAllCarBookings() ? (data.cars || []) : (data.cars || []).map(publicCarBooking)) : [],
      contacts: byAccess.contacts ? (data.contacts || []) : [],
      calendar: byAccess.calendar ? (byAccess.cars ? (data.calendar || []) : (data.calendar || []).filter(item => !isCarLikeCalendarItem(item))) : [],
      reports: byAccess.reports ? (data.reports || []) : [],
      profiles: byAccess.profiles ? (data.profiles || []) : [],
      quality: byAccess.quality ? (data.quality || []) : [],
      users: byAccess.admin ? (data.users || []) : [],
      adminChecks: byAccess.admin ? (data.adminChecks || []) : []
    };
  }

  P.DATA_ACCESS = ACCESS;
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
  P.isSupervisorRole = isSupervisorRole;
  P.isSupervisorUser = isSupervisorUser;
  P.supervisorForCurrentUser = supervisorForCurrentUser;
  P.assignedSchoolsForCurrentUser = assignedSchoolsForCurrentUser;
  P.visibleSchools = visibleSchools;
  P.visibleSupervisors = visibleSupervisors;
  P.canViewSchool = canViewSchool;
  P.canViewSupervisor = canViewSupervisor;
  P.scopedData = scopedData;
})();
