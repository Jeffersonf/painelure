(function () {
  const P = window.PainelURE;

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

  function scopedData(data = P.getAppData?.()) {
    if (!data || !isSupervisorUser()) return data;
    const allowed = allowedSchoolSet(data);
    const schools = visibleSchools(data);
    const supervisors = visibleSupervisors(data);
    return {
      ...data,
      schools,
      supervisors,
      networkData: filterObjectBySchool(data.networkData || {}, allowed),
      schoolInventoryMetrics: filterObjectBySchool(data.schoolInventoryMetrics || {}, allowed),
      schoolProfiles: filterBySchoolField(data.schoolProfiles || [], allowed),
      schoolAssets: filterBySchoolField(data.schoolAssets || [], allowed),
      inventory: filterBySchoolField(data.inventory || [], allowed),
      calls: filterBySchoolField(data.calls || [], allowed),
      ctcVisits: (data.ctcVisits || []).filter(visit => allowed.has(normalized(visit.place))),
      reports: data.reports || []
    };
  }

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
