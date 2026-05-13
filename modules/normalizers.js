(function () {
  const P = window.PainelURE;

  function firstValue(row, keys, fallback = "") {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && String(value).trim()) return String(value).trim();
    }
    return fallback;
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

  function normalizeSupervisorRows(rows) {
    const official = P.seedData?.supervisors || [];
    const stats = new Map();
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

    function visitDate(value) {
      const match = String(value || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) return null;
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }

    function weekOfMonth(date) {
      if (!date) return 0;
      return Math.ceil(date.getDate() / 7);
    }

    rows.forEach(row => {
      const supervisorName = officialSupervisorName(firstValue(row, ["nome_do_supervisor", "supervisor", "nome"], ""));
      const date = visitDate(firstValue(row, ["data_da_visita", "data", "date"], ""));
      const schools = Object.entries(row)
        .filter(([key]) => key.startsWith("escola_visitada") || key.startsWith("escolas_visitadas"))
        .map(([, value]) => String(value || "").trim())
        .filter(Boolean);

      if (!stats.has(supervisorName)) {
        stats.set(supervisorName, { visits: 0, schools: new Set(), weekVisits: new Map() });
      }

      const item = stats.get(supervisorName);
      schools.forEach(school => item.schools.add(school));
      item.visits += schools.length || 1;
      if (date) {
        const week = weekOfMonth(date);
        item.weekVisits.set(week, (item.weekVisits.get(week) || 0) + (schools.length || 1));
        allVisits.push(date);
      }
    });

    const latestWeek = allVisits.length
      ? weekOfMonth(new Date(Math.max(...allVisits.map(date => date.getTime()))))
      : 0;

    const source = official.length ? official : Array.from(stats.keys()).map(name => ({ name, schools: 0, assignedSchools: [] }));
    return source.map(supervisor => {
      const item = stats.get(supervisor.name) || { visits: 0, schools: new Set(), weekVisits: new Map() };
      const schoolCount = Number(supervisor.schools || supervisor.assignedSchools?.length || item.schools.size || 0);
      const monthlyGoal = Math.max(3, schoolCount * 3);
      const weekVisits = latestWeek ? (item.weekVisits.get(latestWeek) || 0) : 0;
      return {
        ...supervisor,
        schools: schoolCount,
        week: `${weekVisits}/3`,
        month: `${item.visits}/${monthlyGoal}`,
        pending: Math.max(0, monthlyGoal - item.visits),
        visits: item.visits,
        visitedSchools: item.schools.size,
        source: "Planilha supervisores - abril de 2026"
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

  P.normalizers = {
    contacts: normalizeContactRows,
    schools: normalizeSchoolRows,
    inventory: normalizeInventoryRows,
    supervision: normalizeSupervisorRows,
    network: normalizeNetworkRows,
    calendar: normalizeCalendarRows
  };
})();
