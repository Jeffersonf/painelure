(function () {
  const P = window.PainelURE;
  const MONTH_KEY = "painelure2_month";
  const MONTHS = [
    "Janeiro",
    "Fevereiro",
    "Marco",
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
    const buttons = [
      ...(P.$all?.("[data-month-current]") || []),
      ...(P.$all?.("#currentMonthBtn") || [])
    ];
    buttons.forEach(button => {
      if (button) button.textContent = monthLabel();
    });
    const note = P.$?.("#monthScopeNote");
    if (note) {
      const selected = selectedMonthKey();
      const supervisionMonth = P.sources?.supervision?.monthKey || "";
      const calendarReady = Boolean(P.sources?.calendar?.url);
      const carsReady = Boolean(P.sources?.cars?.url);
      const details = [
        "Painel, carros, agenda e CTC filtram por data.",
        supervisionMonth && supervisionMonth !== selected ? `Supervisão oficial disponível em ${monthLabel(supervisionMonth)}.` : "Supervisão usa o mês selecionado quando houver fonte mensal.",
        !calendarReady && "Calendario oficial pendente: agenda usa fallback operacional.",
        !carsReady && "Carros usa base local ate conectar fonte oficial."
      ].filter(Boolean);
      note.textContent = details.join(" ");
    }
  }

  function bindMonthControls() {
    updateMonthControls();
    const prevButtons = [
      ...(P.$all?.("[data-month-prev]") || []),
      ...(P.$all?.("#prevMonthBtn") || [])
    ];
    const nextButtons = [
      ...(P.$all?.("[data-month-next]") || []),
      ...(P.$all?.("#nextMonthBtn") || [])
    ];
    const currentButtons = [
      ...(P.$all?.("[data-month-current]") || []),
      ...(P.$all?.("#currentMonthBtn") || [])
    ];
    prevButtons.forEach(button => {
      if (!button || button.dataset.bound) return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => shiftMonth(-1));
    });
    nextButtons.forEach(button => {
      if (!button || button.dataset.bound) return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => shiftMonth(1));
    });
    currentButtons.forEach(button => {
      if (!button || button.dataset.bound) return;
      button.dataset.bound = "true";
      button.addEventListener("click", () => setSelectedMonth(monthKey(new Date())));
    });
  }

  P.selectedMonthKey = selectedMonthKey;
  P.selectedMonth = selectedMonth;
  P.selectedMonthLabel = monthLabel;
  P.setSelectedMonth = setSelectedMonth;
  P.shiftSelectedMonth = shiftMonth;
  P.bindMonthControls = bindMonthControls;
})();
