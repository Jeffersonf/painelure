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
      director: "direção",
      viceDirector: "vice-direção",
      proati: "PROATI",
      goe: "GOE",
      phone: "telefone",
      mobile: "celular",
      email: "email",
      address: "endereço",
      notes: "observações"
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
    if (summary) summary.textContent = `${visibleCount}/${cards.length} escola(s) visíveis.`;
  }

  function supervisorTone(item) {
    return item.pending > 6 ? "danger" : item.pending > 0 ? "warn" : "ok";
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
    if (summary) summary.textContent = `${visibleCount}/${rows.length} supervisor(es) visíveis.`;
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

  function assetCategory(asset) {
    const text = P.normalize([asset.name, asset.sourceName, asset.notes].join(" "));
    if (text.includes("tablet")) return "Tablets";
    if (text.includes("netbook")) return "Netbooks";
    if (text.includes("notebook") || text.includes("chromebook")) return "Notebooks";
    if (text.includes("recarga") || text.includes("plataforma")) return "Recarga";
    if (text.includes("smartphone") || text.includes("celular")) return "Smartphones";
    if (text.includes("adm") || text.includes("administrativo")) return "PC adm";
    if (text.includes("pc") || text.includes("desktop") || text.includes("pedagogico")) return "PC pedagógico";
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
    if (subtitle) subtitle.textContent = supervisor.email || supervisor.phone || "Acompanhamento de metas e vínculos.";
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
        ? { icon: "🌐", title: "Completar dados de rede", note: `${missingNetwork} escola(s) sem infraestrutura mapeada.`, label: "Rede", tone: "warn", page: "network" }
        : { icon: "🌐", title: "Redes mapeadas", note: `${networkCount} escola(s) com dados técnicos disponíveis.`, label: "OK", tone: "ok", page: "network" },
      inventoryAlerts
        ? { icon: "💻", title: "Conferir inventário em alerta", note: `${inventoryAlerts} unidade(s) em manutenção ou defeito.`, label: "Invent.", tone: "danger", page: "inventory" }
        : { icon: "💻", title: "Inventário consolidado", note: `${data.schoolAssets.length} linha(s) carregada(s) sem alerta resumido.`, label: "OK", tone: "ok", page: "inventory" },
      pendingVisits
        ? { icon: "🧭", title: "Acompanhar visitas pendentes", note: `${pendingVisits} visita(s) faltando nas metas atuais.`, label: "Meta", tone: "warn", page: "supervision" }
        : { icon: "🧭", title: "Supervisão sem pendência crítica", note: `${data.supervisors.length} responsável(is) ativos no painel.`, label: "OK", tone: "ok", page: "supervision" }
    ];

    const agenda = [
      calendarCount
        ? { icon: "📅", title: "Agenda com eventos", note: `${calendarCount} evento(s) carregado(s) para consulta.`, label: "Agenda", tone: "info", page: "calendar" }
        : { icon: "📅", title: "Calendário preparado", note: "Área pronta para a agenda institucional da URE.", label: "Agenda", tone: "info", page: "calendar" },
      ctcVisits
        ? { icon: "🛠️", title: "Visitas técnicas previstas", note: `${ctcVisits} compromisso(s) técnico(s) na base atual.`, label: "CTC", tone: "info", page: "ctc" }
        : { icon: "🛠️", title: "Agenda CTC pronta", note: "Área preparada para rotas e compromissos técnicos.", label: "CTC", tone: "info", page: "ctc" },
      openCalls
        ? { icon: "📥", title: "Chamados em acompanhamento", note: `${openCalls} chamado(s) ainda não resolvido(s).`, label: "Fila", tone: "warn", page: "calls" }
        : { icon: "📥", title: "Fila de chamados estável", note: "Sem pendência aberta na base atual.", label: "OK", tone: "ok", page: "calls" }
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
    setText("#userIdentitySource", display.linked ? "Usuário vinculado ao contato" : "Usuário importado da v1");
    setText("#userRoleSummary", role);
    setText("#userAccessSummary", profile?.note || "Perfil local de acesso ao painel.");
    setText("#userContactSummary", display.linked
      ? `${display.contactRole || "Contato"} • ${display.sector || "Setor"} • ${display.email || display.phone || "sem canal"}`
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
      const note = missing.length ? `pendente: ${missing.slice(0, 2).join(", ")}` : firstNote(profile?.notes) || "ficha escolar completa";
      return `
        <button class="school-card" type="button" data-school-name="${school.name}" data-school-key="${P.searchText([school.name])}" data-city="${P.searchText([school.city])}" data-profile-status="${profileStatus}" data-inventory-alerts="${alertCount}" data-network-status="${networkStatus}" data-search="${P.searchText([school.name, school.city, school.cie, school.initials, profile?.director, profile?.email, profile?.phone, supervisor?.name])}">
          <div class="school-top">
            <div class="school-avatar">${school.initials}</div>
            <div>
              <h2>${school.name}</h2>
              <p>${school.city} | CIE ${school.cie}</p>
            </div>
            <span class="status-pill ${network ? "info" : "warn"}">${network ? "rede" : "sem rede"}</span>
          </div>
          <div class="school-meta">
            <span>${profilePct}% ficha</span>
            <span>${metrics.items || 0} item(ns)</span>
            <span>${alertCount ? `${alertCount} alerta(s)` : "inventario ok"}</span>
            <span>${supervisor?.name || "sem supervisor"}</span>
          </div>
          <p class="school-note">${note}</p>
          <div class="school-foot">
            <span class="status-pill ${profileStatus}">ficha</span>
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
    const contacts = (data.contacts || []).filter(contact => ["Tecnologia", "Supervisão", "Gabinete"].includes(contact.sector)).slice(0, 3);
    const networkStatus = network ? "Mapeada" : "Pendente";
    const profileNote = missingProfile.length ? `Pendências: ${missingProfile.slice(0, 4).join(", ")}.` : firstNote(profile?.notes) || "Dados principais da escola preenchidos.";
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
            <small>${school.city} • CIE ${school.cie}</small>
          </div>
          <span class="status-pill ${profileStatusFromPct(profilePct)}">${profilePct}% ficha</span>
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
              <small>Direção</small>
              <strong>${profile?.director || "Não informada"}</strong>
              <p>${[profile?.viceDirector && `Vice: ${profile.viceDirector}`, profile?.goe && `GOE: ${profile.goe}`].filter(Boolean).join(" • ") || "Equipe gestora pendente na ficha."}</p>
            </div>
            <span class="status-pill ${profile?.director ? "ok" : "warn"}">gestão</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Contato da escola</small>
              <strong>${profile?.phone || "Telefone pendente"}</strong>
              <p>${[profile?.email, profile?.address].filter(Boolean).join(" • ") || "Email e endereço ainda não informados."}</p>
            </div>
            <span class="status-pill ${profile?.phone || profile?.email ? "info" : "warn"}">contato</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Inventário</small>
              <strong>${totals.lines || metrics.items} linha(s)</strong>
              <p>${totals.alertUnits || metrics.alerts ? `${totals.alertUnits || metrics.alerts} unidade(s) em manutenção ou defeito.` : "Sem alerta operacional registrado."}</p>
            </div>
            <span class="status-pill ${totals.alertUnits || metrics.alerts ? "warn" : "ok"}">${totals.alertUnits || metrics.alerts ? "revisar" : "ok"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Redes e câmeras</small>
              <strong>${networkStatus}</strong>
              <p>${network ? [network.network?.[0], network.cameras?.[0]].filter(Boolean).join(" • ") : "Sem dados técnicos vinculados."}</p>
            </div>
            <span class="status-pill ${network ? "info" : "warn"}">${network ? "CTC" : "pendente"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Supervisão</small>
              <strong>${supervisor?.name || "Não vinculada"}</strong>
              <p>${supervisor ? `${supervisor.week} na semana • ${supervisor.month} no mês.` : "Aguardando vínculo oficial."}</p>
            </div>
            <span class="status-pill info">oficial</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Chamados</small>
              <strong>${calls.length}</strong>
              <p>${calls.length ? calls.map(call => call.title).slice(0, 2).join(" • ") : "Sem chamado vinculado na base atual."}</p>
            </div>
            <span class="status-pill ${calls.length ? "warn" : "ok"}">${calls.length ? "fila" : "ok"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Contatos úteis</small>
              <strong>${contacts.length}</strong>
              <p>${contacts.map(contact => `${contact.sector}: ${contact.name}`).join(" • ")}</p>
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
          ${!P.canAccess || P.canAccess("inventory") ? `<button class="ghost-btn" type="button" data-open-inventory="${school.name}">Abrir inventário</button>` : ""}
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
    select.innerHTML = Object.keys(networkData).map(name => `<option value="${name}">${name}</option>`).join("");
    select.onchange = () => renderNetwork(networkData);
    renderNetwork(networkData);
  }

  function renderNetwork(networkData) {
    const select = P.$("#networkSelect");
    const layout = P.$("#networkLayout");
    if (!select || !layout) return;
    const selectedName = select.value || Object.keys(networkData)[0];
    const data = networkData[select.value] || networkData[Object.keys(networkData)[0]];
    if (!data) {
      layout.innerHTML = `<div class="empty-state">Nenhum dado de rede cadastrado ainda.</div>`;
      return;
    }
    const school = findSchool(selectedName);
    const supervisor = supervisorForSchool(selectedName);
    const credentialItems = data.credentials || [];
    const widgets = [
      ["Informações sobre redes", data.network || [], "🌐", "info", "Público CTC"],
      ["Informações sobre IPs", data.ips || [], "🔢", "info", "Público CTC"],
      ["Informações sobre câmeras", data.cameras || [], "📹", "info", "Público CTC"],
      ["Credenciais", data.credentials || [], "🔐", "warn", "Restrito"]
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
          <p>${school ? `${school.city} • CIE ${school.cie}` : "Escola fora da lista mestre."}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedName}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-inventory="${selectedName}">Abrir inventário</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      ${widgets.map(([title, items, icon, tone, label]) => `
      <article class="detail-widget" data-search="${P.searchText([title, ...items])}">
        <div>
          <small>${title}</small>
          <strong>${icon} ${items[0]}</strong>
          <p>${items.slice(1).join(" • ")}</p>
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

  function renderInventory(data) {
    const grid = P.$("#inventoryGrid");
    const select = P.$("#inventorySelect");
    if (!grid) return;
    const assets = data.schoolAssets || [];
    if (!assets.length) {
      grid.innerHTML = `<div class="empty-state">Nenhum dado de inventário carregado ainda.</div>`;
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

    grid.innerHTML = `
      <article class="network-summary">
        <div>
          <small>Escola selecionada</small>
          <strong>${selectedSchool}</strong>
          <p>${totals.lines} linha(s) • ${totals.units} unidade(s) • ${totals.alertUnits} alerta(s)</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedSchool}">Abrir escola</button>
          <button class="ghost-btn" type="button" data-open-network="${selectedSchool}" ${network ? "" : "disabled"}>Abrir redes</button>
          <button class="ghost-btn" type="button" data-open-supervisor="${supervisor?.name || ""}" ${supervisor ? "" : "disabled"}>Abrir supervisor</button>
        </div>
      </article>
      ${categories.map(item => `
        <article class="detail-widget" data-search="${P.searchText([selectedSchool, item.category, item.units, item.alerts])}">
          <div>
            <small>${item.category}</small>
            <strong>${item.units} unidade(s)</strong>
            <p>${item.lines} linha(s) consolidada(s) • ${item.alerts} em manutenção/defeito.</p>
          </div>
          <span class="status-pill ${item.alerts ? "warn" : "ok"}">${item.alerts ? "revisar" : "ok"}</span>
        </article>
      `).join("")}
      <article class="inventory-list box">
        <div class="box-head"><div><strong>Itens da escola</strong><small>${selectedAssets.length} linha(s) do inventário</small></div></div>
        <div class="row-list">
          ${selectedAssets.map(asset => `
            <div class="data-row" data-inventory-key="${P.searchText([asset.school, asset.sourceName || asset.name, asset.notes])}" data-search="${P.searchText([asset.school, asset.name, asset.sourceName, asset.notes, asset.status])}">
              <span class="row-icon">💻</span>
              <span><strong>${asset.sourceName || asset.name}</strong><small>${asset.notes || asset.name}</small></span>
              <em class="status-pill ${assetTone(asset.status)}">${assetUnits(asset)} • ${assetStatusLabel(asset.status)}</em>
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

  function renderSupervisors(supervisors) {
    const host = P.$("#supervisorRows");
    if (!host) return;
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
    host.innerHTML = `${sourceNote ? `<div class="data-row compact"><span class="row-icon">&#128197;</span><span><strong>Fonte de supervisao</strong><small>${sourceNote}</small></span><em class="status-pill info">oficial</em></div>` : ""}${sorted.map((item, index) => {
      const tone = supervisorTone(item);
      return `
      <button class="supervisor-row" type="button" data-supervisor-index="${index}" data-supervisor-key="${P.searchText([item.name])}" data-status="${tone}" data-search="${P.searchText([item.name, item.email, item.phone, item.schools, item.week, item.month, item.pending])}">
        <div class="supervisor-person">
          <div class="school-avatar">${initials(item.name)}</div>
          <span>
            <strong>${item.name}</strong>
            <small>${item.email || item.phone || `${item.schools} escola(s) vinculada(s)`}</small>
          </span>
        </div>
        <div class="supervisor-metrics">
          <div class="bar-stat" style="--pct:${pctFromText(item.week)}%">
            <small>Semana</small>
            <span>${item.week}</span>
            <i></i>
          </div>
          <div class="bar-stat" style="--pct:${pctFromText(item.month)}%">
            <small>Mês</small>
            <span>${item.month}</span>
            <i></i>
          </div>
        </div>
        <span class="status-pill ${tone}">${item.pending ? `${item.pending} faltam` : "Verde"}</span>
      </button>
    `; }).join("")}`;
    applySupervisorFilters();
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
      return {
        name,
        city: school?.city || "Município não informado",
        cie: school?.cie || "CIE pendente",
        items: school?.items ?? 0,
        profilePct,
        alerts,
        status: alerts ? "warn" : profileStatusFromPct(profilePct)
      };
    });
    const status = supervisor.pending ? "warn" : "ok";
    const alertSchools = schoolCards.filter(school => school.alerts).length;
    const incompleteProfiles = schoolCards.filter(school => school.profilePct < 65).length;
    const week = progressParts(supervisor.week);
    const month = progressParts(supervisor.month);
    const attentionCards = schoolCards
      .filter(school => school.alerts || school.profilePct < 65)
      .slice(0, 5);
    detail.innerHTML = `
      <article class="box">
        <div class="box-head">
          <div>
            <strong>${supervisor.name}</strong>
            <small>${supervisor.email || "email não informado"} • ${supervisor.phone || "telefone não informado"}</small>
          </div>
          <span class="status-pill ${status}">${supervisor.pending ? "Acompanhar" : "Meta ok"}</span>
        </div>
        <div class="network-layout">
          <article class="detail-widget">
            <div>
              <small>Meta semanal</small>
              <strong>${supervisor.week}</strong>
              <p>Meta base de 3 visitas por semana.</p>
            </div>
            <span class="status-pill ${statusClass(supervisor.pending ? "warn" : "ok")}">${supervisor.pending ? "pendente" : "verde"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Meta mensal</small>
              <strong>${supervisor.month}</strong>
              <p>${supervisor.pending ? `${supervisor.pending} visita(s) pendente(s).` : "Meta mensal concluída."}</p>
            </div>
            <span class="status-pill ${status}">${supervisor.pending ? "atenção" : "verde"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Escolas vinculadas</small>
              <strong>${supervisor.schools}</strong>
              <p>${schools.length ? "Clique em uma escola para abrir o card na lista principal." : "Lista de escolas pendente."}</p>
            </div>
            <span class="status-pill info">oficial</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Atenções da carteira</small>
              <strong>${alertSchools + incompleteProfiles}</strong>
              <p>${alertSchools} escola(s) com alerta de inventário • ${incompleteProfiles} ficha(s) abaixo de 65%.</p>
            </div>
            <span class="status-pill ${alertSchools || incompleteProfiles ? "warn" : "ok"}">${alertSchools || incompleteProfiles ? "revisar" : "ok"}</span>
          </article>
          <article class="detail-widget">
            <div>
              <small>Fonte</small>
              <strong>${supervisor.source || "Seed oficial"}</strong>
              <p>Dados normalizados antes de renderizar.</p>
            </div>
            <span class="status-pill info">CSV</span>
          </article>
        </div>
        <div class="row-list">
          <button class="data-row compact" type="button" data-jump="supervision">
            <span class="row-icon">&#127919;</span>
            <span><strong>Semana ${week.done}/${week.total}</strong><small>${week.missing ? `${week.missing} visita(s) para fechar a semana.` : "Meta semanal concluida."}</small></span>
            <em class="status-pill ${week.missing ? "warn" : "ok"}">${week.pct}%</em>
          </button>
          <button class="data-row compact" type="button" data-jump="supervision">
            <span class="row-icon">&#128197;</span>
            <span><strong>Mes ${month.done}/${month.total}</strong><small>${month.missing ? `${month.missing} visita(s) para fechar o mes.` : "Meta mensal concluida."}</small></span>
            <em class="status-pill ${month.missing ? "warn" : "ok"}">${month.pct}%</em>
          </button>
        </div>
        ${attentionCards.length ? `
        <div class="row-list">
          ${attentionCards.map(school => `
            <button class="data-row compact" type="button" data-school-jump="${school.name}" data-search="${P.searchText([school.name, school.city])}">
              <span class="row-icon">&#128204;</span>
              <span><strong>${school.name}</strong><small>${school.alerts ? `${school.alerts} alerta(s) de inventario` : `ficha ${school.profilePct}%`}</small></span>
              <em class="status-pill warn">Acompanhar</em>
            </button>
          `).join("")}
        </div>` : `
        <div class="row-list">
          <div class="data-row compact">
            <span class="row-icon">&#9989;</span>
            <span><strong>Carteira sem alerta resumido</strong><small>Se houver visita errada ou faltando, acione o gabinete para correcao da base.</small></span>
            <em class="status-pill ok">OK</em>
          </div>
        </div>`}
        <div class="linked-school-grid">
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
        <div class="detail-actions">
          ${supervisor.email ? `<a class="ghost-btn" href="mailto:${supervisor.email}">Enviar email</a>` : ""}
          ${supervisor.phone ? `<a class="ghost-btn" href="tel:${String(supervisor.phone).replace(/[^0-9+]/g, "")}">Ligar</a>` : ""}
        </div>
      </article>
    `;
    detail.querySelectorAll("[data-school-jump]").forEach(button => {
      button.addEventListener("click", () => focusSchool(button.dataset.schoolJump));
    });
  }

  function renderContacts(contacts, sector = "Todos") {
    const grid = P.$("#contactGrid");
    if (!grid) return;
    const visible = sector === "Todos" ? contacts : contacts.filter(contact => contact.sector === sector);
    grid.innerHTML = visible.length
      ? visible.map(contactCard).join("")
      : `<div class="empty-state">Nenhum contato cadastrado para ${sector} ainda.</div>`;
  }

  function renderCalendar(calendar) {
    const grid = P.$("#calendarGrid");
    if (!grid) return;
    if (!calendar.length) {
      grid.innerHTML = `<div class="empty-state">Nenhum evento carregado ainda.</div>`;
      return;
    }
    grid.innerHTML = calendar.map(item => `
      <article class="detail-widget" data-calendar-key="${P.searchText([item.label, item.value])}" data-search="${P.searchText([item.label, item.value, item.note])}">
        <div>
          <small>${item.label}</small>
          <strong>${item.value}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill info">Agenda</span>
      </article>
    `).join("");
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
    const summary = P.$("#ctcFilterSummary");
    if (summary) summary.textContent = `${visible.length}/${visits.length} visita(s) visíveis.`;

    grid.innerHTML = visible.length ? visible.map(visit => `
      <article class="detail-widget" data-ctc-key="${P.searchText([visit.owner, visit.date, visit.time, visit.place])}" data-search="${P.searchText([visit.owner, visit.date, visit.time, visit.place, visit.objective])}">
        <div>
          <small>${visit.date} • ${visit.time}</small>
          <strong>🛠️ ${visit.owner}</strong>
          <p>${visit.place} • ${visit.objective}</p>
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

  function renderReports(data) {
    const grid = P.$("#reportsGrid");
    const list = P.$("#reportsList");
    if (!grid || !list) return;
    const alerts = Object.values(data.schoolInventoryMetrics || {}).reduce((sum, item) => sum + Number(item.alerts || 0), 0);
    const networkCount = Object.keys(data.networkData || {}).length;
    const pendingVisits = (data.supervisors || []).reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const linkedUsers = (data.users || []).filter(user => user.contactSync === "linked").length;
    const metrics = [
      { icon: "🏫", label: "Escolas", value: String(data.schools.length), note: "base regional", tone: "glow-lime" },
      { icon: "💻", label: "Inventário", value: String(data.schoolAssets.length), note: "linhas por escola", tone: "glow-teal" },
      { icon: "⚠️", label: "Alertas", value: String(alerts), note: "manutenção/defeito", tone: "glow-amber" },
      { icon: "🌐", label: "Redes", value: String(networkCount), note: "escolas mapeadas", tone: "glow-teal" },
      { icon: "🧭", label: "Pendências", value: String(pendingVisits), note: "visitas faltantes", tone: "glow-purple" },
      { icon: "👤", label: "Usuários", value: `${linkedUsers}/${data.users.length}`, note: "vinculados a contatos", tone: "glow-lime" }
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
      ["Supervisão", `${data.supervisors.length} supervisores com planilha oficial de abril conectada.`, "ok"],
      ["Inventário", `${data.schoolAssets.length} linhas sanitizadas, sem previews brutos da 1.0.`, "ok"],
      ["Redes e câmeras", `${networkCount}/${data.schools.length} escola(s) com infraestrutura mapeada.`, networkCount === data.schools.length ? "ok" : "warn"],
      ["Chamados", `${data.calls.length} chamado(s) operacionais em acompanhamento.`, data.calls.some(call => call.status !== "resolvido") ? "warn" : "ok"],
      ["Calendário", "Estrutura pronta para a agenda institucional.", "info"],
      ["Publicação", "2.0 publicado em repositório próprio e GitHub Pages.", "ok"]
    ].map(([title, note, status]) => `
      <div class="data-row" data-search="${P.searchText([title, note, status])}">
        <span class="row-icon">📈</span>
        <span><strong>${title}</strong><small>${note}</small></span>
        <em class="status-pill ${status}">${status === "ok" ? "ok" : "revisar"}</em>
      </div>
    `).join("");
  }

  function renderAdmin(items) {
    const grid = P.$("#adminGrid");
    if (!grid) return;
    const data = P.getAppData();
    const systemChecks = [
      { label: "Escolas carregadas", status: data.schools.length === 21 ? "ok" : "warn", note: `${data.schools.length}/21 escola(s)` },
      { label: "Inventário carregado", status: data.schoolAssets.length ? "ok" : "warn", note: `${data.schoolAssets.length} linha(s)` },
      { label: "Supervisão carregada", status: data.supervisors.length === 6 ? "ok" : "warn", note: `${data.supervisors.length}/6 supervisor(es)` },
      { label: "Contatos carregados", status: data.contacts.length ? "ok" : "warn", note: `${data.contacts.length} contato(s)` },
      {
        label: "Fichas escolares",
        status: data.schoolProfiles.length ? "ok" : "warn",
        note: `${data.schoolProfiles.length}/${data.schools.length || 21} ficha(s) herdada(s) da v1`
      },
      {
        label: "Usuários importados da v1",
        status: data.users.length ? "ok" : "warn",
        note: `${data.users.length} usuário(s), ${data.users.filter(user => user.contactSync === "linked").length} vinculado(s) a contatos`
      },
      { label: "Perfis ativos", status: P.ROLE_ACCESS ? "ok" : "danger", note: P.ROLE_ACCESS ? `${Object.keys(P.ROLE_ACCESS).length} perfil(is)` : "matriz indisponível" }
    ];
    const rows = [...systemChecks, ...items];
    grid.innerHTML = rows.length ? rows.map(item => `
      <article class="detail-widget" data-search="${P.searchText([item.label, item.status, item.note])}">
        <div>
          <small>${item.status === "ok" ? "estável" : "decisão pendente"}</small>
          <strong>⚙️ ${item.label}</strong>
          <p>${item.note}</p>
        </div>
        <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
      </article>
    `).join("") : `<div class="empty-state">Nenhum diagnóstico administrativo carregado.</div>`;
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
})();
