(function () {
  const P = window.PainelURE;

  function pageId(id) {
    return `page-${id}`;
  }

  let previousPage = "dashboard";

  function pageLabel(page) {
    return P.pageMeta?.(page)?.label || page;
  }

  function accessDeniedMessage(id) {
    const role = P.currentRole?.() || "Consulta";
    const available = P.allowedPageLabels?.(role) || (P.roleAccess?.(role) || []).map(page => pageLabel(page)).join(", ");
    return `Acesso negado a ${pageLabel(id)}. Categorias disponiveis para seu perfil: ${available || "nenhuma categoria liberada"}.`;
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
    P.applyAccessState?.();
    history.replaceState(null, "", `#${id}`);
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
        setPage(jumpButton.dataset.jump);
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
    const initial = location.hash.replace("#", "");
    if (initial && P.$(`#${pageId(initial)}`)) {
      setPage(initial);
      return true;
    }
    return false;
  }

  P.setPage = setPage;
  P.showAccessDenied = showAccessDenied;
  P.bindNavigation = bindNavigation;
  P.restoreInitialPage = restoreInitialPage;
})();
