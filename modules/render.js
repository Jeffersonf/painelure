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
      director: "direÃ§Ã£o",
      viceDirector: "vice-direÃ§Ã£o",
      proati: "PROATI",
      goe: "GOE",
      phone: "telefone",
      mobile: "celular",
      email: "email",
      address: "endereÃ§o",
      notes: "observaÃ§Ãµes"
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

  function setSelectOptions(select, options, selectedValue) {
    if (!select) return;
    select.innerHTML = options.map(option => `<option value="${option.value}">${option.label}</option>`).join("");
    select.value = options.some(option => option.value === selectedValue) ? selectedValue : options[0]?.value || "";
  }

  function applySchoolFilters() {
    const city = P.$("#schoolCityFilter")?.value || "all";
    const profile = P.$("#schoolProfileFilter")?.value || "all";
    const inventory = P.$("#schoolInventoryFilter")?.value || "all";
    const network = P.$("#schoolNetworkFilter")?.value || "all";
    const cards = P.$all("#schoolGrid .school-card");
    let visibleCount = 0;

    cards.forEach(card => {
      const cityOk = city === "all" || card.dataset.city === city;
      const profileOk = profile === "all" || card.dataset.profileStatus === profile;
      const inventoryOk = inventory === "all"
        || (inventory === "alerts" && Number(card.dataset.inventoryAlerts || 0) > 0)
        || (inventory === "ok" && Number(card.dataset.inventoryAlerts || 0) === 0);
      const networkOk = network === "all" || card.dataset.networkStatus === network;
      const visible = cityOk && profileOk && inventoryOk && networkOk;
      card.classList.toggle("filter-hidden", !visible);
      if (visible) visibleCount++;
    });

    const summary = P.$("#schoolFilterSummary");
    if (summary) summary.textContent = `${visibleCount}/${cards.length} escola(s) visÃ­veis.`;
  }

  function supervisorTone(item) {
    return item.pending > 6 ? "danger" : item.pending > 0 ? "warn" : "ok";
  }

  function supervisorStatusMeta(item) {
    const tone = supervisorTone(item);
    if (tone === "danger") return { tone, label: "critico", title: "Intervencao", action: "Priorizar contato hoje" };
    if (tone === "warn") return { tone, label: `${item.pending} faltam`, title: "Acompanhar", action: "Checar visitas pendentes" };
    return { tone, label: "verde", title: "Em dia", action: "Manter rotina" };
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
    const rows = P.$all("#supervisorRows .supervisor-row");
    let visibleCount = 0;
    rows.forEach(row => {
      const visible = status === "all" || row.dataset.status === status;
      row.classList.toggle("filter-hidden", !visible);
      if (visible) visibleCount++;
    });
    const summary = P.$("#supervisorFilterSummary");
    if (summary) summary.textContent = `${visibleCount}/${rows.length} supervisor(es) visÃ­veis.`;
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

  function renderSchoolFilters(schools) {
    const citySelect = P.$("#schoolCityFilter");
    if (!citySelect) return;
    const currentCity = citySelect.value || "all";
    const cities = [...new Set(schools.map(school => school.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    setSelectOptions(citySelect, [
      { value: "all", label: "Todos" },
      ...cities.map(city => ({ value: P.searchText([city]), label: city }))
    ], currentCity);

    [citySelect, P.$("#schoolProfileFilter"), P.$("#schoolInventoryFilter"), P.$("#schoolNetworkFilter")].forEach(select => {
      if (!select || select.dataset.bound) return;
      select.dataset.bound = "true";
      select.addEventListener("change", applySchoolFilters);
    });
    bindResetButton(P.$("#schoolFilterReset"), () => {
      if (citySelect) citySelect.value = "all";
      const profile = P.$("#schoolProfileFilter");
      const inventory = P.$("#schoolInventoryFilter");
      const network = P.$("#schoolNetworkFilter");
      if (profile) profile.value = "all";
      if (inventory) inventory.value = "all";
      if (network) network.value = "all";
      applySchoolFilters();
    });
  }

  function renderSchoolOperationalSummary(schools) {
    const data = P.getAppData();
    const total = schools.length;
    const cities = new Set(schools.map(school => school.city).filter(Boolean)).size;
    const completeProfiles = schools.filter(school => schoolProfileCompletion(school.name) >= 65).length;
    const inventoryAlerts = schools.reduce((sum, school) => sum + inventoryAlertCount(school), 0);
    const networkMapped = schools.filter(school => data.networkData?.[school.name]).length;
    const linkedSupervision = schools.filter(school => supervisorForSchool(school.name)).length;
    const rows = [
      { icon: "ðŸ«", title: "Base escolar", note: `${total} escola(s) em ${cities || 0} municipio(s).`, label: `${total}`, tone: "info" },
      { icon: "ðŸ“‹", title: "Fichas escolares", note: `${completeProfiles}/${total} ficha(s) com dados principais preenchidos.`, label: total && completeProfiles === total ? "ok" : "revisar", tone: total && completeProfiles === total ? "ok" : "warn" },
      { icon: "ðŸ’»", title: "Inventario", note: inventoryAlerts ? `${inventoryAlerts} unidade(s) em manutencao ou defeito.` : "Sem alerta de inventario neste recorte.", label: inventoryAlerts ? "atencao" : "ok", tone: inventoryAlerts ? "warn" : "ok" },
      { icon: "ðŸŒ", title: "Redes e supervisao", note: `${networkMapped}/${total} rede(s) mapeada(s) e ${linkedSupervision}/${total} escola(s) com supervisor.`, label: networkMapped === total && linkedSupervision === total ? "ok" : "base", tone: networkMapped === total && linkedSupervision === total ? "ok" : "info" }
    ];
    renderSummaryRows("#schoolSummaryRows", rows);
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
    if (status === "manutencao") return "manutenÃ§Ã£o";
    return "ok";
  }

  function assetPriority(asset) {
    const units = assetUnits(asset);
    if (asset.status === "defeito") return { tone: "danger", label: "critico", note: `${units} unidade(s) com defeito.` };
    if (asset.status === "manutencao") return { tone: "warn", label: "manutencao", note: `${units} unidade(s) em manutencao.` };
    return { tone: "ok", label: "ok", note: `${units} unidade(s) sem alerta.` };
  }

  function assetCategory(asset) {
    const text = P.normalize([asset.name, asset.sourceName, asset.notes].join(" "));
    if (text.includes("tablet")) return "Tablets";
    if (text.includes("netbook")) return "Netbooks";
    if (text.includes("notebook") || text.includes("chromebook")) return "Notebooks";
    if (text.includes("recarga") || text.includes("plataforma")) return "Recarga";
    if (text.includes("smartphone") || text.includes("celular")) return "Smartphones";
    if (text.includes("adm") || text.includes("administrativo")) return "PC adm";
    if (text.includes("pc") || text.includes("desktop") || text.includes("pedagogico")) return "PC pedagÃ³gico";
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
    if (subtitle) subtitle.textContent = supervisor.email || supervisor.phone || "Acompanhamento de metas e vÃ­nculos.";
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
    const calendarCount = data.calendar?.length || 0;
    const missingNetwork = Math.max((data.schools?.length || 0) - networkCount, 0);
    const inventoryAlerts = Object.values(data.schoolInventoryMetrics || {}).reduce((sum, item) => sum + Number(item.alerts || 0), 0);
    const pendingVisits = (data.supervisors || []).reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const openCalls = (data.calls || []).filter(item => item.status !== "resolvido").length;
    const ctcVisits = data.ctcVisits?.length || 0;
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
    setText("#shortcutInventoryNote", profile.shortcuts?.inventory || (inventoryAlerts ? `${inventoryAlerts} alerta(s) para triagem` : `${data.schoolAssets.length} linha(s) consolidadas`));
    setText("#shortcutSupervisionNote", profile.shortcuts?.supervision || (pendingVisits ? `${pendingVisits} visita(s) pendente(s)` : `${data.supervisors.length} responsavel(is) ativos`));

    const decisions = [
      missingNetwork
        ? { icon: "ðŸŒ", title: "Completar dados de rede", note: `${missingNetwork} escola(s) sem infraestrutura mapeada.`, label: "Rede", tone: "warn", page: "network" }
        : { icon: "ðŸŒ", title: "Redes mapeadas", note: `${networkCount} escola(s) com dados tÃ©cnicos disponÃ­veis.`, label: "OK", tone: "ok", page: "network" },
      inventoryAlerts
        ? { icon: "ðŸ’»", title: "Conferir inventÃ¡rio em alerta", note: `${inventoryAlerts} unidade(s) em manutenÃ§Ã£o ou defeito.`, label: "Invent.", tone: "danger", page: "inventory" }
        : { icon: "ðŸ’»", title: "InventÃ¡rio consolidado", note: `${data.schoolAssets.length} linha(s) carregada(s) sem alerta resumido.`, label: "OK", tone: "ok", page: "inventory" },
      pendingVisits
        ? { icon: "ðŸ§­", title: "Acompanhar visitas pendentes", note: `${pendingVisits} visita(s) faltando nas metas atuais.`, label: "Meta", tone: "warn", page: "supervision" }
        : { icon: "ðŸ§­", title: "SupervisÃ£o sem pendÃªncia crÃ­tica", note: `${data.supervisors.length} responsÃ¡vel(is) ativos no painel.`, label: "OK", tone: "ok", page: "supervision" }
    ];

    const agenda = [
      calendarCount
        ? { icon: "ðŸ“…", title: "Agenda com eventos", note: `${calendarCount} evento(s) carregado(s) para consulta.`, label: "Agenda", tone: "info", page: "calendar" }
        : { icon: "ðŸ“…", title: "CalendÃ¡rio preparado", note: "Ãrea pronta para a agenda institucional da URE.", label: "Agenda", tone: "info", page: "calendar" },
      ctcVisits
        ? { icon: "ðŸ› ï¸", title: "Visitas tÃ©cnicas previstas", note: `${ctcVisits} compromisso(s) tÃ©cnico(s) na base atual.`, label: "CTC", tone: "info", page: "ctc" }
        : { icon: "ðŸ› ï¸", title: "Agenda CTC pronta", note: "Ãrea preparada para rotas e compromissos tÃ©cnicos.", label: "CTC", tone: "info", page: "ctc" },
      openCalls
        ? { icon: "ðŸ“¥", title: "Chamados em acompanhamento", note: `${openCalls} chamado(s) ainda nÃ£o resolvido(s).`, label: "Fila", tone: "warn", page: "calls" }
        : { icon: "ðŸ“¥", title: "Fila de chamados estÃ¡vel", note: "Sem pendÃªncia aberta na base atual.", label: "OK", tone: "ok", page: "calls" }
    ];

    const profileDecision = {
      icon: "\u{1F9ED}",
      title: profile.title,
      note: profile.note,
      label: "Perfil",
      tone: "info",
      page: currentRoleKey().includes("supervis") ? "supervision" : "schools"
    };

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
    setText("#userIdentitySource", display.linked ? "UsuÃ¡rio vinculado ao contato" : "UsuÃ¡rio importado da v1");
    setText("#userRoleSummary", role);
    setText("#userAccessSummary", profile?.note || "Perfil local de acesso ao painel.");
    setText("#userContactSummary", display.linked
      ? `${display.contactRole || "Contato"} â€¢ ${display.sector || "Setor"} â€¢ ${display.email || display.phone || "sem canal"}`
      : "Sem contato vinculado. Ajuste o mapeamento em usuÃ¡rios."
    );
    setText("#userContactStatus", display.linked ? "Vinculado" : "Pendente");
    P.$("#userContactStatus")?.classList.toggle("warn", !display.linked);
    P.$("#userContactStatus")?.classList.toggle("info", display.linked);
    const online = P.onlineUser?.();
    setText("#onlineSessionSummary", online
      ? `${online.username || online.login || online.name} conectado ao backend.`
      : "SessÃ£o local ativa. Entre quando a API estiver disponÃ­vel."
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
    renderSchoolOperationalSummary(schools);
    if (!schools.length) {
      grid.innerHTML = `<div class="empty-state">Nenhuma escola carregada ainda.</div>`;
      return;
    }
    const data = P.getAppData();
    grid.innerHTML = schools.map(school => {
      const profile = schoolProfile(school.name);
      const profilePct = schoolProfileCompletion(school.name);
      const missing = schoolMissingProfileFields(school.name);
      const metrics = data.schoolInventoryMetrics?.[school.name] || { items: school.items || 0, alerts: school.alerts || 0 };
      const alertCount = inventoryAlertCount(school);
      const profileStatus = profileStatusFromPct(profilePct);
      const network = data.networkData?.[school.name];
      const networkStatus = network ? "mapped" : "pending";
      const supervisor = supervisorForSchool(school.name);
      const cardTone = alertCount ? "warn" : (!network || profileStatus !== "ok" ? "info" : "ok");
      const cardLabel = alertCount ? "Inventario" : (!network ? "Rede" : (profileStatus !== "ok" ? "Ficha" : "OK"));
      const note = followUpText(missing, alertCount, network, 0);
      const actionLabel = alertCount ? "Conferir inventario" : (!network ? "Mapear rede" : (profileStatus !== "ok" ? "Completar ficha" : "Abrir unidade"));
      return `
        <button class="school-card school-card-${cardTone}" type="button" data-school-name="${school.name}" data-school-key="${P.searchText([school.name])}" data-city="${P.searchText([school.city])}" data-profile-status="${profileStatus}" data-inventory-alerts="${alertCount}" data-network-status="${networkStatus}" data-search="${P.searchText([school.name, school.city, school.cie, school.initials, profile?.director, profile?.email, profile?.phone, supervisor?.name])}">
          <div class="school-top">
            <div class="school-avatar">${school.initials}</div>
            <div>
              <h2>${school.name}</h2>
              <p>${school.city} | CIE ${school.cie}</p>
            </div>
            <span class="status-pill ${cardTone}">${cardLabel}</span>
          </div>
          <div class="school-scoreboard">
            <span><strong>${profilePct}%</strong><small>ficha</small></span>
            <span><strong>${metrics.items || 0}</strong><small>itens</small></span>
            <span><strong>${alertCount || 0}</strong><small>alertas</small></span>
          </div>
          <p class="school-note">${note}</p>
          <div class="school-foot">
            <span>${supervisor?.name || "sem supervisor"}</span>
            <em>${actionLabel}</em>
            <div class="progress" aria-label="Ficha ${profilePct}%"><i style="width:${profilePct}%"></i></div>
          </div>
        </button>
      `;
    }).join("");
    renderSchoolFilters(schools);
    applySchoolFilters();
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
    const contacts = (data.contacts || []).filter(contact => ["Tecnologia", "SupervisÃ£o", "Gabinete"].includes(contact.sector)).slice(0, 3);
    const networkStatus = network ? "Mapeada" : "Pendente";
    const profileNote = missingProfile.length ? `PendÃªncias: ${missingProfile.slice(0, 4).join(", ")}.` : firstNote(profile?.notes) || "Dados principais da escola preenchidos.";
    const hasAttention = missingProfile.length || totals.alertUnits || metrics.alerts || !network || calls.length;
    const decisionRows = [
      { icon: "\u{1F4CC}", title: "Proxima acao", note: followUpText(missingProfile, totals.alertUnits || metrics.alerts, network, calls.length), label: hasAttention ? "revisar" : "ok", tone: hasAttention ? "warn" : "ok" },
      { icon: "\u{1F3AF}", title: "Responsavel direto", note: supervisor ? `${supervisor.name} acompanha ${supervisor.schools || supervisor.assignedSchools?.length || 0} escola(s).` : "Escola ainda sem supervisor vinculado.", label: supervisor ? "supervisao" : "pendente", tone: supervisor ? "info" : "warn" },
      { icon: "\u{1F4BB}", title: "Risco operacional", note: totals.alertUnits || metrics.alerts ? `${totals.alertUnits || metrics.alerts} item(ns) em manutencao/defeito.` : "Inventario sem alerta resumido.", label: totals.alertUnits || metrics.alerts ? "atencao" : "ok", tone: totals.alertUnits || metrics.alerts ? "warn" : "ok" }
    ];
    const quickFacts = [
      { icon: "\u{1F3EB}", title: "Ficha e contato", note: `${profilePct}% preenchida | ${profile?.phone || "telefone pendente"} | ${profile?.email || "email pendente"}`, label: profilePct >= 65 ? "OK" : "Ficha", tone: profileStatusFromPct(profilePct), page: "schools" },
      supervisor ? { icon: "\u{1F3AF}", title: "Supervisao", note: `${supervisor.name} | semana ${supervisor.week} | mes ${supervisor.month}`, label: supervisor.pending ? "Meta" : "OK", tone: supervisor.pending ? "warn" : "ok", page: "supervision" } : null,
      network ? { icon: "\u{1F310}", title: "Rede e cameras", note: [network.network?.[0], network.ips?.[0], network.cameras?.[0]].filter(Boolean).join(" | "), label: "Rede", tone: "info", page: "network" } : { icon: "\u{1F310}", title: "Rede e cameras", note: "Sem dados tecnicos vinculados.", label: "Pendente", tone: "warn", page: "network" },
      { icon: "\u{1F4BB}", title: "Inventario", note: `${totals.lines || metrics.items || 0} linha(s) | ${totals.alertUnits || metrics.alerts || 0} alerta(s)`, label: totals.alertUnits || metrics.alerts ? "Revisar" : "OK", tone: totals.alertUnits || metrics.alerts ? "warn" : "ok", page: "inventory" },
      calls.length ? { icon: "\u{1F4E5}", title: "Chamados", note: calls.map(call => call.title).slice(0, 3).join(" | "), label: "Fila", tone: "warn", page: "calls" } : null
    ].filter(Boolean).filter(item => !P.canAccess || P.canAccess(item.page));
    const followUps = [
      missingProfile.length ? { icon: "\u{1F4DD}", title: "Completar ficha", note: `Campos pendentes: ${missingProfile.slice(0, 5).join(", ")}.`, label: "Ficha", tone: "warn", page: "schools" } : null,
      totals.alertUnits || metrics.alerts ? { icon: "\u{1F4BB}", title: "Conferir inventario", note: `${totals.alertUnits || metrics.alerts} unidade(s) em manutencao ou defeito.`, label: "Invent.", tone: "warn", page: "inventory" } : null,
      !network ? { icon: "\u{1F310}", title: "Mapear rede e cameras", note: "Sem bloco tecnico vinculado a esta escola.", label: "Rede", tone: "warn", page: "network" } : null,
      calls.length ? { icon: "\u{1F4E5}", title: "Acompanhar chamados", note: calls.map(call => call.title).slice(0, 2).join(" - "), label: "Fila", tone: "info", page: "calls" } : null
    ].filter(Boolean).filter(item => !P.canAccess || P.canAccess(item.page));
    detail.innerHTML = `
      <article class="box">
        <div class="box-head school-detail-head">
          <div class="school-avatar large">${school.initials}</div>
          <div>
            <strong>${school.name}</strong>
            <small>${school.city} â€¢ CIE ${school.cie}</small>
          </div>
          <span class="status-pill ${profileStatusFromPct(profilePct)}">${profilePct}% ficha</span>
        </div>
        <div class="row-list compact">
          ${summaryRowsMarkup(decisionRows)}
        </div>
        <div class="network-layout">
          <article class="detail-widget profile-wide">
            <div>
              <small>Ficha escolar</small>
              <strong>${profilePct}% preenchida</strong>
              <p>${profileNote}</p>
            </div>
            <span class="status-pill ${profileStatusFromPct(profilePct)}">cadastro</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>DireÃ§Ã£o</small>
              <strong>${profile?.director || "NÃ£o informada"}</strong>
              <p>${[profile?.viceDirector && `Vice: ${profile.viceDirector}`, profile?.goe && `GOE: ${profile.goe}`].filter(Boolean).join(" â€¢ ") || "Equipe gestora pendente na ficha."}</p>
            </div>
            <span class="status-pill ${profile?.director ? "ok" : "warn"}">gestÃ£o</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Contato da escola</small>
              <strong>${profile?.phone || "Telefone pendente"}</strong>
              <p>${[profile?.email, profile?.address].filter(Boolean).join(" â€¢ ") || "Email e endereÃ§o ainda nÃ£o informados."}</p>
            </div>
            <span class="status-pill ${profile?.phone || profile?.email ? "info" : "warn"}">contato</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>InventÃ¡rio</small>
              <strong>${totals.lines || metrics.items} linha(s)</strong>
              <p>${totals.alertUnits || metrics.alerts ? `${totals.alertUnits || metrics.alerts} unidade(s) em manutenÃ§Ã£o ou defeito.` : "Sem alerta operacional registrado."}</p>
            </div>
            <span class="status-pill ${totals.alertUnits || metrics.alerts ? "warn" : "ok"}">${totals.alertUnits || metrics.alerts ? "revisar" : "ok"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Redes e cÃ¢meras</small>
              <strong>${networkStatus}</strong>
              <p>${network ? [network.network?.[0], network.cameras?.[0]].filter(Boolean).join(" â€¢ ") : "Sem dados tÃ©cnicos vinculados."}</p>
            </div>
            <span class="status-pill ${network ? "info" : "warn"}">${network ? "CTC" : "pendente"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>SupervisÃ£o</small>
              <strong>${supervisor?.name || "NÃ£o vinculada"}</strong>
              <p>${supervisor ? `${supervisor.week} na semana â€¢ ${supervisor.month} no mÃªs.` : "Aguardando vÃ­nculo oficial."}</p>
            </div>
            <span class="status-pill info">oficial</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Chamados</small>
              <strong>${calls.length}</strong>
              <p>${calls.length ? calls.map(call => call.title).slice(0, 2).join(" â€¢ ") : "Sem chamado vinculado na base atual."}</p>
            </div>
            <span class="status-pill ${calls.length ? "warn" : "ok"}">${calls.length ? "fila" : "ok"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Contatos Ãºteis</small>
              <strong>${contacts.length}</strong>
              <p>${contacts.map(contact => `${contact.sector}: ${contact.name}`).join(" â€¢ ")}</p>
            </div>
            <span class="status-pill info">URE</span>
          </article>
        </div>
        <div class="row-list compact">
          ${quickFacts.map(item => `
            <button class="data-row compact" type="button" data-jump="${item.page}" data-search="${P.searchText([item.title, item.note, item.label])}">
              <span class="row-icon">${item.icon}</span>
              <span><strong>${item.title}</strong><small>${item.note}</small></span>
              <em class="status-pill ${item.tone}">${item.label}</em>
            </button>
          `).join("")}
        </div>
        ${followUps.length ? `
        <div class="row-list">
          ${followUps.map(item => `
            <button class="data-row compact" type="button" data-jump="${item.page}" data-search="${P.searchText([item.title, item.note])}">
              <span class="row-icon">${item.icon}</span>
              <span><strong>${item.title}</strong><small>${item.note}</small></span>
              <em class="status-pill ${item.tone}">${item.label}</em>
            </button>
          `).join("")}
        </div>` : ""}
        <div class="detail-actions">
          ${profile?.email ? `<a class="ghost-btn" href="mailto:${profile.email}">Enviar email</a>` : ""}
          ${profile?.phone ? `<a class="ghost-btn" href="tel:${profile.phone.replace(/[^0-9+]/g, "")}">Ligar</a>` : ""}
          ${!P.canAccess || P.canAccess("network") ? `<button class="ghost-btn" type="button" data-open-network="${school.name}" ${network ? "" : "disabled"}>Abrir redes</button>` : ""}
          ${!P.canAccess || P.canAccess("inventory") ? `<button class="ghost-btn" type="button" data-open-inventory="${school.name}">Abrir inventÃ¡rio</button>` : ""}
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
    `;
    detail.querySelector("[data-open-network]")?.addEventListener("click", event => {
      focusNetworkSchool(event.currentTarget.dataset.openNetwork);
    });
    detail.querySelector("[data-open-inventory]")?.addEventListener("click", event => {
      focusInventorySchool(event.currentTarget.dataset.openInventory);
    });
    detail.querySelector("[data-open-supervisor]")?.addEventListener("click", event => {
      focusSupervisor(event.currentTarget.dataset.openSupervisor);
    });
  }

  function followUpText(missingProfile, alertCount, network, callCount) {
    if (alertCount) return "Prioridade: conferir inventario com manutencao ou defeito.";
    if (callCount) return "Acompanhar chamados vinculados antes de encerrar a escola.";
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
      { icon: "ðŸŒ", title: "Escolas mapeadas", note: `${names.length} escola(s) com dados de infraestrutura.`, label: `${names.length}`, tone: names.length ? "info" : "warn" },
      { icon: "ðŸ”¢", title: "IPs", note: `${selectedData?.ips?.length || 0} registro(s) de IP para ${selectedName || "a escola selecionada"}.`, label: selectedData?.ips?.length ? "ok" : "pendente", tone: selectedData?.ips?.length ? "ok" : "warn" },
      { icon: "ðŸ“¹", title: "Cameras", note: `${selectedData?.cameras?.length || 0} informacao(oes) de cameras disponiveis.`, label: selectedData?.cameras?.length ? "ok" : "base", tone: selectedData?.cameras?.length ? "ok" : "info" },
      { icon: "ðŸ”", title: "Credenciais", note: canViewCredentials() ? "Perfil autorizado a consultar credenciais tecnicas." : "Credenciais ficam protegidas para este perfil.", label: canViewCredentials() ? "liberado" : "restrito", tone: canViewCredentials() ? "ok" : "warn" }
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
      ["InformaÃ§Ãµes sobre redes", data.network || [], "ðŸŒ", "info", "PÃºblico CTC"],
      ["InformaÃ§Ãµes sobre IPs", data.ips || [], "ðŸ”¢", "info", "PÃºblico CTC"],
      ["InformaÃ§Ãµes sobre cÃ¢meras", data.cameras || [], "ðŸ“¹", "info", "PÃºblico CTC"],
      ["Credenciais", data.credentials || [], "ðŸ”", "warn", "Restrito"]
    ].filter(([, items]) => items.length);
    if (credentialItems.length && !canViewCredentials()) {
      const credentialIndex = widgets.findIndex(([title]) => title === "Credenciais");
      if (credentialIndex >= 0) {
        widgets[credentialIndex] = ["Credenciais protegidas", ["Disponivel apenas para Administrador, SETEC, SEINTEC e Tecnicos CTC."], "\u{1F510}", "warn", "Restrito"];
      }
    }

    layout.innerHTML = `
      <article class="network-summary">
        <div>
          <small>Escola selecionada</small>
          <strong>${selectedName}</strong>
          <p>${school ? `${school.city} â€¢ CIE ${school.cie}` : "Escola fora da lista mestre."}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedName}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-inventory="${selectedName}">Abrir inventÃ¡rio</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      ${widgets.map(([title, items, icon, tone, label]) => `
      <article class="detail-widget" data-search="${P.searchText([title, ...items])}">
        <div>
          <small>${title}</small>
          <strong>${icon} ${items[0]}</strong>
          <p>${items.slice(1).join(" â€¢ ")}</p>
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
      { icon: "ðŸ’»", title: "Inventario da escola", note: `${totals.lines} linha(s), ${totals.units} unidade(s) e ${categoryCount} categoria(s).`, label: `${totals.units}`, tone: "info" },
      { icon: "âš ï¸", title: "Alertas", note: totals.alertUnits ? `${totals.alertUnits} unidade(s) em manutencao ou defeito em ${selectedSchool}.` : "Sem alerta na escola selecionada.", label: totals.alertUnits ? "revisar" : "ok", tone: totals.alertUnits ? "warn" : "ok" },
      { icon: "ðŸ«", title: "Base carregada", note: `${schools} escola(s) com inventario e ${globalTotals.lines} linha(s) totais.`, label: `${schools}`, tone: "info" },
      { icon: "âœ…", title: "Conferencia", note: globalTotals.alertUnits ? `${globalTotals.alertUnits} alerta(s) na base completa.` : "Base completa sem alerta resumido.", label: globalTotals.alertUnits ? "atencao" : "ok", tone: globalTotals.alertUnits ? "warn" : "ok" }
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
        { icon: "ðŸ’»", title: "Inventario", note: "Nenhuma linha carregada para o perfil atual.", label: "vazio", tone: "warn" }
      ]);
      grid.innerHTML = `<div class="empty-state">Nenhum dado de inventÃ¡rio carregado ainda.</div>`;
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
    const okLines = selectedAssets.filter(asset => asset.status === "ok").length;

    grid.innerHTML = `
      <article class="inventory-hero">
        <div class="inventory-hero-main">
          <small>Escola selecionada</small>
          <strong>${selectedSchool}</strong>
          <p>${totals.lines} linha(s) â€¢ ${totals.units} unidade(s) â€¢ ${totals.alertUnits} alerta(s)</p>
        </div>
        <div class="inventory-hero-score">
          <span><strong>${alertAssets.length}</strong><small>prioridade</small></span>
          <span><strong>${okLines}</strong><small>ok</small></span>
          <span><strong>${categories.length}</strong><small>categorias</small></span>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedSchool}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-network="${selectedSchool}" ${network ? "" : "disabled"}>Abrir redes</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      <article class="inventory-list box inventory-priority">
        <div class="box-head"><div><strong>Triagem da escola</strong><small>${alertAssets.length ? "Itens que pedem acao" : "Sem alerta no filtro atual"}</small></div></div>
        <div class="row-list compact">
          ${alertAssets.length ? alertAssets.map(asset => `
            <div class="data-row compact" data-inventory-key="${P.searchText([asset.school, asset.sourceName || asset.name, asset.notes])}" data-search="${P.searchText([asset.school, asset.name, asset.sourceName, asset.notes, asset.status])}">
              <span class="row-icon">âš ï¸</span>
              <span><strong>${asset.sourceName || asset.name}</strong><small>${asset.notes || asset.name}</small></span>
              <em class="status-pill ${assetTone(asset.status)}">${assetUnits(asset)} â€¢ ${assetStatusLabel(asset.status)}</em>
            </div>
          `).join("") : `
            <div class="data-row compact">
              <span class="row-icon">âœ…</span>
              <span><strong>Sem alerta resumido</strong><small>A escola selecionada nao possui item em manutencao ou defeito neste filtro.</small></span>
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
            <p>${item.lines} linha(s) consolidada(s) â€¢ ${item.alerts} em manutenÃ§Ã£o/defeito.</p>
          </div>
          <span class="status-pill ${item.alerts ? "warn" : "ok"}">${item.alerts ? "revisar" : "ok"}</span>
        </article>
      `).join("")}
      <article class="inventory-list box">
        <div class="box-head"><div><strong>Itens da escola</strong><small>${selectedAssets.length} linha(s) do inventÃ¡rio</small></div></div>
        <div class="row-list">
          ${selectedAssets.map(asset => `
            <div class="data-row" data-inventory-key="${P.searchText([asset.school, asset.sourceName || asset.name, asset.notes])}" data-search="${P.searchText([asset.school, asset.name, asset.sourceName, asset.notes, asset.status])}">
              <span class="row-icon">ðŸ’»</span>
              <span><strong>${asset.sourceName || asset.name}</strong><small>${asset.notes || asset.name}</small></span>
              <em class="status-pill ${assetTone(asset.status)}">${assetUnits(asset)} â€¢ ${assetStatusLabel(asset.status)}</em>
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
      const tone = supervisorTone(item);
      acc.weekDone += week.done;
      acc.weekTotal += week.total;
      acc.monthDone += month.done;
      acc.monthTotal += month.total;
      acc.pending += pending;
      acc.schools += schools;
      if (tone === "ok") acc.ok += 1;
      if (tone === "danger") acc.critical += 1;
      return acc;
    }, { weekDone: 0, weekTotal: 0, monthDone: 0, monthTotal: 0, pending: 0, schools: 0, ok: 0, critical: 0 });
    const sourceNote = supervisionMonthNote();
    const rows = [
      { icon: "🎯", title: "Semana", note: `${totals.weekDone}/${totals.weekTotal || 0} visita(s) registradas no recorte atual.`, label: totals.weekTotal && totals.weekDone >= totals.weekTotal ? "verde" : "meta", tone: totals.weekTotal && totals.weekDone >= totals.weekTotal ? "ok" : "warn" },
      { icon: "📅", title: "Mes", note: `${totals.monthDone}/${totals.monthTotal || 0} visita(s) no mes oficial.`, label: totals.pending ? `${totals.pending} faltam` : "verde", tone: totals.pending ? "warn" : "ok" },
      { icon: "🏫", title: "Carteira", note: `${totals.schools} escola(s) vinculada(s) a ${supervisors.length} supervisor(es).`, label: `${supervisors.length}`, tone: "info" },
      { icon: "⚠️", title: "Acompanhamento", note: sourceNote || `${totals.critical} critico(s), ${totals.ok}/${supervisors.length} em dia.`, label: totals.critical ? "critico" : "status", tone: totals.critical ? "danger" : (totals.ok === supervisors.length ? "ok" : "warn") }
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
    const attention = sorted.filter(item => supervisorTone(item) !== "ok").slice(0, 3);
    host.innerHTML = `
      ${sourceNote ? `<div class="supervision-source"><span>📅</span><strong>Fonte de supervisao</strong><small>${sourceNote}</small></div>` : ""}
      ${attention.length ? `
        <div class="supervision-focus">
          <div>
            <strong>Prioridade do dia</strong>
            <small>${attention.length} supervisor(es) com meta pendente no recorte atual.</small>
          </div>
          <div class="supervision-focus-list">
            ${attention.map(item => {
              const meta = supervisorStatusMeta(item);
              return `<button type="button" data-supervisor-focus="${item.name}"><span>${initials(item.name)}</span><strong>${item.name}</strong><em class="status-pill ${meta.tone}">${meta.label}</em></button>`;
            }).join("")}
          </div>
        </div>
      ` : ""}
      ${sorted.map((item, index) => {
        const { week, month, schools } = supervisorProgress(item);
        const meta = supervisorStatusMeta(item);
        return `
        <button class="supervisor-row" type="button" data-supervisor-index="${index}" data-supervisor-key="${P.searchText([item.name])}" data-status="${meta.tone}" data-search="${P.searchText([item.name, item.email, item.phone, item.schools, item.week, item.month, item.pending])}">
          <div class="supervisor-person">
            <div class="school-avatar">${initials(item.name)}</div>
            <span>
              <strong>${item.name}</strong>
              <small>${schools} escola(s) • ${item.email || item.phone || "contato pendente"}</small>
            </span>
          </div>
          <div class="supervisor-row-summary">
            <strong>${meta.title}</strong>
            <small>${meta.action}</small>
          </div>
          <div class="supervisor-metrics">
            <div class="bar-stat" style="--pct:${week.pct}%">
              <small>Semana</small>
              <span>${item.week}</span>
              <i></i>
            </div>
            <div class="bar-stat" style="--pct:${month.pct}%">
              <small>Mes</small>
              <span>${item.month}</span>
              <i></i>
            </div>
          </div>
          <span class="status-pill ${meta.tone}">${meta.label}</span>
        </button>
      `; }).join("")}`;
    applySupervisorFilters();
    host.querySelectorAll("[data-supervisor-focus]").forEach(button => {
      button.addEventListener("click", () => openSupervisorPage(button.dataset.supervisorFocus));
    });
    host.querySelectorAll("[data-supervisor-index]").forEach(button => {
      button.addEventListener("click", () => {
        openSupervisorPage(sorted[Number(button.dataset.supervisorIndex)].name);
      });
    });
  }
  function renderSupervisorDetail(supervisor, target = "#supervisorDetailPageBody") {
    const detail = P.$(target);
    if (!detail || !supervisor) return;
    const schools = supervisor.assignedSchools || [];
    const schoolCards = schools.map(name => {
      const school = findSchool(name);
      const profilePct = schoolProfileCompletion(name);
      const alerts = school ? inventoryAlertCount(school) : 0;
      const missingFields = schoolMissingProfileFields(name).slice(0, 3);
      return {
        name,
        city: school?.city || "Municipio nao informado",
        cie: school?.cie || "CIE pendente",
        items: school?.items ?? 0,
        profilePct,
        missingFields,
        alerts,
        status: alerts ? "warn" : profileStatusFromPct(profilePct)
      };
    });
    const { week, month, pending, schools: schoolCount } = supervisorProgress(supervisor);
    const meta = supervisorStatusMeta(supervisor);
    const alertSchools = schoolCards.filter(school => school.alerts).length;
    const incompleteProfiles = schoolCards.filter(school => school.profilePct < 65).length;
    const attentionCards = schoolCards
      .filter(school => school.alerts || school.profilePct < 65)
      .sort((a, b) => b.alerts - a.alerts || a.profilePct - b.profilePct)
      .slice(0, 6);
    const completedMessage = pending ? `${pending} visita(s) ainda faltam no mes.` : "Meta mensal concluida.";
    detail.innerHTML = `
      <article class="supervisor-hero supervisor-hero-${meta.tone}">
        <div class="supervisor-hero-main">
          <div class="school-avatar large">${initials(supervisor.name)}</div>
          <div>
            <span class="eyebrow">Supervisor</span>
            <strong>${supervisor.name}</strong>
            <p>${supervisor.email || "email nao informado"} ${supervisor.phone ? `• ${supervisor.phone}` : ""}</p>
          </div>
        </div>
        <div class="supervisor-hero-status">
          <span class="status-pill ${meta.tone}">${meta.label}</span>
          <small>${meta.action}</small>
        </div>
      </article>

      <section class="supervisor-score-grid">
        <article class="supervisor-score-card ${week.missing ? "warn" : "ok"}">
          <div class="score-card-head"><small>Meta semanal</small><span>${week.pct}%</span></div>
          <strong>${supervisor.week}</strong>
          <i style="--pct:${week.pct}%"></i>
          <p>${week.missing ? `${week.missing} visita(s) para fechar a semana.` : "Semana concluida."}</p>
        </article>
        <article class="supervisor-score-card ${month.missing ? "warn" : "ok"}">
          <div class="score-card-head"><small>Meta mensal</small><span>${month.pct}%</span></div>
          <strong>${supervisor.month}</strong>
          <i style="--pct:${month.pct}%"></i>
          <p>${completedMessage}</p>
        </article>
        <article class="supervisor-score-card info">
          <div class="score-card-head"><small>Carteira</small><span>${schoolCount}</span></div>
          <strong>${schoolCards.length}</strong>
          <i style="--pct:${schoolCards.length ? 100 : 0}%"></i>
          <p>${schoolCards.length} escola(s) vinculada(s) na base oficial.</p>
        </article>
        <article class="supervisor-score-card ${alertSchools || incompleteProfiles ? "warn" : "ok"}">
          <div class="score-card-head"><small>Avisos</small><span>${alertSchools + incompleteProfiles}</span></div>
          <strong>${alertSchools + incompleteProfiles}</strong>
          <i style="--pct:${alertSchools || incompleteProfiles ? 66 : 100}%"></i>
          <p>${alertSchools} inventario(s) e ${incompleteProfiles} ficha(s) para revisar.</p>
        </article>
      </section>

      <section class="supervisor-workbench">
        <article class="box supervisor-attention-box">
          <div class="box-head"><div><strong>O que precisa de acao</strong><small>Prioridade para corrigir visita errada, faltante ou dado incompleto.</small></div></div>
          <div class="row-list compact">
            ${attentionCards.length ? attentionCards.map(school => `
              <button class="data-row compact" type="button" data-school-jump="${school.name}" data-search="${P.searchText([school.name, school.city])}">
                <span class="row-icon">📌</span>
                <span><strong>${school.name}</strong><small>${school.alerts ? `${school.alerts} alerta(s) de inventario` : `ficha ${school.profilePct}%`}</small></span>
                <em class="status-pill warn">acompanhar</em>
              </button>
            `).join("") : `
              <div class="data-row compact">
                <span class="row-icon">✅</span>
                <span><strong>Sem alerta resumido</strong><small>Se houver visita errada ou faltando, entrar em contato com o gabinete.</small></span>
                <em class="status-pill ok">ok</em>
              </div>
            `}
          </div>
        </article>

        <article class="box supervisor-school-box">
          <div class="box-head"><div><strong>Escolas da carteira</strong><small>Clique para abrir a unidade e conferir ficha, inventario e rede.</small></div></div>
          <div class="linked-school-grid supervisor-linked-grid">
            ${schoolCards.length ? schoolCards.map(school => `
              <button class="linked-school" type="button" data-school-jump="${school.name}" data-search="${P.searchText([school.name, school.city, school.cie])}">
                <span>
                  <strong>${school.name}</strong>
                  <small>${school.city} • ${school.cie} • ficha ${school.profilePct}%</small>
                </span>
                <em class="status-pill ${statusClass(school.status)}">${school.alerts ? `${school.alerts} alerta(s)` : `${school.items} item(ns)`}</em>
              </button>
            `).join("") : `<div class="empty-state">Nenhuma escola vinculada a este supervisor.</div>`}
          </div>
        </article>
      </section>

      <div class="detail-actions supervisor-actions">
        ${supervisor.email ? `<a class="ghost-btn" href="mailto:${supervisor.email}">Enviar email</a>` : ""}
        ${supervisor.phone ? `<a class="ghost-btn" href="tel:${String(supervisor.phone).replace(/[^0-9+]/g, "")}">Ligar</a>` : ""}
        <button class="ghost-btn" type="button" data-jump="contacts">Abrir contatos</button>
      </div>
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
      { icon: "â˜Žï¸", title: "Contatos visiveis", note: sector === "Todos" ? `${visible.length} contato(s) em ${sectors} setor(es).` : `${visible.length} contato(s) em ${sector}.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "âœ‰ï¸", title: "Email", note: `${emailCount}/${visible.length || 0} contato(s) com email disponivel.`, label: emailCount === visible.length && visible.length ? "ok" : "base", tone: emailCount === visible.length && visible.length ? "ok" : "info" },
      { icon: "ðŸ“ž", title: "Telefone e ramal", note: `${phoneCount}/${visible.length || 0} contato(s) com canal telefonico.`, label: phoneCount === visible.length && visible.length ? "ok" : "revisar", tone: phoneCount === visible.length && visible.length ? "ok" : "warn" },
      { icon: "ðŸ‘¤", title: "Perfis vinculados", note: `${photoCount} contato(s) ja usam foto enviada pelo usuario.`, label: photoCount ? "foto" : "local", tone: photoCount ? "ok" : "info" }
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

  function renderCalendar(calendar) {
    const grid = P.$("#calendarGrid");
    if (!grid) return;
    bindCalendarTabs();
    const mode = P.$("[data-calendar-mode].active")?.dataset.calendarMode || "shared";
    const visible = calendarByMode(calendar, mode);
    renderCalendarOperationalSummary(visible, mode);
    if (!visible.length) {
      grid.innerHTML = `<div class="empty-state">${mode === "personal" ? "Nenhum evento pessoal carregado ainda." : "Nenhum evento compartilhado carregado ainda."}</div>`;
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
        <div class="box-head"><div><strong>${P.selectedMonthLabel?.() || "MÃªs atual"}</strong><small>Calendario visual do recorte selecionado</small></div></div>
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
      { icon: "ðŸ—“ï¸", title: mode === "personal" ? "Agenda pessoal" : "Agenda compartilhada", note: `${calendar.length} evento(s) ou prazo(s) disponiveis.`, label: `${calendar.length}`, tone: calendar.length ? "info" : "warn" },
      { icon: "ðŸš—", title: "Recursos compartilhados", note: `${calendar.filter(item => P.normalize([item.label, item.note].join(" ")).includes("carro")).length} item(ns) relacionados a carro oficial.`, label: "recurso", tone: "info" },
      { icon: "ðŸ“Œ", title: "Prazos", note: `${calendar.filter(item => P.normalize([item.label, item.note].join(" ")).includes("prazo")).length} item(ns) com sinal de prazo institucional.`, label: "prazo", tone: "warn" },
      { icon: "âœ…", title: "Fonte", note: calendar.length ? "Agenda pronta para consulta no recorte atual." : "Aguardando fonte oficial do calendario URE.", label: calendar.length ? "ok" : "pendente", tone: calendar.length ? "ok" : "warn" }
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
          <small>${item.status === "ok" ? "concluÃ­do" : "atenÃ§Ã£o"}</small>
          <strong>${item.label}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.status)}">${item.status === "ok" ? "ok" : "revisar"}</span>
      </article>
    `).join("") : `<div class="empty-state">Checklist de qualidade nÃ£o carregado.</div>`;
  }

  function renderCtc(visits) {
    const grid = P.$("#ctcGrid");
    if (!grid) return;
    const ownerFilter = P.$("#ctcOwnerFilter");
    const schoolFilter = P.$("#ctcSchoolFilter");
    const owners = [...new Set(visits.map(visit => visit.owner).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const schools = [...new Set(visits.map(visit => visit.place).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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
    const visible = visits.filter(visit => {
      const ownerOk = selectedOwner === "all" || P.searchText([visit.owner]) === selectedOwner;
      const schoolOk = selectedSchool === "all" || P.searchText([visit.place]) === selectedSchool;
      return ownerOk && schoolOk;
    });
    renderCtcOperationalSummary(visits, visible);
    const summary = P.$("#ctcFilterSummary");
    if (summary) summary.textContent = `${visible.length}/${visits.length} visita(s) visÃ­veis.`;

    grid.innerHTML = visible.length ? visible.map(visit => `
      <article class="detail-widget" data-ctc-key="${P.searchText([visit.owner, visit.date, visit.time, visit.place])}" data-search="${P.searchText([visit.owner, visit.date, visit.time, visit.place, visit.objective])}">
        <div>
          <small>${visit.date} â€¢ ${visit.time}</small>
          <strong>ðŸ› ï¸ ${visit.owner}</strong>
          <p>${visit.place} â€¢ ${visit.objective}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${visit.place}">Abrir escola</button>
        </div>
      </article>
    `).join("") : `<div class="empty-state">${visits.length ? "Nenhuma visita CTC com esses filtros." : "Nenhuma visita CTC carregada."}</div>`;
    grid.querySelectorAll("[data-open-school]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.openSchool));
    });
  }

  function renderCtcOperationalSummary(visits, visible) {
    const owners = new Set(visible.map(visit => visit.owner).filter(Boolean)).size;
    const schools = new Set(visible.map(visit => visit.place).filter(Boolean)).size;
    const dates = new Set(visible.map(visit => visit.date).filter(Boolean)).size;
    const rows = [
      { icon: "ðŸ› ï¸", title: "Visitas tecnicas", note: `${visible.length}/${visits.length} visita(s) no recorte atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "warn" },
      { icon: "ðŸ‘¤", title: "Tecnicos", note: `${owners} tecnico(s) com agenda visivel.`, label: `${owners}`, tone: owners ? "ok" : "warn" },
      { icon: "ðŸ«", title: "Escolas atendidas", note: `${schools} escola(s) aparecem nas visitas filtradas.`, label: `${schools}`, tone: schools ? "info" : "warn" },
      { icon: "ðŸ“…", title: "Dias de agenda", note: `${dates} dia(s) distintos no recorte.`, label: `${dates}`, tone: dates ? "info" : "warn" }
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
    if (summary) summary.textContent = `${visible.length}/${calls.length} chamado(s) visÃ­veis.`;

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
      { icon: "ðŸ“¥", title: "Fila visivel", note: `${visible.length}/${calls.length} chamado(s) no recorte atual.`, label: `${visible.length}`, tone: visible.length ? "info" : "ok" },
      { icon: "âš ï¸", title: "Abertos", note: `${open} chamado(s) aguardando encaminhamento.`, label: `${open}`, tone: open ? "warn" : "ok" },
      { icon: "ðŸ§­", title: "Em rota", note: `${route} chamado(s) em atendimento.`, label: `${route}`, tone: route ? "info" : "ok" },
      { icon: "ðŸ«", title: "Escolas envolvidas", note: `${schools} escola(s) com chamado no filtro. Resolvidos: ${resolved}.`, label: `${schools}`, tone: schools ? "info" : "ok" }
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
    const metrics = [
      { icon: "ðŸ«", label: "Escolas", value: String(data.schools.length), note: "base regional", tone: "glow-lime" },
      { icon: "ðŸ’»", label: "InventÃ¡rio", value: String(data.schoolAssets.length), note: "linhas por escola", tone: "glow-teal" },
      { icon: "âš ï¸", label: "Alertas", value: String(alerts), note: "manutenÃ§Ã£o/defeito", tone: "glow-amber" },
      { icon: "ðŸŒ", label: "Redes", value: String(networkCount), note: "escolas mapeadas", tone: "glow-teal" },
      { icon: "ðŸ§­", label: "PendÃªncias", value: String(pendingVisits), note: "visitas faltantes", tone: "glow-purple" },
      { icon: "ðŸ‘¤", label: "UsuÃ¡rios", value: `${linkedUsers}/${data.users.length}`, note: "vinculados a contatos", tone: "glow-lime" }
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
      ["SupervisÃ£o", `${data.supervisors.length} supervisores com planilha oficial de abril conectada.`, "ok"],
      ["InventÃ¡rio", `${data.schoolAssets.length} linhas sanitizadas, sem previews brutos da 1.0.`, "ok"],
      ["Redes e cÃ¢meras", `${networkCount}/${data.schools.length} escola(s) com infraestrutura mapeada.`, networkCount === data.schools.length ? "ok" : "warn"],
      ["Chamados", `${data.calls.length} chamado(s) operacionais em acompanhamento.`, data.calls.some(call => call.status !== "resolvido") ? "warn" : "ok"],
      ["CalendÃ¡rio", "Estrutura pronta para a agenda institucional.", "info"],
      ["PublicaÃ§Ã£o", "2.0 publicado em repositÃ³rio prÃ³prio e GitHub Pages.", "ok"]
    ].map(([title, note, status]) => `
      <div class="data-row" data-search="${P.searchText([title, note, status])}">
        <span class="row-icon">ðŸ“ˆ</span>
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
      { label: "InventÃ¡rio carregado", status: data.schoolAssets.length ? "ok" : "warn", note: `${data.schoolAssets.length} linha(s)` },
      { label: "SupervisÃ£o carregada", status: data.supervisors.length === 6 ? "ok" : "warn", note: `${data.supervisors.length}/6 supervisor(es)` },
      { label: "Contatos carregados", status: data.contacts.length ? "ok" : "warn", note: `${data.contacts.length} contato(s)` },
      {
        label: "Backend online",
        status: backend.ok ? "ok" : "warn",
        note: backend.ok ? `API conectada${backend.updatedAt ? ` em ${new Date(backend.updatedAt).toLocaleString("pt-BR")}` : ""}` : "Use Verificar/Carregar para validar a API."
      },
      {
        label: "Fontes oficiais",
        status: configuredSources || officialSources ? "ok" : "warn",
        note: `${configuredSources}/${sources.length} configurada(s), ${officialSources} oficial(is), ${sensitiveSources} sensÃ­vel(is)`
      },
      {
        label: "Escopo ativo",
        status: P.canAccessData ? "ok" : "danger",
        note: `${currentRole} com ${P.roleAccess?.(currentRole)?.length || 0} pÃ¡gina(s) liberada(s). Teste automÃ¡tico cobre os perfis atuais.`
      },
      {
        label: "Fichas escolares",
        status: data.schoolProfiles.length ? "ok" : "warn",
        note: `${data.schoolProfiles.length}/${data.schools.length || 21} ficha(s) herdada(s) da v1`
      },
      {
        label: "UsuÃ¡rios importados da v1",
        status: data.users.length ? "ok" : "warn",
        note: `${data.users.length} usuÃ¡rio(s), ${data.users.filter(user => user.contactSync === "linked").length} vinculado(s) a contatos`
      },
      { label: "Perfis ativos", status: P.ROLE_ACCESS ? "ok" : "danger", note: P.ROLE_ACCESS ? `${Object.keys(P.ROLE_ACCESS).length} perfil(is)` : "matriz indisponÃ­vel" }
    ];
    const rows = [...systemChecks, ...items];
    grid.innerHTML = rows.length ? rows.map(item => `
      <article class="detail-widget" data-search="${P.searchText([item.label, item.status, item.note])}">
        <div>
          <small>${item.status === "ok" ? "estÃ¡vel" : "decisÃ£o pendente"}</small>
          <strong>âš™ï¸ ${item.label}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
      </article>
    `).join("") : `<div class="empty-state">Nenhum diagnÃ³stico administrativo carregado.</div>`;
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
  P.renderSchools = renderSchools;
  P.renderNetworkOptions = renderNetworkOptions;
  P.renderInventory = renderInventory;
  P.renderSupervisors = renderSupervisors;
  P.renderContacts = renderContacts;
  P.renderCalendar = renderCalendar;
  P.renderProfiles = renderProfiles;
  P.renderQuality = renderQuality;
  P.renderCtc = renderCtc;
  P.renderCalls = renderCalls;
  P.renderReports = renderReports;
  P.renderAdmin = renderAdmin;
  P.calendarByMode = calendarByMode;
})();
