(function () {
  const P = window.PainelURE;

  function pageId(id) {
    return `page-${id}`;
  }

  function setPage(id) {
    if (P.canAccess && !P.canAccess(id)) id = "dashboard";
    P.renderPage?.(id);
    P.$all(".page").forEach(page => page.classList.toggle("active", page.id === pageId(id)));
    P.$all("[data-page]").forEach(btn => btn.classList.toggle("active", btn.dataset.page === id));
    history.replaceState(null, "", `#${id}`);
    P.clearSearch();
    window.scrollTo(0, 0);
  }

  function bindNavigation({ onContactSector }) {
    document.addEventListener("click", event => {
      const pageButton = event.target.closest("[data-page]");
      if (pageButton) {
        setPage(pageButton.dataset.page);
        return;
      }

      const jumpButton = event.target.closest("[data-jump]");
      if (jumpButton) {
        setPage(jumpButton.dataset.jump);
        return;
      }

      const sectorButton = event.target.closest("[data-sector]");
      if (sectorButton) {
        P.$all("[data-sector]").forEach(tab => tab.classList.toggle("active", tab === sectorButton));
        onContactSector(sectorButton.dataset.sector);
      }
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
  P.bindNavigation = bindNavigation;
  P.restoreInitialPage = restoreInitialPage;
})();
