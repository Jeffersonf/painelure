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
