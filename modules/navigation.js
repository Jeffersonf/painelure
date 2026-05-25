(function () {
  const P = window.PainelURE;

  function pageId(id) {
    return `page-${id}`;
  }

  const PAGE_SLUGS = {
    dashboard: "painel",
    schools: "escolas",
    network: "redes",
    inventory: "inventario",
    supervision: "supervisao",
    contacts: "contatos",
    calendar: "calendario",
    reports: "relatorios",
    cars: "carros",
    ctc: "ctc",
    calls: "chamados",
    admin: "admin",
    user: "conta",
    profiles: "perfis",
    quality: "qualidade"
  };
  const PAGE_BY_SLUG = Object.fromEntries(Object.entries(PAGE_SLUGS).map(([page, slug]) => [slug, page]));

  let previousPage = "dashboard";

  function routeBase() {
    const path = location.pathname.replace(/\/+$/, "");
    const marker = "/painelure";
    const index = path.toLowerCase().indexOf(marker);
    if (index >= 0) return path.slice(0, index + marker.length);
    return "";
  }

  function routePage() {
    const hashPage = location.hash.replace("#", "");
    const params = new URLSearchParams(location.search);
    const queryPage = params.get("categoria") || params.get("tela") || "";
    const normalizedQueryPage = PAGE_BY_SLUG[queryPage] || queryPage;
    const base = routeBase();
    let path = location.pathname;
    if (base && path.toLowerCase().startsWith(base.toLowerCase())) {
      path = path.slice(base.length);
    }
    const segment = path.replace(/^\/+|\/+$/g, "").split("/")[0];
    const page = segment === "acesso-admin" ? "dashboard" : (PAGE_BY_SLUG[segment] || segment);
    if (normalizedQueryPage && P.$(`#${pageId(normalizedQueryPage)}`)) return normalizedQueryPage;
    if (page && P.$(`#${pageId(page)}`)) return page;
    if (hashPage && P.$(`#${pageId(hashPage)}`)) return hashPage;
    return "";
  }

  function pageRoute(id) {
    const page = id || "dashboard";
    const url = new URL(location.href);
    const base = routeBase();
    url.hash = "";
    if (base) url.pathname = `${base}/`;
    if (page === "dashboard") {
      url.searchParams.delete("tela");
      url.searchParams.delete("categoria");
    } else {
      url.searchParams.delete("tela");
      url.searchParams.set("categoria", PAGE_SLUGS[page] || page);
    }
    return `${url.pathname}${url.search}`;
  }

  function pageLabel(page) {
    return P.pageMeta?.(page)?.label || page;
  }

  function showToast(title, message = "", tone = "info", options = {}) {
    let stack = P.$("#toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.className = `app-toast toast-${tone || "info"}`;
    toast.setAttribute("role", tone === "danger" ? "alert" : "status");
    toast.innerHTML = `<strong>${title || "Aviso"}</strong>${message ? `<span>${message}</span>` : ""}`;
    stack.appendChild(toast);
    window.setTimeout(() => toast.classList.add("show"), 20);
    const delay = Number(options.delay || 4200);
    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 180);
    }, delay);
    return toast;
  }

  function updateGlobalPageHeading(id) {
    const meta = P.pageMeta?.(id) || {};
    const title = P.$("#globalPageTitle");
    const note = P.$("#globalPageNote");
    if (title) title.textContent = meta.label || pageLabel(id);
    if (note) note.textContent = meta.note || "Painel operacional da URE.";
  }

  function accessDeniedMessage(id) {
    const role = P.currentRole?.() || "Consulta";
    const available = P.allowedPageLabels?.(role) || (P.roleAccess?.(role) || []).map(page => pageLabel(page)).join(", ");
    return `Acesso negado a ${pageLabel(id)}. Categorias disponíveis para seu perfil: ${available || "nenhuma categoria liberada"}.`;
  }

  function showAccessDenied(id) {
    const message = accessDeniedMessage(id);
    let toast = P.$("#accessDeniedToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "accessDeniedToast";
      toast.className = "access-denied-toast";
      toast.setAttribute("role", "alert");
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<strong>Acesso negado</strong><span>${message}</span>`;
    toast.classList.add("show");
    window.clearTimeout(showAccessDenied.timer);
    showAccessDenied.timer = window.setTimeout(() => toast.classList.remove("show"), 5200);
  }

  function updatePageMaintenanceNotice(id) {
    let notice = P.$("#pageMaintenanceNotice");
    const config = P.pageMaintenanceConfig?.(id) || {};
    const active = config.enabled === true;
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "pageMaintenanceNotice";
      notice.className = "page-maintenance-notice";
      notice.setAttribute("role", "status");
      P.$(".main")?.prepend(notice);
    }
    notice.hidden = !active;
    if (!active) return;
    const label = pageLabel(id);
    notice.innerHTML = `<strong>${label} em manutenção</strong><span>${config.message || "Esta categoria está temporariamente em revisão. Os dados podem aparecer incompletos."}</span>`;
  }

  function setPage(id) {
    if (P.canAccess && !P.canAccess(id)) {
      showAccessDenied(id);
      return false;
    }
    const active = P.$(".page.active");
    const activeId = active?.id?.replace("page-", "");
    if (activeId && activeId !== id) previousPage = activeId;
    P.renderPage?.(id);
    P.$all(".page").forEach(page => page.classList.toggle("active", page.id === pageId(id)));
    P.$all("[data-page]").forEach(btn => btn.classList.toggle("active", btn.dataset.page === id));
    updateGlobalPageHeading(id);
    updatePageMaintenanceNotice(id);
    P.applyAccessState?.();
    history.replaceState(null, "", pageRoute(id));
    P.clearSearch();
    window.scrollTo(0, 0);
    return true;
  }

  function bindNavigation({ onContactSector }) {
    document.addEventListener("click", event => {
      const pageButton = event.target.closest("[data-page]");
      if (pageButton) {
        setPage(pageButton.dataset.page);
        P.closeAccountMenu?.();
        return;
      }

      const accountButton = event.target.closest("#accountBtn");
      if (accountButton) {
        P.toggleAccountMenu?.();
        return;
      }

      const backButton = event.target.closest("[data-back]");
      if (backButton) {
        setPage(previousPage || "dashboard");
        return;
      }

      const jumpButton = event.target.closest("[data-jump]");
      if (jumpButton) {
        const changed = setPage(jumpButton.dataset.jump);
        const calendarMode = jumpButton.dataset.calendarModeTarget;
        if (changed && calendarMode) requestAnimationFrame(() => P.setCalendarMode?.(calendarMode));
        P.closeAccountMenu?.();
        return;
      }

      const sectorButton = event.target.closest("[data-sector]");
      if (sectorButton) {
        P.$all("[data-sector]").forEach(tab => tab.classList.toggle("active", tab === sectorButton));
        onContactSector(sectorButton.dataset.sector);
      }
    });

    document.addEventListener("click", event => {
      if (!event.target.closest(".account")) P.closeAccountMenu?.();
    });

    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        P.$(".sidebar-search input")?.focus();
      }
    });
  }

  function restoreInitialPage() {
    const initial = routePage();
    if (initial && P.$(`#${pageId(initial)}`)) {
      setPage(initial);
      return true;
    }
    const fallback = P.firstAllowedPage?.();
    if (fallback && fallback !== "dashboard") {
      setPage(fallback);
      return true;
    }
    return false;
  }

  P.setPage = setPage;
  P.showAccessDenied = showAccessDenied;
  P.showToast = showToast;
  P.updatePageMaintenanceNotice = updatePageMaintenanceNotice;
  P.updateGlobalPageHeading = updateGlobalPageHeading;
  P.bindNavigation = bindNavigation;
  P.routePage = routePage;
  P.restoreInitialPage = restoreInitialPage;
})();
