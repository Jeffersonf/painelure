(function () {
  const P = window.PainelURE;

  function statusClass(status) {
    if (status === "warn") return "warn";
    if (status === "danger") return "danger";
    if (status === "info") return "info";
    return "ok";
  }

  function pctFromText(text) {
    const [done, total] = text.split("/").map(Number);
    if (!total) return 0;
    return Math.min(Math.round((done / total) * 100), 100);
  }

  function progressParts(text) {
    const [done, total] = String(text || "0/0").split("/").map(value => Number(value) || 0);
    return { done, total, missing: Math.max(total - done, 0), pct: total ? Math.min(Math.round((done / total) * 100), 100) : 0 };
  }

  function currentRoleKey() {
    const display = P.displayUser?.() || {};
    return P.normalize(P.currentRole?.() || display.role || "Consulta");
  }

  function canViewCredentials() {
    return P.canViewCredentials ? P.canViewCredentials() : ["administrador", "tecnicos ctc", "setec", "seintec"].some(item => currentRoleKey().includes(item));
  }

  function dashboardProfile(data, context) {
    const role = currentRoleKey();
    if (role.includes("supervis")) {
      return {
        title: "Carteira de supervisao",
        note: `${data.schools.length} escola(s) sob acompanhamento no mês.`,
        notice: "Visão filtrada para sua supervisão",
        noticeNote: "A página mostra apenas suas escolas, suas metas e os canais de apoio disponíveis.",
        shortcuts: {
          schools: `${data.schools.length} escola(s) vinculada(s)`,
          network: "Restrito ao perfil técnico",
          inventory: "Restrito ao perfil técnico",
          supervision: context.pendingVisits ? `${context.pendingVisits} visita(s) pendente(s)` : "metas em dia"
        }
      };
    }
    if (role.includes("ctc") || role.includes("setec") || role.includes("seintec")) {
      return {
        title: "Operação técnica",
        note: `${context.networkCount} rede(s) mapeada(s), ${data.schoolAssets.length} item(ns) de inventario.`,
        notice: "Base técnica pronta para consulta",
        noticeNote: "Redes, IPs, câmeras, inventário e chamados aparecem no mesmo fluxo operacional.",
        shortcuts: null
      };
    }
    if (role.includes("gabinete")) {
      return {
        title: "Acompanhamento do gabinete",
        note: `${context.openCalls} chamado(s) em acompanhamento e ${context.calendarCount} evento(s) na agenda.`,
        notice: "Fila administrativa consolidada",
        noticeNote: "Chamados, escolas, contatos e agenda ficam priorizados para resposta rapida.",
        shortcuts: null
      };
    }
    if (role.includes("pedagog")) {
      return {
        title: "Acompanhamento pedagogico",
        note: `${data.schools.length} escola(s), ${data.supervisors.length} supervisor(es) e agenda institucional.`,
        notice: "Visão escolar e de supervisão",
        noticeNote: "Escolas, supervisao, contatos e calendario ficam em primeiro plano.",
        shortcuts: null
      };
    }
    return {
      title: "Pagina inicial da URE",
      note: `${data.schools.length} escola(s), contatos e dados liberados para consulta.`,
      notice: context.calendarCount ? "Base operacional atualizada" : "Base operacional pronta",
      noticeNote: context.calendarCount
        ? "Escolas, supervisão, inventário, redes e agenda disponíveis para consulta."
        : "Escolas, supervisão, inventário, redes e contatos disponíveis para consulta.",
      shortcuts: null
    };
  }

  function supervisionMonthNote() {
    const selected = P.selectedMonthKey?.() || "";
    const official = P.sources?.supervision?.monthKey || "";
    if (!official || selected === official) return "";
    return `Fonte oficial carregada para ${P.selectedMonthLabel?.(official) || official}.`;
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function findSchool(name) {
    const target = P.normalize(name);
    return P.getAppData().schools.find(school => P.normalize(school.name) === target) || null;
  }

  function schoolProfile(name) {
    const target = P.normalize(name);
    return (P.getAppData().schoolProfiles || []).find(profile => P.normalize(profile.school) === target) || null;
  }

  function schoolProfileCompletion(name) {
    const profile = schoolProfile(name);
    if (!profile) return 0;
    const fields = ["director", "viceDirector", "proati", "goe", "phone", "mobile", "email", "address", "notes"];
    const filled = fields.filter(field => String(profile[field] || "").trim()).length;
    return Math.round((filled / fields.length) * 100);
  }

  function schoolMissingProfileFields(name) {
    const labels = {
      director: "direção",
      viceDirector: "vice-direção",
      proati: "PROATI",
      goe: "GOE",
      phone: "telefone",
      mobile: "celular",
      email: "email",
      address: "endereço",
      notes: "observacoes"
    };
    const profile = schoolProfile(name);
    if (!profile) return Object.values(labels);
    return Object.entries(labels)
      .filter(([field]) => !String(profile[field] || "").trim())
      .map(([, label]) => label);
  }

  function profileStatusFromPct(percent) {
    if (percent >= 65) return "ok";
    if (percent >= 35) return "warn";
    return "danger";
  }

  function inventoryAlertCount(school) {
    const data = P.getAppData();
    const metrics = data.schoolInventoryMetrics?.[school.name] || {};
    const assets = schoolAssets(school.name);
    return Math.max(Number(metrics.alerts || 0), inventoryTotals(assets).alertUnits);
  }

  function firstNote(text) {
    return String(text || "").split(".").map(item => item.trim()).find(Boolean) || "";
  }

  function attrValue(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function canEditSchoolData() {
    const display = P.displayUser?.() || {};
    const role = P.normalize(P.currentRole?.() || display.role || "");
    const contactRole = P.normalize(display.contactRole || "");
    const sector = P.normalize(display.sector || "");
    const name = P.normalize(display.name || display.shortName || "");
    return [
      "administrador",
      "gabinete",
      "seintec",
      "supervis",
      "seom"
    ].some(item => role.includes(item) || sector.includes(item) || contactRole.includes(item))
      || contactRole.includes("dirigente")
      || name.includes("nelio");
  }

  function saveSchoolDetailForm(schoolName, form) {
    const data = P.getAppData();
    const current = findSchool(schoolName);
    if (!current || !form) return;
    const value = name => String(form.querySelector(`[name="${name}"]`)?.value || "").trim();
    const profile = schoolProfile(schoolName) || { school: schoolName };
    const nextSchool = {
      ...current,
      city: value("city") || current.city,
      cie: value("cie") || current.cie
    };
    const nextProfile = {
      ...profile,
      school: schoolName,
      director: value("director"),
      viceDirector: value("viceDirector"),
      proati: value("proati"),
      goe: value("goe"),
      phone: value("phone"),
      mobile: value("mobile"),
      email: value("email"),
      address: value("address"),
      notes: value("notes")
    };
    const target = P.normalize(schoolName);
    const schools = (data.schools || []).map(item => P.normalize(item.name) === target ? nextSchool : item);
    const profiles = (data.schoolProfiles || []).some(item => P.normalize(item.school) === target)
      ? data.schoolProfiles.map(item => P.normalize(item.school) === target ? nextProfile : item)
      : [...(data.schoolProfiles || []), nextProfile];
    P.setAppData({ ...data, schools, schoolProfiles: profiles });
    P.saveAppData?.();
    openSchoolPage(schoolName);
  }

  function isInSelectedMonth(value) {
    const month = P.selectedMonth?.();
    const date = calendarDate({ value });
    if (!month || !date) return true;
    return date.getFullYear() === month.year && date.getMonth() === month.month - 1;
  }

  function monthFiltered(items, getter = item => item.date || item.value) {
    return (items || []).filter(item => isInSelectedMonth(getter(item)));
  }

  function setSelectOptions(select, options, selectedValue) {
    if (!select) return;
    select.innerHTML = options.map(option => `<option value="${option.value}">${option.label}</option>`).join("");
    select.value = options.some(option => option.value === selectedValue) ? selectedValue : options[0]?.value || "";
  }

  function applySchoolCityFilter() {
    const city = P.$("#schoolCityFilter")?.value || "all";
    P.$all("#schoolGrid .school-card").forEach(card => {
      card.classList.toggle("filter-hidden", city !== "all" && card.dataset.city !== city);
    });
  }

  function schoolCity(school = {}) {
    return school.city || school.municipio || school.cidade || school.town || school.municipality || "";
  }

  function schoolCie(school = {}) {
    return school.cie || school.codigoCie || school.codigo_cie || school.code || school.codigo || "";
  }

  function schoolSubtitle(school = {}) {
    const city = schoolCity(school) || "Munic\u00edpio n\u00e3o informado";
    const cie = schoolCie(school);
    return cie ? `${city} | CIE ${cie}` : city;
  }

  function renderSchoolCityFilter(schools) {
    const select = P.$("#schoolCityFilter");
    if (!select) return;
    const current = select.value || "all";
    const cities = [...new Set(schools.map(schoolCity).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setSelectOptions(select, [
      { value: "all", label: "Todos" },
      ...cities.map(city => ({ value: P.searchText([city]), label: city }))
    ], current);
    if (!select.dataset.bound) {
      select.dataset.bound = "true";
      select.addEventListener("change", applySchoolCityFilter);
    }
  }

  function bindSimpleSelect(select, handler) {
    if (!select || select.dataset.bound) return;
    select.dataset.bound = "true";
    select.addEventListener("change", handler);
  }

  function bindResetButton(button, handler) {
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", handler);
  }

  function supervisorForSchool(name) {
    const target = P.normalize(name);
    return P.getAppData().supervisors.find(supervisor =>
      (supervisor.assignedSchools || []).some(school => P.normalize(school) === target)
    ) || null;
  }

  function assetUnits(asset) {
    const text = String(asset?.notes || "");
    const unitMatch = text.match(/(\d+)\s*(unidade|unidades|registro|registros)/i);
    if (unitMatch) return Number(unitMatch[1]);
    const firstNumber = text.match(/\b(\d+)\b/);
    return firstNumber ? Number(firstNumber[1]) : 1;
  }

  function assetTone(status) {
    if (status === "defeito") return "danger";
    if (status === "manutencao") return "warn";
    return "ok";
  }

  function assetStatusLabel(status) {
    if (status === "defeito") return "defeito";
    if (status === "manutencao") return "manutenção";
    return "ok";
  }

  function assetPriority(asset) {
    const units = assetUnits(asset);
    if (asset.status === "defeito") return { tone: "warn", label: "defeito", note: `${units} unidade(s) com defeito.` };
    if (asset.status === "manutencao") return { tone: "warn", label: "manutenção", note: `${units} unidade(s) em manutenção.` };
    return { tone: "ok", label: "ok", note: `${units} unidade(s) OK.` };
  }

  function assetCategory(asset) {
    const text = P.normalize([asset.name, asset.sourceName, asset.notes].join(" "));
    if (text.includes("tablet")) return "Tablets";
    if (text.includes("netbook")) return "Netbooks";
    if (text.includes("notebook") || text.includes("chromebook")) return "Notebooks";
    if (text.includes("recarga") || text.includes("plataforma")) return "Recarga";
    if (text.includes("smartphone") || text.includes("celular")) return "Smartphones";
    if (text.includes("adm") || text.includes("administrativo")) return "PC adm";
    if (text.includes("pc") || text.includes("desktop") || text.includes("pedagogico")) return "PC pedagogico";
    return "Outros";
  }

  function schoolAssets(name) {
    const target = P.normalize(name);
    return P.getAppData().schoolAssets.filter(asset => P.normalize(asset.school) === target);
  }

  function inventoryTotals(assets) {
    return assets.reduce((acc, asset) => {
      const units = assetUnits(asset);
      acc.lines += 1;
      acc.units += units;
      if (asset.status !== "ok") acc.alertUnits += units;
      if (asset.status === "defeito") acc.defectUnits += units;
      acc.categories.add(assetCategory(asset));
      return acc;
    }, { lines: 0, units: 0, alertUnits: 0, defectUnits: 0, categories: new Set() });
  }

  function focusSchool(name) {
    openSchoolPage(name);
  }

  function openSchoolPage(name) {
    if (P.canViewSchool && !P.canViewSchool(name)) {
      P.setPage?.("schools");
      return;
    }
    const school = findSchool(name);
    if (!school) return;
    const title = P.$("#schoolDetailTitle");
    const subtitle = P.$("#schoolDetailSubtitle");
    if (title) title.textContent = school.name;
    if (subtitle) subtitle.textContent = schoolSubtitle(school);
    renderSchoolDetail(school, "#schoolDetailPageBody");
    P.setPage?.("school-detail");
  }

  function focusSchoolInList(name) {
    P.setPage?.("schools");
    requestAnimationFrame(() => {
      const target = P.$(`[data-school-key="${P.searchText([name])}"]`);
      if (!target) return;
      P.$all(".school-card.focused").forEach(card => card.classList.remove("focused"));
      P.$all(".school-card.active").forEach(card => card.classList.remove("active"));
      target.classList.add("active");
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function focusNetworkSchool(name) {
    if (P.canViewSchool && !P.canViewSchool(name)) {
      P.setPage?.("schools");
      return;
    }
    P.setPage?.("network");
    requestAnimationFrame(() => {
      renderNetwork(P.getAppData().networkData, name);
      const target = P.$(`[data-network-school-key="${P.searchText([name])}"]`);
      if (!target) return;
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function focusSupervisor(name) {
    openSupervisorPage(name);
  }

  function openSupervisorPage(name) {
    if (P.canViewSupervisor && !P.canViewSupervisor(name)) {
      P.setPage?.("supervision");
      return;
    }
    const supervisor = (P.getAppData().supervisors || []).find(item => P.normalize(item.name) === P.normalize(name));
    if (!supervisor) return;
    const title = P.$("#supervisorDetailTitle");
    const subtitle = P.$("#supervisorDetailSubtitle");
    if (title) title.textContent = supervisor.name;
    if (subtitle) {
      const stats = P.supervisorStatsForMonth?.([supervisor])?.[0];
      subtitle.textContent = `${stats?.assignedSchools.length || supervisor.assignedSchools?.length || 0} escola(s) | ${stats?.visits.length || 0} visita(s) importada(s).`;
    }
    P.renderSupervisorDetail?.(supervisor, "#supervisorDetailPageBody");
    P.setPage?.("supervisor-detail");
  }

  function focusSupervisorInList(name) {
    P.setPage?.("supervision");
    requestAnimationFrame(() => {
      const target = P.$(`[data-supervisor-key="${P.searchText([name])}"]`);
      if (!target) return;
      target.click();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function focusContact(name, sector = "Todos") {
    P.setPage?.("contacts");
    requestAnimationFrame(() => {
      const selectedSector = sector || "Todos";
      P.$all("[data-sector]").forEach(tab => tab.classList.toggle("active", tab.dataset.sector === selectedSector));
      renderContacts(P.getAppData().contacts, selectedSector);
      const target = P.$(`[data-contact-key="${P.searchText([name])}"]`);
      if (!target) return;
      P.$all(".contact-card.focused").forEach(card => card.classList.remove("focused"));
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function focusCall(title) {
    P.setPage?.("calls");
    requestAnimationFrame(() => {
      const target = P.$(`[data-call-key="${P.searchText([title])}"]`);
      if (!target) return;
      P.$all(".detail-widget.focused").forEach(card => card.classList.remove("focused"));
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function focusInventoryAsset(key, schoolName = "") {
    P.setPage?.("inventory");
    requestAnimationFrame(() => {
      const select = P.$("#inventorySelect");
      const filter = P.$("#inventoryFilterInput");
      const status = P.$("#inventoryStatusSelect");
      if (select && schoolName) select.value = schoolName;
      if (filter) filter.value = "";
      if (status) status.value = "";
      renderInventory(P.getAppData());
      const target = P.$(`[data-inventory-key="${key}"]`);
      if (!target) return;
      P.$all(".data-row.focused").forEach(row => row.classList.remove("focused"));
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function focusCtcVisit(key) {
    P.setPage?.("ctc");
    requestAnimationFrame(() => {
      const owner = P.$("#ctcOwnerFilter");
      const school = P.$("#ctcSchoolFilter");
      if (owner) owner.value = "all";
      if (school) school.value = "all";
      renderCtc(P.getAppData().ctcVisits);
      const target = P.$(`[data-ctc-key="${key}"]`);
      if (!target) return;
      P.$all(".detail-widget.focused").forEach(card => card.classList.remove("focused"));
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function focusCalendarItem(key) {
    P.setPage?.("calendar");
    requestAnimationFrame(() => {
      const target = P.$(`[data-calendar-key="${key}"]`);
      if (!target) return;
      P.$all(".detail-widget.focused").forEach(card => card.classList.remove("focused"));
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function contactCard(contact) {
    const photo = contact.photo || "";
    return `
      <article class="contact-card" data-contact-key="${P.searchText([contact.name])}" data-search="${P.searchText([contact.name, contact.role, contact.sector, contact.email, contact.phone])}">
        <div class="contact-avatar${photo ? " has-photo" : ""}"${photo ? ` style="background-image:url('${photo}')"` : ""}>${initials(contact.name)}</div>
        <div>
          <small>${contact.role}</small>
          <h2>${contact.name}</h2>
          <em class="status-pill info">${contact.sector}</em>
          <div class="contact-line"><span>Email</span><strong>${contact.email}</strong></div>
          <div class="contact-line"><span>Ramal</span><strong>${contact.phone}</strong></div>
          <div class="contact-actions">
            ${contact.email ? `<a class="ghost-btn" href="mailto:${contact.email}">Email</a>` : ""}
            ${contact.phone ? `<a class="ghost-btn" href="tel:${String(contact.phone).replace(/[^0-9+]/g, "")}">Ligar</a>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function setText(selector, value) {
    const element = P.$(selector);
    if (element) element.textContent = value;
  }

  function dashboardRow(item, compact = false) {
    if (P.canAccess && item.page !== "calendar" && !P.canAccess(item.page)) return "";
    const modeAttr = item.mode ? ` data-calendar-mode-target="${item.mode}"` : "";
    return `
      <button class="data-row${compact ? " compact" : ""}" type="button" data-jump="${item.page}"${modeAttr} data-search="${P.searchText([item.title, item.note, item.label])}">
        <span class="row-icon">${item.icon}</span>
        <span><strong>${item.title}</strong><small>${item.note}</small></span>
        <em class="status-pill ${item.tone}">${item.label}</em>
      </button>
    `;
  }

  function renderSummaryRows(selector, rows) {
    const host = P.$(selector);
    if (!host) return;
    host.innerHTML = summaryRowsMarkup(rows);
  }

  function summaryRowsMarkup(rows) {
    return rows.map(row => `
      <div class="data-row compact" data-search="${P.searchText([row.title, row.note, row.label])}">
        <span class="row-icon">${row.icon}</span>
        <span><strong>${row.title}</strong><small>${row.note}</small></span>
        <em class="status-pill ${row.tone}">${row.label}</em>
      </div>
    `).join("");
  }

  function roleAllowsDashboardWidget(widget, role) {
    return widget.roles.includes("*") || widget.roles.some(item => role.includes(item));
  }

  function dashboardWidgetDefinitions(data, context) {
    const calendarSource = calendarWithOperationalFallback(data.calendar || [], data);
    const sharedCalendarCount = monthFiltered(calendarByMode(calendarSource, "shared"), item => item.date || item.value).length;
    const personalCalendarCount = monthFiltered(calendarByMode(data.calendar || [], "personal"), item => item.date || item.value).length;
    const supervisionPct = (data.supervisors || []).reduce((acc, item) => {
      const month = progressParts(item.month);
      acc.done += month.done;
      acc.total += month.total;
      return acc;
    }, { done: 0, total: 0 });
    const supervisionValue = supervisionPct.total ? `${Math.round((supervisionPct.done / supervisionPct.total) * 100)}%` : "0%";
    return [
      { id: "schools", roles: ["administrador", "gabinete", "supervis", "pedagog", "consulta", "seom", "setec", "seintec", "ctc"], page: "schools", icon: "&#127979;", label: "Escolas", value: data.schools?.length || 0, note: `${data.schools?.length || 0} unidade(s) na base regional`, tone: "info" },
      { id: "supervision", roles: ["administrador", "gabinete", "supervis", "pedagog"], page: "supervision", icon: "&#129517;", label: "Supervisão", value: supervisionValue, note: context.pendingVisits ? `${context.pendingVisits} visita(s) pendente(s)` : "Metas em dia no recorte", tone: context.pendingVisits ? "warn" : "ok" },
      { id: "network", roles: ["administrador", "setec", "seintec", "ctc"], page: "network", icon: "&#127760;", label: "Redes", value: context.networkCount, note: context.missingNetwork ? `${context.missingNetwork} escola(s) sem rede` : "Infraestrutura mapeada", tone: context.missingNetwork ? "warn" : "ok" },
      { id: "inventory", roles: ["administrador", "setec", "seintec", "ctc"], page: "inventory", icon: "&#128187;", label: "Inventário", value: data.schoolAssets?.length || 0, note: context.inventoryAlerts ? `${context.inventoryAlerts} alerta(s) de ativo` : "Itens consolidados", tone: context.inventoryAlerts ? "warn" : "ok" },
      { id: "ctc", roles: ["administrador", "setec", "ctc"], page: "ctc", icon: "&#128736;&#65039;", label: "CTC", value: context.ctcVisits, note: context.ctcVisits ? "Visitas técnicas no mês" : "Sem visitas no recorte", tone: context.ctcVisits ? "info" : "ok" },
      { id: "calls", roles: ["administrador", "gabinete", "setec", "ctc"], page: "calls", icon: "&#128229;", label: "Chamados", value: context.openCalls, note: context.openCalls ? "Chamados em acompanhamento" : "Fila sem pendências", tone: context.openCalls ? "warn" : "ok" },
      { id: "cars", roles: ["administrador", "gabinete", "seom", "seintec", "ctc", "carro"], page: "cars", icon: "&#128663;", label: "Carros", value: context.carCount, note: context.carCount ? "Reservas no recorte" : "Sem reservas no mês", tone: context.carCount ? "info" : "ok" },
      { id: "contacts", roles: ["administrador", "gabinete", "supervis", "pedagog", "consulta", "seom", "setec", "seintec", "ctc"], page: "contacts", icon: "&#128222;", label: "Contatos", value: data.contacts?.length || 0, note: "Canais institucionais", tone: "info" },
      { id: "sharedCalendar", roles: ["*"], page: "calendar", mode: "shared", icon: "&#128197;", label: "Compartilhado", value: sharedCalendarCount, note: sharedCalendarCount ? "Eventos institucionais do mês" : "Sem eventos compartilhados", tone: sharedCalendarCount ? "info" : "ok" },
      { id: "personalCalendar", roles: ["*"], page: "calendar", mode: "personal", icon: "&#128198;", label: "Pessoal", value: personalCalendarCount, note: personalCalendarCount ? "Eventos vinculados ao usuário" : "Nenhum evento pessoal", tone: personalCalendarCount ? "info" : "ok" },
      { id: "satisfaction", roles: ["*"], page: "satisfaction", icon: "&#128221;", label: "Pesquisa", value: data.satisfaction?.length || 0, note: data.satisfaction?.length ? "Campanhas e devolutivas" : "Área pronta para formulários", tone: data.satisfaction?.length ? "info" : "warn" },
      { id: "reports", roles: ["administrador", "gabinete", "setec", "seintec", "seom", "ctc"], page: "reports", icon: "&#128200;", label: "Relatórios", value: P.selectedMonthLabel?.() || "Mês", note: "Consolidado administrativo", tone: "info" }
    ];
  }

  function dashboardWidgetsForRole(data, context) {
    const role = currentRoleKey();
    return dashboardWidgetDefinitions(data, context).filter(widget => {
      if (!roleAllowsDashboardWidget(widget, role)) return false;
      if (widget.page === "calendar") return true;
      return !P.canAccess || P.canAccess(widget.page);
    });
  }

  function dashboardWidgetMarkup(widget) {
    const modeAttr = widget.mode ? ` data-calendar-mode-target="${widget.mode}"` : "";
    return `
      <button class="dashboard-widget-card dashboard-widget-${widget.tone}" type="button" data-jump="${widget.page}"${modeAttr} data-search="${P.searchText([widget.label, widget.note, widget.value])}">
        <span class="dashboard-widget-icon">${widget.icon}</span>
        <span class="dashboard-widget-copy">
          <small>${widget.label}</small>
          <strong>${widget.value}</strong>
          <em>${widget.note}</em>
        </span>
      </button>
    `;
  }

  function renderDashboard(data) {
    P.bindMonthControls?.();
    const monthLabel = P.selectedMonthLabel?.() || "Maio 2026";
    const networkCount = Object.keys(data.networkData || {}).length;
    const calendarCount = monthFiltered(data.calendar || [], item => item.date || item.value).length;
    const carCount = monthFiltered(carBookings(data), item => item.date).length;
    const missingNetwork = Math.max((data.schools?.length || 0) - networkCount, 0);
    const inventoryAlerts = Object.values(data.schoolInventoryMetrics || {}).reduce((sum, item) => sum + Number(item.alerts || 0), 0);
    const pendingVisits = (data.supervisors || []).reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const openCalls = (data.calls || []).filter(item => item.status !== "resolvido").length;
    const ctcVisits = monthFiltered(data.ctcVisits || [], item => item.date).length;
    const officialSources = (P.sourceStatus || []).filter(item => item.status === "loaded").length;
    const context = { networkCount, calendarCount, carCount, missingNetwork, inventoryAlerts, pendingVisits, openCalls, ctcVisits };
    const profile = dashboardProfile(data, context);
    const dashboardWidgets = dashboardWidgetsForRole(data, context);
    const sourceNote = officialSources
      ? `${officialSources} fonte(s) atualizada(s)`
      : "base local pronta para consulta";

    setText("#dashboardSummary", `${monthLabel} - ${profile.title} - ${sourceNote}`);
    setText("#dashboardNoticeTitle", profile.notice);
    setText("#dashboardNoticeNote", [profile.noticeNote, supervisionMonthNote()].filter(Boolean).join(" "));
    setText("#shortcutSchoolsNote", profile.shortcuts?.schools || `${data.schools.length} unidade(s) na base regional`);
    setText("#shortcutNetworkNote", profile.shortcuts?.network || (missingNetwork ? `${missingNetwork} escola(s) ainda sem rede` : `${networkCount} rede(s) mapeada(s)`));
    setText("#shortcutInventoryNote", profile.shortcuts?.inventory || (inventoryAlerts ? `${inventoryAlerts} unidade(s) em manutenção/defeito` : `${data.schoolAssets.length} linha(s) consolidadas`));
    setText("#shortcutSupervisionNote", profile.shortcuts?.supervision || (pendingVisits ? `${pendingVisits} visita(s) pendente(s)` : `${data.supervisors.length} responsável(is) ativos`));
    setText("#shortcutCarsNote", carCount ? `${carCount} reserva(s) no recorte` : "Agenda de carros pronta");
    const shortcutGrid = P.$(".shortcut-grid");
    if (shortcutGrid) {
      shortcutGrid.innerHTML = dashboardWidgets.slice(0, 8).map(widget => {
        const modeAttr = widget.mode ? ` data-calendar-mode-target="${widget.mode}"` : "";
        return `
          <button class="shortcut-card" type="button" data-jump="${widget.page}"${modeAttr}>
            <span>${widget.icon}</span>
            <strong>${widget.label}</strong>
            <small>${widget.note}</small>
          </button>
        `;
      }).join("");
    }

    const decisions = [
      missingNetwork
        ? { icon: "&#127760;", title: "Completar dados de rede", note: `${missingNetwork} escola(s) sem infraestrutura mapeada.`, label: "Rede", tone: "warn", page: "network" }
        : { icon: "&#127760;", title: "Redes mapeadas", note: `${networkCount} escola(s) com dados técnicos disponíveis.`, label: "OK", tone: "ok", page: "network" },
      inventoryAlerts
        ? { icon: "&#128187;", title: "Inventário com manutenção/defeito", note: `${inventoryAlerts} unidade(s) fora de OK.`, label: "Invent.", tone: "warn", page: "inventory" }
        : { icon: "&#128187;", title: "Inventário consolidado", note: `${data.schoolAssets.length} linha(s) carregada(s).`, label: "OK", tone: "ok", page: "inventory" },
      pendingVisits
        ? { icon: "&#129517;", title: "Acompanhar visitas pendentes", note: `${pendingVisits} visita(s) faltando nas metas atuais.`, label: "Meta", tone: "warn", page: "supervision" }
        : { icon: "&#129517;", title: "Supervisão em dia", note: `${data.supervisors.length} responsável(is) ativos no painel.`, label: "OK", tone: "ok", page: "supervision" }
    ];

    const agenda = [
      calendarCount
        ? { icon: "&#128197;", title: "Agenda com eventos", note: `${calendarCount} evento(s) carregado(s) para consulta.`, label: "Agenda", tone: "info", page: "calendar" }
        : { icon: "&#128197;", title: "Calendário preparado", note: "Área pronta para a agenda institucional da URE.", label: "Agenda", tone: "info", page: "calendar" },
      ctcVisits
        ? { icon: "&#128736;&#65039;", title: "Visitas técnicas previstas", note: `${ctcVisits} compromisso(s) técnico(s) na base atual.`, label: "CTC", tone: "info", page: "ctc" }
        : { icon: "&#128736;&#65039;", title: "Agenda CTC pronta", note: "Área preparada para rotas e compromissos técnicos.", label: "CTC", tone: "info", page: "ctc" },
      openCalls
        ? { icon: "&#128229;", title: "Chamados em acompanhamento", note: `${openCalls} chamado(s) ainda não resolvido(s).`, label: "Fila", tone: "warn", page: "calls" }
        : { icon: "&#128229;", title: "Fila de chamados estável", note: "Sem pendencia aberta na base atual.", label: "OK", tone: "ok", page: "calls" },
      carCount
        ? { icon: "&#128663;", title: "Carros agendados", note: `${carCount} reserva(s) de carro oficial no recorte.`, label: "Carros", tone: "info", page: "cars" }
        : { icon: "&#128663;", title: "Agenda de carros pronta", note: "Área pronta para puxar reservas de carros oficiais.", label: "Carros", tone: "info", page: "cars" }
    ];

    const profileDecision = {
      icon: "&#129513;",
      title: profile.title,
      note: profile.note,
      label: "Perfil",
      tone: "info",
      page: currentRoleKey().includes("supervis") ? "supervision" : "schools"
    };

    const command = P.$("#dashboardCommand");
    if (command) {
      const focusWidget = dashboardWidgets.find(item => item.page !== "calendar") || dashboardWidgets[0] || { page: "calendar", mode: "shared" };
      const focusModeAttr = focusWidget.mode ? ` data-calendar-mode-target="${focusWidget.mode}"` : "";
      command.innerHTML = `
        <article class="command-primary command-${profile.notice === "Base operacional pronta" ? "info" : "ok"}">
          <img class="command-logo" src="./assets/ure-logo.png" alt="Logo da URE Itapeva">
          <div>
            <span class="eyebrow">Comando do mês</span>
            <strong>${profile.title}</strong>
            <p>${profile.note}</p>
          </div>
          <button class="ghost-btn" type="button" data-jump="${focusWidget.page}"${focusModeAttr}>Abrir foco</button>
        </article>
        <div class="dashboard-widget-grid">
          ${dashboardWidgets.map(dashboardWidgetMarkup).join("")}
        </div>
      `;
    }

    const decisionRows = P.$("#decisionRows");
    const agendaRows = P.$("#agendaRows");
    const widgetRows = dashboardWidgets
      .filter(item => item.page !== "calendar")
      .map(item => ({
        icon: item.icon,
        title: item.label,
        note: item.note,
        label: String(item.value),
        tone: item.tone,
        page: item.page,
        mode: item.mode
      }));
    const calendarRows = dashboardWidgets
      .filter(item => item.page === "calendar")
      .map(item => ({
        icon: item.icon,
        title: `Calendario ${item.label.toLowerCase()}`,
        note: item.note,
        label: String(item.value),
        tone: item.tone,
        page: "calendar",
        mode: item.mode
      }));
    if (decisionRows) decisionRows.innerHTML = [profileDecision, ...widgetRows, ...decisions].map(item => dashboardRow(item)).join("");
    if (agendaRows) agendaRows.innerHTML = [...calendarRows, ...agenda].map(item => dashboardRow(item, true)).join("");
  }

  function renderUser(data) {
    const display = P.displayUser?.() || { name: "Jefferson", role: "Administrador", linked: false };
    const role = P.currentRole?.() || display.role || "Administrador";
    const profile = (data.profiles || []).find(item => P.normalize(item.name) === P.normalize(role));
    setText("#userNameLabel", display.name);
    setText("#accountNameLabel", P.firstName?.(display.shortName || display.name) || display.shortName || display.name);
    P.applyConnectionState?.();
    setText("#userIdentitySource", display.linked ? "Usuário vinculado ao contato" : "Usuário importado da v1");
    setText("#userRoleSummary", P.roleLabel?.(role) || role);
    setText("#userAccessSummary", profile?.note || "Perfil local de acesso ao painel.");
    setText("#userContactSummary", display.linked
      ? `${display.contactRole || "Contato"} | ${display.sector || "Setor"} | ${display.email || display.phone || "sem canal"}`
      : "Sem contato vinculado. Ajuste o mapeamento em usuários."
    );
    setText("#userContactStatus", display.linked ? "Vinculado" : "Pendente");
    P.$("#userContactStatus")?.classList.toggle("warn", !display.linked);
    P.$("#userContactStatus")?.classList.toggle("info", display.linked);
    const online = P.onlineUser?.();
    setText("#onlineSessionSummary", online
      ? `${online.username || online.login || online.name} conectado ao backend.`
      : "Sessão local ativa. Entre quando a API estiver disponível."
    );
    const logoutButton = P.$("#onlineLogoutBtn");
    if (logoutButton) logoutButton.hidden = !online;
    const userRoleSelect = P.$("#userRoleSelect");
    if (userRoleSelect) userRoleSelect.value = role;
    const localControlsLocked = Boolean(online && role !== "Administrador");
    [P.$("#activeUserSelect"), userRoleSelect, P.$("#restoreAdminBtn")].forEach(control => {
      if (!control) return;
      control.disabled = localControlsLocked;
      control.hidden = localControlsLocked;
    });

    const list = P.$("#userAccessList");
    if (list) {
      const pages = (P.roleAccess?.(role) || P.ROLE_ACCESS?.[role] || P.ROLE_ACCESS?.Consulta || []).filter(page => !["profiles", "quality", "admin"].includes(page));
      list.innerHTML = pages.map(page => {
        const item = P.pageMeta(page);
        return `
          <button class="settings-row compact" type="button" data-jump="${page}">
            <div><strong>${item.icon} ${item.label}</strong><small>${item.note}</small></div>
            <span class="status-pill info">Abrir</span>
          </button>
        `;
      }).join("");
    }

    const themeButton = P.$("#userThemeBtn");
    if (themeButton && !themeButton.dataset.bound) {
      themeButton.dataset.bound = "true";
      themeButton.addEventListener("click", () => P.$("#themeBtn")?.click());
    }
    P.applyUserAvatar?.();
  }

  function renderSchools(schools) {
    const grid = P.$("#schoolGrid");
    if (!grid) return;
    if (!schools.length) {
      grid.innerHTML = `<div class="empty-state">Nenhuma escola carregada ainda.</div>`;
      return;
    }
    renderSchoolCityFilter(schools);
    const safeSchools = schools.filter(school => school && school.name);
    const sorted = [...safeSchools].sort((a, b) =>
      String(schoolCity(a)).localeCompare(String(schoolCity(b)))
      || String(a.name || "").localeCompare(String(b.name || ""))
    );
    grid.innerHTML = `
      <section class="schools-board">
        ${sorted.map(school => `
        <button class="school-card school-compact-card" type="button" data-school-name="${school.name}" data-school-key="${P.searchText([school.name])}" data-city="${P.searchText([schoolCity(school)])}" data-search="${P.searchText([school.name, schoolCity(school), schoolCie(school), school.initials])}">
          <div class="school-compact-main">
            <div class="school-avatar">&#127979;</div>
            <div class="school-compact-title">
              <strong>${school.name}</strong>
              <small>${schoolSubtitle(school)}</small>
            </div>
          </div>
        </button>
      `).join("")}
      </section>
    `;
    applySchoolCityFilter();
    grid.querySelectorAll("[data-school-name]").forEach(button => {
      button.addEventListener("click", () => {
        openSchoolPage(button.dataset.schoolName);
      });
    });
  }

  function renderSchoolDetail(school, target = "#schoolDetailPageBody") {
    const detail = P.$(target);
    if (!detail || !school) return;
    const data = P.getAppData();
    const assets = schoolAssets(school.name);
    const totals = inventoryTotals(assets);
    const metrics = data.schoolInventoryMetrics?.[school.name] || { items: school.items || 0, alerts: school.alerts || 0 };
    const profile = schoolProfile(school.name);
    const profilePct = schoolProfileCompletion(school.name);
    const missingProfile = schoolMissingProfileFields(school.name);
    const network = data.networkData?.[school.name];
    const supervisor = supervisorForSchool(school.name);
    const calls = (data.calls || []).filter(call => P.normalize(call.school) === P.normalize(school.name));
    const networkStatus = network ? "Mapeada" : "Pendente";
    const profileNote = missingProfile.length ? `Pendências: ${missingProfile.slice(0, 4).join(", ")}.` : firstNote(profile?.notes) || "Dados principais da escola preenchidos.";
    const schoolTone = totals.alertUnits || metrics.alerts ? "warn" : (!network || profilePct < 65 || calls.length ? "info" : "ok");
    const inventoryPreview = assets.slice(0, 6);
    const networkItems = [
      { title: "Rede", value: network?.network?.[0] || "Sem informação" },
      { title: "IPs", value: network?.ips?.[0] || "Sem IP cadastrado" },
      { title: "Câmeras", value: network?.câmeras?.[0] || "Sem câmera cadastrada" }
    ];
    const guideWidgets = [
      { key: "inventory", title: "&#128187; Inventário", note: totals.alertUnits || metrics.alerts ? `${totals.alertUnits || metrics.alerts} item(ns) pedem revisão` : `${totals.lines || metrics.items || 0} item(ns) sem alerta`, label: totals.alertUnits || metrics.alerts ? "Revisar" : "Abrir", tone: totals.alertUnits || metrics.alerts ? "warn" : "ok", enabled: !P.canAccess || P.canAccess("inventory") },
      { key: "network", title: "&#127760; Redes", note: network ? `${networkItems.filter(item => !item.value.includes("Sem")).length}/3 grupos mapeados` : "Rede e câmeras pendentes", label: network ? "Abrir" : "Pendente", tone: network ? "info" : "warn", enabled: Boolean(network) && (!P.canAccess || P.canAccess("network")) },
      { key: "supervisor", title: "&#129517; Supervisão", note: supervisor ? `${supervisor.name} | mês ${supervisor.month || "0/12"}` : "Sem supervisor vinculado", label: supervisor ? "Abrir" : "Pendente", tone: supervisor ? "info" : "warn", enabled: Boolean(supervisor) },
      { key: "calls", title: "&#128229; Chamados", note: calls.length ? `${calls.length} chamado(s) vinculados` : "Sem fila vinculada", label: calls.length ? "Ver fila" : "Estavel", tone: calls.length ? "warn" : "ok", enabled: !P.canAccess || P.canAccess("calls") }
    ];
    detail.innerHTML = `
      <section class="school-profile-page school-profile-${schoolTone}">
        <article class="school-profile-hero compact">
          <div class="school-profile-title">
            <div class="school-avatar large">&#127979;</div>
            <div>
              <span class="eyebrow">${schoolSubtitle(school)}</span>
              <strong>Ficha operacional</strong>
            </div>
          </div>
          <div class="school-profile-owner">
            <small>Supervisor</small>
            <strong>${supervisor?.name || "Não vinculado"}</strong>
            <span class="status-pill ${supervisor ? "info" : "warn"}">${supervisor ? "supervisao" : "pendente"}</span>
          </div>
        </article>

        <section class="school-profile-metrics">
          <article><span>&#128203;</span><small>Ficha</small><strong>${profilePct}%</strong><i style="--pct:${profilePct}%"></i></article>
          <article><span>&#128187;</span><small>Inventário</small><strong>${totals.lines || metrics.items || 0}</strong><i style="--pct:100%"></i></article>
          <article><span>&#128736;&#65039;</span><small>Manutenção</small><strong>${totals.alertUnits || metrics.alerts || 0}</strong><i style="--pct:${totals.alertUnits || metrics.alerts ? 100 : 0}%"></i></article>
          <article><span>&#127760;</span><small>Rede</small><strong>${networkStatus}</strong><i style="--pct:${network ? 100 : 0}%"></i></article>
          <article><span>&#128229;</span><small>Chamados</small><strong>${calls.length}</strong><i style="--pct:${calls.length ? 100 : 0}%"></i></article>
        </section>

        <section class="school-guide-grid">
          ${guideWidgets.map(widget => `<button class="school-guide-widget school-guide-${widget.tone}" type="button" data-school-guide="${widget.key}" ${widget.enabled ? "" : "disabled"}>
            <span>${widget.title}</span>
            <strong>${widget.label}</strong>
            <small>${widget.note}</small>
          </button>`).join("")}
        </section>

        <section class="school-profile-grid">
          <article class="box school-profile-card wide">
            <div class="box-head"><div><strong>Ficha escolar</strong><small>Dados principais da unidade.</small></div><span class="status-pill ${profileStatusFromPct(profilePct)}">${profilePct}%</span></div>
            <div class="school-profile-fields">
              <span><small>Direção</small><strong>${profile?.director || "Não informada"}</strong></span>
              <span><small>Vice-direção</small><strong>${profile?.viceDirector || "Não informada"}</strong></span>
              <span><small>GOE</small><strong>${profile?.goe || "Não informado"}</strong></span>
              <span><small>Telefone</small><strong>${profile?.phone || "Pendente"}</strong></span>
              <span><small>Email</small><strong>${profile?.email || "Pendente"}</strong></span>
              <span><small>Endereço</small><strong>${profile?.address || "Não informado"}</strong></span>
            </div>
            <p class="school-profile-note">${profileNote}</p>
          </article>

          <article class="box school-profile-card">
            <div class="box-head"><div><strong>Supervisão</strong><small>Recorte oficial importado.</small></div></div>
            <div class="school-profile-stack">
              <span><small>Responsável</small><strong>${supervisor?.name || "Não vinculado"}</strong></span>
              <span><small>Semana</small><strong>${supervisor?.week || "0/3"}</strong></span>
              <span><small>Mês</small><strong>${supervisor?.month || "0/12"}</strong></span>
            </div>
            <button class="ghost-btn block" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
          </article>

          <article class="box school-profile-card">
            <div class="box-head"><div><strong>Rede e câmeras</strong><small>Infraestrutura vinculada.</small></div><span class="status-pill ${network ? "info" : "warn"}">${networkStatus}</span></div>
            <div class="school-profile-stack">
              ${networkItems.map(item => `<span><small>${item.title}</small><strong>${item.value}</strong></span>`).join("")}
            </div>
            ${!P.canAccess || P.canAccess("network") ? `<button class="ghost-btn block" type="button" data-open-network="${school.name}" ${network ? "" : "disabled"}>Abrir redes</button>` : ""}
          </article>

          <article class="box school-profile-card wide">
            <div class="box-head"><div><strong>Inventário</strong><small>Resumo consolidado da escola.</small></div><span class="status-pill ${totals.alertUnits || metrics.alerts ? "warn" : "ok"}">${totals.alertUnits || metrics.alerts ? "revisar" : "ok"}</span></div>
            <div class="school-inventory-preview">
              ${inventoryPreview.length ? inventoryPreview.map(asset => `<button class="data-row compact" type="button" data-open-inventory="${school.name}">
                <span class="row-icon">&#128187;</span>
                <span><strong>${asset.name}</strong><small>${asset.description || `${asset.quantity || 0} unidade(s)`}</small></span>
                <em class="status-pill ${statusClass(asset.status)}">${asset.status || "base"}</em>
              </button>`).join("") : `<div class="empty-state">Sem linhas de inventario para esta escola.</div>`}
            </div>
            ${!P.canAccess || P.canAccess("inventory") ? `<button class="ghost-btn block" type="button" data-open-inventory="${school.name}">Abrir inventario completo</button>` : ""}
          </article>

          <article class="box school-profile-card">
            <div class="box-head"><div><strong>Chamados</strong><small>Fila vinculada a escola.</small></div><span class="status-pill ${calls.length ? "warn" : "ok"}">${calls.length}</span></div>
            <div class="school-profile-stack">
              ${calls.length ? calls.slice(0, 4).map(call => `<span><small>${call.status || "Chamado"}</small><strong>${call.title}</strong></span>`).join("") : `<span><small>Status</small><strong>Sem chamados vinculados</strong></span>`}
            </div>
          </article>

          ${canEditSchoolData() ? `<article class="box school-edit-card wide">
            <div class="box-head"><div><strong>Editar dados</strong><small>Alteracoes ficam salvas neste painel.</small></div><span class="status-pill info">aberto</span></div>
            <form class="school-edit-form" data-school-edit-form>
              <label><span>Municipio</span><input name="city" value="${attrValue(schoolCity(school))}"></label>
              <label><span>CIE</span><input name="cie" value="${attrValue(schoolCie(school))}"></label>
              <label><span>Direção</span><input name="director" value="${attrValue(profile?.director)}"></label>
              <label><span>Vice-direção</span><input name="viceDirector" value="${attrValue(profile?.viceDirector)}"></label>
              <label><span>PROATI</span><input name="proati" value="${attrValue(profile?.proati)}"></label>
              <label><span>GOE</span><input name="goe" value="${attrValue(profile?.goe)}"></label>
              <label><span>Telefone</span><input name="phone" value="${attrValue(profile?.phone)}"></label>
              <label><span>Celular</span><input name="mobile" value="${attrValue(profile?.mobile)}"></label>
              <label><span>Email</span><input name="email" value="${attrValue(profile?.email)}"></label>
              <label class="wide"><span>Endereço</span><input name="address" value="${attrValue(profile?.address)}"></label>
              <label class="wide"><span>Observacoes</span><textarea name="notes">${attrValue(profile?.notes)}</textarea></label>
              <button class="ghost-btn" type="submit">Salvar dados</button>
            </form>
          </article>` : ""}
        </section>
      </section>
    `;
    detail.querySelectorAll("[data-open-network]").forEach(button => {
      button.addEventListener("click", event => focusNetworkSchool(event.currentTarget.dataset.openNetwork));
    });
    detail.querySelectorAll("[data-open-inventory]").forEach(button => {
      button.addEventListener("click", event => focusInventorySchool(event.currentTarget.dataset.openInventory));
    });
    detail.querySelectorAll("[data-open-supervisor]").forEach(button => {
      button.addEventListener("click", event => focusSupervisor(event.currentTarget.dataset.openSupervisor));
    });
    detail.querySelectorAll("[data-school-guide]").forEach(button => {
      button.addEventListener("click", event => {
        const guide = event.currentTarget.dataset.schoolGuide;
        if (guide === "inventory") focusInventorySchool(school.name);
        if (guide === "network") focusNetworkSchool(school.name);
        if (guide === "supervisor") focusSupervisor(supervisor?.name);
        if (guide === "calls") P.setPage?.("calls");
      });
    });
    detail.querySelector("[data-school-edit-form]")?.addEventListener("submit", event => {
      event.preventDefault();
      saveSchoolDetailForm(school.name, event.currentTarget);
    });
  }

  function followUpText(missingProfile, alertCount, network, callCount) {
    if (alertCount) return "Conferir inventário com manutenção ou defeito.";
    if (callCount) return "Chamados vinculados na escola.";
    if (missingProfile.length) return `Completar ficha: ${missingProfile.slice(0, 3).join(", ")}.`;
    if (!network) return "Mapear rede e câmeras para completar a base técnica.";
    return "Escola sem pendencia resumida no painel.";
  }

  function focusInventorySchool(name) {
    if (P.canViewSchool && !P.canViewSchool(name)) {
      P.setPage?.("schools");
      return;
    }
    P.setPage?.("inventory");
    requestAnimationFrame(() => {
      const select = P.$("#inventorySelect");
      if (!select) return;
      select.value = name;
      renderInventory(P.getAppData());
      select.focus();
    });
  }

  function renderNetworkOptions(networkData) {
    const data = networkData || {};
    const grid = P.$("#networkSchoolGrid");
    const names = Object.keys(data);
    if (grid) {
      const sorted = names.sort((a, b) => {
        const schoolA = findSchool(a);
        const schoolB = findSchool(b);
        return String(schoolCity(schoolA)).localeCompare(String(schoolCity(schoolB)))
          || String(a).localeCompare(String(b));
      });
      grid.innerHTML = sorted.length ? `
        <section class="schools-board network-schools-board">
          ${sorted.map((name, index) => {
            const school = findSchool(name);
            const item = data[name] || {};
            const cameras = item.cameras || item.câmeras || [];
            return `
              <button class="school-card school-compact-card network-school-card ${index === 0 ? "active" : ""}" type="button" data-network-school="${name}" data-network-school-key="${P.searchText([name])}" data-search="${P.searchText([name, schoolCity(school), schoolCie(school)])}">
                <div class="school-compact-main">
                  <div class="school-avatar">&#127979;</div>
                  <div class="school-compact-title">
                    <strong>${name}</strong>
                    <small>${school ? schoolSubtitle(school) : "Escola fora da lista mestre."}</small>
                  </div>
                </div>
                <div class="network-school-metrics">
                  <span><b>${item.network?.length || 0}</b><small>redes</small></span>
                  <span><b>${item.ips?.length || 0}</b><small>IPs</small></span>
                  <span><b>${cameras.length}</b><small>câmeras</small></span>
                </div>
              </button>
            `;
          }).join("")}
        </section>
      ` : `<div class="empty-state">Nenhuma escola com dados de rede cadastrada ainda.</div>`;
      grid.querySelectorAll("[data-network-school]").forEach(button => {
        button.addEventListener("click", () => renderNetwork(data, button.dataset.networkSchool));
      });
    }
    renderNetwork(data, names[0]);
  }

  function renderNetwork(networkData, requestedName = "") {
    const layout = P.$("#networkLayout");
    if (!layout) return;
    const names = Object.keys(networkData || {});
    const selectedName = requestedName || layout.dataset.selectedNetworkSchool || names[0] || "";
    const data = networkData?.[selectedName] || networkData?.[names[0]];
    const effectiveName = networkData?.[selectedName] ? selectedName : names[0] || "";
    layout.dataset.selectedNetworkSchool = effectiveName;
    P.$all("[data-network-school]").forEach(button => {
      button.classList.toggle("active", button.dataset.networkSchool === effectiveName);
    });
    if (!data) {
      layout.innerHTML = `<div class="empty-state">Nenhum dado de rede cadastrado ainda.</div>`;
      return;
    }
    const school = findSchool(effectiveName);
    const supervisor = supervisorForSchool(effectiveName);
    const cameraItems = data.cameras || data.câmeras || [];
    const credentialItems = data.credentials || [];
    const widgets = [
      ["network", "Rede administrativa e pedagógica", data.network || [], "RD", "info", "redes"],
      ["ips", "IPs, banda e CIE", data.ips || [], "IP", "info", "endereços"],
      ["cameras", "Câmeras e DVR", cameraItems, "CM", "ok", "monitoramento"],
      ["credentials", "Credenciais", data.credentials || [], "CR", "warn", "restrito"]
    ].filter(([, , items]) => items.length);
    if (credentialItems.length && !canViewCredentials()) {
      const credentialIndex = widgets.findIndex(([key]) => key === "credentials");
      if (credentialIndex >= 0) {
        widgets[credentialIndex] = ["credentials", "Credenciais protegidas", ["Disponível apenas para Administrador, SETEC, SEINTEC e Técnicos CTC."], "CR", "warn", "restrito"];
      }
    }
    const activeKey = widgets[0]?.[0] || "network";
    const detailMarkup = widgets.map(([key, title, items, icon, tone, label]) => `
      <article class="network-detail-panel ${key === activeKey ? "is-active" : ""}" data-network-panel="${key}">
        <div class="box-head">
          <div>
            <strong>${title}</strong>
            <small>${effectiveName}</small>
          </div>
          <span class="status-pill ${tone}">${label}</span>
        </div>
        <div class="network-detail-list">
          ${items.map((item, index) => `
            <span>
              <small>${icon} ${String(index + 1).padStart(2, "0")}</small>
              <strong>${item}</strong>
            </span>
          `).join("")}
        </div>
      </article>
    `).join("");

    layout.innerHTML = `
      <article class="network-summary network-school-strip">
        <div>
          <small>Escola selecionada</small>
          <strong>${effectiveName}</strong>
          <p>${school ? schoolSubtitle(school) : "Escola fora da lista mestre."}</p>
        </div>
        <div class="network-score">
          <span><b>${data.network?.length || 0}</b><small>redes</small></span>
          <span><b>${data.ips?.length || 0}</b><small>IPs</small></span>
          <span><b>${cameraItems.length}</b><small>câmeras</small></span>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${effectiveName}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-inventory="${effectiveName}">Abrir inventário</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      <section class="network-widget-grid" aria-label="Dados de rede e câmeras">
      ${widgets.map(([key, title, items, icon, tone, label], index) => `
      <button class="network-mini-widget ${index === 0 ? "is-active" : ""}" type="button" data-network-detail="${key}" data-search="${P.searchText([title, ...items])}">
        <span class="network-mini-icon">${icon}</span>
        <div>
          <small>${title}</small>
          <strong>${items.length}</strong>
          <p>${items[0]}</p>
        </div>
        <span class="status-pill ${tone}">${label}</span>
      </button>
    `).join("")}
      </section>
      <section class="network-detail-zone">
        ${detailMarkup}
      </section>`;
    layout.querySelectorAll("[data-network-detail]").forEach(button => {
      button.addEventListener("click", event => {
        const key = event.currentTarget.dataset.networkDetail;
        layout.querySelectorAll("[data-network-detail]").forEach(item => item.classList.toggle("is-active", item === event.currentTarget));
        layout.querySelectorAll("[data-network-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.networkPanel === key));
      });
    });
    layout.querySelector("[data-open-school]")?.addEventListener("click", event => {
      focusSchool(event.currentTarget.dataset.openSchool);
    });
    layout.querySelector("[data-open-inventory]")?.addEventListener("click", event => {
      focusInventorySchool(event.currentTarget.dataset.openInventory);
    });
    layout.querySelector("[data-open-supervisor]")?.addEventListener("click", event => {
      focusSupervisor(event.currentTarget.dataset.openSupervisor);
    });
  }

  function renderInventoryOperationalSummary(assets, selectedSchool, selectedAssets, totals) {
    const globalTotals = inventoryTotals(assets);
    const schools = new Set(assets.map(asset => asset.school).filter(Boolean)).size;
    const categoryCount = new Set(selectedAssets.map(asset => assetCategory(asset))).size;
    const rows = [
      { icon: "&#128187;", title: "Inventário da escola", note: `${totals.lines} linha(s), ${totals.units} unidade(s) e ${categoryCount} categoria(s).`, label: `${totals.units}`, tone: "info" },
      { icon: "&#128736;&#65039;", title: "Manutenção/defeito", note: totals.alertUnits ? `${totals.alertUnits} unidade(s) fora de OK em ${selectedSchool}.` : "Todos os itens filtrados estao OK.", label: `${totals.alertUnits}`, tone: totals.alertUnits ? "warn" : "ok" },
      { icon: "&#127979;", title: "Base carregada", note: `${schools} escola(s) com inventario e ${globalTotals.lines} linha(s) totais.`, label: `${schools}`, tone: "info" },
      { icon: "&#9989;", title: "Conferencia", note: `${globalTotals.alertUnits} unidade(s) fora de OK na base completa.`, label: globalTotals.alertUnits ? "acompanhar" : "ok", tone: globalTotals.alertUnits ? "warn" : "ok" }
    ];
    renderSummaryRows("#inventorySummaryRows", rows);
  }

  function renderInventory(data) {
    const grid = P.$("#inventoryGrid");
    const select = P.$("#inventorySelect");
    if (!grid) return;
    const assets = data.schoolAssets || [];
    if (!assets.length) {
      renderSummaryRows("#inventorySummaryRows", [
        { icon: "&#128187;", title: "Inventário", note: "Nenhuma linha carregada para o perfil atual.", label: "vazio", tone: "warn" }
      ]);
      grid.innerHTML = `<div class="empty-state">Nenhum dado de inventario carregado ainda.</div>`;
      return;
    }
    if (select && !select.options.length) {
      const schools = [...new Set(assets.map(asset => asset.school))].sort((a, b) => a.localeCompare(b));
      select.innerHTML = schools.map(name => `<option value="${name}">${name}</option>`).join("");
      select.onchange = () => renderInventory(P.getAppData());
    }
    const filterInput = P.$("#inventoryFilterInput");
    const statusSelect = P.$("#inventoryStatusSelect");
    if (filterInput && !filterInput.dataset.bound) {
      filterInput.dataset.bound = "true";
      filterInput.addEventListener("input", () => renderInventory(P.getAppData()));
    }
    if (statusSelect && !statusSelect.dataset.bound) {
      statusSelect.dataset.bound = "true";
      statusSelect.addEventListener("change", () => renderInventory(P.getAppData()));
    }
    bindResetButton(P.$("#inventoryFilterReset"), () => {
      if (filterInput) filterInput.value = "";
      if (statusSelect) statusSelect.value = "";
      renderInventory(P.getAppData());
    });
    const selectedSchool = select?.value || assets[0].school;
    const query = P.normalize(filterInput?.value || "");
    const statusFilter = statusSelect?.value || "";
    const selectedAssets = assets.filter(asset => {
      if (asset.school !== selectedSchool) return false;
      if (statusFilter && asset.status !== statusFilter) return false;
      if (!query) return true;
      return P.searchText([asset.name, asset.sourceName, asset.notes, asset.status]).includes(query);
    });
    const totals = inventoryTotals(selectedAssets);
    renderInventoryOperationalSummary(assets, selectedSchool, selectedAssets, totals);
    const network = data.networkData?.[selectedSchool];
    const supervisor = supervisorForSchool(selectedSchool);
    const categories = Object.entries(selectedAssets.reduce((acc, asset) => {
      const category = assetCategory(asset);
      const units = assetUnits(asset);
      acc[category] = acc[category] || { category, units: 0, alerts: 0, lines: 0 };
      acc[category].units += units;
      acc[category].lines += 1;
      if (asset.status !== "ok") acc[category].alerts += units;
      return acc;
    }, {})).map(([, item]) => item).sort((a, b) => b.alerts - a.alerts || b.units - a.units);
    const alertAssets = selectedAssets
      .filter(asset => asset.status !== "ok")
      .sort((a, b) => assetUnits(b) - assetUnits(a))
      .slice(0, 6);
    grid.innerHTML = `
      <article class="inventory-hero inventory-hero-${totals.alertUnits ? "warn" : "ok"}">
        <div class="inventory-hero-main">
          <span class="row-icon">&#128187;</span>
          <div>
            <small>Escola selecionada</small>
            <strong>${selectedSchool}</strong>
          </div>
          <p>${totals.lines} linha(s) | ${totals.units} unidade(s) | ${totals.alertUnits} manutenção/defeito</p>
        </div>
        <div class="inventory-hero-score">
          <span><strong>${totals.lines}</strong><small>linhas</small></span>
          <span><strong>${totals.units}</strong><small>unidades</small></span>
          <span><strong>${totals.alertUnits}</strong><small>manut./defeito</small></span>
          <span><strong>${categories.length}</strong><small>categorias</small></span>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedSchool}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-network="${selectedSchool}" ${network ? "" : "disabled"}>Abrir redes</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      <article class="inventory-list box inventory-priority">
        <div class="box-head"><div><strong>Status da escola</strong><small>${alertAssets.length ? "Itens em manutenção ou defeito" : "Sem manutenção/defeito no filtro atual"}</small></div></div>
        <div class="row-list compact">
          ${alertAssets.length ? alertAssets.map(asset => `
            <div class="data-row compact" data-inventory-key="${P.searchText([asset.school, asset.sourceName || asset.name, asset.notes])}" data-search="${P.searchText([asset.school, asset.name, asset.sourceName, asset.notes, asset.status])}">
              <span class="row-icon">&#9888;&#65039;</span>
              <span><strong>${asset.sourceName || asset.name}</strong><small>${asset.notes || asset.name}</small></span>
              <em class="status-pill ${assetTone(asset.status)}">${assetUnits(asset)} | ${assetStatusLabel(asset.status)}</em>
            </div>
          `).join("") : `
            <div class="data-row compact">
              <span class="row-icon">&#9989;</span>
              <span><strong>Todos OK</strong><small>A escola selecionada não possui item em manutenção ou defeito neste filtro.</small></span>
              <em class="status-pill ok">ok</em>
            </div>
          `}
        </div>
      </article>
      ${categories.map(item => `
        <article class="detail-widget inventory-category ${item.alerts ? "inventory-category-alert" : ""}" data-search="${P.searchText([selectedSchool, item.category, item.units, item.alerts])}">
          <div>
            <small>${item.category}</small>
            <strong>${item.units} unidade(s)</strong>
            <p>${item.lines} linha(s) consolidada(s) | ${item.alerts} em manutenção/defeito.</p>
          </div>
          <span class="status-pill ${item.alerts ? "warn" : "ok"}">${item.alerts ? "acompanhar" : "ok"}</span>
        </article>
      `).join("")}
      <article class="inventory-list box">
        <div class="box-head"><div><strong>Itens da escola</strong><small>${selectedAssets.length} linha(s) do inventario</small></div></div>
        <div class="row-list">
          ${selectedAssets.map(asset => `
            <div class="data-row" data-inventory-key="${P.searchText([asset.school, asset.sourceName || asset.name, asset.notes])}" data-search="${P.searchText([asset.school, asset.name, asset.sourceName, asset.notes, asset.status])}">
              <span class="row-icon">IN</span>
              <span><strong>${asset.sourceName || asset.name}</strong><small>${asset.notes || asset.name}</small></span>
              <em class="status-pill ${assetTone(asset.status)}">${assetUnits(asset)} | ${assetStatusLabel(asset.status)}</em>
            </div>
          `).join("")}
        </div>
      </article>
    `;
    grid.querySelector("[data-open-school]")?.addEventListener("click", event => {
      focusSchool(event.currentTarget.dataset.openSchool);
    });
    grid.querySelector("[data-open-network]")?.addEventListener("click", event => {
      focusNetworkSchool(event.currentTarget.dataset.openNetwork);
    });
    grid.querySelector("[data-open-supervisor]")?.addEventListener("click", event => {
      focusSupervisor(event.currentTarget.dataset.openSupervisor);
    });
  }

  function renderInventorySummary(inventory) {
    const grid = P.$("#inventoryGrid");
    if (!grid) return;
    grid.innerHTML = inventory.map(item => `
      <article class="detail-widget" data-search="${P.searchText([item.label, item.value, item.note])}">
        <div>
          <small>${item.label}</small>
          <strong>${item.value}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.tone)}">${item.tone === "warn" ? "Revisar" : "OK"}</span>
      </article>
    `).join("");
  }

  function renderContactOperationalSummary(contacts, visible, sector) {
    const sectors = new Set(contacts.map(contact => contact.sector).filter(Boolean)).size;
    const emailCount = visible.filter(contact => contact.email).length;
    const phoneCount = visible.filter(contact => contact.phone).length;
    const photoCount = visible.filter(contact => contact.photo).length;
    const rows = [
      { icon: "CO", title: "Contatos visíveis", note: sector === "Todos" ? `${visible.length} contato(s) em ${sectors} setor(es).` : `${visible.length} contato(s) em ${sector}.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "EM", title: "E-mail", note: `${emailCount}/${visible.length || 0} contato(s) com e-mail disponível.`, label: emailCount === visible.length && visible.length ? "ok" : "base", tone: emailCount === visible.length && visible.length ? "ok" : "info" },
      { icon: "TE", title: "Telefone e ramal", note: `${phoneCount}/${visible.length || 0} contato(s) com canal telefonico.`, label: phoneCount === visible.length && visible.length ? "ok" : "revisar", tone: phoneCount === visible.length && visible.length ? "ok" : "warn" },
      { icon: "US", title: "Perfis vinculados", note: `${photoCount} contato(s) já usam foto enviada pelo usuário.`, label: photoCount ? "foto" : "local", tone: photoCount ? "ok" : "info" }
    ];
    renderSummaryRows("#contactSummaryRows", rows);
  }

  function renderContacts(contacts, sector = "Todos") {
    const grid = P.$("#contactGrid");
    if (!grid) return;
    const visible = sector === "Todos" ? contacts : contacts.filter(contact => contact.sector === sector);
    renderContactOperationalSummary(contacts, visible, sector);
    grid.innerHTML = visible.length
      ? visible.map(contactCard).join("")
      : `<div class="empty-state">Nenhum contato cadastrado para ${sector} ainda.</div>`;
  }

  function carStatusTone(status) {
    const key = P.normalize(status || "");
    if (["cancelado", "cancelada", "bloqueado", "indisponível", "recusado", "reprovado"].some(item => key.includes(item))) return "danger";
    if (["pendente", "aguardando", "solicitado"].some(item => key.includes(item))) return "warn";
    if (["uso", "rota", "andamento"].some(item => key.includes(item))) return "info";
    return "ok";
  }

  function isCarCalendarItem(item) {
    const text = P.normalize([item.label, item.value, item.note, item.type, item.scope, item.category].join(" "));
    return ["carro", "veiculo", "veiculo oficial", "motorista", "deslocamento"].some(term => text.includes(term));
  }

  function carBookings(data = P.getAppData()) {
    const direct = (data.cars || []).map(item => ({
      requestId: item.requestId || item.id || item.ID || "",
      vehicle: item.vehicle || item.car || item.recurso || "Carro oficial",
      date: item.date || item.value || "",
      time: item.time || item.hora || "",
      returnTime: item.returnTime || item.devolutionTime || item.devolucao || "",
      requester: item.requester || item.owner || item.responsavel || "",
      sector: item.sector || item.setor || "",
      category: item.category || item.categoria || "",
      destination: item.destination || item.place || item.local || "",
      driver: item.driver || item.motorista || "",
      driverId: item.driverId || item.condutorId || item.CondutorId || "",
      status: item.status || "pendente",
      note: item.note || item.description || item.motivo || "",
      source: "cars"
    }));
    const fromCalendar = (data.calendar || []).filter(isCarCalendarItem).map(item => ({
      requestId: item.requestId || "",
      vehicle: item.vehicle || "Carro oficial",
      date: item.date || item.value || "",
      time: item.time || "",
      returnTime: item.returnTime || item.devolutionTime || item.devolucao || "",
      requester: item.owner || item.assignee || item.responsible || "",
      sector: item.sector || item.setor || "",
      category: item.category || item.categoria || "",
      destination: item.place || item.local || item.note || "",
      driver: item.driver || "",
      driverId: item.driverId || item.condutorId || item.CondutorId || "",
      status: item.tone || item.status || "agenda",
      note: item.note || item.label || "",
      source: "calendar"
    }));
    const seen = new Set();
    return [...direct, ...fromCalendar]
      .filter(item => item.vehicle || item.date || item.destination || item.requester)
      .filter(item => {
        const key = P.searchText([item.vehicle, item.date, item.time, item.destination, item.requester, item.source]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const dateA = calendarDate({ value: a.date })?.getTime() || Number.MAX_SAFE_INTEGER;
        const dateB = calendarDate({ value: b.date })?.getTime() || Number.MAX_SAFE_INTEGER;
        return dateA - dateB || String(a.time || "").localeCompare(String(b.time || ""));
      });
  }

  function canShowCarDetails(item) {
    if (item?.restricted) return false;
    return P.canViewCarBookingDetails ? P.canViewCarBookingDetails(item) : true;
  }

  function carVehicleEmoji(vehicle = "") {
    const key = P.normalize(vehicle || "");
    if (key.includes("pick")) return "&#128763;";
    if (key.includes("utilitario") || key.includes("utilit")) return "&#128656;";
    return "&#128663;";
  }

  function carDriverLabel(item = {}) {
    if (item.driver) return item.driver;
    if (item.driverId) return `Condutor ID ${item.driverId}`;
    return "Condutor n\u00e3o informado";
  }

  function carDisplayDate(value = "") {
    const text = String(value || "").trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return text || "--";
  }

  function carRequestLabel(value = "") {
    const text = String(value || "").trim();
    if (!text || P.normalize(text).includes("sharepoint")) return "--";
    return text;
  }

  function carCalendarEntry(item) {
    const details = canShowCarDetails(item);
    const timeLabel = `${item.time || "Hor\u00e1rio a definir"}${item.returnTime ? ` - ${item.returnTime}` : ""}`;
    return {
      label: details
        ? `${item.vehicle} - ${item.destination || item.requester || "reserva"}`
        : `${item.vehicle} - ${item.time || "hor\u00e1rio a definir"}`,
      value: item.date,
      date: item.date,
      time: item.time,
      note: details
        ? `${timeLabel} | Solicita\u00e7\u00e3o ${item.requestId || "--"} | ${item.status || "pendente"}`
        : `${timeLabel} | Reserva de ve\u00edculo`,
      tone: carStatusTone(item.status),
      type: "carro",
      scope: "shared"
    };
  }

  function focusCarBooking(key) {
    P.setPage?.("cars");
    requestAnimationFrame(() => {
      const target = P.$(`[data-car-key="${key}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("focused");
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function calendarWithOperationalFallback(calendar, data = P.getAppData()) {
    const base = [...(calendar || [])];
    const carItems = carBookings(data).map(item => ({ ...carCalendarEntry(item), source: "cars" }));
    if (base.length) {
      const seen = new Set(base.map(item => P.searchText([item.label, item.value, item.date, item.time, item.note])));
      return [...base, ...carItems.filter(item => {
        const key = P.searchText([item.label, item.value, item.date, item.time, item.note]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })].sort((a, b) => {
        const dateA = calendarDate({ value: a.date || a.value })?.getTime() || Number.MAX_SAFE_INTEGER;
        const dateB = calendarDate({ value: b.date || b.value })?.getTime() || Number.MAX_SAFE_INTEGER;
        return dateA - dateB || String(a.time || "").localeCompare(String(b.time || ""));
      });
    }
    const ctcItems = (data.ctcVisits || []).map(item => ({
      label: `CTC - ${item.place || item.owner || "visita técnica"}`,
      value: item.date,
      date: item.date,
      time: item.time,
      note: `${item.time || "Horário a definir"} | ${item.owner || "Técnico"} | ${item.objective || "Visita técnica"}`,
      scope: "shared",
      type: "ctc",
      source: "ctc"
    }));
    return [...carItems, ...ctcItems].sort((a, b) => {
      const dateA = calendarDate({ value: a.date })?.getTime() || Number.MAX_SAFE_INTEGER;
      const dateB = calendarDate({ value: b.date })?.getTime() || Number.MAX_SAFE_INTEGER;
      return dateA - dateB || String(a.time || "").localeCompare(String(b.time || ""));
    });
  }

  function renderCars(data) {
    const grid = P.$("#carGrid");
    if (!grid) return;
    const existingStatus = P.sourceResult?.("cars");
    if (!existingStatus && P.sources?.cars?.url && !P.carsAutoRefreshStarted) {
      P.carsAutoRefreshStarted = true;
      P.ensureSource?.("cars")
        .then(() => {
          P.renderSourceStatus?.();
          renderCars(P.scopedData?.(P.getAppData()) || P.getAppData());
        })
        .catch(() => renderCars(P.scopedData?.(P.getAppData()) || P.getAppData()));
    }
    const allBookings = carBookings(data);
    const bookings = monthFiltered(allBookings, item => item.date);
    const vehicleFilter = P.$("#carVehicleFilter");
    const statusFilter = P.$("#carStatusFilter");
    const vehicles = [...new Set(bookings.map(item => item.vehicle).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const statuses = [...new Set(bookings.map(item => item.status || "pendente"))].sort((a, b) => a.localeCompare(b));
    setSelectOptions(vehicleFilter, [{ value: "all", label: "Todos" }, ...vehicles.map(item => ({ value: P.searchText([item]), label: item }))], vehicleFilter?.value || "all");
    setSelectOptions(statusFilter, [{ value: "all", label: "Todos" }, ...statuses.map(item => ({ value: P.searchText([item]), label: item }))], statusFilter?.value || "all");
    bindSimpleSelect(vehicleFilter, () => renderCars(P.scopedData?.(P.getAppData()) || P.getAppData()));
    bindSimpleSelect(statusFilter, () => renderCars(P.scopedData?.(P.getAppData()) || P.getAppData()));
    bindResetButton(P.$("#carFilterReset"), () => {
      if (vehicleFilter) vehicleFilter.value = "all";
      if (statusFilter) statusFilter.value = "all";
      renderCars(P.scopedData?.(P.getAppData()) || P.getAppData());
    });
    const refreshButton = P.$("#carRefreshBtn");
    const sourceStatus = P.$("#carSourceStatus");
    if (refreshButton && !refreshButton.dataset.bound) {
      refreshButton.dataset.bound = "true";
      refreshButton.addEventListener("click", async () => {
        const original = refreshButton.textContent;
        refreshButton.disabled = true;
        refreshButton.textContent = "Atualizando...";
        if (sourceStatus) sourceStatus.textContent = "Atualizando reservas de carros...";
        try {
          const result = await P.refreshSource?.("cars");
          P.renderSourceStatus?.();
          P.renderGlobalSyncBanner?.();
          const rows = result?.rows?.length || 0;
          if (sourceStatus) sourceStatus.textContent = `${rows} reserva(s) atualizada(s).`;
          renderCars(P.scopedData?.(P.getAppData()) || P.getAppData());
        } catch (error) {
          if (sourceStatus) sourceStatus.textContent = error?.message || "N\u00e3o foi poss\u00edvel atualizar as reservas.";
          P.renderGlobalSyncBanner?.();
        } finally {
          refreshButton.disabled = false;
          refreshButton.textContent = original || "Atualizar";
        }
      });
    }
    const vehicleValue = vehicleFilter?.value || "all";
    const statusValue = statusFilter?.value || "all";
    const visible = bookings.filter(item => {
      const vehicleOk = vehicleValue === "all" || P.searchText([item.vehicle]) === vehicleValue;
      const statusOk = statusValue === "all" || P.searchText([item.status || "pendente"]) === statusValue;
      return vehicleOk && statusOk;
    });
    const summary = P.$("#carFilterSummary");
    if (summary) summary.textContent = "";
    const summaryBox = P.$("#carSummaryRows")?.closest(".summary-box");
    if (summaryBox) summaryBox.hidden = true;
    if (sourceStatus && !sourceStatus.textContent.includes("Atualizando")) {
      const status = (P.sourceStatus || []).find(item => item.key === "cars");
      if (status?.status === "loading") sourceStatus.textContent = "Carregando reservas de carros...";
      else if (status?.status === "loaded") sourceStatus.textContent = `${status.rows?.length || 0} reserva(s) carregada(s).`;
      else if (status?.status === "error") sourceStatus.textContent = status.error?.message || "Reservas n\u00e3o carregadas.";
      else sourceStatus.textContent = P.sources?.cars?.url ? "" : "Fonte de carros n\u00e3o configurada.";
    }
    renderSummaryRows("#carSummaryRows", []);
    if (!visible.length) {
      grid.innerHTML = `
        <section class="car-calendar-shell">
          ${calendarBoardMarkup([], { includeDetails: false })}
        </section>
        <div class="empty-state">${bookings.length ? "Nenhum agendamento de carro encontrado neste filtro." : `Sem solicita\u00e7\u00f5es at\u00e9 o momento em ${P.selectedMonthLabel?.() || "m\u00eas selecionado"}.`}</div>
      `;
      return;
    }
    const byDate = visible.reduce((acc, item) => {
      const key = item.date || "Sem data";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
    const carCalendar = visible.map(carCalendarEntry);
    grid.innerHTML = `
      <section class="car-calendar-shell">
        ${calendarBoardMarkup(carCalendar, { includeDetails: false })}
      </section>
      <section class="car-widget-agenda">
        ${Object.entries(byDate).map(([date, items]) => `
          <article class="car-day-group">
            <div class="car-day-head"><strong>${carDisplayDate(date)}</strong><small>${items.length} reserva(s)</small></div>
            ${items.map(item => {
              const tone = carStatusTone(item.status);
              const details = canShowCarDetails(item);
              const key = details
                ? P.searchText([item.vehicle, item.date, item.time, item.destination, item.requester])
                : P.searchText([item.vehicle, item.date, item.time]);
              const search = details
                ? P.searchText([item.vehicle, item.date, item.time, item.destination, item.requester, item.driver, item.status, item.note])
                : P.searchText([item.vehicle, item.date, item.time]);
              const calendarItem = carCalendarEntry(item);
              const calendarKey = P.searchText([calendarItem.label, calendarItem.value]);
              const displayDate = carDisplayDate(date);
              const requestLabel = carRequestLabel(item.requestId);
              return `<button class="car-booking-card car-booking-${tone}${details ? "" : " car-booking-limited"}" type="button" data-car-key="${key}" data-car-calendar-key="${calendarKey}" data-search="${search}">
                <span class="car-card-icon">${carVehicleEmoji(item.vehicle)}</span>
                <span class="car-card-body">
                  <span class="car-card-headline">
                    <span class="car-route">
                      <strong>${details ? (item.destination || "Destino n\u00e3o informado") : (item.vehicle || "Carro oficial")}</strong>
                      <small>${details ? (item.vehicle || "Carro oficial") : "Reserva de ve\u00edculo oficial"}</small>
                    </span>
                    <em class="status-pill ${details ? tone : "info"}">${details ? (item.status || "pendente") : "reservado"}</em>
                  </span>
                  <span class="car-booking-metrics">
                    <span><small>Data</small><strong>${displayDate}</strong></span>
                    <span><small>Retirada</small><strong>${item.time || "--:--"}</strong></span>
                    <span><small>Devolu\u00e7\u00e3o</small><strong>${item.returnTime || "--:--"}</strong></span>
                    <span><small>N\u00ba</small><strong>${requestLabel}</strong></span>
                  </span>
                  <span class="car-requester${details ? "" : " restricted-blur"}"><strong>${details ? (item.requester || "Setor n\u00e3o informado") : "Detalhes protegidos"}</strong><small>${details ? carDriverLabel(item) : "Destino, setor e condutor protegidos"}</small></span>
                </span>
              </button>`;
            }).join("")}
          </article>
        `).join("")}
      </section>
    `;
    grid.querySelectorAll(".calendar-day [data-calendar-key]").forEach(button => {
      button.addEventListener("click", () => {
        const target = grid.querySelector(`[data-car-calendar-key="${button.dataset.calendarKey}"]`);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("focused");
        window.setTimeout(() => target.classList.remove("focused"), 1600);
      });
    });
  }

  function renderCalendar(calendar) {
    const grid = P.$("#calendarGrid");
    if (!grid) return;
    bindCalendarTabs();
    const mode = P.$("[data-calendar-mode].active")?.dataset.calendarMode || "shared";
    const sourceCalendar = calendarWithOperationalFallback(calendar, P.scopedData?.(P.getAppData()) || P.getAppData());
    const visibleAll = calendarByMode(sourceCalendar, mode);
    const visible = monthFiltered(visibleAll, item => item.date || item.value);
    renderCalendarOperationalSummary(visible, mode);
    if (!visible.length) {
      grid.innerHTML = `<div class="empty-state">${mode === "personal" ? "Nenhum evento pessoal" : "Nenhum evento compartilhado"} em ${P.selectedMonthLabel?.() || "mês selecionado"}.</div>`;
      return;
    }
    grid.innerHTML = calendarBoardMarkup(visible);
    grid.querySelectorAll(".calendar-day [data-calendar-key]").forEach(button => {
      button.addEventListener("click", () => {
        const target = grid.querySelector(`.detail-widget[data-calendar-key="${button.dataset.calendarKey}"]`);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("focused");
        window.setTimeout(() => target.classList.remove("focused"), 1600);
      });
    });
  }

  function bindCalendarTabs() {
    P.$all("[data-calendar-mode]").forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => {
        P.$all("[data-calendar-mode]").forEach(tab => tab.classList.toggle("active", tab === button));
        const data = P.scopedData?.(P.getAppData()) || P.getAppData();
        renderCalendar(data.calendar || []);
      });
    });
  }

  function setCalendarMode(mode = "shared") {
    const target = P.$(`[data-calendar-mode="${mode}"]`) || P.$("[data-calendar-mode]");
    if (!target) return;
    P.$all("[data-calendar-mode]").forEach(tab => tab.classList.toggle("active", tab === target));
    const data = P.scopedData?.(P.getAppData()) || P.getAppData();
    renderCalendar(data.calendar || []);
  }

  function addCalendarKey(keys, value, options = {}) {
    const key = P.normalize ? P.normalize(value) : String(value || "").toLowerCase().trim();
    if (!key) return;
    keys.add(key);
    if (key.includes("@")) {
      const local = key.split("@")[0];
      keys.add(local);
      if (options.loose) local.split(/[\s._-]+/).filter(part => part.length > 2).forEach(part => keys.add(part));
      return;
    }
    if (options.loose) key.split(/[\s._-]+/).filter(part => part.length > 2).forEach(part => keys.add(part));
  }

  function calendarCurrentUserKeys() {
    const user = P.onlineUser?.() || P.activeUser?.() || {};
    const display = P.displayUser?.() || {};
    const contact = P.contactForUser?.(user) || {};
    const keys = new Set();
    [user.id, user.contactId, user.contact_id, display.id, display.contactId, contact.id].forEach(value => addCalendarKey(keys, value));
    [user.email, display.email, contact.email].forEach(value => addCalendarKey(keys, value, { loose: false }));
    [
      user.name,
      user.login,
      user.username,
      user.contactName,
      user.supervisorName,
      display.name,
      display.shortName,
      display.login,
      contact.name
    ].forEach(value => addCalendarKey(keys, value, { loose: true }));
    return keys;
  }

  function calendarItemOwnerKeys(item) {
    const keys = new Set();
    [item.ownerId, item.userId, item.assigneeId, item.contactId, item.contact_id].forEach(value => addCalendarKey(keys, value));
    [item.ownerEmail, item.email].forEach(value => addCalendarKey(keys, value, { loose: false }));
    [
      item.owner,
      item.user,
      item.assignee,
      item.responsible,
      item.login,
      item.username
    ].forEach(value => addCalendarKey(keys, value, { loose: true }));
    return keys;
  }

  function calendarModeKey(value) {
    return P.normalize ? P.normalize(value) : String(value || "").toLowerCase().trim();
  }

  function calendarByMode(calendar, mode) {
    const userKeys = calendarCurrentUserKeys();
    const personalModes = new Set(["personal", "pessoal", "privado", "individual"]);
    const sharedModes = new Set(["shared", "compartilhado", "geral", "publico", "publico ure", "ure"]);
    return (calendar || []).filter(item => {
      const ownerKeys = calendarItemOwnerKeys(item);
      const markerKeys = [item.scope, item.type, item.category, item.categoria].map(calendarModeKey).filter(Boolean);
      const ownerMatches = [...ownerKeys].some(key => userKeys.has(key));
      const shared = markerKeys.some(key => sharedModes.has(key));
      const personal = markerKeys.some(key => personalModes.has(key)) || (!shared && ownerKeys.size > 0);
      return mode === "personal" ? personal && ownerMatches : !personal;
    });
  }

  function calendarDate(item) {
    const value = String(item.value || item.date || "");
    const isoMatch = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  function calendarBoardMarkup(calendar, options = {}) {
    const includeDetails = options.includeDetails !== false;
    const selected = P.selectedMonth?.() || { year: 2026, month: 5 };
    const first = new Date(selected.year, selected.month - 1, 1);
    const daysInMonth = new Date(selected.year, selected.month, 0).getDate();
    const offset = first.getDay();
    const byDay = calendar.reduce((acc, item) => {
      const date = calendarDate(item);
      if (!date || date.getFullYear() !== selected.year || date.getMonth() !== selected.month - 1) return acc;
      const day = date.getDate();
      acc[day] = acc[day] || [];
      acc[day].push(item);
      return acc;
    }, {});
    const cells = [
      ...Array.from({ length: offset }, (_, index) => `<div class="calendar-day muted" aria-hidden="true"></div>`),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const items = byDay[day] || [];
        return `
          <div class="calendar-day${items.length ? " has-event" : ""}">
            <strong>${day}</strong>
            ${items.slice(0, 2).map(item => `<button type="button" data-calendar-key="${P.searchText([item.label, item.value])}">${item.label}</button>`).join("")}
            ${items.length > 2 ? `<small>+${items.length - 2}</small>` : ""}
          </div>
        `;
      })
    ];
    return `
      <article class="box calendar-board">
        <div class="box-head"><div><strong>${P.selectedMonthLabel?.() || "Mês atual"}</strong><small>Calendário visual do recorte selecionado</small></div></div>
        <div class="calendar-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span></div>
        <div class="calendar-days">${cells.join("")}</div>
      </article>
      ${includeDetails ? calendar.map(item => `
        <article class="detail-widget" data-calendar-key="${P.searchText([item.label, item.value])}" data-search="${P.searchText([item.label, item.value, item.note])}">
          <div>
            <small>${item.value || "Sem data"}</small>
            <strong>${item.label}</strong>
            <p>${item.note}</p>
          </div>
          <span class="status-pill info">Agenda</span>
        </article>
      `).join("") : ""}
    `;
  }

  function renderCalendarOperationalSummary(calendar, mode = "shared") {
    const rows = [
      { icon: "AG", title: mode === "personal" ? "Agenda pessoal" : "Agenda compartilhada", note: `${calendar.length} evento(s) ou prazo(s) disponíveis.`, label: `${calendar.length}`, tone: calendar.length ? "info" : "warn" },
      { icon: "CR", title: "Recursos compartilhados", note: `${calendar.filter(item => P.normalize([item.label, item.note].join(" ")).includes("carro")).length} item(ns) relacionados a carro oficial.`, label: "recurso", tone: "info" },
      { icon: "PZ", title: "Prazos", note: `${calendar.filter(item => P.normalize([item.label, item.note].join(" ")).includes("prazo")).length} item(ns) com sinal de prazo institucional.`, label: "prazo", tone: "warn" },
      { icon: "OK", title: "Fonte", note: calendar.length ? "Agenda pronta para consulta no recorte atual." : "Aguardando fonte oficial do calendario URE.", label: calendar.length ? "ok" : "pendente", tone: calendar.length ? "ok" : "warn" }
    ];
    renderSummaryRows("#calendarSummaryRows", rows);
  }

  function renderProfiles(profiles) {
    const grid = P.$("#profilesGrid");
    if (!grid) return;
    grid.innerHTML = profiles.length ? profiles.map(profile => `
      <article class="detail-widget" data-search="${P.searchText([profile.name, profile.access, profile.note])}">
        <div>
          <small>${profile.access}</small>
          <strong>${profile.emoji} ${profile.name}</strong>
          <p>${profile.note}</p>
        </div>
        <span class="status-pill info">perfil</span>
      </article>
    `).join("") : `<div class="empty-state">Nenhum perfil definido ainda.</div>`;
  }

  function renderQuality(items) {
    const grid = P.$("#qualityGrid");
    if (!grid) return;
    grid.innerHTML = items.length ? items.map(item => `
      <article class="detail-widget" data-search="${P.searchText([item.label, item.status, item.note])}">
        <div>
          <small>${item.status === "ok" ? "concluído" : "atenção"}</small>
          <strong>${item.label}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.status)}">${item.status === "ok" ? "ok" : "revisar"}</span>
      </article>
    `).join("") : `<div class="empty-state">Checklist de qualidade não carregado.</div>`;
  }

  function bindCtcVisitForm() {
    const form = P.$("#ctcVisitForm");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "true";
    const schoolSelect = P.$("#ctcNewSchool");
    if (schoolSelect && !schoolSelect.options.length) {
      const schools = (P.getAppData().schools || []).map(school => school.name).filter(Boolean).sort((a, b) => a.localeCompare(b));
      schoolSelect.innerHTML = schools.map(name => `<option value="${name}">${name}</option>`).join("");
    }
    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = P.getAppData();
      const visit = {
        owner: P.$("#ctcNewOwner")?.value.trim() || "Técnico CTC",
        date: P.$("#ctcNewDate")?.value || new Date().toISOString().slice(0, 10),
        time: P.$("#ctcNewTime")?.value || "08:00",
        place: P.$("#ctcNewSchool")?.value || "",
        objective: P.$("#ctcNewObjective")?.value.trim() || "Visita técnica"
      };
      if (!visit.place) return;
      P.setAppData({ ...data, ctcVisits: [...(data.ctcVisits || []), visit] });
      P.saveAppData?.();
      form.reset();
      P.showToast?.("Visita CTC agendada", `${visit.owner} em ${visit.place}.`, "ok", { delay: 5000 });
      renderCtc(P.getAppData().ctcVisits);
    });
  }

  function renderCtc(visits) {
    const grid = P.$("#ctcGrid");
    if (!grid) return;
    bindCtcVisitForm();
    const ownerFilter = P.$("#ctcOwnerFilter");
    const schoolFilter = P.$("#ctcSchoolFilter");
    const monthVisits = monthFiltered(visits, visit => visit.date);
    const owners = [...new Set(monthVisits.map(visit => visit.owner).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const schools = [...new Set(monthVisits.map(visit => visit.place).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setSelectOptions(ownerFilter, [{ value: "all", label: "Todos" }, ...owners.map(owner => ({ value: P.searchText([owner]), label: owner }))], ownerFilter?.value || "all");
    setSelectOptions(schoolFilter, [{ value: "all", label: "Todas" }, ...schools.map(school => ({ value: P.searchText([school]), label: school }))], schoolFilter?.value || "all");
    bindSimpleSelect(ownerFilter, () => renderCtc(P.getAppData().ctcVisits));
    bindSimpleSelect(schoolFilter, () => renderCtc(P.getAppData().ctcVisits));
    bindResetButton(P.$("#ctcFilterReset"), () => {
      if (ownerFilter) ownerFilter.value = "all";
      if (schoolFilter) schoolFilter.value = "all";
      renderCtc(P.getAppData().ctcVisits);
    });

    const selectedOwner = ownerFilter?.value || "all";
    const selectedSchool = schoolFilter?.value || "all";
    const visible = monthVisits.filter(visit => {
      const ownerOk = selectedOwner === "all" || P.searchText([visit.owner]) === selectedOwner;
      const schoolOk = selectedSchool === "all" || P.searchText([visit.place]) === selectedSchool;
      return ownerOk && schoolOk;
    });
    renderCtcOperationalSummary(monthVisits, visible);
    const summary = P.$("#ctcFilterSummary");
    if (summary) summary.textContent = `${visible.length}/${monthVisits.length} visita(s) visíveis em ${P.selectedMonthLabel?.() || "mês selecionado"}.`;

    grid.innerHTML = visible.length ? visible.map(visit => `
      <article class="detail-widget ctc-visit-card" data-ctc-key="${P.searchText([visit.owner, visit.date, visit.time, visit.place])}" data-search="${P.searchText([visit.owner, visit.date, visit.time, visit.place, visit.objective])}">
        <div class="ctc-date-box"><strong>${formatDate(visit.date)}</strong><small>${visit.time || "--:--"}</small></div>
        <div>
          <small>${visit.owner || "Técnico CTC"}</small>
          <strong>${visit.place}</strong>
          <p>${visit.objective}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${visit.place}">Abrir escola</button>
        </div>
      </article>
    `).join("") : `<div class="empty-state">${monthVisits.length ? "Nenhuma visita CTC com esses filtros." : `Nenhuma visita CTC em ${P.selectedMonthLabel?.() || "mês selecionado"}.`}</div>`;
    grid.querySelectorAll("[data-open-school]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.openSchool));
    });
  }

  function renderCtcOperationalSummary(visits, visible) {
    const owners = new Set(visible.map(visit => visit.owner).filter(Boolean)).size;
    const schools = new Set(visible.map(visit => visit.place).filter(Boolean)).size;
    const dates = new Set(visible.map(visit => visit.date).filter(Boolean)).size;
    const rows = [
      { icon: "CT", title: "Visitas técnicas", note: `${visible.length}/${visits.length} visita(s) no recorte atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "US", title: "Técnicos", note: `${owners} técnico(s) com agenda visível.`, label: `${owners}`, tone: owners ? "ok" : "warn" },
      { icon: "ES", title: "Escolas atendidas", note: `${schools} escola(s) aparecem nas visitas filtradas.`, label: `${schools}`, tone: schools ? "info" : "warn" },
      { icon: "AG", title: "Dias de agenda", note: `${dates} dia(s) distintos no recorte.`, label: `${dates}`, tone: dates ? "info" : "warn" }
    ];
    renderSummaryRows("#ctcSummaryRows", rows);
  }

  function renderCalls(calls) {
    const grid = P.$("#callsGrid");
    if (!grid) return;
    const statusFilter = P.$("#callStatusFilter");
    const schoolFilter = P.$("#callSchoolFilter");
    const tone = status => status === "resolvido" ? "ok" : status === "em_rota" ? "info" : "warn";
    const schools = [...new Set(calls.map(call => call.school).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setSelectOptions(schoolFilter, [{ value: "all", label: "Todas" }, ...schools.map(school => ({ value: P.searchText([school]), label: school }))], schoolFilter?.value || "all");
    bindSimpleSelect(statusFilter, () => renderCalls(P.getAppData().calls));
    bindSimpleSelect(schoolFilter, () => renderCalls(P.getAppData().calls));
    bindResetButton(P.$("#callFilterReset"), () => {
      if (statusFilter) statusFilter.value = "all";
      if (schoolFilter) schoolFilter.value = "all";
      renderCalls(P.getAppData().calls);
    });

    const selectedStatus = statusFilter?.value || "all";
    const selectedSchool = schoolFilter?.value || "all";
    const visible = calls.filter(call => {
      const statusOk = selectedStatus === "all" || call.status === selectedStatus;
      const schoolOk = selectedSchool === "all" || P.searchText([call.school]) === selectedSchool;
      return statusOk && schoolOk;
    });
    renderCallOperationalSummary(calls, visible);
    const summary = P.$("#callFilterSummary");
    if (summary) summary.textContent = `${visible.length}/${calls.length} chamado(s) visíveis.`;

    grid.innerHTML = visible.length ? visible.map(call => `
      <article class="detail-widget" data-call-key="${P.searchText([call.title])}" data-search="${P.searchText([call.title, call.school, call.status, call.note])}">
        <div>
          <small>${call.school}</small>
          <strong>${call.title}</strong>
          <p>${call.note}</p>
        </div>
        <div class="detail-actions">
          <span class="status-pill ${tone(call.status)}">${call.status.replace("_", " ")}</span>
          <button class="ghost-btn" type="button" data-open-school="${call.school}">Abrir escola</button>
        </div>
      </article>
    `).join("") : `<div class="empty-state">${calls.length ? "Nenhum chamado com esses filtros." : "Nenhum chamado carregado."}</div>`;
    grid.querySelectorAll("[data-open-school]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.openSchool));
    });
  }

  function renderCallOperationalSummary(calls, visible) {
    const open = visible.filter(call => call.status === "aberto").length;
    const route = visible.filter(call => call.status === "em_rota").length;
    const resolved = visible.filter(call => call.status === "resolvido").length;
    const schools = new Set(visible.map(call => call.school).filter(Boolean)).size;
    const rows = [
      { icon: "CH", title: "Fila visível", note: `${visible.length}/${calls.length} chamado(s) no recorte atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "ok" },
      { icon: "!", title: "Abertos", note: `${open} chamado(s) aguardando encaminhamento.`, label: `${open}`, tone: open ? "warn" : "ok" },
      { icon: "SV", title: "Em rota", note: `${route} chamado(s) em atendimento.`, label: `${route}`, tone: route ? "info" : "ok" },
      { icon: "ES", title: "Escolas envolvidas", note: `${schools} escola(s) com chamado no filtro. Resolvidos: ${resolved}.`, label: `${schools}`, tone: schools ? "info" : "ok" }
    ];
    renderSummaryRows("#callSummaryRows", rows);
  }

  function satisfactionTone(status = "") {
    const text = P.normalize?.(status) || String(status || "").toLowerCase();
    if (text.includes("encerr") || text.includes("finaliz")) return "ok";
    if (text.includes("planej") || text.includes("pend")) return "warn";
    if (text.includes("cancel")) return "danger";
    return "info";
  }

  function renderSatisfaction(items = []) {
    const grid = P.$("#satisfactionGrid");
    if (!grid) return;
    const list = Array.isArray(items) ? items : [];
    const active = list.filter(item => !["encerrada", "finalizada", "cancelada"].some(term => (P.normalize?.(item.status) || "").includes(term))).length;
    const responses = list.reduce((sum, item) => sum + Number(item.responses || 0), 0);
    const links = list.filter(item => item.link).length;
    renderSummaryRows("#satisfactionSummaryRows", [
      { icon: "PS", title: "Pesquisas", note: "Campanhas cadastradas", label: String(list.length), tone: list.length ? "info" : "warn" },
      { icon: "RP", title: "Respostas", note: "Total consolidado na base", label: String(responses), tone: responses ? "ok" : "warn" },
      { icon: "AT", title: "Ativas", note: "Campanhas em acompanhamento", label: String(active), tone: active ? "info" : "ok" },
      { icon: "LK", title: "Formularios", note: "Links oficiais disponíveis", label: String(links), tone: links ? "ok" : "warn" }
    ]);
    grid.innerHTML = list.length ? list.map(item => {
      const tone = satisfactionTone(item.status);
      const search = P.searchText([item.title, item.audience, item.status, item.period, item.note]);
      return `
        <article class="detail-widget" data-search="${search}">
          <div>
            <small>${item.period || "Periodo a definir"}</small>
            <strong>${item.title || "Pesquisa de satisfação"}</strong>
            <p>${item.note || item.audience || "Aguardando fonte oficial da pesquisa."}</p>
            <div class="mini-metrics">
              <span><b>Publico</b>${item.audience || "Nao informado"}</span>
              <span><b>Respostas</b>${Number(item.responses || 0)}</span>
              <span><b>Nota</b>${item.score || "sem media"}</span>
            </div>
          </div>
          <div class="detail-actions">
            <span class="status-pill ${tone}">${item.status || "ativa"}</span>
            ${item.link ? `<a class="ghost-btn" href="${item.link}" target="_blank" rel="noopener">Abrir formulário</a>` : ""}
          </div>
        </article>
      `;
    }).join("") : `<div class="empty-state">Nenhuma pesquisa de satisfacao cadastrada. Cadastre a fonte oficial no Painel admin quando o formulário estiver pronto.</div>`;
  }

  function renderReports(data) {
    const grid = P.$("#reportsGrid");
    const list = P.$("#reportsList");
    const plan = P.$("#reportsPlanList");
    if (!grid || !list) return;
    const ctcVisits = monthFiltered(data.ctcVisits || [], item => item.date);
    const supervisorVisitCount = (data.supervisors || []).reduce((sum, item) => sum + (Array.isArray(item.visits) ? item.visits.length : Number(item.visits || 0)), 0);
    const pendingVisits = (data.supervisors || []).reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const cars = monthFiltered(carBookings(data), item => item.date);
    const openCalls = (data.calls || []).filter(call => call.status !== "resolvido").length;
    const involvedSchools = new Set([
      ...ctcVisits.map(item => item.place),
      ...(data.calls || []).map(item => item.school),
      ...(data.supervisors || []).flatMap(item => item.assignedSchools || [])
    ].filter(Boolean).map(item => P.normalize(item)));
    const metrics = [
      { icon: "VT", label: "Visitas CTC", value: String(ctcVisits.length), note: "técnicas no mês", tone: "glow-teal" },
      { icon: "SV", label: "Supervisão", value: String(supervisorVisitCount || data.supervisors.length), note: supervisorVisitCount ? "visitas registradas" : "responsáveis ativos", tone: "glow-lime" },
      { icon: "PE", label: "Pendências", value: String(pendingVisits), note: "visitas faltantes", tone: pendingVisits ? "glow-amber" : "glow-teal" },
      { icon: "&#128663;", label: "Deslocamentos", value: String(cars.length), note: "carros no recorte", tone: "glow-teal" },
      { icon: "CH", label: "Chamados", value: `${openCalls}/${data.calls.length}`, note: "em acompanhamento", tone: openCalls ? "glow-amber" : "glow-lime" },
      { icon: "ES", label: "Escolas", value: String(involvedSchools.size || data.schools.length), note: "com referência", tone: "glow-lime" }
    ];
    grid.innerHTML = metrics.map(item => `
      <article class="metric-card ${item.tone}">
        <span>${item.icon}</span>
        <small>${item.label}</small>
        <strong>${item.value}</strong>
        <em>${item.note}</em>
      </article>
    `).join("");
    list.innerHTML = [
      ["Visitas técnicas CTC", `${ctcVisits.length} compromisso(s) técnico(s) no recorte atual.`, ctcVisits.length ? "ok" : "info"],
      ["Visitas de supervisão", supervisorVisitCount ? `${supervisorVisitCount} visita(s) registrada(s) nas planilhas de supervisão.` : `${data.supervisors.length} responsável(is) ativo(s), aguardando detalhamento de visitas.`, supervisorVisitCount ? "ok" : "info"],
      ["Deslocamentos oficiais", `${cars.length} reserva(s) de carro oficial vinculada(s) ao mês selecionado.`, cars.length ? "ok" : "info"],
      ["Acompanhamentos e chamados", `${openCalls} chamado(s) aberto(s) de ${data.calls.length} ocorrência(s) cadastrada(s).`, openCalls ? "warn" : "ok"],
      ["Escolas acompanhadas", `${involvedSchools.size || data.schools.length} escola(s) com vínculo em visitas, chamados ou supervisão.`, "ok"],
      ["Relatórios formais", "Base preparada para registrar visitas, devolutivas, deslocamentos e acompanhamentos por setor.", "info"]
    ].map(([title, note, status]) => `
      <div class="data-row" data-search="${P.searchText([title, note, status])}">
        <span class="row-icon">&#128203;</span>
        <span><strong>${title}</strong><small>${note}</small></span>
        <em class="status-pill ${status}">${status === "ok" ? "ok" : "revisar"}</em>
      </div>
    `).join("");
    if (plan) {
      const planned = [
        ["Relatório de visita técnica", "Registro de escola, técnico, objetivo, atendimento realizado e encaminhamentos."],
        ["Relatório de visita de supervisão", "Acompanhamento por supervisor, escola, pauta, pendências e devolutiva."],
        ["Relatório de deslocamento", "Carro, condutor, setor, destino, retirada, devolução e solicitação."],
        ["Relatório de acompanhamento escolar", "Histórico de contatos, visitas, chamados e providências por unidade."],
        ["Relatório de ocorrência/chamado", "Fila operacional com status, prioridade, responsável e data de conclusão."],
        ["Relatório de satisfação", "Campanhas, respostas, média, comentários e plano de ação."]
      ];
      plan.innerHTML = planned.map(([title, note], index) => `
        <div class="data-row compact">
          <span class="row-icon">${String(index + 1).padStart(2, "0")}</span>
          <span><strong>${title}</strong><small>${note}</small></span>
          <em class="status-pill info">planejado</em>
        </div>
      `).join("");
    }
  }

  function renderAdmin(items) {
    const grid = P.$("#adminGrid");
    const overview = P.$("#adminOverview");
    const carDiagnostics = P.$("#carDataDiagnostics");
    if (!grid && !overview) return;
    const data = P.getAppData();
    const cars = P.carBookings?.(data) || [];
    const carSource = P.sourceResult?.("cars") || {};
    const rawCarRows = Array.isArray(carSource.rows) ? carSource.rows : [];
    const rawCarColumns = [...new Set(rawCarRows.flatMap(row => Object.keys(row || {})))].sort((a, b) => a.localeCompare(b));
    const missingCar = {
      destination: cars.filter(item => !item.destination).length,
      date: cars.filter(item => !item.date).length,
      time: cars.filter(item => !item.time).length,
      returnTime: cars.filter(item => !item.returnTime).length,
      requester: cars.filter(item => !item.requester && !item.sector).length,
      driver: cars.filter(item => !item.driver && !item.driverId).length
    };
    const sources = Object.entries(P.sources || {});
    const configuredSources = sources.filter(([, source]) => source.url).length;
    const officialSources = sources.filter(([, source]) => source.status === "official").length;
    const sensitiveSources = sources.filter(([, source]) => source.metadata?.sensitive).length;
    const backend = P.backendStatus || {};
    const currentRole = P.currentRole?.() || "Administrador";
    const linkedUsers = data.users.filter(user => user.contactSync === "linked").length;
    const networkCount = Object.keys(data.networkData || {}).length;
    const overviewRows = [
      { icon: "DB", label: "Base oficial", value: backend.ok ? "online" : "verificar", note: backend.ok ? "API respondendo" : "Clique em Verificar API", tone: backend.ok ? "ok" : "warn" },
      { icon: "US", label: "Usuários", value: String(data.users.length), note: `${linkedUsers} vinculado(s) a contatos`, tone: data.users.length ? "ok" : "warn" },
      { icon: "ES", label: "Escolas", value: String(data.schools.length), note: "unidades na base atual", tone: data.schools.length ? "ok" : "warn" },
      { icon: "FT", label: "Fontes", value: `${configuredSources}/${sources.length}`, note: `${officialSources} oficial(is)`, tone: configuredSources ? "ok" : "warn" },
      { icon: "CR", label: "Carros", value: String(cars.length), note: `${rawCarRows.length || cars.length} linha(s) de origem`, tone: cars.length ? "ok" : "warn" },
      { icon: "RD", label: "Redes", value: String(networkCount), note: "escolas com infraestrutura", tone: networkCount ? "info" : "warn" },
      { icon: "BK", label: "Backups", value: "auto", note: "snapshots antes de gravações", tone: "info" }
    ];
    if (overview) {
      overview.innerHTML = overviewRows.map(item => `
        <article class="admin-overview-card admin-overview-${item.tone}">
          <span>${item.icon}</span>
          <small>${item.label}</small>
          <strong>${item.value}</strong>
          <em>${item.note}</em>
        </article>
      `).join("");
    }
    const systemChecks = [
      { label: "Escolas carregadas", status: data.schools.length === 21 ? "ok" : "warn", note: `${data.schools.length}/21 escola(s)` },
      { label: "Inventário carregado", status: data.schoolAssets.length ? "ok" : "warn", note: `${data.schoolAssets.length} linha(s)` },
      { label: "Supervisão carregada", status: data.supervisors.length === 6 ? "ok" : "warn", note: `${data.supervisors.length}/6 supervisor(es)` },
      { label: "Contatos carregados", status: data.contacts.length ? "ok" : "warn", note: `${data.contacts.length} contato(s)` },
      {
        label: "Backend online",
        status: backend.ok ? "ok" : "warn",
        note: backend.ok ? `API conectada${backend.updatedAt ? ` em ${new Date(backend.updatedAt).toLocaleString("pt-BR")}` : ""}` : "Use Verificar/Carregar para validar a API."
      },
      {
        label: "Fontes oficiais",
        status: configuredSources || officialSources ? "ok" : "warn",
        note: `${configuredSources}/${sources.length} configurada(s), ${officialSources} oficial(is), ${sensitiveSources} sensível(is)`
      },
      {
        label: "Escopo ativo",
        status: P.canAccessData ? "ok" : "danger",
        note: `${currentRole} com ${P.roleAccess?.(currentRole)?.length || 0} página(s) liberada(s). Teste automático cobre os perfis atuais.`
      },
      {
        label: "Fichas escolares",
        status: data.schoolProfiles.length ? "ok" : "warn",
        note: `${data.schoolProfiles.length}/${data.schools.length || 21} ficha(s) herdada(s) da v1`
      },
      {
        label: "Usuários importados da base anterior",
        status: data.users.length ? "ok" : "warn",
        note: `${data.users.length} usuário(s), ${linkedUsers} vinculado(s) a contatos`
      },
      { label: "Perfis ativos", status: P.ROLE_ACCESS ? "ok" : "danger", note: P.ROLE_ACCESS ? `${Object.keys(P.ROLE_ACCESS).length} perfil(is)` : "matriz indisponível" }
    ];
    if (carDiagnostics) {
      const missingRows = [
        ["Destino", missingCar.destination],
        ["Data", missingCar.date],
        ["Retirada", missingCar.time],
        ["Devolucao", missingCar.returnTime],
        ["Setor", missingCar.requester],
        ["Condutor", missingCar.driver]
      ];
      const missingTotal = Object.values(missingCar).reduce((sum, count) => sum + count, 0);
      const fieldText = rawCarColumns.length
        ? rawCarColumns.slice(0, 22).join(", ") + (rawCarColumns.length > 22 ? ` +${rawCarColumns.length - 22}` : "")
        : "Sincronize carros para ver as colunas originais.";
      carDiagnostics.innerHTML = `
        <div class="settings-row">
          <div><strong>Fonte de carros</strong><small>${carSource.status ? `Status ${carSource.status}` : "Ainda sem sincronização nesta sessao."} | ${rawCarRows.length || cars.length} linha(s)</small></div>
          <span class="status-pill ${cars.length ? "ok" : "warn"}">${cars.length ? "ok" : "revisar"}</span>
        </div>
        <div class="settings-row">
          <div><strong>Campos vazios</strong><small>${missingRows.map(([label, count]) => `${label}: ${count}`).join(" | ")}</small></div>
          <span class="status-pill ${missingTotal ? "warn" : "ok"}">${missingTotal ? "revisar" : "ok"}</span>
        </div>
        <div class="settings-row">
          <div><strong>Colunas detectadas</strong><small>${fieldText}</small></div>
          <span class="status-pill info">origem</span>
        </div>
        <div class="settings-row">
          <div><strong>Regra anti-perda</strong><small>Fonte vazia não sobrescreve dados bons; o painel mantém o último estado válido e mostra aviso.</small></div>
          <span class="status-pill ok">ativo</span>
        </div>
      `;
    }
    const rows = [...systemChecks, ...items];
    if (!grid) return;
    grid.innerHTML = rows.length ? rows.map(item => `
      <article class="detail-widget" data-search="${P.searchText([item.label, item.status, item.note])}">
        <div>
          <small>${item.status === "ok" ? "estável" : "decisão pendente"}</small>
          <strong>AD ${item.label}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
      </article>
    `).join("") : `<div class="empty-state">Nenhum diagnostico administrativo carregado.</div>`;
  }

  P.renderDashboard = renderDashboard;
  P.renderUser = renderUser;
  P.focusSchool = focusSchool;
  P.focusSchoolInList = focusSchoolInList;
  P.focusNetworkSchool = focusNetworkSchool;
  P.focusInventorySchool = focusInventorySchool;
  P.focusSupervisor = focusSupervisor;
  P.focusSupervisorInList = focusSupervisorInList;
  P.focusContact = focusContact;
  P.focusCall = focusCall;
  P.focusInventoryAsset = focusInventoryAsset;
  P.focusCtcVisit = focusCtcVisit;
  P.focusCalendarItem = focusCalendarItem;
  P.focusCarBooking = focusCarBooking;
  P.carBookings = carBookings;
  P.renderSchools = renderSchools;
  P.renderNetworkOptions = renderNetworkOptions;
  P.renderInventory = renderInventory;
  P.renderContacts = renderContacts;
  P.renderCalendar = renderCalendar;
  P.renderCars = renderCars;
  P.renderProfiles = renderProfiles;
  P.renderQuality = renderQuality;
  P.renderSatisfaction = renderSatisfaction;
  P.renderCtc = renderCtc;
  P.renderCalls = renderCalls;
  P.renderReports = renderReports;
  P.renderAdmin = renderAdmin;
  P.calendarByMode = calendarByMode;
  P.setCalendarMode = setCalendarMode;
})();
