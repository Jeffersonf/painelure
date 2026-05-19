(function () {
  const P = window.PainelURE;
  const renderedPages = new Set();
  const THEME_KEY = "painelure2_theme";

  const PAGE_RENDERERS = {
    dashboard(data) {
      P.renderDashboard(data);
    },
    user(data) {
      P.renderUser?.(data);
    },
    "school-detail"() {},
    "supervisor-detail"() {},
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
    cars(data) {
      P.renderCars(data);
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
    const data = P.scopedData?.(P.getAppData()) || P.getAppData();
    renderer(data);
    renderedPages.add(id);
    P.applyAccessState?.();
  }

  function renderApp() {
    renderedPages.clear();
    const active = location.hash.replace("#", "") || "dashboard";
    renderPage(active, { force: true });
  }

  function refreshRenderedPages() {
    P.bindMonthControls?.();
    renderPage("dashboard", { force: true });
    [...renderedPages].forEach(id => renderPage(id, { force: true }));
  }

  function loadSourcesInBackground() {
    const run = () => {
      P.loadConfiguredSources()
        .then(() => {
          refreshRenderedPages();
          P.renderSourceStatus?.();
        })
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

  function loadBackendInBackground() {
    if (!P.loadBackendData) return;

    const run = () => {
      let token = "";
      try {
        token = localStorage.getItem("painelure2_backend_token") || sessionStorage.getItem("painelure2_backend_token") || "";
      } catch (error) {}
      if (!token) return;
      P.loadBackendData(token)
        .then(payload => {
          if (payload?.data?.appData) {
            refreshRenderedPages();
          }
        })
        .catch(error => {
          console.warn("[PainelURE] Backend carregando em segundo plano:", error);
        });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 1600 });
      return;
    }

    window.setTimeout(run, 300);
  }

  function applyTheme(theme) {
    const selectedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = selectedTheme;

    const button = document.getElementById("themeBtn");
    if (button) {
      const light = selectedTheme === "light";
      button.innerHTML = light ? "&#127769;" : "&#9728;&#65039;";
      button.setAttribute("aria-label", light ? "Usar tema escuro" : "Usar tema claro");
      button.setAttribute("aria-pressed", String(light));
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", selectedTheme === "light" ? "#f7f9fc" : "#08090d");
    }
  }

  function bindTheme() {
    let savedTheme = "dark";
    try {
      savedTheme = localStorage.getItem(THEME_KEY) || "dark";
    } catch (error) {}

    applyTheme(savedTheme);

    const button = document.getElementById("themeBtn");
    if (!button) return;

    button.addEventListener("click", () => {
      const currentTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      const nextTheme = currentTheme === "light" ? "dark" : "light";
      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch (error) {}
      applyTheme(nextTheme);
    });
  }

  function init() {
    bindTheme();
    P.bindMonthControls?.();
    P.renderPage("dashboard");
    P.bindNavigation({
      onContactSector: sector => {
        renderedPages.add("contacts");
        P.renderContacts(P.getAppData().contacts, sector);
      }
    });
    P.bindAdminTools();
    P.restoreBackendSession?.();
    P.bindSearch();
    P.restoreInitialPage() || P.setPage("dashboard");
    loadBackendInBackground();
    loadSourcesInBackground();
  }

  P.renderPage = renderPage;
  P.renderApp = renderApp;
  init();
})();
