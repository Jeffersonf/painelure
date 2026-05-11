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

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function findSchool(name) {
    const target = P.normalize(name);
    return P.getAppData().schools.find(school => P.normalize(school.name) === target) || null;
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
    P.setPage?.("schools");
    requestAnimationFrame(() => {
      const target = P.$(`[data-school-key="${P.searchText([name])}"]`);
      if (!target) return;
      P.$all(".school-card.focused").forEach(card => card.classList.remove("focused"));
      P.$all(".school-card.active").forEach(card => card.classList.remove("active"));
      target.classList.add("active");
      target.classList.add("focused");
      renderSchoolDetail(findSchool(name));
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => target.classList.remove("focused"), 1800);
    });
  }

  function focusNetworkSchool(name) {
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
    P.setPage?.("supervision");
    requestAnimationFrame(() => {
      const target = P.$(`[data-supervisor-key="${P.searchText([name])}"]`);
      if (!target) return;
      target.click();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function contactCard(contact) {
    return `
      <article class="contact-card" data-search="${P.searchText([contact.name, contact.role, contact.sector, contact.email, contact.phone])}">
        <div class="contact-avatar">${initials(contact.name)}</div>
        <div>
          <small>${contact.role}</small>
          <h2>${contact.name}</h2>
          <div class="contact-line"><span>Setor</span><strong>${contact.sector}</strong></div>
          <div class="contact-line"><span>Email</span><strong>${contact.email}</strong></div>
          <div class="contact-line"><span>Ramal</span><strong>${contact.phone}</strong></div>
        </div>
      </article>
    `;
  }

  function setText(selector, value) {
    const element = P.$(selector);
    if (element) element.textContent = value;
  }

  function dashboardRow(item, compact = false) {
    return `
      <button class="data-row${compact ? " compact" : ""}" type="button" data-jump="${item.page}" data-search="${P.searchText([item.title, item.note, item.label])}">
        <span class="row-icon">${item.icon}</span>
        <span><strong>${item.title}</strong><small>${item.note}</small></span>
        <em class="status-pill ${item.tone}">${item.label}</em>
      </button>
    `;
  }

  function renderDashboard(data) {
    const networkCount = Object.keys(data.networkData || {}).length;
    const calendarCount = data.calendar?.length || 0;
    const missingNetwork = Math.max((data.schools?.length || 0) - networkCount, 0);
    const inventoryAlerts = Object.values(data.schoolInventoryMetrics || {}).reduce((sum, item) => sum + Number(item.alerts || 0), 0);
    const pendingVisits = (data.supervisors || []).reduce((sum, item) => sum + Number(item.pending || 0), 0);
    const openCalls = (data.calls || []).filter(item => item.status !== "resolvido").length;
    const ctcVisits = data.ctcVisits?.length || 0;
    const officialSources = (P.sourceStatus || []).filter(item => item.status === "loaded").length;
    const sourceNote = officialSources
      ? `${officialSources} fonte(s) oficial(is) atualizada(s) em segundo plano`
      : "dados locais primeiro; fontes oficiais entram em segundo plano";

    setText("#metricSchools", data.schools.length);
    setText("#metricSchoolsNote", "base regional");
    setText("#metricNetwork", networkCount);
    setText("#metricNetworkNote", networkCount ? "com dados de infraestrutura" : "fonte pendente");
    setText("#metricInventory", data.schoolAssets.length);
    setText("#metricInventoryNote", data.schoolAssets.length ? "linhas consolidadas" : "aguardando inventário");
    setText("#metricSupervision", data.supervisors.length);
    setText("#metricSupervisionNote", data.supervisors.length ? "responsáveis ativos" : "fonte pendente");
    setText("#metricCalendar", calendarCount);
    setText("#metricCalendarNote", calendarCount ? "eventos carregados" : "fonte oficial pendente");
    setText("#dashboardSummary", `consulta rápida • ${data.schools.length} escolas • ${sourceNote}`);
    setText("#dashboardNoticeTitle", calendarCount ? "Base operacional atualizada" : "Base operacional carregada");
    setText("#dashboardNoticeNote", calendarCount
      ? "Escolas, supervisão, inventário, redes e agenda disponíveis para consulta."
      : "Escolas, supervisão, inventário e redes disponíveis para consulta. Calendário aguarda fonte oficial."
    );
    setText("#shortcutSchoolsNote", `${data.schools.length} unidade(s) na base regional`);
    setText("#shortcutNetworkNote", missingNetwork ? `${missingNetwork} escola(s) ainda sem rede` : `${networkCount} rede(s) mapeada(s)`);
    setText("#shortcutInventoryNote", inventoryAlerts ? `${inventoryAlerts} alerta(s) para triagem` : `${data.schoolAssets.length} linha(s) consolidadas`);
    setText("#shortcutSupervisionNote", pendingVisits ? `${pendingVisits} visita(s) pendente(s)` : `${data.supervisors.length} responsável(is) ativos`);
    setText("#shortcutContactsNote", `${data.contacts.length} contato(s) organizado(s)`);
    setText("#shortcutCalendarNote", calendarCount ? `${calendarCount} evento(s) carregado(s)` : "fonte oficial pendente");
    setText("#shortcutCtcNote", ctcVisits ? `${ctcVisits} compromisso(s) técnico(s)` : "agenda técnica preparada");
    setText("#shortcutReportsNote", openCalls ? `${openCalls} chamado(s) em acompanhamento` : "resumo rápido para gestão");

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
        : { icon: "📅", title: "Calendário oficial pendente", note: "Definir fonte antes de exibir eventos reais.", label: "Fonte", tone: "warn", page: "calendar" },
      ctcVisits
        ? { icon: "🛠️", title: "Visitas técnicas previstas", note: `${ctcVisits} compromisso(s) técnico(s) na base atual.`, label: "CTC", tone: "info", page: "ctc" }
        : { icon: "🛠️", title: "Agenda CTC pronta", note: "Área preparada para rotas e compromissos técnicos.", label: "CTC", tone: "info", page: "ctc" },
      openCalls
        ? { icon: "📥", title: "Chamados em acompanhamento", note: `${openCalls} chamado(s) ainda não resolvido(s).`, label: "Fila", tone: "warn", page: "calls" }
        : { icon: "📥", title: "Fila de chamados estável", note: "Sem pendência aberta na base atual.", label: "OK", tone: "ok", page: "calls" }
    ];

    const decisionRows = P.$("#decisionRows");
    const agendaRows = P.$("#agendaRows");
    if (decisionRows) decisionRows.innerHTML = decisions.map(item => dashboardRow(item)).join("");
    if (agendaRows) agendaRows.innerHTML = agenda.map(item => dashboardRow(item, true)).join("");
  }

  function renderSchools(schools) {
    const grid = P.$("#schoolGrid");
    const detail = P.$("#schoolDetail");
    if (!grid) return;
    if (!schools.length) {
      grid.innerHTML = `<div class="empty-state">Nenhuma escola carregada ainda.</div>`;
      if (detail) detail.innerHTML = "";
      return;
    }
    grid.innerHTML = schools.map(school => `
      <button class="school-card" type="button" data-school-name="${school.name}" data-school-key="${P.searchText([school.name])}" data-search="${P.searchText([school.name, school.city, school.cie, school.initials])}">
        <div class="school-top">
          <div class="school-avatar">${school.initials}</div>
          <div>
            <h2>${school.name}</h2>
            <p>${school.city} | CIE ${school.cie}</p>
          </div>
        </div>
        <div></div>
        <div class="school-foot">
          <span class="status-pill ${statusClass(school.status)}">${school.status === "warn" ? "Atenção" : "OK"}</span>
          <span>${school.items} item(ns)</span>
          <div class="progress" aria-label="Ficha ${school.fiche}%"><i style="width:${school.fiche}%"></i></div>
        </div>
      </button>
    `).join("");
    grid.querySelectorAll("[data-school-name]").forEach(button => {
      button.addEventListener("click", () => {
        grid.querySelectorAll("[data-school-name]").forEach(item => item.classList.toggle("active", item === button));
        renderSchoolDetail(findSchool(button.dataset.schoolName));
      });
    });
    grid.querySelector("[data-school-name]")?.classList.add("active");
    renderSchoolDetail(schools[0]);
  }

  function renderSchoolDetail(school) {
    const detail = P.$("#schoolDetail");
    if (!detail || !school) return;
    const data = P.getAppData();
    const assets = schoolAssets(school.name);
    const totals = inventoryTotals(assets);
    const metrics = data.schoolInventoryMetrics?.[school.name] || { items: school.items || 0, alerts: school.alerts || 0 };
    const network = data.networkData?.[school.name];
    const supervisor = supervisorForSchool(school.name);
    const networkStatus = network ? "Mapeada" : "Pendente";
    detail.innerHTML = `
      <article class="box">
        <div class="box-head">
          <div>
            <strong>${school.name}</strong>
            <small>${school.city} • CIE ${school.cie}</small>
          </div>
          <span class="status-pill ${statusClass(school.status)}">${school.status === "warn" ? "Atenção" : "OK"}</span>
        </div>
        <div class="network-layout">
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
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-network="${school.name}" ${network ? "" : "disabled"}>Abrir redes</button>
          <button class="ghost-btn" type="button" data-open-inventory="${school.name}">Abrir inventário</button>
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
    const widgets = [
      ["Informações sobre redes", data.network || [], "🌐", "info", "Público CTC"],
      ["Informações sobre IPs", data.ips || [], "🔢", "info", "Público CTC"],
      ["Informações sobre câmeras", data.cameras || [], "📹", "info", "Público CTC"],
      ["Credenciais", data.credentials || [], "🔐", "warn", "Restrito"]
    ].filter(([, items]) => items.length);

    layout.innerHTML = `
      <article class="network-summary">
        <div>
          <small>Escola selecionada</small>
          <strong>${selectedName}</strong>
          <p>${school ? `${school.city} • CIE ${school.cie}` : "Escola fora da lista mestre."}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-btn" type="button" data-open-school="${selectedName}">Abrir escola</button>
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
    const selectedSchool = select?.value || assets[0].school;
    const selectedAssets = assets.filter(asset => asset.school === selectedSchool);
    const totals = inventoryTotals(selectedAssets);
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
            <div class="data-row" data-search="${P.searchText([asset.school, asset.name, asset.sourceName, asset.notes, asset.status])}">
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
    const detail = P.$("#supervisorDetail");
    if (!host) return;
    if (!supervisors.length) {
      host.innerHTML = `<div class="empty-state">Nenhum supervisor carregado ainda.</div>`;
      if (detail) detail.innerHTML = "";
      return;
    }
    const sorted = [...supervisors].sort((a, b) => a.name.localeCompare(b.name));
    host.innerHTML = sorted.map((item, index) => `
      <button class="table-row" type="button" data-supervisor-index="${index}" data-supervisor-key="${P.searchText([item.name])}" data-search="${P.searchText([item.name, item.email, item.phone, item.schools, item.week, item.month, item.pending])}">
        <div>
          <strong>${item.name}</strong>
          <small>${item.email || item.phone || `${item.schools} escola(s) vinculada(s)`}</small>
        </div>
        <div class="bar-stat" style="--pct:${pctFromText(item.week)}%">
          <span>${item.week}</span>
          <i></i>
        </div>
        <div class="bar-stat" style="--pct:${pctFromText(item.month)}%">
          <span>${item.month}</span>
          <i></i>
        </div>
        <span class="status-pill ${item.pending ? "warn" : "ok"}">${item.pending ? `${item.pending} faltam` : "Verde"}</span>
      </button>
    `).join("");
    host.querySelectorAll("[data-supervisor-index]").forEach(button => {
      button.addEventListener("click", () => {
        host.querySelectorAll("[data-supervisor-index]").forEach(item => item.classList.toggle("active", item === button));
        renderSupervisorDetail(sorted[Number(button.dataset.supervisorIndex)]);
      });
    });
    host.querySelector("[data-supervisor-index]")?.classList.add("active");
    renderSupervisorDetail(sorted[0]);
  }

  function renderSupervisorDetail(supervisor) {
    const detail = P.$("#supervisorDetail");
    if (!detail || !supervisor) return;
    const schools = supervisor.assignedSchools || [];
    const schoolCards = schools.map(name => {
      const school = findSchool(name);
      return {
        name,
        city: school?.city || "Município não informado",
        cie: school?.cie || "CIE pendente",
        items: school?.items ?? 0,
        status: school?.status || "info"
      };
    });
    const status = supervisor.pending ? "warn" : "ok";
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
              <small>Fonte</small>
              <strong>${supervisor.source || "Seed oficial"}</strong>
              <p>Dados normalizados antes de renderizar.</p>
            </div>
            <span class="status-pill info">CSV</span>
          </article>
        </div>
        <div class="linked-school-grid">
          ${schoolCards.length ? schoolCards.map(school => `
            <button class="linked-school" type="button" data-school-jump="${school.name}" data-search="${P.searchText([school.name, school.city, school.cie])}">
              <span>
                <strong>${school.name}</strong>
                <small>${school.city} • ${school.cie}</small>
              </span>
              <em class="status-pill ${statusClass(school.status)}">${school.items} item(ns)</em>
            </button>
          `).join("") : `<div class="empty-state">Nenhuma escola vinculada a este supervisor.</div>`}
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
      <article class="detail-widget" data-search="${P.searchText([item.label, item.value, item.note])}">
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
    grid.innerHTML = visits.length ? visits.map(visit => `
      <article class="detail-widget" data-search="${P.searchText([visit.owner, visit.date, visit.time, visit.place, visit.objective])}">
        <div>
          <small>${visit.date} • ${visit.time}</small>
          <strong>🛠️ ${visit.owner}</strong>
          <p>${visit.place} • ${visit.objective}</p>
        </div>
        <span class="status-pill info">CTC</span>
      </article>
    `).join("") : `<div class="empty-state">Nenhuma visita CTC carregada.</div>`;
  }

  function renderCalls(calls) {
    const grid = P.$("#callsGrid");
    if (!grid) return;
    const tone = status => status === "resolvido" ? "ok" : status === "em_rota" ? "info" : "warn";
    grid.innerHTML = calls.length ? calls.map(call => `
      <article class="detail-widget" data-search="${P.searchText([call.title, call.school, call.status, call.note])}">
        <div>
          <small>${call.school}</small>
          <strong>${call.title}</strong>
          <p>${call.note}</p>
        </div>
        <span class="status-pill ${tone(call.status)}">${call.status.replace("_", " ")}</span>
      </article>
    `).join("") : `<div class="empty-state">Nenhum chamado carregado.</div>`;
  }

  function renderReports(data) {
    const grid = P.$("#reportsGrid");
    const list = P.$("#reportsList");
    if (!grid || !list) return;
    const alerts = Object.values(data.schoolInventoryMetrics || {}).reduce((sum, item) => sum + Number(item.alerts || 0), 0);
    const metrics = [
      { icon: "🏫", label: "Escolas", value: String(data.schools.length), note: "base regional", tone: "glow-lime" },
      { icon: "💻", label: "Inventário", value: String(data.schoolAssets.length), note: "linhas por escola", tone: "glow-teal" },
      { icon: "⚠️", label: "Alertas", value: String(alerts), note: "manutenção/defeito", tone: "glow-amber" },
      { icon: "🧭", label: "Supervisão", value: String(data.supervisors.length), note: "responsáveis", tone: "glow-purple" }
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
      ["Calendário", "Base criada; fonte oficial ainda pendente.", "warn"],
      ["Publicação", "2.0 permanece fora do repositório oficial até decisão.", "warn"]
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
  P.focusSchool = focusSchool;
  P.focusNetworkSchool = focusNetworkSchool;
  P.focusSupervisor = focusSupervisor;
  P.focusInventorySchool = focusInventorySchool;
})();
