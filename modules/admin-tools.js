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
    return P.onlineUser?.()?.role || localStorage.getItem(ROLE_KEY) || P.displayUser?.().role || "Administrador";
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
    const activeUser = P.onlineUser?.() || P.activeUser?.();
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

  function setAuthenticated(authenticated) {
    document.documentElement.classList.remove("auth-pending");
    document.body.classList.toggle("is-authenticated", Boolean(authenticated));
  }

  function showLoginStatus(message) {
    const status = P.$("#loginStatus");
    if (status) status.textContent = message;
  }

  function friendlyAuthError(error) {
    const message = String(error?.message || error || "");
    if (/HTTP 401|invalido|invalid/i.test(message)) return "Nome ou PIN incorretos.";
    if (/HTTP 405|method/i.test(message)) return "API nao encontrada nesta pagina. Atualize e tente novamente.";
    if (/aborted|network|failed to fetch/i.test(message)) return "Nao foi possivel conectar ao servidor.";
    return message || "Nao foi possivel entrar.";
  }

  function showPinChange(required = true) {
    const loginForm = P.$("#loginForm");
    const pinForm = P.$("#pinChangeForm");
    if (loginForm) loginForm.hidden = required;
    if (pinForm) pinForm.hidden = !required;
    setAuthenticated(!required);
    window.setTimeout(() => {
      const target = required ? P.$("#newPinInput") : P.$("#loginUserInput");
      target?.focus?.();
    }, 0);
  }

  async function logoutOnline() {
    if (backendToken) await P.logoutBackend?.(backendToken).catch(() => {});
    backendToken = "";
    sessionStorage.removeItem("painelure2_backend_token");
    P.clearOnlineUser?.();
    const localUser = P.activeUser?.();
    applyRole(localUser?.role || "Administrador");
    applyUserAvatar();
    P.renderPage?.("user", { force: true });
    setAuthenticated(false);
    if (P.$("#loginForm")) P.$("#loginForm").hidden = false;
    if (P.$("#pinChangeForm")) P.$("#pinChangeForm").hidden = true;
    showLoginStatus("Sessao encerrada.");
    const userInput = P.$("#loginUserInput");
    const pinInput = P.$("#loginPinInput");
    if (userInput) userInput.value = "";
    if (pinInput) pinInput.value = "";
    window.setTimeout(() => userInput?.focus?.(), 0);
    P.closeAccountMenu?.();
  }

  function activateOnlineUser(token, user) {
    backendToken = token;
    sessionStorage.setItem("painelure2_backend_token", backendToken);
    P.setOnlineUser?.(user);
    localStorage.setItem(ROLE_KEY, user.role || "Consulta");
    applyRole(user.role || "Consulta");
    applyUserAvatar();
    P.renderPage?.("user", { force: true });
  }

  async function submitLogin(username, password) {
    showLoginStatus("");
    if (!username || !password) throw new Error("Informe nome e PIN.");
    const result = await P.loginBackend?.({ username, password });
    if (!result?.token || !result?.user) throw new Error("Login nao retornou usuario.");
    activateOnlineUser(result.token, result.user);
    if (result.user.preferences?.forcePinChange) {
      showPinChange(true);
      showLoginStatus("Troque o PIN inicial para continuar.");
      return result.user;
    }
    showPinChange(false);
    return result.user;
  }

  async function submitPinChange() {
    const pin = P.$("#newPinInput")?.value || "";
    const confirm = P.$("#confirmPinInput")?.value || "";
    showLoginStatus("");
    if (pin.length < 4) throw new Error("Use um PIN com pelo menos 4 digitos.");
    if (pin === "1234") throw new Error("Escolha um PIN diferente do inicial.");
    if (pin !== confirm) throw new Error("Os PINs nao conferem.");
    const user = P.onlineUser?.();
    if (!backendToken || !user) throw new Error("Sessao online nao encontrada.");
    const preferences = {
      ...(user.preferences || {}),
      forcePinChange: false,
      pinChangedAt: new Date().toISOString()
    };
    const payload = await P.updateBackendUser?.(backendToken, { password: pin, preferences });
    const nextUser = payload?.user || { ...user, preferences };
    P.setOnlineUser?.(nextUser);
    P.$("#newPinInput").value = "";
    P.$("#confirmPinInput").value = "";
    showPinChange(false);
    showLoginStatus("");
    applyRole(nextUser.role || "Consulta");
    applyUserAvatar();
    P.renderApp?.();
    return nextUser;
  }

  async function restoreBackendSession() {
    if (!backendToken || !P.loadBackendUser) {
      document.documentElement.classList.remove("auth-pending");
      return null;
    }
    try {
      const payload = await P.loadBackendUser(backendToken);
      const user = payload?.user;
      if (user) {
        P.setOnlineUser?.(user);
        localStorage.setItem(ROLE_KEY, user.role || "Consulta");
        applyRole(user.role || "Consulta");
        applyUserAvatar();
        P.renderPage?.("user", { force: true });
        showPinChange(Boolean(user.preferences?.forcePinChange));
      }
      return user || null;
    } catch (error) {
      backendToken = "";
      sessionStorage.removeItem("painelure2_backend_token");
      P.clearOnlineUser?.();
      applyRole(P.activeUser?.()?.role || "Administrador");
      setAuthenticated(false);
      return null;
    } finally {
      document.documentElement.classList.remove("auth-pending");
    }
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
    const newUserRoleSelect = P.$("#newUserRoleSelect");
    if (newUserRoleSelect && !newUserRoleSelect.dataset.bound) {
      newUserRoleSelect.dataset.bound = "true";
      newUserRoleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${role}</option>`).join("");
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

    P.$("#loginSubmitBtn")?.addEventListener("click", async () => {
      try {
        const username = P.$("#loginUserInput")?.value.trim();
        const pin = P.$("#loginPinInput")?.value || "";
        await submitLogin(username, pin);
        const pinInput = P.$("#loginPinInput");
        if (pinInput) pinInput.value = "";
      } catch (error) {
        showLoginStatus(friendlyAuthError(error));
      }
    });

    ["#loginUserInput", "#loginPinInput"].forEach(selector => {
      P.$(selector)?.addEventListener("keydown", event => {
        if (event.key === "Enter") P.$("#loginSubmitBtn")?.click();
      });
    });

    P.$("#pinChangeSubmitBtn")?.addEventListener("click", async () => {
      try {
        await submitPinChange();
      } catch (error) {
        showLoginStatus(friendlyAuthError(error));
      }
    });

    ["#newPinInput", "#confirmPinInput"].forEach(selector => {
      P.$(selector)?.addEventListener("keydown", event => {
        if (event.key === "Enter") P.$("#pinChangeSubmitBtn")?.click();
      });
    });

    P.$("#onlineLoginBtn")?.addEventListener("click", async () => {
      const username = P.$("#onlineLoginInput")?.value.trim();
      const password = P.$("#onlinePasswordInput")?.value || "";
      const summary = P.$("#onlineSessionSummary");
      try {
        const user = await submitLogin(username, password);
        const passwordInput = P.$("#onlinePasswordInput");
        if (passwordInput) passwordInput.value = "";
        if (summary) summary.textContent = `${user.username || user.name} conectado ao backend.`;
      } catch (error) {
        if (summary) summary.textContent = `Falha no login online: ${error.message}`;
      }
    });

    P.$("#onlineLogoutBtn")?.addEventListener("click", logoutOnline);
    P.$("#sidebarLogoutBtn")?.addEventListener("click", logoutOnline);

    P.$("#restoreAdminBtn")?.addEventListener("click", async () => {
      if (backendToken) await P.logoutBackend?.(backendToken).catch(() => {});
      backendToken = "";
      sessionStorage.removeItem("painelure2_backend_token");
      P.clearOnlineUser?.();
      const adminUser = (P.users?.() || []).find(user => user.role === "Administrador" && user.active !== false);
      if (adminUser) P.setActiveUser?.(adminUser.id);
      localStorage.setItem(ROLE_KEY, "Administrador");
      applyRole("Administrador");
      applyUserAvatar();
      P.renderPage?.("user", { force: true });
    });

    P.$("#avatarInput")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const user = P.onlineUser?.() || P.activeUser?.();
        localStorage.setItem(`${AVATAR_PREFIX}${user?.id || "local"}`, reader.result);
        if (user) {
          P.updateLinkedContactPhoto?.(user.id, reader.result);
          if (P.onlineUser?.() && backendToken) P.updateBackendUser?.(backendToken, { avatar: reader.result }).catch(() => {});
          P.renderPage?.("contacts", { force: true });
        }
        applyUserAvatar();
      };
      reader.readAsDataURL(file);
    });

    P.$("#avatarRemoveBtn")?.addEventListener("click", () => {
      const user = P.onlineUser?.() || P.activeUser?.();
      localStorage.removeItem(`${AVATAR_PREFIX}${user?.id || "local"}`);
      localStorage.removeItem(AVATAR_KEY);
      if (user) {
        P.updateLinkedContactPhoto?.(user.id, "");
        if (P.onlineUser?.() && backendToken) P.updateBackendUser?.(backendToken, { avatar: "" }).catch(() => {});
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

    P.$("#createBackendUserBtn")?.addEventListener("click", async () => {
      try {
        const name = P.$("#newUserNameInput")?.value.trim();
        const username = P.$("#newUserLoginInput")?.value.trim();
        const role = P.$("#newUserRoleSelect")?.value || "Consulta";
        const password = P.$("#newUserPasswordInput")?.value || "";
        if (!name || !username || !password) throw new Error("Preencha nome, login e senha inicial.");
        const token = await ensureBackendToken();
        await P.createBackendUser?.(token, { name, username, role, password });
        ["#newUserNameInput", "#newUserLoginInput", "#newUserPasswordInput"].forEach(selector => {
          const input = P.$(selector);
          if (input) input.value = "";
        });
        setAdminMeta("Usuário online criado.");
        refreshBackendPanel();
      } catch (error) {
        setAdminMeta(`Falha ao criar usuário online: ${error.message}`);
      }
    });

    const backendUserList = P.$("#backendUserList");
    if (backendUserList && !backendUserList.dataset.bound) {
      backendUserList.dataset.bound = "true";
      backendUserList.addEventListener("click", async event => {
        const resetButton = event.target.closest("[data-reset-backend-pin]");
        if (resetButton) {
          const row = resetButton.closest("[data-user-id]");
          const user = (P.backendUsersCache || []).find(item => item.id === row?.dataset.userId);
          if (!row || !user) return;
          try {
            const token = await ensureBackendToken();
            await P.updateBackendUserById?.(token, row.dataset.userId, {
              password: "1234",
              preferences: {
                ...(user.preferences || {}),
                forcePinChange: true,
                initialPinIssuedAt: new Date().toISOString()
              }
            });
            setAdminMeta(`PIN de ${user.name} resetado para 1234.`);
            refreshBackendPanel();
          } catch (error) {
            setAdminMeta(`Falha ao resetar PIN: ${error.message}`);
          }
          return;
        }

        const button = event.target.closest("[data-save-backend-user]");
        if (!button) return;
        const row = button.closest("[data-user-id]");
        if (!row) return;
        try {
          const token = await ensureBackendToken();
          const role = row.querySelector("[data-user-role]")?.value || "Consulta";
          const contactId = row.querySelector("[data-user-contact]")?.value || "";
          await P.updateBackendUserById?.(token, row.dataset.userId, { role, contactId });
          setAdminMeta("Usuário online atualizado.");
          refreshBackendPanel();
        } catch (error) {
          setAdminMeta(`Falha ao atualizar usuário online: ${error.message}`);
        }
      });
    }

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

    P.$("#saveSourceOverridesBtn")?.addEventListener("click", () => {
      const overrides = readSourceEditor();
      saveSourceOverrides(overrides);
      applySourceOverrides();
      renderSourceEditor();
      renderSourceStatus();
      setAdminMeta("Fontes oficiais salvas localmente.");
    });

    P.$("#saveBackendSourcesBtn")?.addEventListener("click", async () => {
      try {
        const overrides = readSourceEditor();
        saveSourceOverrides(overrides);
        applySourceOverrides();
        const token = await ensureBackendToken();
        await P.saveBackendSources?.(token, P.sources || {});
        renderSourceEditor();
        renderSourceStatus();
        refreshBackendPanel();
        setAdminMeta("Fontes oficiais salvas no backend.");
      } catch (error) {
        setAdminMeta(`Falha ao salvar fontes online: ${error.message}`);
      }
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
    renderSourceEditor();
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

  function renderSourceEditor() {
    const host = P.$("#sourceEditorList");
    if (!host) return;
    const overrides = loadSourceOverrides();
    host.innerHTML = Object.entries(P.sources || {}).map(([key, source]) => {
      const value = overrides[key] ?? source.url ?? "";
      return `
        <div class="settings-row source-editor-row" data-search="${P.searchText([key, source.label, value])}">
          <div><strong>${source.label || key}</strong><small>${source.status || "pending"} • ${source.type || "csv"}</small></div>
          <input type="url" data-source-url="${key}" value="${value}" placeholder="https://.../pub?output=csv">
        </div>
      `;
    }).join("");
  }

  function readSourceEditor() {
    const overrides = {};
    P.$all("[data-source-url]").forEach(input => {
      overrides[input.dataset.sourceUrl] = input.value.trim();
    });
    return overrides;
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
    const userHost = P.$("#backendUserList");

    try {
      const health = await P.loadBackendHealth?.();
      const storage = health?.storage || {};
      if (statusLine) {
        statusLine.textContent = `${storage.mode || "API"} • ${storage.ready ? "pronta" : "indisponível"}${storage.updatedAt ? ` • ${new Date(storage.updatedAt).toLocaleString("pt-BR")}` : ""}`;
      }
      const sources = await P.loadBackendSources?.();
      if (sources?.sources?.length) {
        sources.sources.forEach(item => {
          if (!P.sources?.[item.key]) return;
          P.sources[item.key] = {
            ...P.sources[item.key],
            label: item.label || P.sources[item.key].label,
            type: item.type || P.sources[item.key].type,
            url: item.url || P.sources[item.key].url,
            status: item.status || P.sources[item.key].status,
            metadata: item.metadata || P.sources[item.key].metadata
          };
        });
        renderSourceEditor();
        renderSourceStatus();
      }
    } catch (error) {
      if (statusLine) statusLine.textContent = `API indisponível: ${error.message}`;
      if (snapshotHost) snapshotHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Snapshots aparecem quando a API estiver acessível.</small></div></div>`;
      if (auditHost) auditHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Auditoria aparece quando a API estiver acessível.</small></div></div>`;
      if (userHost) userHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Usuários online aparecem quando a API estiver acessível.</small></div></div>`;
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

    try {
      const token = backendToken || "";
      const payload = await P.loadBackendUsers?.(token);
      const users = payload?.users || [];
      P.backendUsersCache = users;
      const roleOptions = Object.keys(ROLE_ACCESS);
      const contacts = P.getAppData().contacts || [];
      if (userHost) {
        userHost.innerHTML = users.length ? users.map(user => {
          const pinPending = Boolean(user.preferences?.forcePinChange);
          const lastLogin = user.preferences?.lastLoginAt ? new Date(user.preferences.lastLoginAt).toLocaleString("pt-BR") : "sem login registrado";
          return `
          <div class="settings-row compact backend-user-row" data-user-id="${user.id}" data-search="${P.searchText([user.name, user.username, user.role, lastLogin])}">
            <div><strong>${user.name}</strong><small>${user.username} • ${user.role} • ${lastLogin}</small></div>
            <div class="settings-actions backend-user-actions">
              <span class="status-pill ${pinPending ? "warn" : "ok"}">${pinPending ? "PIN inicial" : "PIN alterado"}</span>
              <select data-user-role>
                ${roleOptions.map(role => `<option value="${role}"${role === user.role ? " selected" : ""}>${role}</option>`).join("")}
              </select>
              <select data-user-contact>
                <option value="">Sem contato</option>
                ${contacts.map(contact => `<option value="${contact.id}"${contact.id === user.contactId ? " selected" : ""}>${contact.name}</option>`).join("")}
              </select>
              <button class="ghost-btn" type="button" data-reset-backend-pin>PIN 1234</button>
              <button class="ghost-btn" type="button" data-save-backend-user>Salvar</button>
            </div>
          </div>
        `;
        }).join("") : `<div class="settings-row compact"><div><strong>Nenhum usuário online</strong><small>Crie o primeiro usuário acima ou configure bootstrap no .env.</small></div></div>`;
      }
    } catch (error) {
      if (userHost) userHost.innerHTML = `<div class="settings-row compact"><div><strong>Usuários protegidos</strong><small>Use a chave administrativa para listar usuários.</small></div></div>`;
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
  P.restoreBackendSession = restoreBackendSession;
  P.renderSourceStatus = renderSourceStatus;
  P.renderSourceEditor = renderSourceEditor;
  P.refreshBackendPanel = refreshBackendPanel;
  P.applyPrefs = applyPrefs;
})();
