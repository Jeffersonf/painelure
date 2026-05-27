(function () {
  const P = window.PainelURE;

  function supervisorVisitDate(value) {
    const text = String(value || "");
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const pt = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (pt) return new Date(Number(pt[3]), Number(pt[2]) - 1, Number(pt[1]));
    return null;
  }

  function supervisorVisitMonthKey(visit) {
    const date = supervisorVisitDate(visit?.date);
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function progressDone(text) {
    const [done] = String(text || "0/0").split("/").map(value => Number(value) || 0);
    return done;
  }

  function progressParts(text, fallbackTotal = 0) {
    const [done, total] = String(text || `0/${fallbackTotal}`).split("/").map(value => Number(value) || 0);
    return { done, total: total || fallbackTotal || 0 };
  }

  function progressPct(parts) {
    return parts.total ? Math.min(100, Math.round((parts.done / parts.total) * 100)) : 0;
  }

  function monthSourceIsSelected() {
    return (P.selectedMonthKey?.() || "") === (P.sources?.supervision?.monthKey || "");
  }

  function selectedWeekOneStart() {
    const selected = P.selectedMonth?.() || { year: 2026, month: 5 };
    const firstDay = new Date(selected.year, selected.month - 1, 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return start;
  }

  function selectedDateWeek(date) {
    if (!date) return 0;
    const start = selectedWeekOneStart();
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((current - start) / 86400000);
    if (diffDays < 0) return 0;
    return Math.floor(diffDays / 7) + 1;
  }

  function lastWeekOfSelectedMonth() {
    const selected = P.selectedMonth?.() || { year: 2026, month: 5 };
    return selectedDateWeek(new Date(selected.year, selected.month, 0));
  }

  function indicatorMeta(parts) {
    const pct = progressPct(parts);
    if (pct >= 100) return { label: "VERDE", tone: "ok" };
    if (pct > 0) return { label: "AMARELO", tone: "warn" };
    return { label: "VERMELHO", tone: "danger" };
  }

  function indicatorFromValue(value, fallbackParts) {
    const text = String(value || "").trim();
    const key = P.normalize(text);
    if (key.includes("verde") || key === "ok" || key.includes("meta_ok")) return { label: "VERDE", tone: "ok" };
    if (key.includes("vermelho") || key.includes("critico") || key.includes("atras")) return { label: "VERMELHO", tone: "danger" };
    if (key.includes("amarelo")) return { label: "AMARELO", tone: "warn" };
    if (key.includes("aviso") || key.includes("atenc")) return { label: "AMARELO", tone: "warn" };
    const cleanLabel = text.replace(/_/g, " ").replace(/[^\p{L}\p{N}\s!]/gu, "").replace(/\s+/g, " ").trim().toUpperCase();
    return cleanLabel ? { label: cleanLabel, tone: "info" } : indicatorMeta(fallbackParts);
  }

  function currentWeekNumber(stats) {
    const officialWeek = monthSourceIsSelected() && stats.map(item => Number(item.supervisor?.currentWeek || 0)).find(Boolean);
    if (officialWeek) return officialWeek;
    const visits = stats.flatMap(item => item.visits || []);
    const dates = visits.map(visit => supervisorVisitDate(visit.date)).filter(Boolean);
    if (dates.length) {
      const latest = new Date(Math.max(...dates.map(date => date.getTime())));
      return Math.max(1, selectedDateWeek(latest));
    }
    return Math.max(1, lastWeekOfSelectedMonth());
  }

  function supervisorSourceFooter() {
    const selected = P.selectedMonthLabel?.() || "mês selecionado";
    const source = P.sources?.supervision?.label || "planilha oficial de supervisão";
    const updated = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(",", "");
    return `
      <div class="supervisor-sheet-foot">
        <span>Fonte: ${source.toLowerCase()} | Mês exibido: ${selected}</span>
        <span>Atualizada em ${updated}</span>
      </div>
    `;
  }

  function supervisorGoalCell(parts) {
    return `<td class="supervisor-goal-cell"><strong>${parts.done}/${parts.total || "--"}</strong><div class="supervisor-sheet-bar"><span style="width:${Math.max(4, progressPct(parts))}%"></span></div></td>`;
  }

  function supervisorIndicatorFromGoal(visits, goal) {
    if (!Number(goal || 0)) return "aviso";
    if (Number(visits || 0) >= Number(goal || 0)) return "verde";
    return Number(visits || 0) > 0 ? "amarelo" : "vermelho";
  }

  function supervisorVisitRowsForMonth(supervisor) {
    const selected = P.selectedMonthKey?.() || "";
    const records = supervisor.visitRecords || [];
    if (records.length) return records.filter(visit => supervisorVisitMonthKey(visit) === selected);
    const fallbackCount = progressDone(supervisor.month);
    const schools = supervisor.assignedSchools || [];
    return Array.from({ length: fallbackCount }, (_, index) => ({
      date: "",
      school: schools[index % Math.max(1, schools.length)] || "Escola não informada",
      type: "Visita"
    }));
  }

  function supervisorStatsForMonth(supervisors) {
    return (supervisors || []).map(supervisor => {
      const assignedSchools = supervisor.assignedSchools || [];
      const visits = supervisorVisitRowsForMonth(supervisor);
      const visited = new Set(visits.map(visit => visit.school).filter(Boolean));
      return {
        supervisor,
        assignedSchools,
        visits,
        visitCount: visits.length,
        visitedSchools: visited.size,
        visited,
        coverage: assignedSchools.length ? Math.round((visited.size / assignedSchools.length) * 100) : 0,
        openCalls: (P.getAppData().calls || []).filter(call => assignedSchools.some(school => P.normalize(school) === P.normalize(call.school)) && call.status !== "resolvido").length
      };
    }).sort((a, b) => a.supervisor.name.localeCompare(b.supervisor.name));
  }

  function supervisorSheetMetrics(item, currentWeek) {
    const supervisor = item.supervisor || {};
    const officialMonth = monthSourceIsSelected();
    const weeklyGoal = Number(supervisor.weeklyGoal || 0);
    const monthlyGoal = Number(supervisor.monthlyGoal || 0);
    const selectedWeek = officialMonth ? Number(supervisor.currentWeek || currentWeek || 0) : currentWeek;
    const localWeekVisits = (item.visits || []).filter(visit => selectedDateWeek(supervisorVisitDate(visit.date)) === selectedWeek).length;
    const weeklyVisits = officialMonth && Number.isFinite(Number(supervisor.weeklyVisits)) ? Number(supervisor.weeklyVisits) : localWeekVisits;
    const monthlyVisits = officialMonth && Number.isFinite(Number(supervisor.monthlyVisits)) ? Number(supervisor.monthlyVisits) : item.visitCount;
    const weeklyIndicator = officialMonth ? (supervisor.weeklyIndicator || "aviso") : supervisorIndicatorFromGoal(weeklyVisits, weeklyGoal);
    const monthlyIndicator = officialMonth ? (supervisor.monthlyIndicator || "aviso") : supervisorIndicatorFromGoal(monthlyVisits, monthlyGoal);
    return {
      assigned: Number(supervisor.assignedSchoolCount || item.assignedSchools.length || 0),
      currentWeek: selectedWeek,
      week: { done: weeklyVisits, total: weeklyGoal },
      month: { done: monthlyVisits, total: monthlyGoal },
      weeklyIndicator: indicatorFromValue(weeklyIndicator, { done: weeklyVisits, total: weeklyGoal }),
      monthlyIndicator: indicatorFromValue(monthlyIndicator, { done: monthlyVisits, total: monthlyGoal })
    };
  }

  function noMonthDataMarkup(stats) {
    const hasData = stats.some(item => item.visitCount > 0) || (monthSourceIsSelected() && stats.some(item => Number(item.supervisor?.monthlyVisits || 0) > 0));
    if (hasData) return "";
    const selected = P.selectedMonthLabel?.() || "mês selecionado";
    const official = P.sources?.supervision?.monthKey ? P.selectedMonthLabel?.(P.sources.supervision.monthKey) : "";
    return `
      <article class="supervisor-no-data-warning" role="status">
        <strong>Não há dados de supervisão para ${selected}</strong>
        <p>${official ? `A planilha oficial carregada atualmente é de ${official}.` : "Nenhuma fonte mensal oficial está carregada para este período."} Selecione um mês com registros ou sincronize uma fonte oficial deste mês.</p>
      </article>
    `;
  }

  function supervisionAprilWarningMarkup() {
    if ((P.selectedMonthKey?.() || "") !== "2026-04") return "";
    return `
      <article class="supervisor-april-warning" role="note">
        <strong>Aviso importante sobre abril</strong>
        <p>A planilha de abril foi usada apenas como teste de importação e validação do painel. Abril não será considerado para acompanhamento oficial; a partir de maio a supervisão usa a planilha oficial nova.</p>
      </article>
    `;
  }

  function supervisorVisitCalendarMarkup(visits = []) {
    const selected = P.selectedMonth?.() || { year: 2026, month: 5 };
    const daysInMonth = new Date(selected.year, selected.month, 0).getDate();
    const byDay = visits.reduce((acc, visit) => {
      const date = supervisorVisitDate(visit.date);
      if (!date || date.getFullYear() !== selected.year || date.getMonth() !== selected.month - 1) return acc;
      const day = date.getDate();
      acc[day] = acc[day] || [];
      acc[day].push(visit);
      return acc;
    }, {});
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const items = byDay[day] || [];
      return `<div class="supervisor-calendar-day ${items.length ? "has-visit" : ""}"><strong>${day}</strong><span>${items.length ? `${items.length} visita(s)` : ""}</span></div>`;
    }).join("");
  }

  function renderSupervisors(supervisors) {
    const host = P.$("#supervisorRows");
    if (!host) return;
    if (!supervisors.length) {
      host.innerHTML = `<div class="empty-state">Nenhum supervisor carregado ainda.</div>`;
      return;
    }
    const stats = supervisorStatsForMonth(supervisors);
    const currentWeek = currentWeekNumber(stats);
    const noDataMarkup = noMonthDataMarkup(stats);
    host.innerHTML = `
      <section class="supervision-original-shell">
        ${supervisionAprilWarningMarkup()}
        <article class="box" id="painelSupervisor">
          <div class="box-head supervisor-original-box-head">
            <div><strong>🧭 Painel de supervisores</strong><small>Resumo mensal das visitas, metas e indicadores da planilha oficial.</small></div>
            <div class="mini-actions">
              <button class="btn btn-p btn-sm" id="syncSupervisorSourcesBtn" type="button">Atualizar planilha</button>
              <button class="btn btn-g btn-sm" id="supervisorFullscreenBtn" type="button">Apresentar</button>
            </div>
          </div>
          <div class="supervisor-sheet-panel">
            ${noDataMarkup}
            <div class="supervisor-sheet-table-wrap">
              <table class="supervisor-sheet-table">
                <colgroup>
                  <col class="supervisor-col-name">
                  <col class="supervisor-col-schools">
                  <col class="supervisor-col-goal">
                  <col class="supervisor-col-goal">
                  <col class="supervisor-col-week">
                  <col class="supervisor-col-indicator">
                  <col class="supervisor-col-indicator">
                </colgroup>
                <thead>
                  <tr>
                    <th>Supervisor</th>
                    <th>Escolas</th>
                    <th>Meta semanal</th>
                    <th>Meta mensal</th>
                    <th>Semana</th>
                    <th>Indicador semana</th>
                    <th>Indicador mês</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.map((item, index) => {
                    const metrics = supervisorSheetMetrics(item, currentWeek);
                    return `
                    <tr class="supervisor-sheet-row" data-supervisor-index="${index}" data-status="${metrics.monthlyIndicator.tone}" data-search="${P.searchText([item.supervisor.name, item.supervisor.email, item.supervisor.phone])}">
                      <td><strong>${item.supervisor.name}</strong></td>
                      <td>${metrics.assigned || item.assignedSchools.length}</td>
                      ${supervisorGoalCell(metrics.week)}
                      ${supervisorGoalCell(metrics.month)}
                      <td>${metrics.currentWeek || "--"}</td>
                      <td><span class="diag-pill pill-${metrics.weeklyIndicator.tone}">${metrics.weeklyIndicator.label}</span></td>
                      <td><span class="diag-pill pill-${metrics.monthlyIndicator.tone}">${metrics.monthlyIndicator.label}</span></td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
            ${supervisorSourceFooter()}
          </div>
        </article>
        <article class="box">
          <div class="box-head supervisor-original-box-head">
            <div><strong>Supervisores</strong><small>Resumo individual, metas e sinal de acompanhamento.</small></div>
          </div>
          <div class="stack-list supervisor-selector-list">
            ${stats.map((item, index) => {
              const metrics = supervisorSheetMetrics(item, currentWeek);
              return `<button class="setechub-item setechub-clickable supervisor-list-card" type="button" data-supervisor-selector="${index}" data-status="${metrics.monthlyIndicator.tone}" data-search="${P.searchText([item.supervisor.name, item.supervisor.email, item.supervisor.phone])}">
                <div class="setechub-head">
                  <div><strong>${item.supervisor.name}</strong><small class="sync-meta">${metrics.assigned || item.assignedSchools.length} escola(s) | ${metrics.month.done}/${metrics.month.total || "--"} meta mensal | ${metrics.week.done}/${metrics.week.total || "--"} semana</small></div>
                  <span class="diag-pill pill-${metrics.monthlyIndicator.tone}">${metrics.monthlyIndicator.label}</span>
                </div>
                <div class="supervisor-list-kpis">
                  <div><span>Escolas</span><strong>${item.assignedSchools.length}</strong></div>
                  <div><span>Visitadas</span><strong>${item.visitedSchools}</strong></div>
                  <div><span>Visitas</span><strong>${item.visitCount}</strong></div>
                  <div><span>Cobertura</span><strong>${item.coverage}%</strong></div>
                </div>
              </button>`;
            }).join("") || `<div class="sync-empty">Nenhum supervisor cadastrado.</div>`}
          </div>
        </article>
      </section>`;
    const refreshButton = host.querySelector("#syncSupervisorSourcesBtn");
    refreshButton?.addEventListener("click", async () => {
      const original = refreshButton.textContent;
      refreshButton.disabled = true;
      refreshButton.textContent = "Atualizando...";
      try {
        await P.refreshSource?.("supervision");
        P.renderSourceStatus?.();
        P.renderGlobalSyncBanner?.();
        P.renderApp?.();
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = original || "Atualizar planilha";
      }
    });
    host.querySelector("#supervisorFullscreenBtn")?.addEventListener("click", () => {
      P.$("#painelSupervisor")?.requestFullscreen?.();
    });
    host.querySelectorAll("[data-supervisor-index], [data-supervisor-selector]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.supervisorIndex || button.dataset.supervisorSelector);
        P.focusSupervisor?.(stats[index].supervisor.name);
      });
    });
  }

  function renderSupervisorDetail(supervisor, target = "#supervisorDetailPageBody") {
    const detail = P.$(target);
    if (!detail || !supervisor) return;
    const selected = supervisorStatsForMonth([supervisor])[0];
    const visits = selected?.visits || [];
    const assignedSchools = selected?.assignedSchools || supervisor.assignedSchools || [];
    const visited = selected?.visited || new Set(visits.map(visit => visit.school));
    const coverage = selected?.coverage || 0;
    detail.innerHTML = `
      <section class="supervisor-record-v1">
        ${supervisionAprilWarningMarkup()}
        <article class="box">
          <div class="school-record-nav">
            <button class="btn btn-g btn-sm" type="button" data-scroll-target="supervisorRecordProfile">Resumo</button>
            <button class="btn btn-g btn-sm" type="button" data-scroll-target="supervisorRecordCalendar">Calendário</button>
            <button class="btn btn-g btn-sm" type="button" data-scroll-target="supervisorRecordVisited">Visitadas</button>
            <button class="btn btn-g btn-sm" type="button" data-scroll-target="supervisorRecordPending">Faltantes</button>
            <button class="btn btn-g btn-sm" type="button" data-scroll-target="supervisorRecordVisitTable">Registros</button>
          </div>
          <div id="supervisorRecordProfile" class="stack-list">
            <div class="setechub-item"><strong>${supervisor.name}</strong><div class="sync-meta">${supervisor.email || ""} | ${supervisor.phone || ""}</div></div>
          </div>
        </article>
        <div class="setechub-two-col">
          <div class="box">
            <div class="box-head"><div><strong>Meta mensal</strong><small>Se cumpriu a meta de visitas do mês atual.</small></div></div>
            <div class="stack-list"><div class="setechub-command-score"><strong>${coverage}%</strong><span class="diag-pill ${coverage >= 80 ? "pill-ok" : "pill-warn"}">Cobertura</span></div></div>
          </div>
          <div class="box">
            <div class="box-head"><div><strong>Indicadores do supervisor</strong></div></div>
            <div class="setechub-monitor-grid compact-grid">
              ${[
                ["Escolas", assignedSchools.length],
                ["Visitadas", visited.size],
                ["Visitas", visits.length],
                ["Chamados", selected?.openCalls || 0]
              ].map(([label, value]) => `<div class="setechub-monitor-card compact"><div class="sync-meta">${label}</div><strong>${value}</strong></div>`).join("")}
            </div>
          </div>
        </div>
        <div class="box" id="supervisorRecordCalendar">
          <div class="box-head"><div><strong>Calendário de visitas</strong><small>Dias com registro de visita para este supervisor.</small></div></div>
          <div class="supervisor-calendar-grid">${supervisorVisitCalendarMarkup(visits)}</div>
        </div>
        <div class="setechub-two-col">
          <div class="box" id="supervisorRecordVisited">
            <div class="box-head"><div><strong>Escolas visitadas</strong><small>Unidades vinculadas com visita no mês atual.</small></div></div>
            <div class="stack-list">${assignedSchools.filter(school => visited.has(school)).map(school => `<button class="setechub-item setechub-clickable" type="button" data-school-jump="${school}"><strong>${school}</strong><div class="sync-meta">Visitada</div></button>`).join("") || `<div class="sync-empty">Nenhuma escola visitada no mês atual.</div>`}</div>
          </div>
          <div class="box" id="supervisorRecordPending">
            <div class="box-head"><div><strong>Faltam visitas</strong><small>Unidades vinculadas sem visita registrada no mês.</small></div></div>
            <div class="stack-list">${assignedSchools.filter(school => !visited.has(school)).map(school => `<button class="setechub-item setechub-clickable" type="button" data-school-jump="${school}"><strong>${school}</strong><div class="sync-meta">Sem visita registrada</div></button>`).join("") || `<div class="sync-empty">Todas as escolas vinculadas possuem visita.</div>`}</div>
          </div>
        </div>
        <div class="box">
          <div class="box-head"><div><strong>Todas as escolas vinculadas</strong><small>Mapa completo de responsabilidade do supervisor.</small></div></div>
          <div class="supervisor-school-list">${assignedSchools.map(school => `<button class="supervisor-school-row" type="button" data-school-jump="${school}"><span>${school}</span><strong>${visited.has(school) ? "visitada" : "pendente"}</strong></button>`).join("")}</div>
        </div>
        <div class="box" id="supervisorRecordVisitTable">
          <div class="box-head"><div><strong>Historico de visitas</strong><small>Registros deste supervisor em ordem de data.</small></div></div>
          <div class="setechub-table-wrap">${visits.length ? `<table class="setechub-table"><thead><tr><th>Data</th><th>Escola</th><th>Tipo</th></tr></thead><tbody>${visits.slice(0, 80).map(visit => `<tr><td>${visit.date || "--"}</td><td>${visit.school}</td><td>${visit.type || "Visita"}</td></tr>`).join("")}</tbody></table>` : `<div class="sync-empty">Nenhuma visita registrada.</div>`}</div>
        </div>
      </section>
    `;
    detail.querySelectorAll("[data-school-jump]").forEach(button => {
      button.addEventListener("click", () => P.focusSchool?.(button.dataset.schoolJump));
    });
    detail.querySelectorAll("[data-scroll-target]").forEach(button => {
      button.addEventListener("click", () => detail.querySelector(`#${button.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    });
  }

  P.supervisorStatsForMonth = supervisorStatsForMonth;
  P.renderSupervisors = renderSupervisors;
  P.renderSupervisorDetail = renderSupervisorDetail;
})();
