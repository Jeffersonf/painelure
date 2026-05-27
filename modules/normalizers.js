(function () {
  const P = window.PainelURE;

  function valueToText(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) {
      for (const item of value) {
        const text = valueToText(item);
        if (text) return text;
      }
      return "";
    }
    if (typeof value === "object") {
      return value.Title || value.Name || value.LookupValue || value.lookupValue || value.Email || value.EMail || value.label || value.value || "";
    }
    return String(value).trim();
  }

  function lookupId(value) {
    if (Array.isArray(value)) {
      const found = value.find(item => item?.lookupId || item?.LookupId || item?.ID || item?.Id);
      return found ? String(found.lookupId || found.LookupId || found.ID || found.Id || "") : "";
    }
    if (value && typeof value === "object") return String(value.lookupId || value.LookupId || value.ID || value.Id || "");
    return "";
  }

  function firstValue(row, keys, fallback = "") {
    for (const key of keys) {
      const value = row[key] !== undefined ? row[key] : Object.entries(row || {}).find(([candidate]) => P.normalize(candidate) === P.normalize(key))?.[1];
      const text = valueToText(value);
      if (text) return text;
    }
    return fallback;
  }

  function firstMatchingValue(row, keys, terms, fallback = "") {
    const exact = firstValue(row, keys, "");
    if (exact) return exact;
    const normalizedTerms = terms.map(term => P.normalize(term));
    const found = Object.entries(row || {}).find(([key, value]) => {
      if (!valueToText(value)) return false;
      const normalizedKey = P.normalize(key);
      return normalizedTerms.some(term => normalizedKey.includes(term));
    });
    return found ? valueToText(found[1]) : fallback;
  }

  function formatDateValue(value) {
    const text = valueToText(value);
    if (!text) return "";
    const serialized = text.match(/\/Date\((\d+)\)\//);
    if (serialized) return new Date(Number(serialized[1])).toISOString().slice(0, 10);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const pt = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (pt) return `${String(Number(pt[1])).padStart(2, "0")}/${String(Number(pt[2])).padStart(2, "0")}/${pt[3]}`;
    return text;
  }

  function formatTimeValue(value) {
    const text = valueToText(value);
    if (!text) return "";
    const serialized = text.match(/\/Date\((\d+)\)\//);
    if (serialized) {
      const date = new Date(Number(serialized[1]));
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    const iso = text.match(/T(\d{2}):(\d{2})/);
    if (iso) return `${iso[1]}:${iso[2]}`;
    const time = text.match(/(\d{1,2}):(\d{2})/);
    if (time) return `${String(Number(time[1])).padStart(2, "0")}:${time[2]}`;
    return text;
  }

  function lookupLabel(value, label) {
    const text = valueToText(value);
    if (!text) return "";
    return /^\d+$/.test(text) ? `${label} #${text}` : text;
  }

  function lookupName(value) {
    const text = valueToText(value);
    if (!text || /^\d+$/.test(text) || /^true|false$/i.test(text)) return "";
    return text;
  }

  function schoolLookupName(value) {
    const text = valueToText(value);
    if (!text) return "";
    if (/^\d+$/.test(text)) return "";
    return text;
  }

  function initialsFromName(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase() || "UR";
  }

  function numberFrom(row, keys, fallback = 0) {
    const raw = firstValue(row, keys, "");
    if (!raw) return fallback;
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeContactRows(rows) {
    return rows.map(row => {
      const name = firstValue(row, ["nome", "name", "contato", "responsavel"], "Sem nome");
      return {
        name,
        role: firstValue(row, ["cargo", "funcao", "role", "descricao"], "Contato"),
        sector: firstValue(row, ["setor", "categoria", "departamento", "area"], "Tecnologia"),
        email: firstValue(row, ["email", "e_mail", "mail"], ""),
        phone: firstValue(row, ["ramal", "telefone", "whatsapp", "celular"], "")
      };
    });
  }

  function normalizeSchoolRows(rows) {
    return rows.map(row => {
      const name = firstValue(row, ["escola", "nome", "unidade", "name"], "Escola sem nome");
      return {
        name,
        city: firstValue(row, ["municipio", "cidade", "city"], ""),
        cie: firstValue(row, ["cie", "codigo", "codigo_cie"], ""),
        initials: firstValue(row, ["iniciais", "initials"], initialsFromName(name)),
        fiche: numberFrom(row, ["ficha", "ficha_pct", "percentual"], 0),
        items: numberFrom(row, ["itens", "items", "inventario"], 0),
        status: firstValue(row, ["status"], "ok").toLowerCase().includes("aten") ? "warn" : "ok"
      };
    });
  }

  function normalizeInventoryRows(rows) {
    if (rows.some(row => firstValue(row, ["escola", "school", "unidade"], ""))) {
      return rows.map(row => {
        const statusText = firstValue(row, ["status", "situacao", "estado"], "ok").toLowerCase();
        return {
          school: firstValue(row, ["escola", "school", "unidade"], "Escola sem nome"),
          name: firstValue(row, ["tipo", "equipamento", "item", "nome"], "Item"),
          sourceName: firstValue(row, ["nome_original", "descricao", "patrimonio", "modelo"], ""),
          notes: firstValue(row, ["observacao", "observacoes", "nota", "quantidade", "qtd"], ""),
          status: statusText.includes("defeito") ? "defeito" : statusText.includes("manut") ? "manutencao" : "ok"
        };
      });
    }
    return rows.map(row => ({
      label: firstValue(row, ["tipo", "equipamento", "item", "nome"], "Item"),
      value: firstValue(row, ["quantidade", "qtd", "total"], "0"),
      note: firstValue(row, ["observacao", "observacoes", "status", "nota"], ""),
      tone: firstValue(row, ["status"], "").toLowerCase().includes("manut") ? "warn" : "ok"
    }));
  }

  function parseVisitCount(value) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function indicatorTone(value) {
    const text = String(value || "").trim();
    if (!text) return "aviso";
    const key = P.normalize(text);
    if (key.includes("verde")) return "verde";
    if (key.includes("amarelo")) return "amarelo";
    if (key.includes("vermelho")) return "vermelho";
    return text;
  }

  function normalizeSupervisorRows(payload) {
    const rows = Array.isArray(payload) ? payload : payload?.visitRows || [];
    const panelRows = Array.isArray(payload?.panelRows) ? payload.panelRows : [];
    const official = P.seedData?.supervisors || [];
    const stats = new Map();
    const panelStats = new Map();
    const allVisits = [];

    function officialSupervisorName(value) {
      const raw = P.normalize(value);
      const first = raw.split(" ")[0];
      const found = official.find(item => {
        const name = P.normalize(item.name);
        return name === raw || name.startsWith(first) || raw.startsWith(name.split(" ")[0]);
      });
      return found?.name || String(value || "").trim() || "Supervisor";
    }

    function officialSchoolName(value) {
      const text = schoolLookupName(value);
      const raw = P.normalize(text);
      if (!raw) return "";
      const aliases = {
        "ee antonio defunne": "EE Doutor Antonio Deffune",
        "ee dr antonio defunne": "EE Doutor Antonio Deffune",
        "ee dr antonio deffune": "EE Doutor Antonio Deffune",
        "ee dr raul venturelli": "EE Doutor Raul Venturelli",
        "ee cinira daniel da silva": "PEI EE Professora Cinira Daniel da Silva",
        "ee celia vasques": "PEI EE Professora Celia Vasques Ferrari Duch",
        "ee celia vasques duch": "PEI EE Professora Celia Vasques Ferrari Duch",
        "ee francelina franco": "PEI EE Professora Francelina Franco",
        "ee joao batista amaral vasconcelos": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
        "ee joao baptista do amaral vasconcellos": "PEI EE Professor Joao Baptista do Amaral Vasconcellos",
        "ee jose vasques ferrari": "PEI EE Professor Jose Vasques Ferrari",
        "ee nicota soares": "PEI EE Professora Nicota Soares",
        "ee oscar kurtz camargo": "PEI EE Oscar Kurtz Camargo",
        "ee otavio ferrari": "PEI EE Otavio Ferrari",
        "ee padre arlindo vieira": "PEI EE Padre Arlindo Vieira",
        "ee ricardo campolim de almeida": "PEI EE Ricardo Campolim de Almeida Neto",
        "ee silverio monteiro": "EE Professor Silverio Monteiro",
        "ee simpliciano campolim de almeida neto": "PEI EE Simpliciano Campolim de Almeida",
        "ee zulmira de oliveira": "PEI EE Professora Zulmira de Oliveira",
        "ee boa vista intervales": "EE Bairro Boa Vista Intervales",
        "ee turvo dos almeidas": "EE Bairro Turvo dos Almeidas",
        "ee bairro turvo dos almeidas": "EE Bairro Turvo dos Almeidas"
      };
      if (aliases[raw]) return aliases[raw];
      const comparable = raw.replace(/\b(pei|ee|doutor|dr|professor|professora)\b/g, "").replace(/\s+/g, " ").trim();
      const found = (P.seedData?.schools || []).find(school => {
        const name = P.normalize(school.name);
        const schoolComparable = name.replace(/\b(pei|ee|doutor|dr|professor|professora)\b/g, "").replace(/\s+/g, " ").trim();
        return name === raw || name.includes(raw) || raw.includes(name) || (comparable && (schoolComparable.includes(comparable) || comparable.includes(schoolComparable)));
      });
      return found?.name || text;
    }

    function visitDate(value) {
      const match = String(value || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) return null;
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }

    function weekOfMonth(date) {
      if (!date) return 0;
      return Math.ceil(date.getDate() / 7);
    }

    panelRows.forEach(row => {
      const supervisorName = officialSupervisorName(firstValue(row, ["supervisor", "nome_do_supervisor", "nome"], ""));
      if (!supervisorName) return;
      const weeklyGoal = parseVisitCount(firstValue(row, ["meta_semanal"], "")) || 3;
      const monthlyGoal = parseVisitCount(firstValue(row, ["meta_mensal"], ""));
      const assignedSchoolCount = parseVisitCount(firstValue(row, ["escolas_atribuidas", "escolas"], ""));
      panelStats.set(supervisorName, {
        assignedSchoolCount,
        weeklyGoal,
        weeklyGoalLabel: weeklyGoal ? String(weeklyGoal) : "--",
        monthlyGoal,
        monthlyGoalLabel: monthlyGoal ? String(monthlyGoal) : "--",
        currentWeek: parseVisitCount(firstValue(row, ["semana_do_mes", "semana_do_m_s", "semana"], "")),
        weeklyVisits: parseVisitCount(firstValue(row, ["visitas_na_semana"], "")),
        monthlyVisits: parseVisitCount(firstValue(row, ["visitas_no_mes", "visitas_no_m_s"], "")),
        weeklyIndicator: indicatorTone(firstValue(row, ["indicador_semana"], "")),
        monthlyIndicator: indicatorTone(firstValue(row, ["indicador_mensal", "indicador_mes"], ""))
      });
    });

    rows.forEach(row => {
      const supervisorName = officialSupervisorName(firstValue(row, ["nome_do_supervisor", "supervisor", "nome"], ""));
      const date = visitDate(firstValue(row, ["data_da_visita", "data", "date"], ""));
      const schools = Object.entries(row)
        .filter(([key]) => key.startsWith("escola_visitada") || key.startsWith("escolas_visitadas"))
        .map(([, value]) => String(value || "").trim())
        .filter(Boolean);

      if (!stats.has(supervisorName)) {
        stats.set(supervisorName, { visits: 0, schools: new Set(), weekVisits: new Map(), records: [] });
      }

      const item = stats.get(supervisorName);
      const canonicalSchools = schools.map(officialSchoolName).filter(Boolean);
      canonicalSchools.forEach(school => item.schools.add(school));
      item.visits += schools.length || 1;
      if (date) {
        const week = weekOfMonth(date);
        item.weekVisits.set(week, (item.weekVisits.get(week) || 0) + (canonicalSchools.length || 1));
        (canonicalSchools.length ? canonicalSchools : ["Escola nao informada"]).forEach(school => {
          item.records.push({
            date: formatDateValue(firstValue(row, ["data_da_visita", "data", "date"], "")),
            school,
            type: firstValue(row, ["confirmacao_de_visita", "tipo", "type"], "Visita")
          });
        });
        allVisits.push(date);
      }
    });

    const latestWeek = allVisits.length
      ? weekOfMonth(new Date(Math.max(...allVisits.map(date => date.getTime()))))
      : 0;

    const source = official.length ? official : Array.from(stats.keys()).map(name => ({ name, schools: 0, assignedSchools: [] }));
    return source.map(supervisor => {
      const item = stats.get(supervisor.name) || { visits: 0, schools: new Set(), weekVisits: new Map(), records: [] };
      const panel = panelStats.get(supervisor.name) || {};
      const schoolCount = Number(panel.assignedSchoolCount || supervisor.schools || supervisor.assignedSchools?.length || item.schools.size || 0);
      const monthlyGoal = Number(panel.monthlyGoal || Math.max(3, schoolCount * 3));
      const weekVisits = latestWeek ? (item.weekVisits.get(latestWeek) || 0) : 0;
      const weeklyGoal = Number(panel.weeklyGoal || 3);
      const officialWeeklyVisits = Number.isFinite(Number(panel.weeklyVisits)) ? Number(panel.weeklyVisits) : weekVisits;
      const officialMonthlyVisits = Number.isFinite(Number(panel.monthlyVisits)) ? Number(panel.monthlyVisits) : item.visits;
      return {
        ...supervisor,
        schools: schoolCount,
        assignedSchoolCount: schoolCount,
        weeklyGoal,
        weeklyGoalLabel: panel.weeklyGoalLabel || String(weeklyGoal),
        monthlyGoal,
        monthlyGoalLabel: panel.monthlyGoalLabel || String(monthlyGoal),
        currentWeek: panel.currentWeek || latestWeek || 0,
        weeklyVisits: officialWeeklyVisits,
        monthlyVisits: officialMonthlyVisits,
        weeklyIndicator: panel.weeklyIndicator || indicatorTone(officialWeeklyVisits >= weeklyGoal ? "verde" : officialWeeklyVisits > 0 ? "amarelo" : "vermelho"),
        monthlyIndicator: panel.monthlyIndicator || indicatorTone(officialMonthlyVisits >= monthlyGoal ? "verde" : officialMonthlyVisits > 0 ? "amarelo" : "vermelho"),
        week: `${officialWeeklyVisits}/${weeklyGoal}`,
        month: `${officialMonthlyVisits}/${monthlyGoal}`,
        pending: Math.max(0, monthlyGoal - officialMonthlyVisits),
        visits: officialMonthlyVisits,
        visitedSchools: item.schools.size,
        visitRecords: item.records,
        source: "Planilha supervisores - maio de 2026"
      };
    });
  }

  function pushUnique(target, value) {
    if (value && !target.includes(value)) target.push(value);
  }

  function normalizeNetworkRows(rows) {
    return rows.reduce((acc, row) => {
      const school = firstValue(row, ["escola", "unidade", "nome", "school"], "Escola sem nome");
      const entry = acc[school] || {
        network: [],
        ips: [],
        cameras: [],
        credentials: ["Acesso restrito", "Nao publicado no frontend estatico", "Solicitar ao CTC, SETEC ou SEINTEC"]
      };

      pushUnique(entry.network, firstValue(row, ["rede", "network", "gateway", "wifi"], ""));
      pushUnique(entry.ips, firstValue(row, ["ip", "ips", "cie", "banda"], ""));
      pushUnique(entry.cameras, firstValue(row, ["camera", "cameras", "dvr"], ""));
      acc[school] = entry;
      return acc;
    }, {});
  }

  function normalizeCalendarRows(rows) {
    return rows.map(row => {
      const type = firstValue(row, ["tipo", "type", "categoria"], "");
      const scope = firstValue(row, ["escopo", "scope", "visibilidade"], "");
      return {
        label: firstValue(row, ["titulo", "evento", "label", "nome"], "Evento"),
        value: firstValue(row, ["data", "quando", "date", "value"], "sem data"),
        note: firstValue(row, ["observacao", "descricao", "local", "note"], ""),
        tone: firstValue(row, ["status", "tone"], type || "info"),
        type,
        scope,
        owner: firstValue(row, ["responsavel", "dono", "owner", "usuario", "user"], ""),
        assignee: firstValue(row, ["atribuido", "assignee", "destinatario"], ""),
        contactId: firstValue(row, ["contact_id", "id_contato", "contato_id"], ""),
        ownerId: firstValue(row, ["owner_id", "user_id", "id_usuario", "usuario_id"], ""),
        ownerEmail: firstValue(row, ["owner_email", "email_usuario", "email"], "")
      };
    });
  }

  function normalizeCarRows(rows) {
    return rows.map(row => {
      const date = firstMatchingValue(row, ["data", "data_da_reserva", "data_x0020_da_x0020_reserva", "data_reserva", "date", "quando"], ["data", "date", "quando"], "");
      const time = firstMatchingValue(row, ["hora", "horario", "horario_da_reserva", "horario_x0020_da_x0020_reserva", "time"], ["hora", "horario", "time"], "");
      const returnDate = firstMatchingValue(row, ["data_devolucao", "datadevolu_x005f_x00e7_x005f_x005f_x00e3_x005f_o", "data_devolu_x00e7__x00e3_o", "datadevolu_x00e7__x00e3_o", "devolucao", "return", "return_time"], ["devolu", "return"], "");
      const externalPlace = firstMatchingValue(row, ["localexterno", "local_externo", "local_x0020_externo"], ["localexterno", "externo"], "");
      const school = firstMatchingValue(row, ["escolas", "escola", "school", "unidade"], ["escola", "school", "unidade"], "");
      const motive = firstMatchingValue(row, ["motivovisita", "motivo_visita", "motivo", "finalidade", "objetivo"], ["motivo", "finalidade", "objetivo"], "");
      const destination = externalPlace || schoolLookupName(school) || firstMatchingValue(row, ["destino", "local", "destination", "place", "local_destino"], ["destino", "destination", "place"], "") || motive;
      const driver = firstMatchingValue(row, ["nome_condutor", "condutor_nome", "nome_do_condutor", "motorista", "driver", "condutor"], ["nome_condutor", "condutor_nome", "nome_do_condutor", "motorista", "driver", "condutor"], "");
      const sector = firstMatchingValue(row, ["setor", "categoria", "area", "departamento"], ["setor", "categoria", "area", "departamento"], "");
      const requester = sector || firstMatchingValue(row, ["solicitante", "responsavel", "responsavel_pela_reserva", "requester", "owner", "e_x002d_mail", "e_x005f_x002d_x005f_mail"], ["solicitante", "responsavel", "requester", "owner", "mail"], "");
      const timeValue = formatTimeValue(time || date);
      return {
        requestId: firstMatchingValue(row, ["id"], ["id"], ""),
        vehicle: firstMatchingValue(row, ["carro", "veiculo", "ve_x00ed_culo", "vehicle", "recurso", "title"], ["carro", "veiculo", "vehicle", "recurso"], "Carro oficial"),
        date: formatDateValue(date),
        time: !time && timeValue === "00:00" ? "" : timeValue,
        returnTime: formatTimeValue(returnDate),
        requester,
        sector,
        destination,
        driver: lookupName(driver),
        driverId: lookupId(row.condutor || row.Condutor || driver) || (/^\d+$/.test(valueToText(driver)) ? valueToText(driver) : ""),
        status: firstMatchingValue(row, ["status", "situacao", "situa_x00e7__x00e3_o", "tone"], ["status", "situacao"], "pendente"),
        note: firstMatchingValue(row, ["observacao", "observacoes", "coment_x00e1_riogestor", "comentario_gestor", "descri_x00e7__x00e3_o", "descricao", "note", "motivo", "motivovisita"], ["observacao", "coment", "descricao", "motivo", "note"], ""),
        sourceFields: Object.keys(row || {}).sort()
      };
    });
  }

  function normalizeSatisfactionRows(rows) {
    return rows.map(row => ({
      title: firstValue(row, ["titulo", "pesquisa", "campanha", "title", "nome"], "Pesquisa de satisfacao"),
      audience: firstValue(row, ["publico", "audiencia", "audience", "destinatario"], "Publico nao informado"),
      status: firstValue(row, ["status", "situacao", "andamento"], "ativa"),
      score: firstValue(row, ["nota", "media", "score", "avaliacao", "satisfacao"], ""),
      responses: numberFrom(row, ["respostas", "responses", "total", "quantidade"], 0),
      link: firstValue(row, ["link", "url", "formulario", "forms"], ""),
      period: firstValue(row, ["periodo", "prazo", "data", "competencia"], ""),
      note: firstValue(row, ["observacao", "observacoes", "descricao", "note"], "")
    }));
  }

  P.normalizers = {
    contacts: normalizeContactRows,
    schools: normalizeSchoolRows,
    inventory: normalizeInventoryRows,
    supervision: normalizeSupervisorRows,
    network: normalizeNetworkRows,
    calendar: normalizeCalendarRows,
    satisfaction: normalizeSatisfactionRows,
    cars: normalizeCarRows
  };
})();
