(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.PainelURE = root.PainelURE || {}).networkImport = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const code = value => String(value ?? "").trim().replace(/^0+/, "");
  const fields = {
    school: ["ESCOLA ESTADUAL", "Escola", "Unidade escolar"],
    cie: ["CODIGO CIE", "CODCIE", "CIE"],
    installed: ["Quantidade de câmeras instaladas", "Câmeras instaladas"],
    working: ["Quantidade de câmeras funcionando", "Câmeras funcionando"],
    mirrored: ["Data do Espelhamento"], technicians: ["Técnicos / Análista:"],
    adm: ["REDE ADM"], admGateway: ["GATEWAY ADM"], admMask: ["MASCARA ADM"],
    ped: ["REDE PED"], pedGateway: ["GATEWAY PED"], pedMask: ["MASCARA PED"],
    dvr1: ["VIDEO-DVR1"], dvr2: ["VIDEO-DVR2"], dvr3: ["VIDEO-DVR3 (Oficial_SEE)", "VIDEO-DVR3"],
    alarm: ["VIDEO-ALARME"], pedDvr1: ["PED -VIDEO-DVR1"], pedDvr2: ["PED -VIDEO-DVR2"],
    pedDvr3: ["PED -VIDEO-DVR3"], pedAlarm: ["PED -VIDEO-ALARME"],
    dns1: ["DNS PRIMARIO"], dns2: ["DNS-SECUNDARIO"]
  };
  // Only these columns leave the browser. Never forward the original rows or workbook.
  function selectRows(rows) {
    return rows.map(row => {
      const indexed = new Map(Object.entries(row).map(([name, value]) => [key(name), value]));
      return Object.fromEntries(Object.entries(fields).map(([name, aliases]) => {
        const value = [name, ...aliases].map(alias => indexed.get(key(alias))).find(v => v !== undefined && v !== null && String(v).trim() !== "");
        return [name, String(value ?? "").trim().slice(0, 1500)];
      }));
    });
  }
  function count(value) {
    const text = String(value ?? "").trim();
    if (!/^\d+$/.test(text)) return null;
    const n = Number(text);
    return Number.isSafeInteger(n) && n <= 100000 ? n : null;
  }
  function normalize(rows, appData) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 2000) throw new Error("Selecione uma aba com 1 a 2.000 linhas de dados.");
    const schools = appData.schools || [];
    const names = new Set([...schools.map(s => s.name), ...Object.keys(appData.networkData || {})].filter(Boolean));
    const byName = new Map();
    const byCie = new Map();
    const add = (map, id, name) => { if (id) map.set(id, map.has(id) && map.get(id) !== name ? null : name); };
    names.forEach(name => add(byName, key(name), name));
    schools.forEach(s => add(byCie, code(s.cie || s.codigoCie || s.codigo_cie), s.name));
    Object.entries(appData.networkData || {}).forEach(([name, record]) => {
      (Array.isArray(record.ips) ? record.ips : []).forEach(ip => {
        const match = String(ip).match(/^CIE\s*:\s*(\d+)\s*$/i);
        if (match) add(byCie, code(match[1]), name);
      });
    });
    const updates = Object.create(null), issues = [], seen = new Set();
    let ignored = 0;
    selectRows(rows).forEach((row, index) => {
      if (!row.school && !row.cie) { ignored++; return; }
      if (key(row.school) === "diretoria") { ignored++; return; }
      const name = row.cie ? byCie.get(code(row.cie)) : byName.get(key(row.school));
      if (!name) { issues.push(`Linha ${index + 2}: escola não vinculada ao cadastro (verifique o CIE).`); return; }
      if (seen.has(name)) { issues.push(`Linha ${index + 2}: escola repetida. Corrija a duplicidade.`); return; }
      seen.add(name);
      if (!Object.keys(fields).some(f => !["school", "cie"].includes(f) && row[f])) {
        issues.push(`Linha ${index + 2}: nenhum dado de rede ou câmera preenchido.`); return;
      }
      const installed = count(row.installed), working = count(row.working);
      const valid = installed !== null && working !== null && working <= installed;
      const list = pairs => pairs.filter(([f]) => row[f]).map(([f, label]) => `${label}: ${row[f]}`);
      updates[name] = {
        network: list([["adm", "Rede administrativa"], ["admGateway", "Gateway ADM"], ["admMask", "Máscara ADM"], ["ped", "Rede pedagógica"], ["pedGateway", "Gateway PED"], ["pedMask", "Máscara PED"]]),
        ips: list([["cie", "CIE"], ["dvr1", "VIDEO-DVR1"], ["dvr2", "VIDEO-DVR2"], ["dvr3", "VIDEO-DVR3"], ["alarm", "VIDEO-ALARME"], ["pedDvr1", "PED VIDEO-DVR1"], ["pedDvr2", "PED VIDEO-DVR2"], ["pedDvr3", "PED VIDEO-DVR3"], ["pedAlarm", "PED VIDEO-ALARME"], ["dns1", "DNS primário"], ["dns2", "DNS secundário"]]),
        cameras: list([["installed", "Instaladas / situação"], ["working", "Funcionando"], ["mirrored", "Último espelhamento"], ["technicians", "Técnicos / analistas"]]),
        cameraMetrics: { installed, working, valid }
      };
    });
    return { updates, issues, ignored };
  }
  function summary(networkData) {
    const entries = Object.values(networkData || {});
    const valid = entries.map(r => r.cameraMetrics).filter(m => m?.valid && Number.isSafeInteger(m.installed) && Number.isSafeInteger(m.working) && m.working >= 0 && m.installed >= m.working);
    const installed = valid.reduce((sum, m) => sum + m.installed, 0);
    const working = valid.reduce((sum, m) => sum + m.working, 0);
    return { schools: entries.length, valid: valid.length, installed, working, stopped: installed - working, percent: installed ? Math.round(working / installed * 100) : null };
  }
  return { key, fields, selectRows, normalize, summary };
});
