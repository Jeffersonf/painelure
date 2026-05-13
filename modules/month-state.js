(function () {
  const P = window.PainelURE;
  const MONTH_KEY = "painelure2_month";
  const MONTHS = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];

  function parseMonthKey(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return { year: Number(match[1]), month };
  }

  function monthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function selectedMonthKey() {
    try {
      const saved = localStorage.getItem(MONTH_KEY);
      if (parseMonthKey(saved)) return saved;
    } catch (error) {}
    return parseMonthKey(P.sources?.supervision?.monthKey) ? P.sources.supervision.monthKey : "2026-05";
  }

  function selectedMonth() {
    return parseMonthKey(selectedMonthKey()) || { year: 2026, month: 5 };
  }

  function monthLabel(key = selectedMonthKey()) {
    const parsed = parseMonthKey(key) || selectedMonth();
    return `${MONTHS[parsed.month - 1]} ${parsed.year}`;
  }

  function setSelectedMonth(key) {
    const parsed = parseMonthKey(key);
    if (!parsed) return selectedMonthKey();
    const next = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
    try {
      localStorage.setItem(MONTH_KEY, next);
    } catch (error) {}
    updateMonthControls();
    P.renderApp?.();
    return next;
  }

  function shiftMonth(delta) {
    const current = selectedMonth();
    const date = new Date(current.year, current.month - 1 + delta, 1);
    return setSelectedMonth(monthKey(date));
  }

  function updateMonthControls() {
    const button = P.$("#currentMonthBtn");
    if (button) button.textContent = monthLabel();
  }

  function bindMonthControls() {
    updateMonthControls();
    const prev = P.$("#prevMonthBtn");
    const next = P.$("#nextMonthBtn");
    const current = P.$("#currentMonthBtn");
    if (prev && !prev.dataset.bound) {
      prev.dataset.bound = "true";
      prev.addEventListener("click", () => shiftMonth(-1));
    }
    if (next && !next.dataset.bound) {
      next.dataset.bound = "true";
      next.addEventListener("click", () => shiftMonth(1));
    }
    if (current && !current.dataset.bound) {
      current.dataset.bound = "true";
      current.addEventListener("click", () => setSelectedMonth(monthKey(new Date())));
    }
  }

  P.selectedMonthKey = selectedMonthKey;
  P.selectedMonth = selectedMonth;
  P.selectedMonthLabel = monthLabel;
  P.setSelectedMonth = setSelectedMonth;
  P.shiftSelectedMonth = shiftMonth;
  P.bindMonthControls = bindMonthControls;
})();
