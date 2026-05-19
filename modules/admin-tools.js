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
    Administrador: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "cars", "supervision", "contacts", "calendar", "reports", "profiles", "quality", "admin"],
    Supervisao: ["dashboard", "schools", "supervision", "contacts", "calendar"],
    "Tecnicos CTC": ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars", "calendar"],
    SETEC: ["dashboard", "schools", "network", "inventory", "ctc", "calls", "contacts", "cars"],
    SEINTEC: ["dashboard", "schools", "network", "inventory", "contacts", "cars"],
    Gabinete: ["dashboard", "schools", "calls", "contacts", "cars", "calendar"],
    SEOM: ["dashboard", "schools", "contacts", "cars", "calendar"],
    Pedagogico: ["dashboard", "schools", "supervision", "contacts", "calendar"],
    Consulta: ["dashboard", "schools", "contacts"]
  };

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
    if (activeId && !canAccess(activeId, role)) P.setPage("dashboard");
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
    P.renderUser?.(P.getAppData?.() || {});
    if (typeof applyPrefs === "function") applyPrefs();
    applyAccessState(role);
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

  async function logoutOnline() {
    if (backendToken) await P.logoutBackend?.(backendToken).catch(() => {});
    backendToken = "";
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
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
    localStorage.setItem(TOKEN_KEY, backendToken);
    sessionStorage.setItem(TOKEN_KEY, backendToken);
    P.setOnlineUser?.(user);
    localStorage.setItem(ROLE_KEY, user.role || "Consulta");
    applyRole(user.role || "Consulta");
    applyUserAvatar();
    P.renderPage?.("user", { force: true });
    P.renderApp?.();
  }

  async function loadScopedBackendData() {
    if (!backendToken || !P.loadBackendData) return null;
    const payload = await P.loadBackendData(backendToken);
    if (payload?.data?.appData) P.renderApp?.();
    return payload;
  }

  async function submitLogin(username, password) {
    showLoginStatus("");
    if (!username || !password) throw new Error("Informe nome e PIN.");
    const result = await P.loginBackend?.({ username, password });
    if (!result?.token || !result?.user) throw new Error("Login nao retornou usuario.");
    activateOnlineUser(result.token, result.user);
    await loadScopedBackendData().catch(() => {});
    if (result.user.preferences?.forcePinChange) {
      showPinChange(true);
      showLoginStatus("Troque o PIN inicial para continuar.");
      return result.user;
    }
    showPinChange(false);
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
        setAuthenticated(true);
        localStorage.setItem(ROLE_KEY, "Administrador");
        applyRole("Administrador");
        applyUserAvatar();
        await P.loadBackendData?.("").catch(() => null);
        P.renderApp?.();
      }
      return null;
    }
    try {
      const payload = await P.loadBackendUser(backendToken);
      const user = payload?.user || P.onlineUser?.() || (payload?.session ? {
        name: payload.session.name || "Administrador",
        role: payload.session.role || "Administrador",
        preferences: {}
      } : null);
      if (user) {
        localStorage.setItem(TOKEN_KEY, backendToken);
        sessionStorage.setItem(TOKEN_KEY, backendToken);
        P.setOnlineUser?.(user);
        localStorage.setItem(ROLE_KEY, user.role || "Consulta");
        applyRole(user.role || "Consulta");
        applyUserAvatar();
        P.renderPage?.("user", { force: true });
        showPinChange(Boolean(user.preferences?.forcePinChange));
        await loadScopedBackendData().catch(() => {});
        if (!user.preferences?.forcePinChange) P.renderApp?.();
      }
      return user || null;
    } catch (error) {
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

  function bindAdminTools() {
    applySourceOverrides();
    bindAdminCollapsibles();
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect && !roleSelect.dataset.bound) {
      roleSelect.dataset.bound = "true";
      roleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
      roleSelect.addEventListener("change", () => applyRole(roleSelect.value));
    }
    const userRoleSelect = P.$("#userRoleSelect");
    if (userRoleSelect && !userRoleSelect.dataset.bound) {
      userRoleSelect.dataset.bound = "true";
      userRoleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
      userRoleSelect.addEventListener("change", () => applyRole(userRoleSelect.value));
    }
    const newUserRoleSelect = P.$("#newUserRoleSelect");
    if (newUserRoleSelect && !newUserRoleSelect.dataset.bound) {
      newUserRoleSelect.dataset.bound = "true";
      newUserRoleSelect.innerHTML = Object.keys(ROLE_ACCESS).map(role => `<option value="${role}">${P.roleLabel?.(role) || role}</option>`).join("");
    }
    const activeUserSelect = P.$("#activeUserSelect");
    if (activeUserSelect && !activeUserSelect.dataset.bound) {
      activeUserSelect.dataset.bound = "true";
      activeUserSelect.innerHTML = (P.users?.() || []).map(user => {
        const display = P.displayUser?.(user) || user;
        return `<option value="${user.id}">${display.shortName || display.name} • ${P.roleLabel?.(user.role) || user.role}</option>`;
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

    P.$("#restoreAdminBtn")?.addEventListener("click", async () => {
      if (backendToken) await P.logoutBackend?.(backendToken).catch(() => {});
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
      shortcuts: { network: true, inventory: true, ctc: true, calls: true, cars: true, calendar: true, reports: true }
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

  function saveSourceOverrides(overrides) {
    try {
      localStorage.setItem(SOURCE_KEY, JSON.stringify(overrides));
    } catch (error) {}
  }

  function applySourceOverrides() {
    const overrides = loadSourceOverrides();
    Object.entries(overrides).forEach(([key, url]) => {
      if (P.sources?.[key]?.metadata?.locked) return;
      if (P.sources?.[key]) P.sources[key].url = url;
    });
  }

  function readSourceEditor() {
    const overrides = {};
    P.$all("[data-source-url]").forEach(input => {
      overrides[input.dataset.sourceUrl] = input.value.trim();
    });
    return overrides;
  }

  function sourceMetaLine(source, compact = false) {
    const meta = source.metadata || {};
    return [
      compact ? null : (meta.domain || source.label),
      meta.owner && `resp. ${meta.owner}`,
      meta.cadence && `cadencia ${meta.cadence}`,
      (meta.monthKey || source.monthKey) && `mes ${P.selectedMonthLabel?.(meta.monthKey || source.monthKey) || meta.monthKey || source.monthKey}`,
      meta.sensitive && (compact ? "dados sensiveis" : `sensivel: ${meta.sensitive}`)
    ].filter(Boolean).join(" | ");
  }

  function renderSourceEditor() {
    const host = P.$("#sourceEditorList");
    if (!host) return;
    const overrides = loadSourceOverrides();
    host.innerHTML = Object.entries(P.sources || {}).map(([key, source]) => {
      const locked = Boolean(source.metadata?.locked);
      const value = locked ? source.url ?? "" : overrides[key] ?? source.url ?? "";
      const metaLine = sourceMetaLine(source) || `${source.status || "pending"} | ${source.type || "csv"}`;
      return `
        <div class="settings-row source-editor-row" data-search="${P.searchText([key, source.label, value, metaLine])}">
          <div><strong>${source.label || key}</strong><small>${metaLine}</small></div>
          <input type="url" data-source-url="${key}" value="${value}" placeholder="https://.../pub?output=csv"${locked ? " disabled" : ""}>
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
      const status = item.status === "skipped" || item.status === "pending" ? "pendente" : item.status;
      const detail = [
        source.url ? "fonte configurada" : "sem URL configurada",
        sourceMetaLine(source, true)
      ].filter(Boolean).join(" | ");
      return `
        <div class="data-row compact" data-search="${P.searchText([label, status, detail])}">
          <span class="row-icon">&#8635;</span>
          <span><strong>${label}</strong><small>${detail}</small></span>
          <em class="status-pill ${ok ? "ok" : "info"}">${status}</em>
        </div>
      `;
    }).join("");
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
          const lastLogin = user.preferences?.lastLoginAt ? new Date(user.preferences.lastLoginAt).toLocaleString("pt-BR") : "sem login registrado";
          return `
          <div class="settings-row compact backend-user-row" data-user-id="${user.id}" data-search="${P.searchText([user.name, user.username, user.role, lastLogin])}">
            <div><strong>${user.name}</strong><small>${user.username} • ${user.role} • ${lastLogin}</small></div>
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
  P.applyAccessState = applyAccessState;
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
