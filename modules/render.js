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
        note: `${data.schools.length} escola(s) sob acompanhamento no mes.`,
        notice: "Visao filtrada para sua supervisao",
        noticeNote: "A pagina mostra apenas suas escolas, suas metas e os canais de apoio disponiveis.",
        shortcuts: {
          schools: `${data.schools.length} escola(s) vinculada(s)`,
          network: "Restrito ao perfil tecnico",
          inventory: "Restrito ao perfil tecnico",
          supervision: context.pendingVisits ? `${context.pendingVisits} visita(s) pendente(s)` : "metas em dia"
        }
      };
    }
    if (role.includes("ctc") || role.includes("setec") || role.includes("seintec")) {
      return {
        title: "Operacao tecnica",
        note: `${context.networkCount} rede(s) mapeada(s), ${data.schoolAssets.length} item(ns) de inventario.`,
        notice: "Base tecnica pronta para consulta",
        noticeNote: "Redes, IPs, cameras, inventario e chamados aparecem no mesmo fluxo operacional.",
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
        notice: "Visao escolar e de supervisao",
        noticeNote: "Escolas, supervisao, contatos e calendario ficam em primeiro plano.",
        shortcuts: null
      };
    }
    return {
      title: "Pagina inicial da URE",
      note: `${data.schools.length} escola(s), contatos e dados liberados para consulta.`,
      notice: context.calendarCount ? "Base operacional atualizada" : "Base operacional pronta",
      noticeNote: context.calendarCount
        ? "Escolas, supervisao, inventario, redes e agenda disponiveis para consulta."
        : "Escolas, supervisao, inventario, redes e contatos disponiveis para consulta.",
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
      director: "direcao",
      viceDirector: "vice-direcao",
      proati: "PROATI",
      goe: "GOE",
      phone: "telefone",
      mobile: "celular",
      email: "email",
      address: "endereco",
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

  function renderSchoolCityFilter(schools) {
    const select = P.$("#schoolCityFilter");
    if (!select) return;
    const current = select.value || "all";
    const cities = [...new Set(schools.map(school => school.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setSelectOptions(select, [
      { value: "all", label: "Todos" },
      ...cities.map(city => ({ value: P.searchText([city]), label: city }))
    ], current);
    if (!select.dataset.bound) {
      select.dataset.bound = "true";
      select.addEventListener("change", applySchoolCityFilter);
    }
  }

  function supervisorTone(item) {
    return item.pending > 0 ? "warn" : "ok";
  }

  function supervisorStatusMeta(item) {
    const { week, month } = supervisorProgress(item);
    const pending = Number(item.pending || month.missing || 0);
    const tone = pending > 0 ? "warn" : "ok";
    return {
      tone,
      label: pending ? `${pending} faltam` : "em dia",
      title: pending ? "Meta pendente" : "Meta concluida",
      action: `Semana ${week.done}/${week.total || 0} | Mes ${month.done}/${month.total || 0}`
    };
  }

  function supervisorProgress(item) {
    const week = progressParts(item.week);
    const month = progressParts(item.month);
    return {
      week,
      month,
      pending: Number(item.pending || month.missing || 0),
      schools: Number(item.schools || item.assignedSchools?.length || 0)
    };
  }

  function applySupervisorFilters() {
    const status = P.$("#supervisorStatusFilter")?.value || "all";
    const rows = P.$all("#supervisorRows .supervisor-row, #supervisorRows .supervisor-sheet-row");
    const selectorRows = P.$all("#supervisorRows [data-supervisor-selector]");
    let visibleCount = 0;
    rows.forEach(row => {
      const visible = status === "all" || row.dataset.status === status;
      row.classList.toggle("filter-hidden", !visible);
      if (visible) visibleCount++;
    });
    selectorRows.forEach(row => {
      const visible = status === "all" || row.dataset.status === status;
      row.classList.toggle("filter-hidden", !visible);
    });
    const summary = P.$("#supervisorFilterSummary");
    if (summary) summary.textContent = `${visibleCount}/${rows.length} supervisor(es) visiveis.`;
  }

  function bindSupervisorFilters() {
    [P.$("#supervisorStatusFilter"), P.$("#supervisorSortFilter")].forEach(select => {
      if (!select || select.dataset.bound) return;
      select.dataset.bound = "true";
      select.addEventListener("change", () => {
        P.renderSupervisors(P.visibleSupervisors?.() || P.getAppData().supervisors);
      });
    });
    bindResetButton(P.$("#supervisorFilterReset"), () => {
      const status = P.$("#supervisorStatusFilter");
      const sort = P.$("#supervisorSortFilter");
      if (status) status.value = "all";
      if (sort) sort.value = "name";
      P.renderSupervisors(P.visibleSupervisors?.() || P.getAppData().supervisors);
    });
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
    if (status === "manutencao") return "manutencao";
    return "ok";
  }

  function assetPriority(asset) {
    const units = assetUnits(asset);
    if (asset.status === "defeito") return { tone: "warn", label: "defeito", note: `${units} unidade(s) com defeito.` };
    if (asset.status === "manutencao") return { tone: "warn", label: "manutencao", note: `${units} unidade(s) em manutencao.` };
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
    if (subtitle) subtitle.textContent = `${school.city} | CIE ${school.cie}`;
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
      const select = P.$("#networkSelect");
      if (!select) return;
      select.value = name;
      renderNetwork(P.getAppData().networkData);
      select.focus();
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
    if (subtitle) subtitle.textContent = supervisor.email || supervisor.phone || "Acompanhamento de metas e vinculos.";
    renderSupervisorDetail(supervisor, "#supervisorDetailPageBody");
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
    if (P.canAccess && !P.canAccess(item.page)) return "";
    return `
      <button class="data-row${compact ? " compact" : ""}" type="button" data-jump="${item.page}" data-search="${P.searchText([item.title, item.note, item.label])}">
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
    const profile = dashboardProfile(data, { networkCount, calendarCount, missingNetwork, inventoryAlerts, pendingVisits, openCalls, ctcVisits });
    const sourceNote = officialSources
      ? `${officialSources} fonte(s) atualizada(s)`
      : "base local pronta para consulta";

    setText("#dashboardSummary", `${monthLabel} - ${profile.title} - ${sourceNote}`);
    setText("#dashboardNoticeTitle", profile.notice);
    setText("#dashboardNoticeNote", [profile.noticeNote, supervisionMonthNote()].filter(Boolean).join(" "));
    setText("#shortcutSchoolsNote", profile.shortcuts?.schools || `${data.schools.length} unidade(s) na base regional`);
    setText("#shortcutNetworkNote", profile.shortcuts?.network || (missingNetwork ? `${missingNetwork} escola(s) ainda sem rede` : `${networkCount} rede(s) mapeada(s)`));
    setText("#shortcutInventoryNote", profile.shortcuts?.inventory || (inventoryAlerts ? `${inventoryAlerts} unidade(s) em manutencao/defeito` : `${data.schoolAssets.length} linha(s) consolidadas`));
    setText("#shortcutSupervisionNote", profile.shortcuts?.supervision || (pendingVisits ? `${pendingVisits} visita(s) pendente(s)` : `${data.supervisors.length} responsavel(is) ativos`));
    setText("#shortcutCarsNote", carCount ? `${carCount} reserva(s) no recorte` : "Agenda de carros pronta");

    const decisions = [
      missingNetwork
        ? { icon: "&#127760;", title: "Completar dados de rede", note: `${missingNetwork} escola(s) sem infraestrutura mapeada.`, label: "Rede", tone: "warn", page: "network" }
        : { icon: "&#127760;", title: "Redes mapeadas", note: `${networkCount} escola(s) com dados tecnicos disponiveis.`, label: "OK", tone: "ok", page: "network" },
      inventoryAlerts
        ? { icon: "&#128187;", title: "Inventario com manutencao/defeito", note: `${inventoryAlerts} unidade(s) fora de OK.`, label: "Invent.", tone: "warn", page: "inventory" }
        : { icon: "&#128187;", title: "Inventario consolidado", note: `${data.schoolAssets.length} linha(s) carregada(s).`, label: "OK", tone: "ok", page: "inventory" },
      pendingVisits
        ? { icon: "&#129517;", title: "Acompanhar visitas pendentes", note: `${pendingVisits} visita(s) faltando nas metas atuais.`, label: "Meta", tone: "warn", page: "supervision" }
        : { icon: "&#129517;", title: "Supervisao em dia", note: `${data.supervisors.length} responsavel(is) ativos no painel.`, label: "OK", tone: "ok", page: "supervision" }
    ];

    const agenda = [
      calendarCount
        ? { icon: "&#128197;", title: "Agenda com eventos", note: `${calendarCount} evento(s) carregado(s) para consulta.`, label: "Agenda", tone: "info", page: "calendar" }
        : { icon: "&#128197;", title: "Calendario preparado", note: "Area pronta para a agenda institucional da URE.", label: "Agenda", tone: "info", page: "calendar" },
      ctcVisits
        ? { icon: "&#128736;&#65039;", title: "Visitas tecnicas previstas", note: `${ctcVisits} compromisso(s) tecnico(s) na base atual.`, label: "CTC", tone: "info", page: "ctc" }
        : { icon: "&#128736;&#65039;", title: "Agenda CTC pronta", note: "Area preparada para rotas e compromissos tecnicos.", label: "CTC", tone: "info", page: "ctc" },
      openCalls
        ? { icon: "&#128229;", title: "Chamados em acompanhamento", note: `${openCalls} chamado(s) ainda nao resolvido(s).`, label: "Fila", tone: "warn", page: "calls" }
        : { icon: "&#128229;", title: "Fila de chamados estavel", note: "Sem pendencia aberta na base atual.", label: "OK", tone: "ok", page: "calls" },
      carCount
        ? { icon: "&#128663;", title: "Carros agendados", note: `${carCount} reserva(s) de carro oficial no recorte.`, label: "Carros", tone: "info", page: "cars" }
        : { icon: "&#128663;", title: "Agenda de carros pronta", note: "Area pronta para puxar reservas de carros oficiais.", label: "Carros", tone: "info", page: "cars" }
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
      const supervisionPct = (data.supervisors || []).reduce((acc, item) => {
        const month = progressParts(item.month);
        acc.done += month.done;
        acc.total += month.total;
        return acc;
      }, { done: 0, total: 0 });
      const agendaFallbackCount = monthFiltered(calendarWithOperationalFallback(data.calendar || [], data), item => item.date || item.value).length;
      const commandItems = [
        { label: "Escolas", value: data.schools?.length || 0, note: `${networkCount}/${data.schools?.length || 0} com rede`, page: "schools", tone: missingNetwork ? "info" : "ok" },
        { label: "Supervisao", value: supervisionPct.total ? `${Math.round((supervisionPct.done / supervisionPct.total) * 100)}%` : "0%", note: `${pendingVisits} visita(s) pendente(s)`, page: "supervision", tone: pendingVisits ? "warn" : "ok" },
        { label: "Carros", value: carCount, note: carCount ? "reservas no mes" : "sem reserva no mes", page: "cars", tone: carCount ? "info" : "warn" },
        { label: "Agenda", value: agendaFallbackCount, note: calendarCount ? "fonte carregada" : "com fallback operacional", page: "calendar", tone: calendarCount ? "ok" : "info" }
      ];
      command.innerHTML = `
        <article class="command-primary command-${profile.notice === "Base operacional pronta" ? "info" : "ok"}">
          <div>
            <span class="eyebrow">Comando do mes</span>
            <strong>${profile.title}</strong>
            <p>${profile.note}</p>
          </div>
          <button class="ghost-btn" type="button" data-jump="${currentRoleKey().includes("supervis") ? "supervision" : "schools"}">Abrir foco</button>
        </article>
        <div class="command-metrics">
          ${commandItems.map(item => `
            <button class="command-metric command-metric-${item.tone}" type="button" data-jump="${item.page}">
              <small>${item.label}</small>
              <strong>${item.value}</strong>
              <span>${item.note}</span>
            </button>
          `).join("")}
        </div>
      `;
    }

    const decisionRows = P.$("#decisionRows");
    const agendaRows = P.$("#agendaRows");
    if (decisionRows) decisionRows.innerHTML = [profileDecision, ...decisions].map(item => dashboardRow(item)).join("");
    if (agendaRows) agendaRows.innerHTML = agenda.map(item => dashboardRow(item, true)).join("");
  }

  function renderUser(data) {
    const display = P.displayUser?.() || { name: "Jefferson", role: "Administrador", linked: false };
    const role = P.currentRole?.() || display.role || "Administrador";
    const profile = (data.profiles || []).find(item => P.normalize(item.name) === P.normalize(role));
    setText("#userNameLabel", display.name);
    setText("#accountNameLabel", display.shortName || display.name);
    setText("#userIdentitySource", display.linked ? "Usuario vinculado ao contato" : "Usuario importado da v1");
    setText("#userRoleSummary", role);
    setText("#userAccessSummary", profile?.note || "Perfil local de acesso ao painel.");
    setText("#userContactSummary", display.linked
      ? `${display.contactRole || "Contato"} | ${display.sector || "Setor"} | ${display.email || display.phone || "sem canal"}`
      : "Sem contato vinculado. Ajuste o mapeamento em usuarios."
    );
    setText("#userContactStatus", display.linked ? "Vinculado" : "Pendente");
    P.$("#userContactStatus")?.classList.toggle("warn", !display.linked);
    P.$("#userContactStatus")?.classList.toggle("info", display.linked);
    const online = P.onlineUser?.();
    setText("#onlineSessionSummary", online
      ? `${online.username || online.login || online.name} conectado ao backend.`
      : "Sessao local ativa. Entre quando a API estiver disponivel."
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
      const pages = (P.ROLE_ACCESS?.[role] || P.ROLE_ACCESS?.Consulta || []).filter(page => !["profiles", "quality", "admin"].includes(page));
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
    const sorted = [...schools].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    grid.innerHTML = `
      <section class="schools-board">
        ${sorted.map(school => `
        <button class="school-card school-compact-card" type="button" data-school-name="${school.name}" data-school-key="${P.searchText([school.name])}" data-city="${P.searchText([school.city])}" data-search="${P.searchText([school.name, school.city, school.cie, school.initials])}">
          <div class="school-compact-main">
            <div class="school-avatar">&#127979;</div>
            <div class="school-compact-title">
              <strong>${school.name}</strong>
              <small>${school.city} | CIE ${school.cie}</small>
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
    const profileNote = missingProfile.length ? `Pendencias: ${missingProfile.slice(0, 4).join(", ")}.` : firstNote(profile?.notes) || "Dados principais da escola preenchidos.";
    const schoolTone = totals.alertUnits || metrics.alerts ? "warn" : (!network || profilePct < 65 || calls.length ? "info" : "ok");
    const inventoryPreview = assets.slice(0, 6);
    const networkItems = [
      { title: "Rede", value: network?.network?.[0] || "Sem informacao" },
      { title: "IPs", value: network?.ips?.[0] || "Sem IP cadastrado" },
      { title: "Cameras", value: network?.cameras?.[0] || "Sem camera cadastrada" }
    ];
    const guideWidgets = [
      { key: "inventory", title: "&#128187; Inventario", note: totals.alertUnits || metrics.alerts ? `${totals.alertUnits || metrics.alerts} item(ns) pedem revisao` : `${totals.lines || metrics.items || 0} item(ns) sem alerta`, label: totals.alertUnits || metrics.alerts ? "Revisar" : "Abrir", tone: totals.alertUnits || metrics.alerts ? "warn" : "ok", enabled: !P.canAccess || P.canAccess("inventory") },
      { key: "network", title: "&#127760; Redes", note: network ? `${networkItems.filter(item => !item.value.includes("Sem")).length}/3 grupos mapeados` : "Rede e cameras pendentes", label: network ? "Abrir" : "Pendente", tone: network ? "info" : "warn", enabled: Boolean(network) && (!P.canAccess || P.canAccess("network")) },
      { key: "supervisor", title: "&#129517; Supervisao", note: supervisor ? `${supervisor.name} | mes ${supervisor.month || "0/12"}` : "Sem supervisor vinculado", label: supervisor ? "Abrir" : "Pendente", tone: supervisor ? "info" : "warn", enabled: Boolean(supervisor) },
      { key: "calls", title: "&#128229; Chamados", note: calls.length ? `${calls.length} chamado(s) vinculados` : "Sem fila vinculada", label: calls.length ? "Ver fila" : "Estavel", tone: calls.length ? "warn" : "ok", enabled: !P.canAccess || P.canAccess("calls") }
    ];
    detail.innerHTML = `
      <section class="school-profile-page school-profile-${schoolTone}">
        <article class="school-profile-hero compact">
          <div class="school-profile-title">
            <div class="school-avatar large">&#127979;</div>
            <div>
              <span class="eyebrow">${school.city} | CIE ${school.cie}</span>
              <strong>Ficha operacional</strong>
            </div>
          </div>
          <div class="school-profile-owner">
            <small>Supervisor</small>
            <strong>${supervisor?.name || "Nao vinculado"}</strong>
            <span class="status-pill ${supervisor ? "info" : "warn"}">${supervisor ? "supervisao" : "pendente"}</span>
          </div>
        </article>

        <section class="school-profile-metrics">
          <article><span>&#128203;</span><small>Ficha</small><strong>${profilePct}%</strong><i style="--pct:${profilePct}%"></i></article>
          <article><span>&#128187;</span><small>Inventario</small><strong>${totals.lines || metrics.items || 0}</strong><i style="--pct:100%"></i></article>
          <article><span>&#128736;&#65039;</span><small>Manutencao</small><strong>${totals.alertUnits || metrics.alerts || 0}</strong><i style="--pct:${totals.alertUnits || metrics.alerts ? 100 : 0}%"></i></article>
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
              <span><small>Direcao</small><strong>${profile?.director || "Nao informada"}</strong></span>
              <span><small>Vice-direcao</small><strong>${profile?.viceDirector || "Nao informada"}</strong></span>
              <span><small>GOE</small><strong>${profile?.goe || "Nao informado"}</strong></span>
              <span><small>Telefone</small><strong>${profile?.phone || "Pendente"}</strong></span>
              <span><small>Email</small><strong>${profile?.email || "Pendente"}</strong></span>
              <span><small>Endereco</small><strong>${profile?.address || "Nao informado"}</strong></span>
            </div>
            <p class="school-profile-note">${profileNote}</p>
          </article>

          <article class="box school-profile-card">
            <div class="box-head"><div><strong>Supervisao</strong><small>Recorte oficial importado.</small></div></div>
            <div class="school-profile-stack">
              <span><small>Responsavel</small><strong>${supervisor?.name || "Nao vinculado"}</strong></span>
              <span><small>Semana</small><strong>${supervisor?.week || "0/3"}</strong></span>
              <span><small>Mes</small><strong>${supervisor?.month || "0/12"}</strong></span>
            </div>
            <button class="ghost-btn block" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
          </article>

          <article class="box school-profile-card">
            <div class="box-head"><div><strong>Rede e cameras</strong><small>Infraestrutura vinculada.</small></div><span class="status-pill ${network ? "info" : "warn"}">${networkStatus}</span></div>
            <div class="school-profile-stack">
              ${networkItems.map(item => `<span><small>${item.title}</small><strong>${item.value}</strong></span>`).join("")}
            </div>
            ${!P.canAccess || P.canAccess("network") ? `<button class="ghost-btn block" type="button" data-open-network="${school.name}" ${network ? "" : "disabled"}>Abrir redes</button>` : ""}
          </article>

          <article class="box school-profile-card wide">
            <div class="box-head"><div><strong>Inventario</strong><small>Resumo consolidado da escola.</small></div><span class="status-pill ${totals.alertUnits || metrics.alerts ? "warn" : "ok"}">${totals.alertUnits || metrics.alerts ? "revisar" : "ok"}</span></div>
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
              <label><span>Municipio</span><input name="city" value="${attrValue(school.city)}"></label>
              <label><span>CIE</span><input name="cie" value="${attrValue(school.cie)}"></label>
              <label><span>Direcao</span><input name="director" value="${attrValue(profile?.director)}"></label>
              <label><span>Vice-direcao</span><input name="viceDirector" value="${attrValue(profile?.viceDirector)}"></label>
              <label><span>PROATI</span><input name="proati" value="${attrValue(profile?.proati)}"></label>
              <label><span>GOE</span><input name="goe" value="${attrValue(profile?.goe)}"></label>
              <label><span>Telefone</span><input name="phone" value="${attrValue(profile?.phone)}"></label>
              <label><span>Celular</span><input name="mobile" value="${attrValue(profile?.mobile)}"></label>
              <label><span>Email</span><input name="email" value="${attrValue(profile?.email)}"></label>
              <label class="wide"><span>Endereco</span><input name="address" value="${attrValue(profile?.address)}"></label>
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
    if (alertCount) return "Conferir inventario com manutencao ou defeito.";
    if (callCount) return "Chamados vinculados na escola.";
    if (missingProfile.length) return `Completar ficha: ${missingProfile.slice(0, 3).join(", ")}.`;
    if (!network) return "Mapear rede e cameras para completar a base tecnica.";
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
    const select = P.$("#networkSelect");
    if (!select) return;
    const data = networkData || {};
    select.innerHTML = Object.keys(data).map(name => `<option value="${name}">${name}</option>`).join("");
    select.onchange = () => renderNetwork(data);
    renderNetwork(data);
  }

  function renderNetworkOperationalSummary(networkData, selectedName, selectedData) {
    const names = Object.keys(networkData || {});
    const rows = [
      { icon: "RD", title: "Escolas mapeadas", note: `${names.length} escola(s) com dados de infraestrutura.`, label: `${names.length}`, tone: names.length ? "info" : "warn" },
      { icon: "IP", title: "IPs", note: `${selectedData?.ips?.length || 0} registro(s) de IP para ${selectedName || "a escola selecionada"}.`, label: selectedData?.ips?.length ? "ok" : "pendente", tone: selectedData?.ips?.length ? "ok" : "warn" },
      { icon: "CM", title: "Cameras", note: `${selectedData?.cameras?.length || 0} informacao(oes) de cameras disponiveis.`, label: selectedData?.cameras?.length ? "ok" : "base", tone: selectedData?.cameras?.length ? "ok" : "info" },
      { icon: "CR", title: "Credenciais", note: canViewCredentials() ? "Perfil autorizado a consultar credenciais tecnicas." : "Credenciais ficam protegidas para este perfil.", label: canViewCredentials() ? "liberado" : "restrito", tone: canViewCredentials() ? "ok" : "warn" }
    ];
    renderSummaryRows("#networkSummaryRows", rows);
  }

  function renderNetwork(networkData) {
    const select = P.$("#networkSelect");
    const layout = P.$("#networkLayout");
    if (!select || !layout) return;
    const names = Object.keys(networkData || {});
    const selectedName = select.value || names[0] || "";
    const data = networkData?.[selectedName] || networkData?.[names[0]];
    renderNetworkOperationalSummary(networkData, selectedName, data);
    if (!data) {
      layout.innerHTML = `<div class="empty-state">Nenhum dado de rede cadastrado ainda.</div>`;
      return;
    }
    const school = findSchool(selectedName);
    const supervisor = supervisorForSchool(selectedName);
    const credentialItems = data.credentials || [];
    const widgets = [
      ["Informacoes sobre redes", data.network || [], "RD", "info", "Publico CTC"],
      ["Informacoes sobre IPs", data.ips || [], "IP", "info", "Publico CTC"],
      ["Informacoes sobre cameras", data.cameras || [], "CM", "info", "Publico CTC"],
      ["Credenciais", data.credentials || [], "CR", "warn", "Restrito"]
    ].filter(([, items]) => items.length);
    if (credentialItems.length && !canViewCredentials()) {
      const credentialIndex = widgets.findIndex(([title]) => title === "Credenciais");
      if (credentialIndex >= 0) {
        widgets[credentialIndex] = ["Credenciais protegidas", ["Disponivel apenas para Administrador, SETEC, SEINTEC e Tecnicos CTC."], "CR", "warn", "Restrito"];
      }
    }

    layout.innerHTML = `
      <article class="network-summary">
        <div>
          <small>Escola selecionada</small>
          <strong>${selectedName}</strong>
          <p>${school ? `${school.city} | CIE ${school.cie}` : "Escola fora da lista mestre."}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedName}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-inventory="${selectedName}">Abrir inventario</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      ${widgets.map(([title, items, icon, tone, label]) => `
      <article class="detail-widget" data-search="${P.searchText([title, ...items])}">
        <div>
          <small>${title}</small>
          <strong>${icon} ${items[0]}</strong>
          <p>${items.slice(1).join(" | ")}</p>
        </div>
        <span class="status-pill ${tone}">${label}</span>
      </article>
    `).join("")}`;
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
      { icon: "&#128187;", title: "Inventario da escola", note: `${totals.lines} linha(s), ${totals.units} unidade(s) e ${categoryCount} categoria(s).`, label: `${totals.units}`, tone: "info" },
      { icon: "&#128736;&#65039;", title: "Manutencao/defeito", note: totals.alertUnits ? `${totals.alertUnits} unidade(s) fora de OK em ${selectedSchool}.` : "Todos os itens filtrados estao OK.", label: `${totals.alertUnits}`, tone: totals.alertUnits ? "warn" : "ok" },
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
        { icon: "&#128187;", title: "Inventario", note: "Nenhuma linha carregada para o perfil atual.", label: "vazio", tone: "warn" }
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
          <p>${totals.lines} linha(s) | ${totals.units} unidade(s) | ${totals.alertUnits} manutencao/defeito</p>
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
        <div class="box-head"><div><strong>Status da escola</strong><small>${alertAssets.length ? "Itens em manutencao ou defeito" : "Sem manutencao/defeito no filtro atual"}</small></div></div>
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
              <span><strong>Todos OK</strong><small>A escola selecionada nao possui item em manutencao ou defeito neste filtro.</small></span>
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
            <p>${item.lines} linha(s) consolidada(s) | ${item.alerts} em manutencao/defeito.</p>
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

  function renderSupervisionOperationalSummary(supervisors) {
    const totals = supervisors.reduce((acc, item) => {
      const { week, month, pending, schools } = supervisorProgress(item);
      acc.weekDone += week.done;
      acc.weekTotal += week.total;
      acc.monthDone += month.done;
      acc.monthTotal += month.total;
      acc.pending += pending;
      acc.schools += schools;
      if (!pending) acc.ok += 1;
      return acc;
    }, { weekDone: 0, weekTotal: 0, monthDone: 0, monthTotal: 0, pending: 0, schools: 0, ok: 0 });
    const sourceNote = supervisionMonthNote();
    const rows = [
      { icon: "SM", title: "Semana", note: `${totals.weekDone}/${totals.weekTotal || 0} visita(s) registradas no recorte atual.`, label: `${totals.weekDone}/${totals.weekTotal || 0}`, tone: totals.weekTotal && totals.weekDone >= totals.weekTotal ? "ok" : "warn" },
      { icon: "MS", title: "Mes", note: `${totals.monthDone}/${totals.monthTotal || 0} visita(s) no mes oficial.`, label: `${totals.monthDone}/${totals.monthTotal || 0}`, tone: totals.pending ? "warn" : "ok" },
      { icon: "ES", title: "Carteira", note: `${totals.schools} escola(s) vinculada(s) a ${supervisors.length} supervisor(es).`, label: `${supervisors.length}`, tone: "info" },
      { icon: "FT", title: "Faltantes", note: sourceNote || `${totals.pending} visita(s) faltam no recorte atual.`, label: `${totals.pending}`, tone: totals.pending ? "warn" : "ok" }
    ];
    renderSummaryRows("#supervisionSummaryRows", rows);
  }
  function renderSupervisors(supervisors) {
    const host = P.$("#supervisorRows");
    if (!host) return;
    renderSupervisionOperationalSummary(supervisors);
    if (!supervisors.length) {
      host.innerHTML = `<div class="empty-state">Nenhum supervisor carregado ainda.</div>`;
      return;
    }
    bindSupervisorFilters();
    const sortMode = P.$("#supervisorSortFilter")?.value || "name";
    const sourceNote = supervisionMonthNote();
    const sorted = [...supervisors].sort((a, b) => {
      if (sortMode === "pending") return Number(b.pending || 0) - Number(a.pending || 0) || a.name.localeCompare(b.name);
      if (sortMode === "schools") return Number(b.schools || 0) - Number(a.schools || 0) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    const totals = sorted.reduce((acc, item) => {
      const { week, month, pending, schools } = supervisorProgress(item);
      acc.schools += schools;
      acc.weekDone += week.done;
      acc.weekTotal += week.total;
      acc.monthDone += month.done;
      acc.monthTotal += month.total;
      acc.pending += pending;
      return acc;
    }, { schools: 0, weekDone: 0, weekTotal: 0, monthDone: 0, monthTotal: 0, pending: 0 });
    const coverage = totals.monthTotal ? Math.round((totals.monthDone / totals.monthTotal) * 100) : 0;
    const schoolLedger = sorted.flatMap(item => {
      const assigned = item.assignedSchools || [];
      const { month } = supervisorProgress(item);
      const targetPerSchool = assigned.length ? Math.max(1, Math.round((month.total || assigned.length * 3) / assigned.length)) : 0;
      return assigned.map((schoolName, index) => {
        const school = findSchool(schoolName);
        const done = Math.min(targetPerSchool, Math.max(0, month.done - (index * targetPerSchool)));
        const pending = Math.max(targetPerSchool - done, 0);
        return {
          supervisor: item.name,
          school: schoolName,
          city: school?.city || "Municipio pendente",
          cie: school?.cie || "CIE pendente",
          done,
          target: targetPerSchool,
          pending,
          alerts: school ? inventoryAlertCount(school) : 0
        };
      });
    }).sort((a, b) => b.pending - a.pending || b.alerts - a.alerts || a.school.localeCompare(b.school));
    host.innerHTML = `
      <section class="supervision-v1-shell">
        <div class="supervision-v1-metrics">
          <article><span>&#129517;</span><small>Supervisores</small><strong>${sorted.length}</strong></article>
          <article><span>&#127979;</span><small>Escolas</small><strong>${totals.schools}</strong></article>
          <article><span>&#9989;</span><small>Visitas</small><strong>${totals.monthDone}/${totals.monthTotal || 0}</strong></article>
          <article><span>&#127919;</span><small>Cobertura</small><strong>${coverage}%</strong></article>
        </div>
        ${sourceNote ? `<div class="supervision-source"><span>&#128197;</span><strong>Fonte de supervisao</strong><small>${sourceNote}</small></div>` : ""}
        <div class="supervision-v1-layout">
          <article class="supervision-v1-table box">
            <div class="box-head"><div><strong>Supervisores</strong><small>Mes, semana, carteira e cobertura.</small></div></div>
            <div class="supervisor-sheet-table-wrap">
              <table class="supervisor-sheet-table">
                <thead><tr><th>Supervisor</th><th>Escolas</th><th>Semana</th><th>Mes</th><th>Cobertura</th><th></th></tr></thead>
                <tbody>
                  ${sorted.map((item, index) => {
                    const { week, month, pending, schools } = supervisorProgress(item);
                    const pct = month.total ? Math.round((month.done / month.total) * 100) : 0;
                    return `<tr class="supervisor-sheet-row" data-supervisor-index="${index}" data-status="${pending ? "warn" : "ok"}" data-search="${P.searchText([item.name, item.email, item.phone, item.week, item.month])}">
                      <td><strong>${item.name}</strong><small>${item.email || item.phone || "contato pendente"}</small></td>
                      <td>${schools}</td>
                      <td><span>${item.week}</span><i style="--pct:${week.pct}%"></i></td>
                      <td><span>${item.month}</span><i style="--pct:${month.pct}%"></i></td>
                      <td><em class="status-pill ${pending ? "warn" : "ok"}">${pct}%</em></td>
                      <td><button class="ghost-btn" type="button">Abrir</button></td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </article>
          <aside class="supervision-v1-selector box">
            <div class="box-head"><div><strong>Carteiras</strong><small>Atalho rapido como na v1.</small></div></div>
            <div class="row-list compact">
              ${sorted.map((item, index) => {
                const { month, pending, schools } = supervisorProgress(item);
                return `<button class="data-row compact" type="button" data-supervisor-selector="${index}" data-status="${pending ? "warn" : "ok"}" data-search="${P.searchText([item.name, item.email])}">
                  <span class="row-icon">&#129517;</span>
                  <span><strong>${item.name}</strong><small>${schools} escola(s) | ${month.done}/${month.total || 0} visitas</small></span>
                  <em class="status-pill ${pending ? "warn" : "ok"}">${pending ? `${pending} faltam` : "ok"}</em>
                </button>`;
              }).join("")}
            </div>
          </aside>
        </div>
        <article class="supervision-school-ledger box">
          <div class="box-head"><div><strong>Carteira por escola</strong><small>Leitura de v1: unidade, supervisor, visitas previstas e pendencias.</small></div></div>
          <div class="supervision-ledger-head"><span>Escola</span><span>Supervisor</span><span>Visitas</span><span>Inventario</span><span>Status</span></div>
          ${schoolLedger.map(row => `<button class="supervision-ledger-row" type="button" data-school-jump="${row.school}" data-search="${P.searchText([row.school, row.city, row.cie, row.supervisor])}">
            <span><strong>${row.school}</strong><small>${row.city} | ${row.cie}</small></span>
            <span><strong>${row.supervisor}</strong><small>responsavel</small></span>
            <span><strong>${row.done}/${row.target}</strong><small>${row.pending ? `${row.pending} pendente(s)` : "em dia"}</small></span>
            <span><strong>${row.alerts}</strong><small>manut./defeito</small></span>
            <em class="status-pill ${row.pending ? "warn" : "ok"}">${row.pending ? "pendente" : "ok"}</em>
          </button>`).join("")}
        </article>
      </section>`;
    applySupervisorFilters();
    host.querySelectorAll("[data-supervisor-index], [data-supervisor-selector]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.supervisorIndex || button.dataset.supervisorSelector);
        openSupervisorPage(sorted[index].name);
      });
    });
    host.querySelectorAll("[data-school-jump]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.schoolJump));
    });
  }

  function renderSupervisorDetail(supervisor, target = "#supervisorDetailPageBody") {
    const detail = P.$(target);
    if (!detail || !supervisor) return;
    const schools = supervisor.assignedSchools || [];
    const schoolCards = schools.map(name => {
      const school = findSchool(name);
      const alerts = school ? inventoryAlertCount(school) : 0;
      const profilePct = schoolProfileCompletion(name);
      return {
        name,
        city: school?.city || "Municipio nao informado",
        cie: school?.cie || "CIE pendente",
        items: school?.items ?? 0,
        alerts,
        profilePct,
        status: alerts ? "warn" : profileStatusFromPct(profilePct)
      };
    });
    const { week, month, pending, schools: schoolCount } = supervisorProgress(supervisor);
    const visitedCount = Math.min(month.done, schoolCards.length);
    const visited = new Set(schoolCards.slice(0, visitedCount).map(item => item.name));
    const weekCount = Math.max(4, Math.ceil((month.total || schoolCards.length * 3 || 12) / Math.max(schoolCards.length || 1, 1)));
    const weeks = Array.from({ length: weekCount }, (_, index) => index + 1);
    const completedMessage = pending ? `${pending} visita(s) ainda faltam no mes.` : "Meta mensal concluida.";
    detail.innerHTML = `
      <section class="supervisor-record-v1">
        <article class="supervisor-record-hero box">
          <div class="supervisor-record-id">
            <div class="school-avatar large">${initials(supervisor.name)}</div>
            <div><span class="eyebrow">&#129517; Supervisor</span><strong>${supervisor.name}</strong><p>${supervisor.email || "email nao informado"}${supervisor.phone ? ` | ${supervisor.phone}` : ""}</p></div>
          </div>
          <div class="supervisor-record-goal"><strong>${month.pct}%</strong><span class="status-pill ${pending ? "warn" : "ok"}">${pending ? "em andamento" : "meta ok"}</span></div>
        </article>

        <section class="supervisor-score-grid">
          <article class="supervisor-score-card ${week.missing ? "warn" : "ok"}"><div class="score-card-head"><small>Meta semanal</small><span>${week.pct}%</span></div><strong>${supervisor.week}</strong><i style="--pct:${week.pct}%"></i><p>${week.missing ? `${week.missing} visita(s) para fechar a semana.` : "Semana concluida."}</p></article>
          <article class="supervisor-score-card ${month.missing ? "warn" : "ok"}"><div class="score-card-head"><small>Meta mensal</small><span>${month.pct}%</span></div><strong>${supervisor.month}</strong><i style="--pct:${month.pct}%"></i><p>${completedMessage}</p></article>
          <article class="supervisor-score-card info"><div class="score-card-head"><small>Escolas</small><span>${schoolCount}</span></div><strong>${schoolCards.length}</strong><i style="--pct:${schoolCards.length ? 100 : 0}%"></i><p>Carteira vinculada ao supervisor.</p></article>
          <article class="supervisor-score-card info"><div class="score-card-head"><small>Visitas importadas</small><span>base</span></div><strong>${month.done}</strong><i style="--pct:${month.pct}%"></i><p>Dados oficiais do recorte atual.</p></article>
        </section>

        <article class="box supervisor-matrix-box">
          <div class="box-head"><div><strong>Matriz semanal</strong><small>Modelo da v1: semanas por escola vinculada.</small></div></div>
          <div class="supervisor-weekly-matrix-wrap">
            <table class="supervisor-weekly-matrix">
              <thead><tr><th>Escola</th>${weeks.map(weekNumber => `<th>Semana ${weekNumber}</th>`).join("")}</tr></thead>
              <tbody>
                ${schoolCards.map((school, schoolIndex) => `<tr>
                  <td class="week-col"><strong>${school.name}</strong><span>${school.city} | ${school.cie}</span></td>
                  ${weeks.map((weekNumber, weekIndex) => {
                    const estimated = (schoolIndex + (weekIndex * schoolCards.length)) < month.done;
                    return `<td class="${estimated ? "visited" : "matrix-wait"}"><strong>${estimated ? "1" : "0"}</strong><span class="matrix-cell-icon">${estimated ? "&#9989;" : "&#9203;"}</span><small>${estimated ? "visita" : "aguarda"}</small></td>`;
                  }).join("")}
                </tr>`).join("")}
              </tbody>
            </table>
          </div>
        </article>

        <section class="supervisor-record-columns">
          <article class="box"><div class="box-head"><div><strong>Escolas visitadas</strong><small>Com visita no recorte atual.</small></div></div><div class="row-list compact">
            ${schoolCards.filter(school => visited.has(school.name)).map(school => `<button class="data-row compact" type="button" data-school-jump="${school.name}"><span class="row-icon">&#9989;</span><span><strong>${school.name}</strong><small>${school.city} | ficha ${school.profilePct}%</small></span><em class="status-pill ok">visitada</em></button>`).join("") || `<div class="empty-state">Nenhuma escola visitada no mes atual.</div>`}
          </div></article>
          <article class="box"><div class="box-head"><div><strong>Escolas pendentes</strong><small>Sem visita suficiente no recorte.</small></div></div><div class="row-list compact">
            ${schoolCards.filter(school => !visited.has(school.name)).map(school => `<button class="data-row compact" type="button" data-school-jump="${school.name}"><span class="row-icon">&#129517;</span><span><strong>${school.name}</strong><small>${school.city} | ${school.alerts ? `${school.alerts} manut./defeito` : `${school.items} item(ns)`}</small></span><em class="status-pill warn">pendente</em></button>`).join("") || `<div class="empty-state">Todas as escolas vinculadas possuem visita.</div>`}
          </div></article>
        </section>

        <div class="detail-actions supervisor-actions">
          ${supervisor.email ? `<a class="ghost-btn" href="mailto:${supervisor.email}">Enviar email</a>` : ""}
          ${supervisor.phone ? `<a class="ghost-btn" href="tel:${String(supervisor.phone).replace(/[^0-9+]/g, "")}">Ligar</a>` : ""}
          <button class="ghost-btn" type="button" data-jump="contacts">Abrir contatos</button>
        </div>
      </section>
    `;
    detail.querySelectorAll("[data-school-jump]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.schoolJump));
    });
    detail.querySelector("[data-jump='contacts']")?.addEventListener("click", () => P.setPage?.("contacts"));
  }
  function renderContactOperationalSummary(contacts, visible, sector) {
    const sectors = new Set(contacts.map(contact => contact.sector).filter(Boolean)).size;
    const emailCount = visible.filter(contact => contact.email).length;
    const phoneCount = visible.filter(contact => contact.phone).length;
    const photoCount = visible.filter(contact => contact.photo).length;
    const rows = [
      { icon: "CO", title: "Contatos visiveis", note: sector === "Todos" ? `${visible.length} contato(s) em ${sectors} setor(es).` : `${visible.length} contato(s) em ${sector}.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "EM", title: "Email", note: `${emailCount}/${visible.length || 0} contato(s) com email disponivel.`, label: emailCount === visible.length && visible.length ? "ok" : "base", tone: emailCount === visible.length && visible.length ? "ok" : "info" },
      { icon: "TE", title: "Telefone e ramal", note: `${phoneCount}/${visible.length || 0} contato(s) com canal telefonico.`, label: phoneCount === visible.length && visible.length ? "ok" : "revisar", tone: phoneCount === visible.length && visible.length ? "ok" : "warn" },
      { icon: "US", title: "Perfis vinculados", note: `${photoCount} contato(s) ja usam foto enviada pelo usuario.`, label: photoCount ? "foto" : "local", tone: photoCount ? "ok" : "info" }
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
    if (["cancelado", "cancelada", "bloqueado", "indisponivel", "recusado", "reprovado"].some(item => key.includes(item))) return "danger";
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
      requester: item.requester || item.owner || item.responsavel || "",
      destination: item.destination || item.place || item.local || "",
      driver: item.driver || item.motorista || "",
      status: item.status || "pendente",
      note: item.note || item.description || item.motivo || "",
      source: "cars"
    }));
    const fromCalendar = (data.calendar || []).filter(isCarCalendarItem).map(item => ({
      requestId: item.requestId || "",
      vehicle: item.vehicle || "Carro oficial",
      date: item.date || item.value || "",
      time: item.time || "",
      requester: item.owner || item.assignee || item.responsible || "",
      destination: item.place || item.local || item.note || "",
      driver: item.driver || "",
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
    const carItems = carBookings(data).map(item => ({
      label: `${item.vehicle} - ${item.destination || item.requester || "reserva"}`,
      value: item.date,
      date: item.date,
      time: item.time,
      note: `${item.time || "Horario a definir"} | ${item.requester || "Solicitante nao informado"} | ${item.status || "pendente"}`,
      scope: "shared",
      type: "carro",
      source: "cars"
    }));
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
      label: `CTC - ${item.place || item.owner || "visita tecnica"}`,
      value: item.date,
      date: item.date,
      time: item.time,
      note: `${item.time || "Horario a definir"} | ${item.owner || "Tecnico"} | ${item.objective || "Visita tecnica"}`,
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
        if (sourceStatus) sourceStatus.textContent = "Atualizando a lista ReservasVeiculos no SharePoint...";
        try {
          const result = await P.refreshSource?.("cars");
          P.renderSourceStatus?.();
          const rows = result?.rows?.length || 0;
          if (sourceStatus) sourceStatus.textContent = `SharePoint atualizado: ${rows} item(ns) lido(s) de ReservasVeiculos.`;
          renderCars(P.scopedData?.(P.getAppData()) || P.getAppData());
        } catch (error) {
          if (sourceStatus) sourceStatus.textContent = error?.message || "Nao foi possivel atualizar o SharePoint.";
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
    const reserved = visible.filter(item => carStatusTone(item.status) === "ok").length;
    const pending = visible.filter(item => carStatusTone(item.status) === "warn").length;
    const calendarLinked = visible.filter(item => item.source === "calendar").length;
    const summary = P.$("#carFilterSummary");
    if (summary) summary.textContent = `${visible.length}/${bookings.length} agendamento(s) visiveis no mes.`;
    if (sourceStatus && !sourceStatus.textContent.includes("Atualizando")) {
      const status = (P.sourceStatus || []).find(item => item.key === "cars");
      if (status?.status === "loading") sourceStatus.textContent = "Carregando ReservasVeiculos do SharePoint...";
      else if (status?.status === "loaded") sourceStatus.textContent = `Fonte SharePoint carregada: ${status.rows?.length || 0} item(ns) de ReservasVeiculos.`;
      else if (status?.status === "error") sourceStatus.textContent = status.error?.message || "SharePoint nao carregado.";
      else sourceStatus.textContent = P.sources?.cars?.url ? "Fonte: SharePoint ReservasVeiculos. Use Atualizar para recarregar." : "Fonte de carros nao configurada.";
    }
    renderSummaryRows("#carSummaryRows", [
      { icon: "&#128663;", title: "Agendamentos", note: `${visible.length} reserva(s) no filtro atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "&#9989;", title: "Reservados", note: `${reserved} carro(s) confirmado(s) ou reservado(s).`, label: `${reserved}`, tone: reserved ? "ok" : "info" },
      { icon: "&#9203;", title: "Pendentes", note: `${pending} solicitacao(oes) aguardando confirmacao.`, label: `${pending}`, tone: pending ? "warn" : "ok" },
      { icon: "&#128197;", title: "Calendario", note: `${calendarLinked} item(ns) vieram da agenda oficial.`, label: `${calendarLinked}`, tone: calendarLinked ? "info" : "warn" }
    ]);
    if (!visible.length) {
      grid.innerHTML = `<div class="empty-state">${bookings.length ? "Nenhum agendamento de carro encontrado neste filtro." : `Nenhum agendamento de carro em ${P.selectedMonthLabel?.() || "mes selecionado"}.`}</div>`;
      return;
    }
    const byDate = visible.reduce((acc, item) => {
      const key = item.date || "Sem data";
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
    const vehicleLoad = vehicles.map(vehicle => ({
      vehicle,
      total: visible.filter(item => item.vehicle === vehicle).length,
      pending: visible.filter(item => item.vehicle === vehicle && carStatusTone(item.status) === "warn").length
    }));
    const sectorLoad = [...new Set(visible.map(item => item.requester).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map(sector => ({
        sector,
        total: visible.filter(item => item.requester === sector).length
      }));
    const carCalendar = visible.map(item => ({
      label: `${item.vehicle} - ${item.destination || item.requester || "reserva"}`,
      value: item.date,
      date: item.date,
      time: item.time,
      note: `${item.time || "Horario a definir"} | ${item.requester || "Solicitante nao informado"} | ${item.status || "pendente"}`,
      tone: carStatusTone(item.status),
      type: "carro",
      scope: "shared"
    }));
    grid.innerHTML = `
      <section class="car-widget-strip">
        <span><strong>${visible.length}</strong><small>solicitacoes no mes</small></span>
        ${sectorLoad.map(item => `<span><strong>${item.sector}</strong><small>${item.total} solicitacao(oes)</small></span>`).join("")}
        ${vehicleLoad.map(item => `<span><strong>${item.vehicle}</strong><small>${item.total} agenda(s)${item.pending ? ` | ${item.pending} pendente(s)` : ""}</small></span>`).join("")}
      </section>
      <section class="car-calendar-shell">
        ${calendarBoardMarkup(carCalendar)}
      </section>
      <section class="car-day-list">
        ${Object.entries(byDate).map(([date, items]) => `
          <article class="car-day-group">
            <div class="car-day-head"><strong>${date}</strong><small>${items.length} reserva(s)</small></div>
            ${items.map(item => {
              const tone = carStatusTone(item.status);
              const key = P.searchText([item.vehicle, item.date, item.time, item.destination, item.requester]);
              return `<button class="car-booking-card car-booking-${tone}" type="button" data-car-key="${key}" data-search="${P.searchText([item.vehicle, item.date, item.time, item.destination, item.requester, item.driver, item.status, item.note])}">
                <span class="car-time"><strong>${item.time || "--:--"}</strong><small>hora</small></span>
                <span class="car-route"><strong>${item.vehicle}</strong><small>${item.destination || "Destino nao informado"}</small></span>
                <span class="car-requester"><strong>${item.requester || "Setor nao informado"}</strong><small>${item.driver || "Condutor a definir"}</small></span>
                <span class="car-request-id"><strong>${item.requestId || "--"}</strong><small>solicitacao</small></span>
                <em class="status-pill ${tone}">${item.status || "pendente"}</em>
              </button>`;
            }).join("")}
          </article>
        `).join("")}
      </section>
    `;
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
      grid.innerHTML = `<div class="empty-state">${mode === "personal" ? "Nenhum evento pessoal" : "Nenhum evento compartilhado"} em ${P.selectedMonthLabel?.() || "mes selecionado"}.</div>`;
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

  function calendarBoardMarkup(calendar) {
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
        <div class="box-head"><div><strong>${P.selectedMonthLabel?.() || "Mes atual"}</strong><small>Calendario visual do recorte selecionado</small></div></div>
        <div class="calendar-weekdays"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span></div>
        <div class="calendar-days">${cells.join("")}</div>
      </article>
      ${calendar.map(item => `
        <article class="detail-widget" data-calendar-key="${P.searchText([item.label, item.value])}" data-search="${P.searchText([item.label, item.value, item.note])}">
          <div>
            <small>${item.value || "Sem data"}</small>
            <strong>${item.label}</strong>
            <p>${item.note}</p>
          </div>
          <span class="status-pill info">Agenda</span>
        </article>
      `).join("")}
    `;
  }

  function renderCalendarOperationalSummary(calendar, mode = "shared") {
    const rows = [
      { icon: "AG", title: mode === "personal" ? "Agenda pessoal" : "Agenda compartilhada", note: `${calendar.length} evento(s) ou prazo(s) disponiveis.`, label: `${calendar.length}`, tone: calendar.length ? "info" : "warn" },
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
          <small>${item.status === "ok" ? "concluido" : "atencao"}</small>
          <strong>${item.label}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.status)}">${item.status === "ok" ? "ok" : "revisar"}</span>
      </article>
    `).join("") : `<div class="empty-state">Checklist de qualidade nao carregado.</div>`;
  }

  function renderCtc(visits) {
    const grid = P.$("#ctcGrid");
    if (!grid) return;
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
    if (summary) summary.textContent = `${visible.length}/${monthVisits.length} visita(s) visiveis em ${P.selectedMonthLabel?.() || "mes selecionado"}.`;

    grid.innerHTML = visible.length ? visible.map(visit => `
      <article class="detail-widget" data-ctc-key="${P.searchText([visit.owner, visit.date, visit.time, visit.place])}" data-search="${P.searchText([visit.owner, visit.date, visit.time, visit.place, visit.objective])}">
        <div>
          <small>${visit.date} | ${visit.time}</small>
          <strong>CT ${visit.owner}</strong>
          <p>${visit.place} | ${visit.objective}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${visit.place}">Abrir escola</button>
        </div>
      </article>
    `).join("") : `<div class="empty-state">${monthVisits.length ? "Nenhuma visita CTC com esses filtros." : `Nenhuma visita CTC em ${P.selectedMonthLabel?.() || "mes selecionado"}.`}</div>`;
    grid.querySelectorAll("[data-open-school]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.openSchool));
    });
  }

  function renderCtcOperationalSummary(visits, visible) {
    const owners = new Set(visible.map(visit => visit.owner).filter(Boolean)).size;
    const schools = new Set(visible.map(visit => visit.place).filter(Boolean)).size;
    const dates = new Set(visible.map(visit => visit.date).filter(Boolean)).size;
    const rows = [
      { icon: "CT", title: "Visitas tecnicas", note: `${visible.length}/${visits.length} visita(s) no recorte atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "US", title: "Tecnicos", note: `${owners} tecnico(s) com agenda visivel.`, label: `${owners}`, tone: owners ? "ok" : "warn" },
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
    if (summary) summary.textContent = `${visible.length}/${calls.length} chamado(s) visiveis.`;

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
      { icon: "CH", title: "Fila visivel", note: `${visible.length}/${calls.length} chamado(s) no recorte atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "ok" },
      { icon: "!", title: "Abertos", note: `${open} chamado(s) aguardando encaminhamento.`, label: `${open}`, tone: open ? "warn" : "ok" },
      { icon: "SV", title: "Em rota", note: `${route} chamado(s) em atendimento.`, label: `${route}`, tone: route ? "info" : "ok" },
      { icon: "ES", title: "Escolas envolvidas", note: `${schools} escola(s) com chamado no filtro. Resolvidos: ${resolved}.`, label: `${schools}`, tone: schools ? "info" : "ok" }
    ];
    renderSummaryRows("#callSummaryRows", rows);
  }

  function renderReports(data) {
    const grid = P.$("#reportsGrid");
    const list = P.$("#reportsList");
    if (!grid || !list) return;
    const alerts = Object.values(data.schoolInventoryMetrics || {}).reduce((sum, item) => sum + Number(item.alerts || 0), 0);
    const networkCount = Object.keys(data.networkData || {}).length;
    const pendingVisits = (data.supervisors || []).reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const linkedUsers = (data.users || []).filter(user => user.contactSync === "linked").length;
    const cars = monthFiltered(carBookings(data), item => item.date).length;
    const metrics = [
      { icon: "ES", label: "Escolas", value: String(data.schools.length), note: "base regional", tone: "glow-lime" },
      { icon: "IN", label: "Inventario", value: String(data.schoolAssets.length), note: "linhas por escola", tone: "glow-teal" },
      { icon: "AT", label: "Alertas", value: String(alerts), note: "manutencao/defeito", tone: "glow-amber" },
      { icon: "RD", label: "Redes", value: String(networkCount), note: "escolas mapeadas", tone: "glow-teal" },
      { icon: "SV", label: "Pendencias", value: String(pendingVisits), note: "visitas faltantes", tone: "glow-purple" },
      { icon: "&#128663;", label: "Carros", value: String(cars), note: "agendamentos", tone: "glow-teal" },
      { icon: "US", label: "Usuarios", value: `${linkedUsers}/${data.users.length}`, note: "vinculados a contatos", tone: "glow-lime" }
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
      ["Supervisao", `${data.supervisors.length} supervisores com planilha oficial de abril conectada.`, "ok"],
      ["Inventario", `${data.schoolAssets.length} linhas sanitizadas, sem previews brutos da 1.0.`, "ok"],
      ["Redes e cameras", `${networkCount}/${data.schools.length} escola(s) com infraestrutura mapeada.`, networkCount === data.schools.length ? "ok" : "warn"],
      ["Carros", `${cars} agendamento(s) de carro oficial no recorte atual.`, cars ? "ok" : "info"],
      ["Chamados", `${data.calls.length} chamado(s) operacionais em acompanhamento.`, data.calls.some(call => call.status !== "resolvido") ? "warn" : "ok"],
      ["Calendario", "Estrutura pronta para a agenda institucional.", "info"],
      ["Publicacao", "2.0 publicado em repositorio proprio e GitHub Pages.", "ok"]
    ].map(([title, note, status]) => `
      <div class="data-row" data-search="${P.searchText([title, note, status])}">
        <span class="row-icon">&#128200;</span>
        <span><strong>${title}</strong><small>${note}</small></span>
        <em class="status-pill ${status}">${status === "ok" ? "ok" : "revisar"}</em>
      </div>
    `).join("");
  }

  function renderAdmin(items) {
    const grid = P.$("#adminGrid");
    if (!grid) return;
    const data = P.getAppData();
    const sources = Object.entries(P.sources || {});
    const configuredSources = sources.filter(([, source]) => source.url).length;
    const officialSources = sources.filter(([, source]) => source.status === "official").length;
    const sensitiveSources = sources.filter(([, source]) => source.metadata?.sensitive).length;
    const backend = P.backendStatus || {};
    const currentRole = P.currentRole?.() || "Administrador";
    const systemChecks = [
      { label: "Escolas carregadas", status: data.schools.length === 21 ? "ok" : "warn", note: `${data.schools.length}/21 escola(s)` },
      { label: "Inventario carregado", status: data.schoolAssets.length ? "ok" : "warn", note: `${data.schoolAssets.length} linha(s)` },
      { label: "Supervisao carregada", status: data.supervisors.length === 6 ? "ok" : "warn", note: `${data.supervisors.length}/6 supervisor(es)` },
      { label: "Contatos carregados", status: data.contacts.length ? "ok" : "warn", note: `${data.contacts.length} contato(s)` },
      {
        label: "Backend online",
        status: backend.ok ? "ok" : "warn",
        note: backend.ok ? `API conectada${backend.updatedAt ? ` em ${new Date(backend.updatedAt).toLocaleString("pt-BR")}` : ""}` : "Use Verificar/Carregar para validar a API."
      },
      {
        label: "Fontes oficiais",
        status: configuredSources || officialSources ? "ok" : "warn",
        note: `${configuredSources}/${sources.length} configurada(s), ${officialSources} oficial(is), ${sensitiveSources} sensivel(is)`
      },
      {
        label: "Escopo ativo",
        status: P.canAccessData ? "ok" : "danger",
        note: `${currentRole} com ${P.roleAccess?.(currentRole)?.length || 0} pagina(s) liberada(s). Teste automatico cobre os perfis atuais.`
      },
      {
        label: "Fichas escolares",
        status: data.schoolProfiles.length ? "ok" : "warn",
        note: `${data.schoolProfiles.length}/${data.schools.length || 21} ficha(s) herdada(s) da v1`
      },
      {
        label: "Usuarios importados da v1",
        status: data.users.length ? "ok" : "warn",
        note: `${data.users.length} usu?rio(s), ${data.users.filter(user => user.contactSync === "linked").length} vinculado(s) a contatos`
      },
      { label: "Perfis ativos", status: P.ROLE_ACCESS ? "ok" : "danger", note: P.ROLE_ACCESS ? `${Object.keys(P.ROLE_ACCESS).length} perfil(is)` : "matriz indisponivel" }
    ];
    const rows = [...systemChecks, ...items];
    grid.innerHTML = rows.length ? rows.map(item => `
      <article class="detail-widget" data-search="${P.searchText([item.label, item.status, item.note])}">
        <div>
          <small>${item.status === "ok" ? "estavel" : "decisao pendente"}</small>
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
  P.renderSupervisors = renderSupervisors;
  P.renderContacts = renderContacts;
  P.renderCalendar = renderCalendar;
  P.renderCars = renderCars;
  P.renderProfiles = renderProfiles;
  P.renderQuality = renderQuality;
  P.renderCtc = renderCtc;
  P.renderCalls = renderCalls;
  P.renderReports = renderReports;
  P.renderAdmin = renderAdmin;
  P.calendarByMode = calendarByMode;
})();
