(function () {
  const P = window.PainelURE;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function searchText(values) {
    return normalize(values.filter(Boolean).join(" "));
  }

  function schoolCity(item = {}) {
    return item.city || item.municipio || item.cidade || item.town || item.municipality || "";
  }

  function schoolCie(item = {}) {
    return item.cie || item.codigoCie || item.codigo_cie || item.code || item.codigo || "";
  }

  function schoolNote(item = {}) {
    const city = schoolCity(item) || "Munic\u00edpio n\u00e3o informado";
    const cie = schoolCie(item);
    return cie ? `${city} | CIE ${cie}` : city;
  }

  function searchableItems() {
    const activePage = P.$(".page.active");
    if (!activePage) return [];
    return P.$all("[data-search]", activePage);
  }

  function globalItems() {
    const data = P.scopedData?.(P.getAppData()) || P.getAppData();
    const pages = [
      "dashboard",
      "schools",
      "network",
      "inventory",
      "supervision",
      "contacts",
      "calendar",
      "ctc",
      "cars",
      "calls",
      "satisfaction",
      "reports"
    ].map(page => {
      const meta = P.pageMeta(page);
      return { page, title: meta.label, type: meta.type, note: meta.note };
    });
    return [
      ...pages,
      ...(data.schools || []).map(item => ({ page: "schools", title: item.name, type: "Escola", note: schoolNote(item), focus: item.name })),
      ...Object.keys(data.networkData || {}).map(name => ({ page: "network", title: name, type: "Rede", note: "Infraestrutura e câmeras", focus: name })),
      ...(data.schoolAssets || []).map(item => ({
        page: "inventory",
        title: item.sourceName || item.name,
        type: "Inventário",
        note: `${item.school} | ${item.status}`,
        focus: searchText([item.school, item.sourceName || item.name, item.notes]),
        school: item.school
      })),
      ...(data.supervisors || []).map(item => ({ page: "supervision", title: item.name, type: "Supervisão", note: item.email || `${item.schools} escola(s)`, focus: item.name })),
      ...(data.contacts || []).map(item => ({ page: "contacts", title: item.name, type: item.sector, note: item.role || item.email, focus: item.name, sector: item.sector })),
      ...(data.calendar || []).map(item => ({ page: "calendar", title: item.label, type: "Calendario", note: item.note || item.value, focus: searchText([item.label, item.value]) })),
      ...(data.ctcVisits || []).map(item => ({
        page: "ctc",
        title: `${item.owner} em ${item.place}`,
        type: "CTC",
        note: `${item.date} ${item.time} | ${item.objective}`,
        focus: searchText([item.owner, item.date, item.time, item.place])
      })),
      ...(P.carBookings?.(data) || []).map(item => {
        const details = P.canViewCarBookingDetails ? P.canViewCarBookingDetails(item) : true;
        return {
          page: "cars",
          title: details ? `${item.vehicle} - ${item.destination || item.requester || "Agendamento"}` : `${item.vehicle} - ${item.time || "Horario a definir"}`,
          type: "Carros",
          note: details ? `${item.date || "sem data"} ${item.time || ""} | ${item.status || "pendente"}` : `${item.date || "sem data"} ${item.time || ""}`,
          focus: details ? searchText([item.vehicle, item.date, item.time, item.destination, item.requester]) : searchText([item.vehicle, item.date, item.time])
        };
      }),
      ...(data.calls || []).map(item => ({ page: "calls", title: item.title, type: "Chamado", note: item.school || item.status, focus: item.title })),
      ...(data.satisfaction || []).map(item => ({
        page: "satisfaction",
        title: item.title,
        type: "Pesquisa",
        note: item.audience || item.status || item.period,
        focus: searchText([item.title, item.audience, item.status, item.period])
      }))
    ].filter(item => !P.canAccess || P.canAccess(item.page));
  }

  function hideGlobalResults() {
    const host = P.$("#globalSearchResults");
    if (host) {
      host.classList.remove("show");
      host.innerHTML = "";
    }
  }

  function renderGlobalResults(rawQuery) {
    const host = P.$("#globalSearchResults");
    if (!host) return;
    const query = normalize(rawQuery);
    if (!query) {
      hideGlobalResults();
      return;
    }
    const results = globalItems()
      .filter(item => searchText([item.title, item.type, item.note]).includes(query))
      .slice(0, 8);
    host.innerHTML = results.length ? results.map(item => `
      <button type="button" data-global-page="${item.page}" data-global-focus="${item.focus || ""}" data-global-sector="${item.sector || ""}" data-global-school="${item.school || ""}">
        <span>${item.type}</span>
        <strong>${item.title}</strong>
        <small>${item.note || ""}</small>
      </button>
    `).join("") : `<div class="global-empty">Nenhum resultado global.</div>`;
    host.classList.add("show");
  }

  function ensureSearchEmpty(activePage) {
    let empty = P.$(".search-empty", activePage);
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "empty-state search-empty";
      empty.textContent = "Nenhum resultado encontrado nesta pagina.";
      activePage.appendChild(empty);
    }
    return empty;
  }

  function applySearch(rawQuery) {
    const activePage = P.$(".page.active");
    if (!activePage) return;
    const query = normalize(rawQuery);
    const items = searchableItems();
    if (!items.length) return;

    let visibleCount = 0;
    items.forEach(item => {
      const visible = !query || item.dataset.search.includes(query);
      item.classList.toggle("is-hidden", !visible);
      if (visible) visibleCount++;
    });

    ensureSearchEmpty(activePage).classList.toggle("show", !!query && visibleCount === 0);
  }

  function clearSearch() {
    const input = P.$(".sidebar-search input");
    if (input) input.value = "";
    hideGlobalResults();
    searchableItems().forEach(item => item.classList.remove("is-hidden"));
    P.$all(".search-empty").forEach(item => item.classList.remove("show"));
  }

  function bindSearch() {
    P.$(".sidebar-search input")?.addEventListener("input", event => {
      applySearch(event.target.value);
      renderGlobalResults(event.target.value);
    });
    document.addEventListener("click", event => {
      const result = event.target.closest("[data-global-page]");
      if (result) {
        const page = result.dataset.globalPage;
        const focus = result.dataset.globalFocus;
        const sector = result.dataset.globalSector;
        const school = result.dataset.globalSchool;
        P.setPage?.(page);
        requestAnimationFrame(() => {
          if (focus && page === "schools") P.focusSchool?.(focus);
          if (focus && page === "network") P.focusNetworkSchool?.(focus);
          if (focus && page === "inventory") P.focusInventoryAsset?.(focus, school);
          if (focus && page === "supervision") P.focusSupervisor?.(focus);
          if (focus && page === "contacts") P.focusContact?.(focus, sector);
          if (focus && page === "calendar") P.focusCalendarItem?.(focus);
          if (focus && page === "ctc") P.focusCtcVisit?.(focus);
          if (focus && page === "cars") P.focusCarBooking?.(focus);
          if (focus && page === "calls") P.focusCall?.(focus);
        });
        clearSearch();
        return;
      }
      if (!event.target.closest(".sidebar-search") && !event.target.closest("#globalSearchResults")) hideGlobalResults();
    });
  }

  P.normalize = normalize;
  P.searchText = searchText;
  P.applySearch = applySearch;
  P.clearSearch = clearSearch;
  P.bindSearch = bindSearch;
  P.renderGlobalResults = renderGlobalResults;
})();
