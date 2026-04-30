'use strict';

applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
setupEventListeners();
restoreUiContext();
restorePageFromHash();
refreshAll();
showPage(currentPage || sessionStorage.getItem(PAGE_KEY) || 'dashboard');
updateSupabaseStatus(
  supabaseConfig().url && supabaseConfig().anonKey
    ? 'Supabase configurado neste navegador.'
    : 'Supabase nao configurado.',
  !!(supabaseConfig().url && supabaseConfig().anonKey)
);

window.addEventListener('hashchange', () => {
  restorePageFromHash();
  showPage(currentPage || 'dashboard');
});

if (sessionStorage.getItem(SESSION_KEY) === 'ok') {
  if (!sessionStorage.getItem(ACTIVE_USER_KEY)) {
    const fallbackUser = (state.users || []).find((item) => item.role === 'admin') || state.users?.[0];
    if (fallbackUser) sessionStorage.setItem(ACTIVE_USER_KEY, fallbackUser.id);
  }
  document.getElementById('setup').style.display = 'none';
}

(async () => {
  await refreshServerHealth();
  await syncFromServerIfUseful();
  await loadServerSnapshots();
  await refreshServerHealth();
})();
