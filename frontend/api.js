'use strict';

function canUseLocalApi() {
  return /^https?:$/i.test(window.location.protocol);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha em ${path}`);
  }
  return response.json();
}

async function refreshServerHealth() {
  if (!canUseLocalApi()) {
    serverStatus = { available: false, message: 'Abra pelo servidor local para usar a API.' };
    renderDiagnostics();
    return serverStatus;
  }
  try {
    const payload = await apiRequest('/api/health');
    serverStatus = {
      available: true,
      message: `Online em ${payload.mode || 'local'} | estado ${payload.stateFile ? 'pronto' : 'sem arquivo'} | snapshots ${payload.snapshotCount || 0}`
    };
  } catch (error) {
    serverStatus = { available: false, message: `Falha na API local: ${error.message}` };
  }
  renderDiagnostics();
  return serverStatus;
}

async function saveStateToServer() {
  if (!canUseLocalApi()) {
    alert('Abra o SETECHUB pelo servidor local para salvar estado na API.');
    return;
  }
  try {
    await apiRequest('/api/state', {
      method: 'PUT',
      body: JSON.stringify({ state })
    });
    await loadServerSnapshots();
    await refreshServerHealth();
    alert('Estado salvo no servidor local.');
  } catch (error) {
    alert(`Nao foi possivel salvar no servidor local: ${error.message}`);
  }
}

async function loadStateFromServer() {
  if (!canUseLocalApi()) {
    alert('Abra o SETECHUB pelo servidor local para carregar estado da API.');
    return;
  }
  try {
    const payload = await apiRequest('/api/state');
    state = mergeState(payload.state || payload);
    refreshAll();
    await loadServerSnapshots();
    await refreshServerHealth();
    alert('Estado carregado do servidor local.');
  } catch (error) {
    alert(`Nao foi possivel carregar do servidor local: ${error.message}`);
  }
}

async function loadServerSnapshots() {
  if (!canUseLocalApi()) {
    serverSnapshots = [];
    renderDiagnostics();
    return serverSnapshots;
  }
  try {
    const payload = await apiRequest('/api/snapshots');
    serverSnapshots = payload.items || [];
  } catch {
    serverSnapshots = [];
  }
  renderDiagnostics();
  return serverSnapshots;
}

async function restoreServerSnapshot(id) {
  if (!canUseLocalApi()) {
    alert('Abra o SETECHUB pelo servidor local para restaurar snapshots.');
    return;
  }
  try {
    const payload = await apiRequest(`/api/snapshots/${encodeURIComponent(id)}`, { method: 'POST' });
    state = mergeState(payload.state || payload);
    refreshAll();
    await loadServerSnapshots();
    await refreshServerHealth();
    alert('Snapshot restaurado com sucesso.');
  } catch (error) {
    alert(`Nao foi possivel restaurar snapshot: ${error.message}`);
  }
}

async function syncFromServerIfUseful() {
  if (!canUseLocalApi()) return;
  const hasLocalState = !!localStorage.getItem(STORAGE_KEY);
  try {
    const payload = await apiRequest('/api/state');
    if (!hasLocalState) {
      state = mergeState(payload.state || payload);
      refreshAll();
    }
  } catch {
    return;
  }
}

function normalizeSupabaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function supabaseConfig() {
  const config = loadSupabaseConfig();
  return {
    url: normalizeSupabaseUrl(config.url),
    anonKey: String(config.anonKey || '').trim()
  };
}

function updateSupabaseStatus(message, configured = false) {
  supabaseStatus = { configured, message };
  const node = document.getElementById('supabaseStatusMeta');
  if (node) node.textContent = message;
  const urlInput = document.getElementById('supabaseUrl');
  const keyInput = document.getElementById('supabaseAnonKey');
  const config = supabaseConfig();
  if (urlInput && !urlInput.value) urlInput.value = config.url || '';
  if (keyInput && !keyInput.value) keyInput.value = config.anonKey || '';
}

async function supabaseRequest(path, options = {}) {
  const config = supabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new Error('Configure URL e anon key do Supabase na tela Conta.');
  }
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha Supabase HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function checkSupabaseConnection() {
  try {
    await supabaseRequest('app_state?select=id,updated_at&id=eq.setechub_state&limit=1');
    updateSupabaseStatus('Supabase conectado. Tabela app_state acessivel.', true);
  } catch (error) {
    updateSupabaseStatus(`Falha no Supabase: ${error.message}`, false);
  }
}

async function saveStateToSupabase() {
  try {
    await supabaseRequest('app_state?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ id: 'setechub_state', state, updated_at: new Date().toISOString() })
    });
    updateSupabaseStatus('Estado salvo no Supabase.', true);
  } catch (error) {
    updateSupabaseStatus(`Nao foi possivel salvar no Supabase: ${error.message}`, false);
  }
}

async function loadStateFromSupabase() {
  try {
    const rows = await supabaseRequest('app_state?select=state,updated_at&id=eq.setechub_state&limit=1');
    const remoteState = rows?.[0]?.state;
    if (!remoteState) {
      updateSupabaseStatus('Nenhum estado setechub_state encontrado no Supabase.', true);
      return;
    }
    state = mergeState(remoteState);
    refreshAll();
    updateSupabaseStatus(`Estado carregado do Supabase. Atualizado em ${rows[0].updated_at || 'data nao informada'}.`, true);
  } catch (error) {
    updateSupabaseStatus(`Nao foi possivel carregar do Supabase: ${error.message}`, false);
  }
}
