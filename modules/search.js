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

  function searchableItems() {
    const activePage = P.$(".page.active");
    if (!activePage) return [];
    return P.$all("[data-search]", activePage);
  }

  function ensureSearchEmpty(activePage) {
    let empty = P.$(".search-empty", activePage);
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "empty-state search-empty";
      empty.textContent = "Nenhum resultado encontrado nesta página.";
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
    searchableItems().forEach(item => item.classList.remove("is-hidden"));
    P.$all(".search-empty").forEach(item => item.classList.remove("show"));
  }

  function bindSearch() {
    P.$(".sidebar-search input")?.addEventListener("input", event => {
      applySearch(event.target.value);
    });
  }

  P.normalize = normalize;
  P.searchText = searchText;
  P.applySearch = applySearch;
  P.clearSearch = clearSearch;
  P.bindSearch = bindSearch;
})();
