(function () {
  const P = window.PainelURE;
  const ROLE_KEY = "painelure2_role";

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
    P.$all("[data-page]").forEach(button => {
      const page = button.dataset.page;
      button.hidden = !canAccess(page, role);
    });
    const active = P.$(".page.active");
    const activeId = active?.id?.replace("page-", "");
    if (activeId && !canAccess(activeId, role)) P.setPage("dashboard");
    const roleSelect = P.$("#activeRoleSelect");
    if (roleSelect) roleSelect.value = role;
    const accountRole = P.$("#accountRoleLabel");
    if (accountRole) accountRole.textContent = role;
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

    P.$("#localSaveBtn")?.addEventListener("click", () => {
      const payload = P.saveAppData();
      const meta = P.$("#adminBackupMeta");
      if (meta) meta.textContent = `Estado salvo localmente em ${new Date(payload.savedAt).toLocaleString("pt-BR")}.`;
    });

    applyRole();
  }

  P.ROLE_ACCESS = ROLE_ACCESS;
  P.currentRole = currentRole;
  P.canAccess = canAccess;
  P.applyRole = applyRole;
  P.bindAdminTools = bindAdminTools;
})();
