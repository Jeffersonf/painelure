(function () {
  "use strict";
  const P = window.PainelURE;
  const core = P.networkImport;
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let workbook = null, pending = null, reading = 0, busy = false;
  const canImport = () => P.canAccess?.("admin") === true;
  const el = id => document.getElementById(id);
  const status = message => { el("networkImportStatus").textContent = message; };
  let library;
  function loadLibrary() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!library) library = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "./vendor/xlsx.full.min.js";
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => { library = null; script.remove(); reject(new Error("Não foi possível carregar o leitor. Tente novamente.")); };
      document.head.appendChild(script);
    });
    return library;
  }
  function clearPreview() {
    pending = null;
    el("networkImportPreview").replaceChildren();
    el("networkImportApply").disabled = true;
  }
  function cancel() {
    reading++;
    workbook = null;
    clearPreview();
    el("networkImportFile").value = "";
    el("networkImportSheetLabel").hidden = true;
    status("Importação cancelada. Nenhum dado alterado.");
  }
  function preview() {
    clearPreview();
    try {
      const sheet = workbook.Sheets[el("networkImportSheet").value];
      const matrix = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false });
      const headerIndex = matrix.slice(0, 20).findIndex(row => row.some(value => [...core.fields.school, ...core.fields.cie].some(alias => core.key(alias) === core.key(value))));
      if (headerIndex < 0) throw new Error("Cabeçalho não encontrado. A aba precisa ter Escola ou Código CIE.");
      const headers = matrix[headerIndex];
      const rows = core.selectRows(matrix.slice(headerIndex + 1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]))));
      const result = core.normalize(rows, P.getAppData());
      const entries = Object.entries(result.updates);
      const missing = entries.filter(([, r]) => !r.cameraMetrics.valid).length;
      el("networkImportPreview").innerHTML = `<p><strong>${entries.length} escolas reconhecidas.</strong> ${result.ignored} linhas ignoradas (vazias ou Diretoria). ${missing} escolas com quantidades ausentes ou inconsistentes.</p>
        <p>As escolas listadas terão seus dados de rede e câmeras atualizados. Escolas ausentes do arquivo serão mantidas. Usuários e senhas não serão importados.</p>
        ${result.issues.length ? `<p role="alert">Corrija o arquivo antes de aplicar:</p><ul>${result.issues.map(issue => `<li>${escape(issue)}</li>`).join("")}</ul>` : ""}
        <div class="network-import-table"><table><thead><tr><th>Escola</th><th>Instaladas</th><th>Funcionando</th><th>Situação</th></tr></thead><tbody>${entries.map(([name, r]) => `<tr><td>${escape(name)}</td><td>${r.cameraMetrics.installed ?? "Não informado"}</td><td>${r.cameraMetrics.working ?? "Não informado"}</td><td>${r.cameraMetrics.valid ? (r.cameraMetrics.installed === r.cameraMetrics.working ? "Em funcionamento" : "Câmeras paradas") : "Revisar quantidades"}</td></tr>`).join("")}</tbody></table></div>`;
      if (entries.length && !result.issues.length) pending = { rows };
      el("networkImportApply").disabled = !pending || !canImport();
      status(pending ? "Confira a prévia e clique em Aplicar importação." : "Nenhum dado alterado. Verifique os avisos da prévia.");
    } catch (error) { status(error.message); }
  }
  async function readFile(event) {
    if (!canImport() || busy) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const generation = ++reading;
    clearPreview();
    workbook = null;
    el("networkImportSheetLabel").hidden = true;
    status("Lendo arquivo no navegador…");
    try {
      if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error("Selecione um arquivo .xlsx ou .csv.");
      if (file.size > 10 * 1024 * 1024) throw new Error("O limite é 10 MB por arquivo.");
      const X = await loadLibrary();
      const bytes = await file.arrayBuffer();
      if (generation !== reading) return;
      let input = bytes, options = { type: "array", sheetRows: 2022 };
      if (/\.csv$/i.test(file.name)) {
        try { input = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
        catch (_) { input = new TextDecoder("windows-1252").decode(bytes); }
        options = { type: "string", raw: true, sheetRows: 2022 };
      }
      workbook = X.read(input, options);
      const select = el("networkImportSheet");
      select.replaceChildren(...workbook.SheetNames.map(name => new Option(name, name)));
      el("networkImportSheetLabel").hidden = workbook.SheetNames.length < 2;
      preview();
    } catch (error) { if (generation === reading) status(`Falha na leitura: ${error.message}`); }
    finally { event.target.value = ""; }
  }
  async function apply() {
    if (!pending || busy || !canImport()) return;
    busy = true;
    el("networkImportApply").disabled = true;
    el("networkImportFile").disabled = true;
    el("networkImportCancel").disabled = true;
    el("networkImportSheet").disabled = true;
    status("Salvando dados no painel…");
    try {
      const payload = await P.importNetworkRows(sessionStorage.getItem("painelure2_backend_token") || "", pending.rows);
      P.setAppData({ ...P.getAppData(), networkData: payload.networkData, networkImportMeta: payload.meta });
      P.backendStatus = { ok: true, updatedAt: payload.updatedAt };
      P.saveAppData();
      workbook = null;
      clearPreview();
      el("networkImportSheetLabel").hidden = true;
      P.renderApp?.();
      status("Importação salva no painel. O arquivo não foi armazenado.");
    } catch (error) {
      status(`Não foi possível confirmar a gravação: ${error.message}. A prévia foi mantida para tentar novamente.`);
    } finally {
      busy = false;
      el("networkImportApply").disabled = !pending || !canImport();
      el("networkImportFile").disabled = false;
      el("networkImportCancel").disabled = false;
      el("networkImportSheet").disabled = false;
    }
  }
  function render(data) {
    if (!el("networkDashboard")) return;
    el("networkImportControls").hidden = !canImport();
    const summary = core.summary(data.networkData);
    const number = n => n === null ? "—" : n;
    const partial = summary.valid < summary.schools ? " (parcial)" : "";
    const cards = [["Escolas mapeadas", summary.schools], [`Câmeras instaladas${partial}`, summary.valid ? summary.installed : null], [`Funcionando${partial}`, summary.valid ? summary.working : null], [`Paradas${partial}`, summary.valid ? summary.stopped : null], [`Em funcionamento${partial}`, summary.percent === null ? null : `${summary.percent}%`]];
    el("networkDashboard").innerHTML = cards.map(([label, value]) => `<article class="network-kpi"><small>${label}</small><strong>${number(value)}</strong></article>`).join("");
    const meta = data.networkImportMeta;
    el("networkImportLast").textContent = `${meta?.importedAt ? `Última importação: ${new Date(meta.importedAt).toLocaleString("pt-BR")}. ` : "Nenhuma importação manual registrada. "}Totais calculados sobre ${summary.valid} de ${summary.schools} escolas com quantidades válidas. Atualização manual: selecione um novo arquivo quando houver alterações.`;
  }
  function bind() {
    el("networkImportFile")?.addEventListener("change", readFile);
    el("networkImportSheet")?.addEventListener("change", preview);
    el("networkImportCancel")?.addEventListener("click", cancel);
    el("networkImportApply")?.addEventListener("click", apply);
  }
  P.renderNetworkDashboard = render;
  P.bindNetworkImport = bind;
})();
