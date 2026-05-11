(function () {
  const P = window.PainelURE;

  function parseCsvLine(line, delimiter) {
    const cells = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i++;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === delimiter && !quoted) {
        cells.push(cell.trim());
        cell = "";
        continue;
      }

      cell += char;
    }

    cells.push(cell.trim());
    return cells;
  }

  function detectDelimiter(text) {
    const firstLine = text.split(/\r?\n/).find(line => line.trim()) || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    return semicolonCount > commaCount ? ";" : ",";
  }

  function normalizeHeader(header) {
    return P.normalize(header)
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function parseCsv(text, options = {}) {
    const delimiter = options.delimiter || detectDelimiter(text);
    const lines = String(text || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(line => line.trim());

    if (!lines.length) return [];

    const headerCounts = {};
    const headers = parseCsvLine(lines[0], delimiter).map(header => {
      const base = normalizeHeader(header) || "col";
      headerCounts[base] = (headerCounts[base] || 0) + 1;
      return headerCounts[base] === 1 ? base : `${base}_${headerCounts[base]}`;
    });
    return lines.slice(1).map(line => {
      const cells = parseCsvLine(line, delimiter);
      return headers.reduce((row, header, index) => {
        row[header || `col_${index}`] = cells[index] ?? "";
        return row;
      }, {});
    });
  }

  async function fetchCsv(url, options = {}) {
    if (!url) throw new Error("Fonte CSV nao configurada.");
    const timeoutMs = options.timeoutMs || 6000;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { cache: "no-store", signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`Erro ao carregar CSV: ${response.status}`);
    return parseCsv(await response.text());
  }

  P.parseCsv = parseCsv;
  P.fetchCsv = fetchCsv;
})();
