(function () {
  const P = window.PainelURE;
  const renderedPages = new Set();

  const PAGE_RENDERERS = {
    dashboard(data) {
      P.renderDashboard(data);
    },
    schools(data) {
      P.renderSchools(data.schools);
    },
    network(data) {
      P.renderNetworkOptions(data.networkData);
    },
    inventory(data) {
      P.renderInventory(data);
    },
    supervision(data) {
      P.renderSupervisors(data.supervisors);
    },
    contacts(data) {
      P.renderContacts(data.contacts);
    },
    calendar(data) {
      P.renderCalendar(data.calendar);
    },
    profiles(data) {
      P.renderProfiles(data.profiles);
    },
    quality(data) {
      P.renderQuality(data.quality);
    },
    ctc(data) {
      P.renderCtc(data.ctcVisits);
    },
    calls(data) {
      P.renderCalls(data.calls);
    },
    reports(data) {
      P.renderReports(data);
    },
    admin(data) {
      P.renderAdmin(data.adminChecks);
    }
  };

  function renderPage(id, options = {}) {
    const renderer = PAGE_RENDERERS[id];
    if (!renderer) return;
    if (!options.force && renderedPages.has(id)) return;
    const data = P.getAppData();
    renderer(data);
    renderedPages.add(id);
  }

  function renderApp() {
    renderedPages.clear();
    const active = location.hash.replace("#", "") || "dashboard";
    renderPage(active, { force: true });
  }

  function refreshRenderedPages() {
    renderPage("dashboard", { force: true });
    [...renderedPages].forEach(id => renderPage(id, { force: true }));
  }

  function loadSourcesInBackground() {
    const run = () => {
      P.loadConfiguredSources()
        .then(() => refreshRenderedPages())
        .catch(error => {
          console.warn("[PainelURE] Fontes oficiais carregam em segundo plano:", error);
        });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 2500 });
      return;
    }

    window.setTimeout(run, 1200);
  }

  async function init() {
    P.renderPage("dashboard");
    P.bindNavigation({
      onContactSector: sector => {
        renderedPages.add("contacts");
        P.renderContacts(P.getAppData().contacts, sector);
      }
    });
    P.bindAdminTools();
    P.bindSearch();
    P.restoreInitialPage() || P.setPage("dashboard");
    loadSourcesInBackground();
  }

  P.renderPage = renderPage;
  P.renderApp = renderApp;
  init();
})();
