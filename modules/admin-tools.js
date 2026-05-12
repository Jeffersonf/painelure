(function () {
  const P = window.PainelURE;
  const ROLE_KEY = "painelure2_role";
  const PREF_KEY = "painelure2_prefs";
  const SOURCE_KEY = "painelure2_source_overrides";
  const AVATAR_KEY = "painelure2_avatar";
  const AVATAR_PREFIX = "painelure2_avatar_";
  let backendToken = sessionStorage.getItem("painelure2_backend_token") || "";

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
    return localStorage.getItem(ROLE_KEY) || P.displayUser?.().role || "Administrador";
  }

  function canAccess(page, role = currentRole()) {
    if (["user", "school-detail", "supervisor-detail"].includes(page)) return true;
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
    const userRoleSelect = P.$("#userRoleSelect");
    if (userRoleSelect) userRoleSelect.value = role;
    const activeUserSelect = P.$("#activeUserSelect");
    const activeUser = P.activeUser?.();
    if (activeUserSelect && activeUser) activeUserSelect.value = activeUser.id;
    const accountRole = P.$("#accountRoleLabel");
    if (accountRole) accountRole.textContent = role;
    const display = P.displayUser?.() || { name: "Jefferson", role };
    const accountName = P.$("#accountNameLabel");
    if (accountName) accountName.textContent = display.shortName || display.name;
    const adminAccountLine = P.$("#adminAccountLine");
    if (adminAccountLine) adminAccountLine.textContent = `${display.shortName || display.name} • ${role}`;
    P.renderUser?.(P.getAppData?.() || {});
    if (typeof applyPrefs === "function") applyPrefs();
  }

  function closeAccountMenu() {
    P.$("#accountPop")?.classList.remove("open");
    P.$("#accountBtn")?.setAttribute("aria-expanded", "false");
  }

  function toggleAccountMenu() {
    const pop = P.$("#accountPop");
    const btn = P.$("#accountBtn");
    if (!pop || !btn) return;
    const open = !pop.classList.contains("open");
    pop.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }

  function applyUserAvatar() {
    const display = P.displayUser?.() || { name: "Jefferson", photo: "" };
    const activeUser = P.activeUser?.();
    const image = localStorage.getItem(`${AVATAR_PREFIX}${activeUser?.id || "local"}`) || display.photo || "";
    P.$all(".user-avatar").forEach(avatar => {
      avatar.classList.toggle("has-photo", Boolean(image));
      avatar.style.backgroundImage = image ? `url("${image}")` : "";
      avatar.textContent = P.userInitials?.(display.name) || "JE";
    });
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

  async function ensureBackendToken() {
    if (backendToken) return backendToken;
    const key = window.prompt("Chave administrativa da API, se houver:");
    if (!key) return "";
    const result = await P.loginBackend?.({ key });
    backendToken = result?.token || "";
    if (backendToken) sessionStorage.setItem("painelure2_backend_token", backendToken);
    return backendToken;
  }

  function setAdminMeta(message) {
    const meta = P.$("#adminBackupMeta");
    if (meta) meta.textContent = message;
  }

  function bindAdminTools() {
    applySourceOverrides();
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect && !roleSelect.dataset.bound) {
      roleSelect.dataset.bound = "true";
      roleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${role}</option>`).join("");
      roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
    }
    const userRoleSelect = P.$("#userRoleSelect");
    if (userRoleSelect && !userRoleSelect.dataset.bound) {
      userRoleSelect.dataset.bound = "true";
      userRoleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${role}</option>`).join("");
      userRoleSelect.addEventListener("change", () => applyRole(userRoleSelect.value));
    }
    const activeUserSelect = P.$("#activeUserSelect");
    if (activeUserSelect && !activeUserSelect.dataset.bound) {
      activeUserSelect.dataset.bound = "true";
      activeUserSelect.innerHTML = (P.users?.() || []).map(user => {
        const display = P.displayUser?.(user) || user;
        return `<option value="${user.id}">${display.shortName || display.name} • ${user.role}</option>`;
      }).join("");
      activeUserSelect.addEventListener("change", () => {
        const user = P.setActiveUser?.(activeUserSelect.value);
        if (user) {
          localStorage.setItem(ROLE_KEY, user.role);
          applyRole(user.role);
          applyUserAvatar();
          P.renderPage?.("user", { force: true });
        }
      });
    }

    P.$("#avatarInput")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const user = P.activeUser?.();
        localStorage.setItem(`${AVATAR_PREFIX}${user?.id || "local"}`, reader.result);
        if (user) {
          P.updateLinkedContactPhoto?.(user.id, reader.result);
          P.renderPage?.("contacts", { force: true });
        }
        applyUserAvatar();
      };
      reader.readAsDataURL(file);
    });

    P.$("#avatarRemoveBtn")?.addEventListener("click", () => {
      const user = P.activeUser?.();
      localStorage.removeItem(`${AVATAR_PREFIX}${user?.id || "local"}`);
      localStorage.removeItem(AVATAR_KEY);
      if (user) {
        P.updateLinkedContactPhoto?.(user.id, "");
        P.renderPage?.("contacts", { force: true });
      }
      const input = P.$("#avatarInput");
      if (input) input.value = "";
      applyUserAvatar();
    });

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

    P.$("#backendHealthBtn")?.addEventListener("click", () => {
      refreshBackendPanel();
    });

    P.$("#backendPullBtn")?.addEventListener("click", () => {
      setAdminMeta("Carregando estado online...");
      P.loadBackendData?.()
        .then(payload => {
          if (payload?.data?.appData) {
            P.renderApp?.();
            applyRole();
            setAdminMeta("Estado online carregado.");
          } else {
            setAdminMeta("API respondeu, mas ainda não há estado online salvo.");
          }
          refreshBackendPanel();
        })
        .catch(error => setAdminMeta(`Falha ao carregar estado online: ${error.message}`));
    });

    P.$("#backendPushBtn")?.addEventListener("click", async () => {
      try {
        setAdminMeta("Enviando estado atual para a API...");
        const token = await ensureBackendToken();
        await P.pushBackendData?.(token);
        setAdminMeta("Estado atual enviado para a API.");
        refreshBackendPanel();
      } catch (error) {
        setAdminMeta(`Falha ao enviar estado online: ${error.message}`);
      }
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

    applyRole();
    applyUserAvatar();
    applyPrefs();
    renderSourceStatus();
    refreshBackendPanel();
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

  async function refreshBackendPanel() {
    const statusLine = P.$("#backendStatusLine");
    const snapshotHost = P.$("#backendSnapshotList");
    const auditHost = P.$("#backendAuditList");

    try {
      const health = await P.loadBackendHealth?.();
      const storage = health?.storage || {};
      if (statusLine) {
        statusLine.textContent = `${storage.mode || "API"} • ${storage.ready ? "pronta" : "indisponível"}${storage.updatedAt ? ` • ${new Date(storage.updatedAt).toLocaleString("pt-BR")}` : ""}`;
      }
    } catch (error) {
      if (statusLine) statusLine.textContent = `API indisponível: ${error.message}`;
      if (snapshotHost) snapshotHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Snapshots aparecem quando a API estiver acessível.</small></div></div>`;
      if (auditHost) auditHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Auditoria aparece quando a API estiver acessível.</small></div></div>`;
      return;
    }

    try {
      const token = backendToken || "";
      const snapshots = await P.loadBackendSnapshots?.(token, 6);
      const items = snapshots?.snapshots || [];
      if (snapshotHost) {
        snapshotHost.innerHTML = items.length ? items.map(item => `
          <div class="settings-row compact" data-search="${P.searchText([item.source, item.createdAt])}">
            <div><strong>${item.source || "snapshot"}</strong><small>${item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : item.id}</small></div>
            <span class="status-pill info">histórico</span>
          </div>
        `).join("") : `<div class="settings-row compact"><div><strong>Nenhum snapshot</strong><small>O primeiro aparece após salvar estado online.</small></div></div>`;
      }
    } catch (error) {
      if (snapshotHost) snapshotHost.innerHTML = `<div class="settings-row compact"><div><strong>Snapshots protegidos</strong><small>Use Enviar ou configure a chave para listar.</small></div></div>`;
    }

    try {
      const token = backendToken || "";
      const audit = await P.loadBackendAudit?.(token, 6);
      const events = audit?.events || [];
      if (auditHost) {
        auditHost.innerHTML = events.length ? events.map(event => `
          <div class="settings-row compact" data-search="${P.searchText([event.action, event.entity, event.detail, event.actorName])}">
            <div><strong>${event.action} • ${event.entity}</strong><small>${event.detail || event.actorName || event.createdAt}</small></div>
            <span class="status-pill info">log</span>
          </div>
        `).join("") : `<div class="settings-row compact"><div><strong>Nenhum evento</strong><small>Logs aparecem após ações administrativas online.</small></div></div>`;
      }
    } catch (error) {
      if (auditHost) auditHost.innerHTML = `<div class="settings-row compact"><div><strong>Auditoria protegida</strong><small>Use a chave administrativa para listar eventos.</small></div></div>`;
    }
  }

  P.ROLE_ACCESS = ROLE_ACCESS;
  P.currentRole = currentRole;
  P.canAccess = canAccess;
  P.applyRole = applyRole;
  P.closeAccountMenu = closeAccountMenu;
  P.toggleAccountMenu = toggleAccountMenu;
  P.applyUserAvatar = applyUserAvatar;
  P.bindAdminTools = bindAdminTools;
  P.renderSourceStatus = renderSourceStatus;
  P.refreshBackendPanel = refreshBackendPanel;
  P.applyPrefs = applyPrefs;
})();
