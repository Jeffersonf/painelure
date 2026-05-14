(function () {
  const P = window.PainelURE;
  const ACCESS = {
    Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "reports", "profiles", "quality", "admin"],
    "Supervisão": ["dashboard", "schools", "supervision", "contacts", "cars", "calendar", "reports"],
    "Técnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar"],
    SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "reports"],
    SEINTEC: ["dashboard", "schools", "network", "inventory", "contacts", "cars", "reports"],
    Gabinete: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "reports"],
    Pedagógico: ["dashboard", "schools", "supervision", "contacts", "cars", "calendar"],
    Consulta: ["dashboard", "schools", "contacts"]
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
    return ACCESS[key] || ACCESS.Consulta;
  }

  function canAccessData(page, role = P.currentRole?.()) {
    return roleAccess(role).includes(page);
  }

  function canViewCredentials(role = P.currentRole?.()) {
    const key = normalized(role);
    return ["administrador", "tecnicos ctc", "setec", "seintec"].some(item => key.includes(item));
  }

  function isSupervisorUser(user = activeIdentity()) {
    return isSupervisorRole(user?.role);
  }

  function supervisorIdentityKey(user = activeIdentity()) {
    return normalized(user?.supervisorName || user?.contactName || user?.name || user?.login || user?.username);
  }

  function identityKeys(values = [], includeFirstName = true) {
    return [...new Set(values.flatMap(value => {
      const key = normalized(value);
      if (!key) return [];
      const emailName = key.includes("@") ? key.split("@")[0] : "";
      const firstName = key.split(/\s+/)[0] || "";
      return [key, emailName, includeFirstName ? firstName : ""].filter(Boolean);
    }))];
  }

  function uniqueFirstNameMatch(supervisors, userKeys) {
    const firstNames = userKeys.filter(key => key && !key.includes(".") && !key.includes("@") && !key.includes(" "));
    if (!firstNames.length) return null;
    const matches = supervisors.filter(supervisor => firstNames.includes(normalized(supervisor.name).split(/\s+/)[0]));
    return matches.length === 1 ? matches[0] : null;
  }

  function supervisorForCurrentUser(data = P.getAppData?.()) {
    const user = activeIdentity();
    if (!user || !isSupervisorUser(user)) return null;
    const supervisors = data?.supervisors || [];
    const userKeys = identityKeys([user.supervisorName, user.contactName, user.name, user.email, user.login, user.username]);
    if (!userKeys.length) return null;
    return supervisors.find(supervisor => {
      const supervisorKeys = identityKeys([supervisor.name, supervisor.email, supervisor.login, supervisor.username], false);
      return supervisorKeys.some(key => userKeys.includes(key));
    }) || uniqueFirstNameMatch(supervisors, userKeys);
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
      cars: byAccess.cars ? (data.cars || []) : [],
      contacts: byAccess.contacts ? (data.contacts || []) : [],
      calendar: byAccess.calendar ? (data.calendar || []) : [],
      reports: byAccess.reports ? (data.reports || []) : [],
      profiles: byAccess.profiles ? (data.profiles || []) : [],
      quality: byAccess.quality ? (data.quality || []) : [],
      users: byAccess.admin ? (data.users || []) : [],
      adminChecks: byAccess.admin ? (data.adminChecks || []) : []
    };
  }

  P.DATA_ACCESS = ACCESS;
  P.roleAccess = roleAccess;
  P.canAccessData = canAccessData;
  P.canViewCredentials = canViewCredentials;
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
