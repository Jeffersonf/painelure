(function () {
  const P = window.PainelURE;
  const ROLE_KEY = "painelure2_role";
  const PREF_KEY = "painelure2_prefs";
  const SOURCE_KEY = "painelure2_source_overrides";

  const ROLE_ACCESS = {
    Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "supervision", "contacts", "calendar", "reports", "profiles", "quality", "admin"],
    "Supervisão": ["dashboard", "schools", "supervision", "contacts", "calendar", "reports"],
    "Técnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "calendar"],
    SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "reports"],
    SEINTEC: ["dashboard", "schools", "network", "inventory", "contacts", "reports"],
    Gabinete: ["dashboard", "schools", "calls", "contacts", "calendar", "reports"],
    Pedagógico: ["dashboard", "schools", "supervision", "contacts", "calendar"],
    Consulta: ["dashboard", "schools", "contacts"]
  };

  function currentRole() {
    return localStorage.getItem(ROLE_KEY) || "Administrador";
  }

  function canAccess(page, role = currentRole()) {
    return (ROLE_ACCESS[role] || ROLE_ACCESS.Consulta).includes(page);
  }

  function applyRole(role = currentRole()) {
    localStorage.setItem(ROLE_KEY, role);
    document.documentElement.dataset.role = role;
    P.$all("[data-page], [data-jump]").forEach(button => {
      const page = button.dataset.page || button.dataset.jump;
      button.hidden = !canAccess(page, role);
    });
    const active = P.$(".page.active");
    const activeId = active?.id?.replace("page-", "");
    if (activeId && !canAccess(activeId, role)) P.setPage("dashboard");
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect) roleSelect.value = role;
    const accountRole = P.$("#accountRoleLabel");
    if (accountRole) accountRole.textContent = role;
    if (typeof applyPrefs === "function") applyPrefs();
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function bindAdminTools() {
    applySourceOverrides();
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect && !roleSelect.dataset.bound) {
      roleSelect.dataset.bound = "true";
      roleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${role}</option>`).join("");
      roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
    }

    P.$("#backupExportBtn")?.addEventListener("click", () => {
      const payload = P.saveAppData();
      downloadJson(`painelure2-backup-${payload.savedAt.slice(0, 10)}.json`, payload);
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = `Backup exportado em ${new Date(payload.savedAt).toLocaleString("pt-BR")}.`;
    });

    P.$("#backupImportInput")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          P.importAppData(JSON.parse(reader.result));
          P.renderApp?.();
          applyRole();
          const meta = P.$("#adminBackupMeta");
          if (meta) meta.textContent = `Backup importado: ${file.name}.`;
        } catch (error) {
          const meta = P.$("#adminBackupMeta");
          if (meta) meta.textContent = `Falha ao importar backup: ${error.message}`;
        }
      };
      reader.readAsText(file);
    });

    P.$("#csvImportInput")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      const target = P.$("#importTargetSelect")?.value;
      if (!file || !target) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rows = P.parseCsv(reader.result);
          const normalizer = P.normalizers?.[target];
          if (!normalizer) throw new Error("Normalizador não encontrado.");
          const appData = { ...P.getAppData() };
          const normalized = normalizer(rows);
          if (target === "network") appData.networkData = normalized;
          else if (target === "supervision") appData.supervisors = normalized;
          else if (target === "inventory" && normalized.some?.(item => item.school)) appData.schoolAssets = normalized;
          else appData[target] = normalized;
          P.setAppData(appData);
          P.saveAppData();
          P.renderApp?.();
          renderSourceStatus();
          const meta = P.$("#adminBackupMeta");
          if (meta) meta.textContent = `${file.name} importado em ${target}.`;
        } catch (error) {
          const meta = P.$("#adminBackupMeta");
          if (meta) meta.textContent = `Falha ao importar CSV: ${error.message}`;
        }
      };
      reader.readAsText(file);
    });

    P.$("#localSaveBtn")?.addEventListener("click", () => {
      const payload = P.saveAppData();
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = `Estado salvo localmente em ${new Date(payload.savedAt).toLocaleString("pt-BR")}.`;
    });

    P.$("#resetLocalBtn")?.addEventListener("click", () => {
      localStorage.removeItem(P.STORAGE_KEY);
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = "Estado local limpo. Recarregue a página para voltar aos dados base.";
    });

    P.$("#savePrefsBtn")?.addEventListener("click", () => {
      savePrefs(readPrefsFromControls());
      const payload = P.saveAppData();
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = `Preferências e base salvas em ${new Date(payload.savedAt).toLocaleString("pt-BR")}.`;
    });

    P.$("#reloadSourcesBtn")?.addEventListener("click", () => {
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = "Atualizando fontes em segundo plano...";
      P.loadConfiguredSources?.()
        .then(() => {
          P.renderApp?.();
          applyRole();
          renderSourceStatus();
          if (meta) meta.textContent = "Fontes atualizadas.";
        })
        .catch(error => {
          if (meta) meta.textContent = `Falha ao atualizar fontes: ${error.message}`;
        });
    });

    const calendarInput = P.$("#calendarSourceInput");
    if (calendarInput) calendarInput.value = loadSourceOverrides().calendar || P.sources?.calendar?.url || "";
    P.$("#saveCalendarSourceBtn")?.addEventListener("click", () => {
      const overrides = loadSourceOverrides();
      overrides.calendar = calendarInput?.value || "";
      saveSourceOverrides(overrides);
      applySourceOverrides();
      renderSourceStatus();
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = "Fonte do calendário salva.";
    });

    P.$("#presentationModeBtn")?.addEventListener("click", () => {
      const active = document.documentElement.dataset.presentation === "true";
      document.documentElement.dataset.presentation = active ? "false" : "true";
      if (!active) P.setPage?.("dashboard");
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = active ? "Modo apresentação desativado." : "Modo apresentação ativado.";
    });

    P.$("#backendPushBtn")?.addEventListener("click", () => {
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = "Enviando estado atual ao backend...";
      P.pushBackendData?.(P.$("#backendTokenInput")?.value || "")
        .then(() => {
          if (meta) meta.textContent = "Backend atualizado com o estado atual.";
        })
        .catch(error => {
          if (meta) meta.textContent = `Falha ao enviar ao backend: ${error.message}`;
        });
    });

    applyRole();
    applyPrefs();
    renderSourceStatus();
  }

  function defaultPrefs() {
    return {
      widgets: { shortcuts: true, metrics: true, operations: true },
      shortcuts: { network: true, inventory: true, ctc: true, calls: true, calendar: true, reports: true }
    };
  }

  function loadPrefs() {
    try {
      return { ...defaultPrefs(), ...(JSON.parse(localStorage.getItem(PREF_KEY) || "null") || {}) };
    } catch (error) {
      return defaultPrefs();
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (error) {}
    applyPrefs(prefs);
  }

  function readPrefsFromControls() {
    const prefs = loadPrefs();
    P.$all("[data-pref-widget]").forEach(input => {
      prefs.widgets[input.dataset.prefWidget] = input.checked;
    });
    P.$all("[data-pref-shortcut]").forEach(input => {
      prefs.shortcuts[input.dataset.prefShortcut] = input.checked;
    });
    return prefs;
  }

  function applyPrefs(prefs = loadPrefs()) {
    P.$all("[data-pref-widget]").forEach(input => {
      input.checked = prefs.widgets?.[input.dataset.prefWidget] !== false;
    });
    P.$all("[data-pref-shortcut]").forEach(input => {
      input.checked = prefs.shortcuts?.[input.dataset.prefShortcut] !== false;
    });
    P.$all("[data-widget-area]").forEach(area => {
      area.hidden = prefs.widgets?.[area.dataset.widgetArea] === false;
    });
    P.$all(".sidebar-shortcuts [data-jump]").forEach(button => {
      button.hidden = prefs.shortcuts?.[button.dataset.jump] === false || (P.canAccess && !P.canAccess(button.dataset.jump));
    });
  }

  function loadSourceOverrides() {
    try {
      return JSON.parse(localStorage.getItem(SOURCE_KEY) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function saveSourceOverrides(overrides) {
    try {
      localStorage.setItem(SOURCE_KEY, JSON.stringify(overrides));
    } catch (error) {}
  }

  function applySourceOverrides() {
    const overrides = loadSourceOverrides();
    Object.entries(overrides).forEach(([key, url]) => {
      if (P.sources?.[key]) P.sources[key].url = url;
    });
  }

  function renderSourceStatus() {
    const host = P.$("#sourceStatusList");
    if (!host) return;
    const statuses = P.sourceStatus?.length
      ? P.sourceStatus
      : Object.entries(P.sources || {}).map(([key, source]) => ({ key, status: source.url ? source.status || "configured" : "pending" }));
    if (P.backendStatus) {
      statuses.unshift({ key: "backend", status: P.backendStatus.ok ? "loaded" : "pending" });
    }
    host.innerHTML = statuses.map(item => {
      const source = P.sources?.[item.key] || {};
      const label = source.label || item.key;
      const ok = item.status === "loaded" || item.status === "official";
      const status = item.status === "skipped" || item.status === "pending" ? "pendente" : item.status;
      return `
        <div class="data-row compact" data-search="${P.searchText([label, status])}">
          <span class="row-icon">↻</span>
          <span><strong>${label}</strong><small>${source.url ? "fonte configurada" : "sem URL configurada"}</small></span>
          <em class="status-pill ${ok ? "ok" : "info"}">${status}</em>
        </div>
      `;
    }).join("");
  }

  P.ROLE_ACCESS = ROLE_ACCESS;
  P.currentRole = currentRole;
  P.canAccess = canAccess;
  P.applyRole = applyRole;
  P.bindAdminTools = bindAdminTools;
  P.renderSourceStatus = renderSourceStatus;
  P.applyPrefs = applyPrefs;
})();
