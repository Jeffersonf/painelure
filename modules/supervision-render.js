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

  function indicatorMeta(parts) {
    const pct = progressPct(parts);
    if (pct >= 100) return { label: "VERDE", tone: "ok" };
    if (pct > 0) return { label: "AMARELO", tone: "warn" };
    return { label: "VERMELHO", tone: "danger" };
  }

  function currentWeekNumber(stats) {
    const visits = stats.flatMap(item => item.visits || []);
    const dates = visits.map(visit => supervisorVisitDate(visit.date)).filter(Boolean);
    if (dates.length) {
      const latest = new Date(Math.max(...dates.map(date => date.getTime())));
      return Math.max(1, Math.ceil(latest.getDate() / 7));
    }
    return Math.max(1, Math.ceil((new Date()).getDate() / 7));
  }

  function supervisorSourceFooter() {
    const selected = P.selectedMonthLabel?.() || "mes selecionado";
    const source = P.sources?.supervision?.label || "planilha oficial de supervisao";
    const updated = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(",", "");
    return `
      <div class="supervisor-sheet-foot">
        <span>Fonte: ${source.toLowerCase()} | Mes exibido: ${selected}</span>
        <span>Atualizada em ${updated}</span>
      </div>
    `;
  }

  function supervisorVisitRowsForMonth(supervisor) {
    const selected = P.selectedMonthKey?.() || "";
    const records = supervisor.visitRecords || [];
    if (records.length) return records.filter(visit => supervisorVisitMonthKey(visit) === selected);
    const fallbackCount = progressDone(supervisor.month);
    const schools = supervisor.assignedSchools || [];
    return Array.from({ length: fallbackCount }, (_, index) => ({
      date: "",
      school: schools[index % Math.max(1, schools.length)] || "Escola nao informada",
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

  function supervisionAprilWarningMarkup() {
    if ((P.selectedMonthKey?.() || "") !== "2026-04") return "";
    return `
      <article class="supervisor-april-warning" role="note">
        <strong>Aviso importante sobre abril</strong>
        <p>A planilha de abril foi usada apenas como teste de importacao e validacao do painel. Abril nao sera considerado para acompanhamento oficial; a partir de maio a supervisao usa a planilha oficial nova.</p>
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
            <div class="supervisor-sheet-table-wrap">
              <table class="supervisor-sheet-table">
                <thead>
                  <tr>
                    <th>Supervisor</th>
                    <th>Escolas</th>
                    <th>Meta semanal</th>
                    <th>Meta mensal</th>
                    <th>Semana</th>
                    <th>Indicador semana</th>
                    <th>Indicador mes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.map((item, index) => {
                    const week = progressParts(item.supervisor.week, 3);
                    const month = progressParts(item.supervisor.month, Math.max(3, item.assignedSchools.length * 3));
                    const weekIndicator = indicatorMeta(week);
                    const monthIndicator = indicatorMeta(month);
                    return `
                    <tr class="supervisor-sheet-row" data-supervisor-index="${index}" data-status="${monthIndicator.tone}" data-search="${P.searchText([item.supervisor.name, item.supervisor.email, item.supervisor.phone])}">
                      <td><strong>${item.supervisor.name}</strong></td>
                      <td>${item.assignedSchools.length}</td>
                      <td class="supervisor-goal-cell"><strong>${week.done}/${week.total}</strong><i class="supervisor-sheet-bar"><span style="width:${progressPct(week)}%"></span></i></td>
                      <td class="supervisor-goal-cell"><strong>${month.done}/${month.total}</strong><i class="supervisor-sheet-bar"><span style="width:${progressPct(month)}%"></span></i></td>
                      <td>${currentWeek}</td>
                      <td><span class="diag-pill pill-${weekIndicator.tone}">${weekIndicator.label}</span></td>
                      <td><span class="diag-pill pill-${monthIndicator.tone}">${monthIndicator.label}</span></td>
                      <td><button class="btn btn-g btn-sm supervisor-open-btn" type="button">Abrir</button></td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
            ${supervisorSourceFooter()}
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
        renderSupervisors(P.scopedData?.(P.getAppData())?.supervisors || P.getAppData().supervisors);
      } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = original || "Atualizar planilha";
      }
    });
    host.querySelector("#supervisorFullscreenBtn")?.addEventListener("click", () => {
      P.$("#painelSupervisor")?.requestFullscreen?.();
    });
    host.querySelectorAll("[data-supervisor-index]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.supervisorIndex);
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
            <button class="btn btn-g btn-sm" type="button" data-scroll-target="supervisorRecordCalendar">Calendario</button>
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
            <div class="box-head"><div><strong>Meta mensal</strong><small>Se cumpriu a meta de visitas do mes atual.</small></div></div>
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
          <div class="box-head"><div><strong>Calendario de visitas</strong><small>Dias com registro de visita para este supervisor.</small></div></div>
          <div class="supervisor-calendar-grid">${supervisorVisitCalendarMarkup(visits)}</div>
        </div>
        <div class="setechub-two-col">
          <div class="box" id="supervisorRecordVisited">
            <div class="box-head"><div><strong>Escolas visitadas</strong><small>Unidades vinculadas com visita no mes atual.</small></div></div>
            <div class="stack-list">${assignedSchools.filter(school => visited.has(school)).map(school => `<button class="setechub-item setechub-clickable" type="button" data-school-jump="${school}"><strong>${school}</strong><div class="sync-meta">Visitada</div></button>`).join("") || `<div class="sync-empty">Nenhuma escola visitada no mes atual.</div>`}</div>
          </div>
          <div class="box" id="supervisorRecordPending">
            <div class="box-head"><div><strong>Faltam visitas</strong><small>Unidades vinculadas sem visita registrada no mes.</small></div></div>
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
