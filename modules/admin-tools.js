(function () {
  const P = window.PainelURE;
  const ROLE_KEY = "painelure2_role";
  const PREF_KEY = "painelure2_prefs";
  const SOURCE_KEY = "painelure2_source_overrides";
  const AVATAR_KEY = "painelure2_avatar";
  const AVATAR_PREFIX = "painelure2_avatar_";
  const ADMIN_COLLAPSE_KEY = "painelure2_admin_sections";
  const TOKEN_KEY = "painelure2_backend_token";
  let backendToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";

  const ROLE_ACCESS = {
    Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "satisfaction", "reports", "profiles", "quality", "admin"],
    Supervisao: ["dashboard", "schools", "supervision", "contacts", "calendar", "satisfaction"],
    "Tecnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar", "satisfaction"],
    SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar", "satisfaction"],
    SEINTEC: ["dashboard", "schools", "network", "inventory", "contacts", "cars", "calendar", "satisfaction"],
    CTC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar", "satisfaction"],
    Gabinete: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "satisfaction"],
    Dirigente: ["dashboard", "schools", "calls", "contacts", "cars", "calendar", "satisfaction"],
    SEOM: ["dashboard", "schools", "contacts", "cars", "calendar", "satisfaction"],
    SEFISC: ["dashboard", "cars", "calendar", "satisfaction"],
    SEGRE: ["dashboard", "cars", "calendar", "satisfaction"],
    SEVESC: ["dashboard", "cars", "calendar", "satisfaction"],
    SEMAT: ["dashboard", "cars", "calendar", "satisfaction"],
    SEPES: ["dashboard", "cars", "calendar", "satisfaction"],
    SEFREP: ["dashboard", "cars", "calendar", "satisfaction"],
    SEAPE: ["dashboard", "cars", "calendar", "satisfaction"],
    SEAFIM: ["dashboard", "cars", "calendar", "satisfaction"],
    SEFIN: ["dashboard", "cars", "calendar", "satisfaction"],
    SECOMSE: ["dashboard", "cars", "calendar", "satisfaction"],
    Carros: ["dashboard", "cars", "calendar", "satisfaction"],
    Pedagogico: ["dashboard", "schools", "supervision", "contacts", "calendar", "satisfaction"],
    Consulta: ["dashboard", "schools", "contacts", "calendar", "satisfaction"]
  };
  const ADMIN_PAGE_CHOICES = ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "satisfaction", "reports", "profiles", "quality", "admin"];

  function currentRole() {
    return P.onlineUser?.()?.role || localStorage.getItem(ROLE_KEY) || P.displayUser?.().role || "Administrador";
  }

  function accessForRole(role) {
    if (P.roleAccess) return P.roleAccess(role);
    const exact = ROLE_ACCESS[role];
    if (exact) return exact;
    const target = P.normalize ? P.normalize(role) : String(role || "").toLowerCase().trim();
    const key = Object.keys(ROLE_ACCESS).find(item => (P.normalize ? P.normalize(item) : item.toLowerCase()) === target);
    return ROLE_ACCESS[key] || ROLE_ACCESS.Consulta;
  }

  function canAccess(page, role = currentRole()) {
    if (["user", "school-detail", "supervisor-detail"].includes(page)) return true;
    return accessForRole(role).includes(page);
  }

  function pageLabel(page) {
    return P.pageMeta?.(page)?.label || page;
  }

  function allowedPageLabels(role = currentRole()) {
    return accessForRole(role)
      .map(page => pageLabel(page))
      .filter(Boolean)
      .join(", ");
  }

  function adminRoleOptions() {
    return Object.keys(P.DEFAULT_ACCESS || ROLE_ACCESS);
  }

  function adminPageChoices() {
    return ADMIN_PAGE_CHOICES.filter(page => P.PAGE_META?.[page]);
  }

  function userOptionLabel(user) {
    const display = P.displayUser?.(user) || user || {};
    const sector = user?.sector || user?.setor || user?.category || user?.categoria || display.sector || "";
    return [
      display.shortName || display.name || user?.name || user?.login || "Usuario",
      sector,
      P.roleLabel?.(user?.role) || user?.role || "Consulta"
    ].filter(Boolean).join(" • ");
  }

  function refreshActiveUserSelect() {
    const activeUserSelect = P.$("#activeUserSelect");
    if (!activeUserSelect) return;
    const currentValue = activeUserSelect.value || P.activeUser?.()?.id || "";
    activeUserSelect.innerHTML = (P.users?.() || []).map(user => `<option value="${user.id}">${userOptionLabel(user)}</option>`).join("");
    if (currentValue && [...activeUserSelect.options].some(option => option.value === currentValue)) {
      activeUserSelect.value = currentValue;
    }
  }

  function firstAllowedPage(role = currentRole()) {
    const pages = accessForRole(role).filter(page => !["profiles", "quality", "admin"].includes(page));
    return pages[0] || "dashboard";
  }

  function applyAccessState(role = currentRole()) {
    P.$all("[data-page], [data-jump]").forEach(button => {
      const page = button.dataset.page || button.dataset.jump;
      const denied = !canAccess(page, role);
      button.classList.toggle("access-disabled", denied);
      button.setAttribute("aria-disabled", denied ? "true" : "false");
      if (denied) {
        button.title = `Acesso negado a ${pageLabel(page)}. Disponiveis: ${allowedPageLabels(role)}`;
      } else if (button.title?.startsWith("Acesso negado")) {
        button.removeAttribute("title");
      }
    });
  }

  function applyRole(role = currentRole()) {
    localStorage.setItem(ROLE_KEY, role);
    document.documentElement.dataset.role = role;
    applyAccessState(role);
    const active = P.$(".page.active");
    const activeId = active?.id?.replace("page-", "");
    if (activeId && !canAccess(activeId, role)) P.setPage(firstAllowedPage(role));
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect) roleSelect.value = role;
    const userRoleSelect = P.$("#userRoleSelect");
    if (userRoleSelect) userRoleSelect.value = role;
    const activeUserSelect = P.$("#activeUserSelect");
    const activeUser = P.activeUser?.();
    if (activeUserSelect && activeUser) activeUserSelect.value = activeUser.id;
    const accountRole = P.$("#accountRoleLabel");
    if (accountRole) accountRole.textContent = P.roleLabel?.(role) || role;
    const display = P.displayUser?.() || { name: "Jefferson", role };
    const sidebarName = P.firstName?.(display.shortName || display.name) || display.shortName || display.name;
    const accountName = P.$("#accountNameLabel");
    if (accountName) accountName.textContent = sidebarName;
    const adminAccountLine = P.$("#adminAccountLine");
    if (adminAccountLine) adminAccountLine.textContent = `${sidebarName} • ${P.roleLabel?.(role) || role}`;
    applyConnectionState();
    P.renderUser?.(P.getAppData?.() || {});
    if (typeof applyPrefs === "function") applyPrefs();
    applyAccessState(role);
  }

  function applyConnectionState() {
    const online = Boolean(P.onlineUser?.());
    const dot = P.$("#accountConnectionDot");
    const label = online ? "Online no servidor" : "Modo offline local";
    if (!dot) return;
    dot.classList.toggle("online", online);
    dot.classList.toggle("offline", !online);
    dot.title = label;
    dot.setAttribute("aria-label", label);
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
    if (backendToken) {
      localStorage.setItem(TOKEN_KEY, backendToken);
      sessionStorage.setItem(TOKEN_KEY, backendToken);
    }
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

  function normalizeLogin(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function backendLooksUnavailable(error) {
    return /aborted|network|failed to fetch|HTTP 502|HTTP 503|HTTP 504/i.test(String(error?.message || error || ""));
  }

  function findLocalLoginUser(username) {
    const target = normalizeLogin(username);
    if (!target) return null;
    return (P.users?.() || []).find(user => {
      const display = P.displayUser?.(user) || user;
      const names = [
        user.login,
        user.username,
        user.name,
        display.name,
        display.shortName,
        user.email
      ].map(normalizeLogin).filter(Boolean);
      return names.includes(target) || names.some(name => name.split(/\s+/)[0] === target);
    }) || null;
  }

  function activateOfflineUser(user, reason = "") {
    P.clearOnlineUser?.();
    if (user?.id) P.setActiveUser?.(user.id);
    backendToken = "";
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    const role = user?.role || P.activeUser?.()?.role || "Administrador";
    localStorage.setItem(ROLE_KEY, role);
    activateLocalSession(role);
    showPinChange(false);
    const text = reason || "Servidor indisponivel. Voce entrou no modo local e a sincronizacao pode ser feita depois.";
    P.showToast?.("Modo offline", text, "warn", { delay: 5200 });
    showLoginStatus(text);
    return user;
  }

  function friendlyAuthError(error) {
    const message = String(error?.message || error || "");
    if (/HTTP 401|invalido|invalid/i.test(message)) return "Nome ou PIN incorretos.";
    if (/reinicie o servidor local/i.test(message)) return "Servidor local antigo detectado. Feche o terminal antigo e rode npm start na pasta painelure2.";
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

  function authErrorIsInvalidSession(error) {
    return /HTTP 401|HTTP 403|invalido|invalid|unauthorized|forbidden/i.test(String(error?.message || error || ""));
  }

  function activateLocalSession(role = currentRole()) {
    setAuthenticated(true);
    applyRole(role || P.activeUser?.()?.role || "Administrador");
    applyUserAvatar();
    P.renderApp?.();
  }

  function logoutOnline() {
    const token = backendToken;
    backendToken = "";
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    P.clearOnlineUser?.();
    P.closeAccountMenu?.();
    setAuthenticated(false);
    document.documentElement.classList.remove("auth-pending");
    const localUser = P.activeUser?.();
    applyRole(localUser?.role || "Administrador");
    applyUserAvatar();
    P.renderPage?.("user", { force: true });
    if (P.$("#loginForm")) P.$("#loginForm").hidden = false;
    if (P.$("#pinChangeForm")) P.$("#pinChangeForm").hidden = true;
    showLoginStatus("Sessao encerrada.");
    P.showToast?.("Sessao encerrada", "Voce saiu do PainelURE.", "ok", { delay: 2600 });
    const userInput = P.$("#loginUserInput");
    const pinInput = P.$("#loginPinInput");
    if (userInput) userInput.value = "";
    if (pinInput) pinInput.value = "";
    window.setTimeout(() => userInput?.focus?.(), 0);
    if (token) P.logoutBackend?.(token).catch(() => {});
  }

  function activateOnlineUser(token, user, options = {}) {
    backendToken = token;
    localStorage.setItem(TOKEN_KEY, backendToken);
    sessionStorage.setItem(TOKEN_KEY, backendToken);
    P.setOnlineUser?.(user);
    localStorage.setItem(ROLE_KEY, user.role || "Consulta");
    if (options.render === false) return user;
    applyRole(user.role || "Consulta");
    applyUserAvatar();
    P.renderPage?.("user", { force: true });
    P.renderApp?.();
    refreshActiveUserSelect();
    return user;
  }

  async function loadScopedBackendData(options = {}) {
    if (!backendToken || !P.loadBackendData) return null;
    const payload = await P.loadBackendData(backendToken);
    if (payload?.data?.appData && options.render !== false) P.renderApp?.();
    refreshActiveUserSelect();
    return payload;
  }

  async function syncOfficialDataBeforeOpen() {
    showLoginStatus("Sincronizando dados oficiais...");
    let backendPayload = null;
    try {
      backendPayload = await loadScopedBackendData({ render: false });
    } catch (error) {
      P.showToast?.("Base online indisponivel", "Entrando com dados locais; tente sincronizar novamente no painel.", "warn", { delay: 6200 });
    }
    if (P.loadConfiguredSources) {
      showLoginStatus("Sincronizando fontes oficiais...");
      P.showToast?.("Sincronizando", "Atualizando carros, supervisao e pesquisas antes de abrir.", "info", { delay: 4200 });
      const results = await P.loadConfiguredSources({ includeManual: true, keys: ["cars", "supervision", "satisfaction"], order: ["cars", "supervision", "satisfaction"] });
      const failed = (results || []).filter(item => item.status === "error");
      if (failed.length) {
        const labels = failed.map(item => P.sources?.[item.key]?.label || item.key).join(", ");
        P.showToast?.("Sincronizacao parcial", `${labels} nao respondeu agora.`, "warn", { delay: 6200 });
      }
    }
    P.saveAppData?.();
    P.renderSourceStatus?.();
    P.renderGlobalSyncBanner?.();
    return backendPayload;
  }

  async function submitLogin(username, password) {
    showLoginStatus("");
    if (!username || !password) throw new Error("Informe nome e PIN.");
    showLoginStatus("Conectando ao servidor...");
    P.showToast?.("Atualizando sessao", "Validando usuario no servidor.", "info", { delay: 2200 });
    let result = null;
    try {
      result = await P.loginBackend?.({ username, password });
    } catch (error) {
      if (!backendLooksUnavailable(error)) throw error;
      const localUser = findLocalLoginUser(username);
      if (localUser && String(password) === "1234") {
        return activateOfflineUser(localUser);
      }
      throw error;
    }
    if (!result?.token || !result?.user) throw new Error("Login nao retornou usuario.");
    activateOnlineUser(result.token, result.user, { render: false });
    P.showToast?.("Sincronizando", "Carregando a base oficial antes de abrir o painel.", "info", { delay: 3200 });
    const syncPayload = await syncOfficialDataBeforeOpen();
    activateOnlineUser(result.token, result.user);
    P.showToast?.("Online", syncPayload?.data?.appData ? "Sessao conectada com dados oficiais." : "Sessao conectada; servidor sem dados novos.", "ok");
    if (result.user.preferences?.forcePinChange) {
      showPinChange(true);
      showLoginStatus("Troque o PIN inicial para continuar.");
      return result.user;
    }
    showPinChange(false);
    showLoginStatus("Online no servidor.");
    P.renderApp?.();
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
    backendToken = backendToken || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
    if (!backendToken || !P.loadBackendUser) {
      document.documentElement.classList.remove("auth-pending");
      if ((location.hostname === "localhost" || location.hostname === "127.0.0.1") && location.port === "4173") {
        localStorage.setItem(ROLE_KEY, "Administrador");
        activateLocalSession("Administrador");
      }
      return null;
    }
    const cachedUser = P.onlineUser?.();
    if (cachedUser) {
      try {
        const payload = await P.loadBackendUser(backendToken);
        const user = payload?.user || cachedUser;
        activateOnlineUser(backendToken, user, { render: false });
        await syncOfficialDataBeforeOpen();
        activateOnlineUser(backendToken, user);
        showPinChange(Boolean(user.preferences?.forcePinChange));
        return user;
      } catch (error) {
        if (authErrorIsInvalidSession(error)) {
          backendToken = "";
          localStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
          P.clearOnlineUser?.();
          setAuthenticated(false);
          return null;
        }
        activateLocalSession(cachedUser.role || currentRole());
        P.showToast?.("Offline", "Nao foi possivel sincronizar agora. Mantendo sessao local.", "warn");
        return cachedUser;
      } finally {
        document.documentElement.classList.remove("auth-pending");
      }
    }
    try {
      const payload = await P.loadBackendUser(backendToken);
      const user = payload?.user || P.onlineUser?.() || (payload?.session ? {
        name: payload.session.name || "Administrador",
        role: payload.session.role || "Administrador",
        preferences: {}
      } : null);
      if (user) {
        activateOnlineUser(backendToken, user, { render: false });
        await syncOfficialDataBeforeOpen();
        activateOnlineUser(backendToken, user);
        showPinChange(Boolean(user.preferences?.forcePinChange));
      }
      return user || null;
    } catch (error) {
      if (!authErrorIsInvalidSession(error)) {
        activateLocalSession(P.activeUser?.()?.role || localStorage.getItem(ROLE_KEY) || "Administrador");
        return null;
      }
      backendToken = "";
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      P.clearOnlineUser?.();
      applyRole(P.activeUser?.()?.role || "Administrador");
      setAuthenticated(false);
      return null;
    } finally {
      document.documentElement.classList.remove("auth-pending");
    }
  }

  function renderAccessRuleEditor() {
    const roleSelect = P.$("#accessRoleSelect");
    const checklist = P.$("#accessPageChecklist");
    if (!roleSelect || !checklist) return;
    if (!roleSelect.dataset.ready) {
      roleSelect.dataset.ready = "true";
      roleSelect.innerHTML = adminRoleOptions().map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
      roleSelect.addEventListener("change", renderAccessRuleEditor);
    }
    const role = roleSelect.value || adminRoleOptions()[0] || "Consulta";
    const access = new Set(P.roleAccess?.(role) || ROLE_ACCESS[role] || []);
    checklist.innerHTML = adminPageChoices().map(page => {
      const meta = P.pageMeta?.(page) || { label: page, note: "" };
      return `
        <label class="admin-check-card">
          <input type="checkbox" data-access-page="${page}"${access.has(page) ? " checked" : ""}>
          <span><strong>${meta.icon || ""} ${meta.label}</strong><small>${meta.note || page}</small></span>
        </label>
      `;
    }).join("");
  }

  function saveAccessRuleEditor() {
    const role = P.$("#accessRoleSelect")?.value || "Consulta";
    const selected = P.$all("[data-access-page]")
      .filter(input => input.checked)
      .map(input => input.dataset.accessPage);
    const appData = { ...P.getAppData() };
    appData.accessRules = {
      ...(appData.accessRules || {}),
      roleAccess: {
        ...(appData.accessRules?.roleAccess || {}),
        [role]: selected
      }
    };
    P.setAppData(appData);
    P.saveAppData?.();
    applyRole(P.currentRole?.() || role);
    renderAccessRuleEditor();
    P.renderPage?.("user", { force: true });
    setAdminMeta(`Acessos de ${P.roleLabel?.(role) || role} atualizados.`);
  }

  function renderPageMaintenanceEditor() {
    const pageSelect = P.$("#maintenancePageSelect");
    const enabledInput = P.$("#maintenanceEnabledInput");
    const messageInput = P.$("#maintenanceMessageInput");
    if (!pageSelect || !enabledInput || !messageInput) return;
    if (!pageSelect.dataset.ready) {
      pageSelect.dataset.ready = "true";
      pageSelect.innerHTML = adminPageChoices().map(page => {
        const meta = P.pageMeta?.(page) || { label: page };
        return `<option value="${page}">${meta.label}</option>`;
      }).join("");
      pageSelect.addEventListener("change", renderPageMaintenanceEditor);
    }
    const page = pageSelect.value || "dashboard";
    const config = P.pageMaintenanceConfig?.(page) || {};
    enabledInput.checked = config.enabled === true;
    messageInput.value = config.message || "";
  }

  function savePageMaintenanceEditor() {
    const page = P.$("#maintenancePageSelect")?.value || "dashboard";
    const enabled = Boolean(P.$("#maintenanceEnabledInput")?.checked);
    const message = P.$("#maintenanceMessageInput")?.value.trim() || "";
    const appData = { ...P.getAppData() };
    appData.pageMaintenance = {
      ...(appData.pageMaintenance || {}),
      [page]: { enabled, message }
    };
    P.setAppData(appData);
    P.saveAppData?.();
    P.updatePageMaintenanceNotice?.(P.routePage?.() || "dashboard");
    renderPageMaintenanceEditor();
    setAdminMeta(`${P.pageMeta?.(page)?.label || page}: aviso de manutenção ${enabled ? "ativado" : "removido"}.`);
  }

  function bindAdminTools() {
    applySourceOverrides();
    bindAdminCollapsibles();
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect && !roleSelect.dataset.bound) {
      roleSelect.dataset.bound = "true";
      roleSelect.innerHTML = adminRoleOptions().map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
      roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
    }
    const userRoleSelect = P.$("#userRoleSelect");
    if (userRoleSelect && !userRoleSelect.dataset.bound) {
      userRoleSelect.dataset.bound = "true";
      userRoleSelect.innerHTML = adminRoleOptions().map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
      userRoleSelect.addEventListener("change", () => applyRole(userRoleSelect.value));
    }
    const newUserRoleSelect = P.$("#newUserRoleSelect");
    if (newUserRoleSelect && !newUserRoleSelect.dataset.bound) {
      newUserRoleSelect.dataset.bound = "true";
      newUserRoleSelect.innerHTML = adminRoleOptions().map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
    }
    const activeUserSelect = P.$("#activeUserSelect");
    refreshActiveUserSelect();
    if (activeUserSelect && !activeUserSelect.dataset.bound) {
      activeUserSelect.dataset.bound = "true";
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

    renderAccessRuleEditor();
    renderPageMaintenanceEditor();
    const saveAccessButton = P.$("#saveAccessRulesBtn");
    if (saveAccessButton && !saveAccessButton.dataset.bound) {
      saveAccessButton.dataset.bound = "true";
      saveAccessButton.addEventListener("click", saveAccessRuleEditor);
    }
    const saveMaintenanceButton = P.$("#savePageMaintenanceBtn");
    if (saveMaintenanceButton && !saveMaintenanceButton.dataset.bound) {
      saveMaintenanceButton.dataset.bound = "true";
      saveMaintenanceButton.addEventListener("click", savePageMaintenanceEditor);
    }

    P.$("#loginSubmitBtn")?.addEventListener("click", async () => {
      const button = P.$("#loginSubmitBtn");
      try {
        if (button) {
          button.disabled = true;
          button.textContent = "Entrando...";
        }
        const username = P.$("#loginUserInput")?.value.trim();
        const pin = P.$("#loginPinInput")?.value || "";
        await submitLogin(username, pin);
        const pinInput = P.$("#loginPinInput");
        if (pinInput) pinInput.value = "";
      } catch (error) {
        showLoginStatus(friendlyAuthError(error));
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Entrar";
        }
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

    P.$("#restoreAdminBtn")?.addEventListener("click", () => {
      const token = backendToken;
      backendToken = "";
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      P.clearOnlineUser?.();
      const adminUser = (P.users?.() || []).find(user => user.role === "Administrador" && user.active !== false);
      if (adminUser) P.setActiveUser?.(adminUser.id);
      localStorage.setItem(ROLE_KEY, "Administrador");
      applyRole("Administrador");
      applyUserAvatar();
      P.renderPage?.("user", { force: true });
      if (token) P.logoutBackend?.(token).catch(() => {});
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

    P.$("#backendPullBtn")?.addEventListener("click", async () => {
      setAdminMeta("Carregando estado online...");
      const token = await ensureBackendToken();
      P.loadBackendData?.(token)
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
        const reloadHint = error.status === 409 ? " Carregue o estado online e tente novamente." : "";
        setAdminMeta(`Falha ao enviar estado online: ${error.message}.${reloadHint}`);
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
                pin: "1234",
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

        const deleteButton = event.target.closest("[data-delete-backend-user]");
        if (deleteButton) {
          const row = deleteButton.closest("[data-user-id]");
          const user = (P.backendUsersCache || []).find(item => item.id === row?.dataset.userId);
          if (!row || !user) return;
          if (!window.confirm(`Remover acesso de ${user.name}?`)) return;
          try {
            const token = await ensureBackendToken();
            await P.deleteBackendUser?.(token, row.dataset.userId);
            setAdminMeta(`Acesso de ${user.name} removido.`);
            refreshBackendPanel();
          } catch (error) {
            setAdminMeta(`Falha ao remover usuario: ${error.message}`);
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
      P.loadConfiguredSources?.({ includeManual: true, order: ["cars", "supervision", "satisfaction", "calendar", "contacts", "schools", "network", "inventory"] })
        .then(() => {
          P.renderApp?.();
          applyRole();
          renderSourceStatus();
          renderGlobalSyncBanner();
          if (meta) meta.textContent = "Fontes atualizadas.";
        })
        .catch(error => {
          if (meta) meta.textContent = `Falha ao atualizar fontes: ${error.message}`;
        });
    });

    const calendarInput = P.$("#calendarSourceInput");
    if (calendarInput) calendarInput.value = sourceOverride(loadSourceOverrides(), "calendar").url || P.sources?.calendar?.url || "";
    P.$("#saveCalendarSourceBtn")?.addEventListener("click", () => {
      const overrides = loadSourceOverrides();
      overrides.calendar = {
        ...sourceOverride(overrides, "calendar"),
        url: calendarInput?.value || "",
        type: P.sources?.calendar?.type || "csv",
        autoLoad: P.sources?.calendar?.metadata?.autoLoad !== false
      };
      saveSourceOverrides(overrides);
      applySourceOverrides();
      renderSourceStatus();
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = "Fonte do calendário salva.";
    });

    const sourceEditorList = P.$("#sourceEditorList");
    if (!document.documentElement.dataset.sourceRetryBound) {
      document.documentElement.dataset.sourceRetryBound = "true";
      document.addEventListener("click", async event => {
        const button = event.target.closest("[data-retry-source]");
        if (!button) return;
        const key = button.dataset.retrySource;
        const label = P.sources?.[key]?.label || key;
        const original = button.textContent;
        try {
          button.disabled = true;
          button.textContent = "Sincronizando...";
          P.sourceStatus = [
            ...(P.sourceStatus || []).filter(item => item.key !== key),
            { key, status: "loading", updatedAt: new Date().toISOString() }
          ];
          renderSourceStatus();
          renderGlobalSyncBanner();
          const result = await P.refreshSource?.(key);
          P.saveAppData?.();
          P.renderApp?.();
          applyRole();
          P.showToast?.("Fonte atualizada", `${label}: ${result?.rows?.length || 0} linha(s).`, "ok");
          setAdminMeta(`${label} sincronizado novamente.`);
        } catch (error) {
          P.sourceStatus = [
            ...(P.sourceStatus || []).filter(item => item.key !== key),
            { key, status: "error", error, updatedAt: new Date().toISOString() }
          ];
          P.showToast?.("Falha na fonte", `${label}: ${error?.message || "nao foi possivel sincronizar"}.`, "warn", { delay: 6200 });
          setAdminMeta(`Falha ao sincronizar ${label}: ${error.message}`);
        } finally {
          renderSourceStatus();
          renderGlobalSyncBanner();
          button.disabled = false;
          button.textContent = original || "Tentar novamente";
        }
      });
    }

    if (sourceEditorList && !sourceEditorList.dataset.bound) {
      sourceEditorList.dataset.bound = "true";
      sourceEditorList.addEventListener("click", async event => {
        const button = event.target.closest("[data-sync-source]");
        if (!button) return;
        const key = button.dataset.syncSource;
        const original = button.textContent;
        try {
          const overrides = readSourceEditor();
          saveSourceOverrides(overrides);
          applySourceOverrides();
          button.disabled = true;
          button.textContent = "Sincronizando...";
          P.sourceStatus = [
            ...(P.sourceStatus || []).filter(item => item.key !== key),
            { key, status: "loading" }
          ];
          renderSourceStatus();
          const result = await P.refreshSource?.(key);
          P.saveAppData?.();
          P.renderApp?.();
          applyRole();
          renderSourceStatus();
          renderGlobalSyncBanner();
          setAdminMeta(`${P.sources?.[key]?.label || key} sincronizado: ${result?.rows?.length || 0} linha(s).`);
        } catch (error) {
          P.sourceStatus = [
            ...(P.sourceStatus || []).filter(item => item.key !== key),
            { key, status: "error", error, updatedAt: new Date().toISOString() }
          ];
          renderSourceStatus();
          renderGlobalSyncBanner();
          setAdminMeta(`Falha ao sincronizar ${P.sources?.[key]?.label || key}: ${error.message}`);
        } finally {
          button.disabled = false;
          button.textContent = original || "Sincronizar";
        }
      });
    }

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
    renderGlobalSyncBanner();
    refreshBackendPanel();
  }

  function bindAdminCollapsibles() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(ADMIN_COLLAPSE_KEY) || "{}") || {};
    } catch (error) {
      saved = {};
    }
    P.$all("[data-admin-collapsible]").forEach((section, index) => {
      const title = section.querySelector(".settings-title");
      if (!title || title.dataset.bound) return;
      title.dataset.bound = "true";
      const key = P.normalize?.(title.childNodes[0]?.textContent || title.textContent || `secao-${index}`) || `secao-${index}`;
      const defaultOpen = section.dataset.adminOpen === "true" || index === 0;
      const open = Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : defaultOpen;
      section.classList.toggle("is-collapsed", !open);
      const button = document.createElement("button");
      button.className = "settings-toggle";
      button.type = "button";
      button.setAttribute("aria-expanded", String(open));
      button.textContent = section.classList.contains("is-collapsed") ? "Ver" : "Ocultar";
      button.addEventListener("click", event => {
        event.stopPropagation();
        const collapsed = section.classList.toggle("is-collapsed");
        const nextOpen = !collapsed;
        button.setAttribute("aria-expanded", String(nextOpen));
        button.textContent = collapsed ? "Ver" : "Ocultar";
        saved[key] = nextOpen;
        try {
          localStorage.setItem(ADMIN_COLLAPSE_KEY, JSON.stringify(saved));
        } catch (error) {}
      });
      title.appendChild(button);
      title.addEventListener("click", () => button.click());
    });
  }

  function defaultPrefs() {
    return {
      widgets: { shortcuts: true, metrics: true, operations: true },
      shortcuts: { network: true, inventory: true, ctc: true, calls: true, cars: true, calendar: true, satisfaction: true, reports: true }
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
      button.hidden = prefs.shortcuts?.[button.dataset.jump] === false;
    });
    applyAccessState();
  }

  function loadSourceOverrides() {
    try {
      return JSON.parse(localStorage.getItem(SOURCE_KEY) || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function sourceOverride(overrides, key) {
    const item = overrides?.[key];
    if (!item || typeof item === "string") return { url: item || "" };
    return item;
  }

  function saveSourceOverrides(overrides) {
    try {
      localStorage.setItem(SOURCE_KEY, JSON.stringify(overrides));
    } catch (error) {}
  }

  function applySourceOverrides() {
    const overrides = loadSourceOverrides();
    Object.entries(overrides).forEach(([key, override]) => {
      if (P.sources?.[key]?.metadata?.locked) return;
      if (!P.sources?.[key]) return;
      const next = typeof override === "string" ? { url: override } : override || {};
      P.sources[key] = {
        ...P.sources[key],
        type: next.type || P.sources[key].type || "csv",
        url: next.url ?? P.sources[key].url ?? "",
        metadata: {
          ...(P.sources[key].metadata || {}),
          autoLoad: next.autoLoad === undefined ? P.sources[key].metadata?.autoLoad : Boolean(next.autoLoad)
        }
      };
    });
  }

  function readSourceEditor() {
    const overrides = {};
    P.$all("[data-source-key]").forEach(row => {
      const key = row.dataset.sourceKey;
      if (!key) return;
      overrides[key] = {
        url: row.querySelector("[data-source-url]")?.value.trim() || "",
        type: row.querySelector("[data-source-type]")?.value || "csv",
        autoLoad: Boolean(row.querySelector("[data-source-autoload]")?.checked)
      };
    });
    return overrides;
  }

  function sourceMetaLine(source, compact = false) {
    const meta = source.metadata || {};
    return [
      compact ? null : (meta.domain || source.label),
      meta.owner && `resp. ${meta.owner}`,
      meta.cadence && `cadencia ${meta.cadence}`,
      meta.autoLoad === false && "sincronizacao manual",
      (meta.monthKey || source.monthKey) && `mes ${P.selectedMonthLabel?.(meta.monthKey || source.monthKey) || meta.monthKey || source.monthKey}`,
      meta.sensitive && (compact ? "dados sensiveis" : `sensivel: ${meta.sensitive}`)
    ].filter(Boolean).join(" | ");
  }

  function sourceStatusLabel(status) {
    const labels = {
      loaded: "sincronizada",
      empty: "vazia",
      official: "oficial",
      configured: "configurada",
      loading: "sincronizando",
      error: "falhou",
      skipped: "manual",
      pending: "pendente"
    };
    return labels[status] || status || "pendente";
  }

  function sourceStatusTone(item = {}) {
    if (item.status === "loaded" || item.status === "official") return "ok";
    if (item.status === "empty") return "warn";
    if (item.status === "error") return "warn";
    if (item.status === "loading") return "info";
    return "info";
  }

  function sourceUpdatedLabel(item = {}) {
    if (!item.updatedAt) return "";
    try {
      return new Date(item.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      return "";
    }
  }

  function sourceRequiresAdminAttention(source = {}) {
    const url = String(source.url || "").toLowerCase();
    return source.type === "sharepoint-list" || url.includes("sharepoint.com");
  }

  function renderSourceEditor() {
    const host = P.$("#sourceEditorList");
    if (!host) return;
    const overrides = loadSourceOverrides();
    host.innerHTML = Object.entries(P.sources || {}).map(([key, source]) => {
      const locked = Boolean(source.metadata?.locked);
      const override = sourceOverride(overrides, key);
      const value = locked ? source.url ?? "" : override.url ?? source.url ?? "";
      const type = locked ? source.type || "csv" : override.type || source.type || "csv";
      const autoLoad = locked ? source.metadata?.autoLoad !== false : (override.autoLoad ?? source.metadata?.autoLoad) !== false;
      const metaLine = sourceMetaLine(source) || `${source.status || "pending"} | ${source.type || "csv"}`;
      return `
        <div class="settings-row source-editor-row" data-source-key="${key}" data-search="${P.searchText([key, source.label, value, metaLine, type])}">
          <div><strong>${source.label || key}</strong><small>${metaLine}</small></div>
          <div class="source-editor-controls">
            <input type="url" data-source-url value="${value}" placeholder="https://.../pub?output=csv"${locked ? " disabled" : ""}>
            <select data-source-type${locked ? " disabled" : ""}>
              <option value="csv"${type === "csv" ? " selected" : ""}>CSV / Google Sheets</option>
              <option value="sharepoint-list"${type === "sharepoint-list" ? " selected" : ""}>SharePoint</option>
            </select>
            <label class="check-row source-autoload"><input type="checkbox" data-source-autoload${autoLoad ? " checked" : ""}${locked ? " disabled" : ""}><span>Auto</span></label>
            <button class="ghost-btn" type="button" data-sync-source="${key}">Sincronizar</button>
          </div>
        </div>
      `;
    }).join("");
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
      const status = item.reason === "manual" ? "manual" : item.status === "skipped" || item.status === "pending" ? "pendente" : sourceStatusLabel(item.status);
      const when = sourceUpdatedLabel(item);
      const detail = [
        source.url ? "fonte configurada" : "sem URL configurada",
        sourceMetaLine(source, true),
        when && `ultima tentativa ${when}`,
        item.status === "empty" && (item.warning || "fonte vazia; dados atuais mantidos"),
        item.status === "error" && (item.error?.message || "falha ao sincronizar")
      ].filter(Boolean).join(" | ");
      const retry = item.status === "error"
        ? `<button class="ghost-btn source-retry-btn" type="button" data-retry-source="${item.key}">Tentar novamente</button>`
        : "";
      const adminNote = currentRole() === "Administrador" && sourceRequiresAdminAttention(source)
        ? `<small class="source-admin-note">Aviso admin: links privados do SharePoint podem exigir permissao ou backend autenticado.</small>`
        : "";
      return `
        <div class="data-row compact" data-search="${P.searchText([label, status, detail])}">
          <span class="row-icon">&#8635;</span>
          <span><strong>${label}</strong><small>${detail}</small>${adminNote}</span>
          ${retry}
          <em class="status-pill ${ok ? "ok" : sourceStatusTone(item)}">${status}</em>
        </div>
      `;
    }).join("");
  }

  function renderGlobalSyncBanner() {
    const host = P.$("#globalSyncBanner");
    if (!host) return;
    const statuses = P.sourceStatus?.length ? P.sourceStatus : [];
    const importantKeys = ["cars", "supervision", "satisfaction"];
    const important = importantKeys.map(key => statuses.find(item => item.key === key)).filter(Boolean);
    const failed = statuses.filter(item => item.status === "error");
    const empty = statuses.filter(item => item.status === "empty");
    const loading = statuses.filter(item => item.status === "loading");
    const loaded = statuses.filter(item => item.status === "loaded");
    const latest = statuses
      .map(sourceUpdatedLabel)
      .filter(Boolean)[0] || "";
    const stale = failed.length > 0 || empty.length > 0;
    const title = loading.length
      ? "Sincronizando fontes"
      : stale
        ? "Dados oficiais com aviso"
        : loaded.length
          ? "Dados oficiais sincronizados"
          : "Fontes oficiais aguardando";
    const detail = loading.length
      ? loading.map(item => P.sources?.[item.key]?.label || item.key).join(", ")
      : failed.length
        ? `${failed.map(item => P.sources?.[item.key]?.label || item.key).join(", ")} falhou. Dados antigos seguem visiveis.`
        : empty.length
          ? `${empty.map(item => P.sources?.[item.key]?.label || item.key).join(", ")} retornou vazio. Dados antigos foram mantidos.`
        : important.length
          ? important.map(item => `${P.sources?.[item.key]?.label || item.key}: ${sourceStatusLabel(item.status)}`).join(" | ")
          : "Carros primeiro, supervisao depois; demais fontes entram aos poucos.";
    const buttons = failed.map(item => `
      <button type="button" data-retry-source="${item.key}">Sincronizar ${P.sources?.[item.key]?.label || item.key}</button>
    `).join("");
    const adminNote = currentRole() === "Administrador" && failed.some(item => sourceRequiresAdminAttention(P.sources?.[item.key]))
      ? `<small class="sync-admin-note">Aviso admin: confirme permissao dos links privados do SharePoint se a falha repetir.</small>`
      : "";
    host.className = `sync-banner ${loading.length ? "sync-loading" : stale ? "sync-warn" : loaded.length ? "sync-ok" : "sync-idle"}`;
    host.innerHTML = `
      <span class="sync-dot" aria-hidden="true"></span>
      <span class="sync-copy"><strong>${title}</strong><small>${detail}${latest ? ` | ${latest}` : ""}</small>${adminNote}</span>
      ${buttons ? `<span class="sync-actions">${buttons}</span>` : ""}
    `;
  }

  function formatDateTime(value) {
    return value ? new Date(value).toLocaleString("pt-BR") : "data indisponivel";
  }

  function auditTitle(event) {
    const action = {
      create: "Criou",
      update: "Atualizou",
      import: "Importou",
      login: "Entrou",
      logout: "Saiu"
    }[event.action] || event.action || "Evento";
    return `${action} ${event.entity || "registro"}`;
  }

  async function refreshBackendPanel() {
    const statusLine = P.$("#backendStatusLine");
    const snapshotHost = P.$("#backendSnapshotList");
    const auditHost = P.$("#backendAuditList");
    const importHost = P.$("#backendImportList");
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
          if (P.sources[item.key].metadata?.locked) return;
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
        renderGlobalSyncBanner();
      }
    } catch (error) {
      if (statusLine) statusLine.textContent = `API indisponível: ${error.message}`;
      if (snapshotHost) snapshotHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Snapshots aparecem quando a API estiver acessível.</small></div></div>`;
      if (auditHost) auditHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Auditoria aparece quando a API estiver acessível.</small></div></div>`;
      if (importHost) importHost.innerHTML = `<div class="settings-row compact"><div><strong>Sem conexão</strong><small>Importações aparecem quando a API estiver acessível.</small></div></div>`;
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
            <div><strong>${item.source || "Snapshot do estado"}</strong><small>Salvo em ${formatDateTime(item.createdAt)}${item.id ? ` | ${item.id}` : ""}</small></div>
            <span class="status-pill info">backup</span>
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
          <div class="settings-row compact" data-search="${P.searchText([event.action, event.entity, event.detail, event.actorName, event.actorRole])}">
            <div><strong>${auditTitle(event)}</strong><small>${event.detail || "Sem detalhe"} | ${event.actorName || "sistema"} ${event.actorRole ? `(${event.actorRole})` : ""} | ${formatDateTime(event.createdAt)}</small></div>
            <span class="status-pill info">log</span>
          </div>
        `).join("") : `<div class="settings-row compact"><div><strong>Nenhum evento</strong><small>Logs aparecem após ações administrativas online.</small></div></div>`;
      }
    } catch (error) {
      if (auditHost) auditHost.innerHTML = `<div class="settings-row compact"><div><strong>Auditoria protegida</strong><small>Use a chave administrativa para listar eventos.</small></div></div>`;
    }

    try {
      const token = backendToken || "";
      const payload = await P.loadBackendImports?.(token, 8);
      const imports = payload?.imports || [];
      if (importHost) {
        importHost.innerHTML = imports.length ? imports.map(item => `
          <div class="settings-row compact" data-search="${P.searchText([item.sourceKey, item.detail, item.status, item.rowsCount])}">
            <div><strong>${item.sourceKey || "importacao"}</strong><small>${item.rowsCount || 0} linha(s) | ${item.detail || "sem detalhe"} | ${formatDateTime(item.createdAt)}</small></div>
            <span class="status-pill ${item.status === "ok" ? "ok" : "warn"}">${item.status || "registro"}</span>
          </div>
        `).join("") : `<div class="settings-row compact"><div><strong>Nenhuma importação online</strong><small>As importações feitas pela API aparecem aqui.</small></div></div>`;
      }
    } catch (error) {
      if (importHost) importHost.innerHTML = `<div class="settings-row compact"><div><strong>Importações protegidas</strong><small>Use a chave administrativa para listar importações.</small></div></div>`;
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
          const visiblePin = user.pin || user.preferences?.pin || "nao informado";
          const lastLogin = user.preferences?.lastLoginAt ? new Date(user.preferences.lastLoginAt).toLocaleString("pt-BR") : "sem login registrado";
          return `
          <div class="settings-row compact backend-user-row" data-user-id="${user.id}" data-search="${P.searchText([user.name, user.username, user.role, visiblePin, lastLogin])}">
            <div><strong>${user.name}</strong><small>${user.username} • ${user.role} • PIN ${visiblePin} • ${lastLogin}</small></div>
            <div class="settings-actions backend-user-actions">
              <span class="status-pill ${pinPending ? "warn" : "ok"}">${pinPending ? "PIN inicial" : "PIN alterado"}</span>
              <select data-user-role>
                ${roleOptions.map(role => `<option value="${role}"${role === user.role ? " selected" : ""}>${P.roleLabel?.(role) || role}</option>`).join("")}
              </select>
              <select data-user-contact>
                <option value="">Sem contato</option>
                ${contacts.map(contact => `<option value="${contact.id}"${contact.id === user.contactId ? " selected" : ""}>${contact.name}</option>`).join("")}
              </select>
              <button class="ghost-btn" type="button" data-reset-backend-pin>PIN 1234</button>
              <button class="ghost-btn" type="button" data-delete-backend-user>Remover</button>
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
  P.accessForRole = accessForRole;
  P.currentRole = currentRole;
  P.canAccess = canAccess;
  P.allowedPageLabels = allowedPageLabels;
  P.firstAllowedPage = firstAllowedPage;
  P.applyAccessState = applyAccessState;
  P.applyRole = applyRole;
  P.closeAccountMenu = closeAccountMenu;
  P.toggleAccountMenu = toggleAccountMenu;
  P.applyUserAvatar = applyUserAvatar;
  P.applyConnectionState = applyConnectionState;
  P.bindAdminTools = bindAdminTools;
  P.restoreBackendSession = restoreBackendSession;
  P.renderSourceStatus = renderSourceStatus;
  P.renderGlobalSyncBanner = renderGlobalSyncBanner;
  P.renderSourceEditor = renderSourceEditor;
  P.refreshBackendPanel = refreshBackendPanel;
  P.applyPrefs = applyPrefs;
})();
