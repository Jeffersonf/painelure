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
    "bi-equipment": "bi-equipamentos",
    supervision: "supervisao",
    contacts: "contatos",
    calendar: "calendario",
    satisfaction: "pesquisa-de-satisfacao",
    internal: "cafe",
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
  PAGE_BY_SLUG.interno = "internal";

  let previousPage = "dashboard";

  function canonicalPage(id) {
    return id === "calls" ? "ctc" : id;
  }

  function routeBase() {
    const path = location.pathname.replace(/\/+$/, "");
    const marker = "/painelure";
    const index = path.toLowerCase().indexOf(marker);
    if (index >= 0) return path.slice(0, index + marker.length);
    return "";
  }

  function routePage() {
    const hashPage = canonicalPage(location.hash.replace("#", ""));
    const params = new URLSearchParams(location.search);
    const queryPage = params.get("categoria") || params.get("tela") || "";
    const normalizedQueryPage = canonicalPage(PAGE_BY_SLUG[queryPage] || queryPage);
    const base = routeBase();
    let path = location.pathname;
    if (base && path.toLowerCase().startsWith(base.toLowerCase())) {
      path = path.slice(base.length);
    }
    const segment = path.replace(/^\/+|\/+$/g, "").split("/")[0];
    const page = canonicalPage(segment === "acesso-admin" ? "dashboard" : (PAGE_BY_SLUG[segment] || segment));
    if (normalizedQueryPage && P.$(`#${pageId(normalizedQueryPage)}`)) return normalizedQueryPage;
    if (page && P.$(`#${pageId(page)}`)) return page;
    if (hashPage && P.$(`#${pageId(hashPage)}`)) return hashPage;
    return "";
  }

  function pageRoute(id) {
    const page = canonicalPage(id || "dashboard");
    const url = new URL(location.href);
    const base = routeBase();
    const slug = PAGE_SLUGS[page] || page;
    url.hash = "";
    url.searchParams.delete("tela");
    url.searchParams.delete("categoria");
    url.searchParams.delete("v");
    if (page === "dashboard") {
      url.pathname = base ? `${base}/` : "/";
    } else {
      url.pathname = base ? `${base}/${slug}` : `/${slug}`;
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
    const icons = { ok: "OK", warn: "!", danger: "!", info: "i" };
    const delay = Number(options.delay || 7600);
    const toast = document.createElement("div");
    toast.className = `app-toast toast-${tone || "info"}`;
    toast.setAttribute("role", tone === "danger" ? "alert" : "status");
    toast.style.setProperty("--toast-delay", `${delay}ms`);
    toast.innerHTML = `
      <i aria-hidden="true">${icons[tone] || icons.info}</i>
      <span class="toast-copy">
        <strong>${title || "Aviso"}</strong>
        ${message ? `<span>${message}</span>` : ""}
      </span>
      <button type="button" aria-label="Fechar aviso">x</button>
      <b class="toast-life" aria-hidden="true"></b>
    `;
    toast.querySelector("button")?.addEventListener("click", () => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 180);
    });
    stack.appendChild(toast);
    window.setTimeout(() => toast.classList.add("show"), 20);
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

  function isAdminRole() {
    const role = P.currentRole?.() || "";
    const key = P.roleKey?.(role) || "";
    const text = P.normalize?.(role) || String(role || "").toLowerCase();
    return key === "Administrador" || text.includes("administrador") || text.includes("admin");
  }

  function canOpenPage(target) {
    if (target === "admin" && isAdminRole()) return true;
    return !P.canAccess || P.canAccess(target);
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
    const target = canonicalPage(id || "dashboard");
    if (!canOpenPage(target)) {
      showAccessDenied(target);
      return false;
    }
    if (target === "admin") document.documentElement.dataset.presentation = "false";
    const active = P.$(".page.active");
    const activeId = active?.id?.replace("page-", "");
    if (activeId && activeId !== target) previousPage = activeId;
    P.$all(".page").forEach(page => page.classList.toggle("active", page.id === pageId(target)));
    P.$all("[data-page]").forEach(btn => btn.classList.toggle("active", canonicalPage(btn.dataset.page) === target));
    updateGlobalPageHeading(target);
    updatePageMaintenanceNotice(target);
    P.applyAccessState?.();
    history.replaceState(null, "", pageRoute(target));
    P.clearSearch();
    window.scrollTo(0, 0);
    try {
      P.renderPage?.(target, { force: true });
    } catch (error) {
      console.error(`[PainelURE] Falha ao abrir ${target}:`, error);
      P.showToast?.("Erro ao abrir categoria", `Não foi possível renderizar ${pageLabel(target)} agora.`, "danger", { delay: 9000 });
    }
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
        if (event.target.closest(".avatar") && (!P.canAccess || P.canAccess("admin"))) {
          setPage("admin");
          P.closeAccountMenu?.();
          return;
        }
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
