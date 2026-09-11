(function () {
  const P = window.PainelURE;

  function pageId(id) {
    return `page-${id}`;
  }

  const PAGE_SLUGS = {
    dashboard: "painel",
    schools: "escolas",
    network: "redes",
    inventory: "equipamentos",
    supervision: "supervisao",
    contacts: "contatos",
    "rede-2026": "redes-2026",
    satisfaction: "pesquisa-de-satisfacao-presencial",
    "satisfaction-online": "pesquisa-de-satisfacao-online",
    internal: "cafe",
    cars: "carros",
    ctc: "ctc",
    calls: "chamados",
    admin: "admin",
    user: "conta",
    profiles: "perfis",
    quality: "qualidade"
  };
  const PAGE_BY_SLUG = Object.fromEntries(Object.entries(PAGE_SLUGS).map(([page, slug]) => [slug, page]));
  PAGE_BY_SLUG.inventario = "inventory";
  PAGE_BY_SLUG["pesquisa-de-satisfacao"] = "satisfaction";
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
    if (location.protocol === "file:" && page !== "dashboard") {
      return `${location.pathname}${url.search}#${page}`;
    }
    return `${url.pathname}${url.search}`;
  }

  function pageLabel(page) {
    return P.pageMeta?.(page)?.label || page;
  }

  function showToast(title, message = "", tone = "info", options = {}) {
    if (options.id && (options.id.includes("sync") || options.id.startsWith("source-"))) {
      return showSyncProgress(options.progress ?? (tone === "ok" ? 100 : 50), title, message, tone, options);
    }
    let stack = P.$("#toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const icons = { ok: "OK", warn: "!", danger: "!", info: "i" };
    const requestedDelay = Number(options.delay || 12000);
    const delay = Math.min(30000, Math.max(2500, Number.isFinite(requestedDelay) ? requestedDelay : 12000));
    const progress = Number.isFinite(Number(options.progress))
      ? Math.max(0, Math.min(100, Math.round(Number(options.progress))))
      : null;
    if (options.id) {
      const previous = document.getElementById(`toast-${options.id}`);
      if (previous) {
        window.clearTimeout(previous.removeTimer);
        previous.remove();
      }
    }
    const toast = document.createElement("div");
    toast.className = `app-toast toast-${tone || "info"}${progress !== null ? " toast-with-progress" : ""}`;
    if (options.id) toast.id = `toast-${options.id}`;
    toast.setAttribute("role", tone === "danger" ? "alert" : "status");
    toast.style.setProperty("--toast-delay", `${delay}ms`);
    toast.innerHTML = `
      <i aria-hidden="true">${icons[tone] || icons.info}</i>
      <span class="toast-copy">
        <strong>${title || "Aviso"}</strong>
        ${message ? `<span>${message}</span>` : ""}
      </span>
      <button type="button" aria-label="Fechar aviso">x</button>
      ${progress !== null ? `
        <span class="toast-progress-copy"><span>Progresso da sincronização</span><strong>${progress}%</strong></span>
        <b class="toast-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></b>
      ` : ""}
      <b class="toast-life" aria-hidden="true"></b>
    `;
    let closing = false;
    const dismiss = () => {
      if (closing || !toast.isConnected) return;
      closing = true;
      window.clearTimeout(toast.removeTimer);
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 180);
    };
    toast.querySelector("button")?.addEventListener("click", dismiss);
    toast.querySelector(".toast-life")?.addEventListener("animationend", dismiss, { once: true });
    stack.appendChild(toast);
    window.setTimeout(() => toast.classList.add("show"), 20);
    toast.removeTimer = window.setTimeout(dismiss, delay);
    return toast;
  }

  const SYNC_ICONS = {
    session: "🛡️",
    server: "🌐",
    supervision: "🧭",
    schools: "🏫",
    contacts: "📞",
    network: "📡",
    calendar: "📅",
    cars: "🚗",
    inventory: "💻",
    ctc: "📥",
    calls: "📥",
    satisfaction: "📝"
  };

  const syncWidgetState = {
    progress: 0,
    title: "Sincronizando dados",
    message: "Aguarde enquanto as informações oficiais são verificadas.",
    tone: "info",
    items: new Map(),
    dismissTimer: null
  };

  function dismissSyncWidget() {
    const widget = document.getElementById("syncWidget");
    if (!widget) return;
    window.clearTimeout(syncWidgetState.dismissTimer);
    widget.classList.remove("show");
    widget.classList.add("hiding");
    window.setTimeout(() => {
      widget.remove();
      syncWidgetState.items.clear();
      syncWidgetState.progress = 0;
    }, 280);
  }

  function renderSyncWidget() {
    let widget = document.getElementById("syncWidget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "syncWidget";
      widget.className = "sync-widget";
      widget.setAttribute("role", "status");
      widget.setAttribute("aria-live", "polite");
      document.body.appendChild(widget);

      widget.addEventListener("click", event => {
        if (event.target.closest(".sync-close-btn")) {
          dismissSyncWidget();
        }
      });
    }

    const { progress, title, message, tone, items } = syncWidgetState;
    const isDone = Number(progress) >= 100;
    const percent = Math.max(0, Math.min(100, Math.round(Number(progress))));

    widget.className = `sync-widget sync-widget-${tone || "info"}${isDone ? " sync-widget-done" : ""}`;

    const itemsHtml = [...items.values()].map(item => {
      const icon = item.icon || SYNC_ICONS[item.key] || "📊";
      let statusLabel = "Na fila";
      let statusClass = "pending";
      let barWidth = "0%";

      if (item.status === "loading") {
        statusLabel = "Carregando...";
        statusClass = "loading";
        barWidth = "65%";
      } else if (item.status === "done" || item.status === "loaded" || item.status === "ok") {
        statusLabel = item.detail || "✓ OK";
        statusClass = "done";
        barWidth = "100%";
      } else if (item.status === "warn" || item.status === "empty") {
        statusLabel = item.detail || "Sem novos dados";
        statusClass = "warn";
        barWidth = "100%";
      } else if (item.status === "error") {
        statusLabel = item.detail || "Falha";
        statusClass = "error";
        barWidth = "100%";
      }

      return `
        <div class="sync-item sync-item-${statusClass}" data-key="${item.key}">
          <div class="sync-item-header">
            <span class="sync-item-label"><span class="sync-item-emoji">${icon}</span> ${item.label}</span>
            <span class="sync-item-badge ${statusClass}">${statusLabel}</span>
          </div>
          <div class="sync-item-track">
            <div class="sync-item-bar" style="width: ${barWidth};"></div>
          </div>
        </div>
      `;
    }).join("");

    widget.innerHTML = `
      <div class="sync-widget-head">
        <div class="sync-widget-icon">
          ${isDone 
            ? `<span class="sync-icon-done">✓</span>` 
            : `<span class="sync-spinner"></span>`}
        </div>
        <div class="sync-widget-titles">
          <strong>${title}</strong>
          <span>${message}</span>
        </div>
        <div class="sync-widget-actions">
          <span class="sync-percent-pill">${percent}%</span>
          <button type="button" class="sync-close-btn" aria-label="Fechar notificação">✕</button>
        </div>
      </div>
      <div class="sync-overall-track" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="sync-overall-fill ${tone}" style="width: ${percent}%;"></div>
      </div>
      ${items.size ? `<div class="sync-items-container">${itemsHtml}</div>` : ""}
    `;

    requestAnimationFrame(() => {
      widget.classList.add("show");
    });
  }

  function showSyncProgress(progress, title, message, tone = "info", options = {}) {
    window.clearTimeout(syncWidgetState.dismissTimer);

    syncWidgetState.progress = progress;
    if (title) syncWidgetState.title = title;
    if (message) syncWidgetState.message = message;
    syncWidgetState.tone = tone;

    if (Array.isArray(options.items)) {
      options.items.forEach(item => {
        if (!syncWidgetState.items.has(item.key)) {
          syncWidgetState.items.set(item.key, {
            key: item.key,
            label: item.label,
            status: item.status || "pending",
            detail: item.detail || "",
            icon: item.icon || SYNC_ICONS[item.key]
          });
        }
      });
    }

    if (options.itemKey) {
      const existing = syncWidgetState.items.get(options.itemKey) || {};
      syncWidgetState.items.set(options.itemKey, {
        key: options.itemKey,
        label: options.itemLabel || existing.label || options.itemKey,
        status: options.itemStatus || existing.status || "loading",
        detail: options.itemDetail !== undefined ? options.itemDetail : (existing.detail || ""),
        icon: options.itemIcon || existing.icon || SYNC_ICONS[options.itemKey]
      });
    }

    renderSyncWidget();

    const isDone = Number(progress) >= 100;
    if (isDone) {
      const delay = Number(options.delay || 4000);
      syncWidgetState.dismissTimer = window.setTimeout(dismissSyncWidget, delay);
    }

    return document.getElementById("syncWidget");
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
  P.showSyncProgress = showSyncProgress;
  P.updatePageMaintenanceNotice = updatePageMaintenanceNotice;
  P.updateGlobalPageHeading = updateGlobalPageHeading;
  P.bindNavigation = bindNavigation;
  P.routePage = routePage;
  P.restoreInitialPage = restoreInitialPage;
})();
