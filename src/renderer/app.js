/* ── State ───────────────────────────────────────────────────────────────────── */
let state = {
  config: null,
  allChats: [],
  isMonitoring: false,
  editingRuleIndex: null
};

/* ── Utils ───────────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

const RELOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 842.488 842.488" fill="currentColor"><path d="M741.744,177.188c-28.1-35.2-61.5-65.3-99.301-89.6c-35.6-22.9-74.299-40-115-50.9c-5.4-1.5-11,1.8-12.4,7.3l-22.199,92.4c-1.301,5.2,1.9,10.5,7,12c59.5,16.5,113.199,51.9,152,100.5c20.4,25.6,36.301,54.1,47.199,84.7c11.301,31.7,17,65,17,99.1c0,78.801-30.699,152.801-86.398,208.5c-55.701,55.701-129.801,86.4-208.5,86.4c-78.801,0-152.801-30.699-208.5-86.4c-55.7-55.699-86.3-129.699-86.3-208.5c0-58.2,16.9-114.5,48.9-162.8c18.3-27.6,40.9-51.7,66.7-71.5c0,0,30.6,40.1,30.6,40.2c5.9,8.4,20,8.1,25.3-1.1c0,0,123.4-215.6,123.601-216.1c5.9-10.2-3.101-23.1-14.7-21.2c0,0-245.3,40.8-245.6,40.8c-10.4,1.7-15.8,14.7-9.8,23.3l24.9,39.6c-37.7,28.1-70.5,62.7-96.8,102.4c-44.5,67.2-68.1,145.4-68.1,226.3c0,55.301,10.8,109,32.2,159.6c20.6,48.801,50.2,92.701,87.8,130.301s81.5,67.199,130.3,87.799c50.6,21.4,104.3,32.201,159.6,32.201c55.299,0,109-10.801,159.6-32.201c48.801-20.6,92.699-50.199,130.301-87.799c37.6-37.6,67.199-81.5,87.799-130.301c21.4-50.6,32.201-104.299,32.201-159.6c0-47.2-8-93.6-23.701-137.7C792.244,252.288,770.145,212.688,741.744,177.188z"/></svg>`;

function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function extColorClass(ext) {
  const map = {
    pdf: 'ext-pdf',
    mp4: 'ext-mp4', mov: 'ext-mp4', avi: 'ext-mp4', mkv: 'ext-mp4',
    jpg: 'ext-jpg', jpeg: 'ext-jpg', png: 'ext-jpg', gif: 'ext-jpg', webp: 'ext-jpg',
    zip: 'ext-zip', rar: 'ext-zip', '7z': 'ext-zip', tar: 'ext-zip', gz: 'ext-zip',
    mp3: 'ext-mp3', wav: 'ext-mp3', flac: 'ext-mp3', ogg: 'ext-mp3'
  };
  return map[ext?.toLowerCase()] || 'ext-default';
}

function showError(elId, msg) {
  const el = $(elId);
  el.textContent = msg;
  show(el);
}

function clearError(elId) {
  hide($(elId));
}

/* ── Navigation ──────────────────────────────────────────────────────────────── */
function navigate(page) {
  if (!state.config?.isLoggedIn) return;
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });
  if (page === 'dashboard') refreshDashboard();
  if (page === 'history') renderHistory();
  if (page === 'chats') renderWatchedChats();
}

function showLoginPage() {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-login').classList.add('active');
  setNavDisabled(true);
  // Reset QR panel to initial state
  $('step-2fa').classList.remove('active');
  $('step-qr').classList.add('active');
  show($('qr-api-fields'));
  hide($('qr-display'));
  $('qr-image').src = '';
  $('qr-status').textContent = 'Waiting for scan…';
  $('qr-status').style.color = '';
}

function setNavDisabled(disabled) {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.35' : '';
    btn.style.cursor = disabled ? 'not-allowed' : '';
    btn.style.pointerEvents = disabled ? 'none' : '';
  });
}

/* ── Init ────────────────────────────────────────────────────────────────────── */
async function init() {
  console.log('[app] init started');

  setNavDisabled(true);

  // Wire 2FA and QR login
  $('btn-2fa').addEventListener('click', handle2FA);
  $('btn-start-qr').addEventListener('click', handleStartQr);
  $('btn-cancel-qr').addEventListener('click', handleCancelQr);
  window.api.on('auth:qrToken', ({ dataUrl }) => {
    $('qr-image').src = dataUrl;
    $('qr-status').textContent = 'Waiting for scan…';
  });
  window.api.on('auth:qrDone', async () => {
    $('qr-status').textContent = '✓ Scanned! Logging in…';
    state.config = await window.api.getConfig();
    setupLoggedInUI();
  });
  window.api.on('auth:qrNeed2FA', () => {
    show($('qr-api-fields'));
    hide($('qr-display'));
    $('step-qr').classList.remove('active');
    $('step-2fa').classList.add('active');
  });
  window.api.on('auth:qrError', ({ error }) => {
    $('qr-status').textContent = '✗ ' + (error || 'Error');
    $('qr-status').style.color = 'var(--red, #ef4444)';
    setTimeout(() => {
      show($('qr-api-fields'));
      hide($('qr-display'));
    }, 2000);
  });

  $('input-2fa').addEventListener('keydown',   e => { if (e.key === 'Enter') handle2FA(); });
  $('qr-api-id').addEventListener('keydown',   e => { if (e.key === 'Enter') $('qr-api-hash').focus(); });
  $('qr-api-hash').addEventListener('keydown', e => { if (e.key === 'Enter') handleStartQr(); });

  // Wire nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  console.log('[app] loading config...');
  state.config = await window.api.getConfig();
  console.log('[app] isLoggedIn:', state.config.isLoggedIn);

  if (!state.config.isLoggedIn) {
    showLoginPage();
    return;
  }

  const conn = await window.api.connect();
  console.log('[app] connect result:', conn);

  if (!conn.success) {
    showLoginPage();
    return;
  }

  setupLoggedInUI();
}

function setupLoggedInUI() {
  state.config.isLoggedIn = true;
  setNavDisabled(false);
  state.isMonitoring = state.config.isMonitoring || false;
  renderSettings();
  refreshDashboard();
  renderRules();
  renderHistory();
  setupToggleSettings();
  setupMainEvents();
  navigate('dashboard');
}

/* ── Dashboard ───────────────────────────────────────────────────────────────── */
function refreshDashboard() {
  const cfg = state.config;
  const history = cfg.downloadHistory || [];
  const today = new Date().toDateString();
  const todayCount = history.filter(h => new Date(h.date).toDateString() === today).length;

  $('stat-total').textContent = history.length;
  $('stat-today').textContent = todayCount;
  $('stat-chats').textContent = (cfg.watchedChats || []).length;
  $('stat-rules').textContent = (cfg.rules || []).length;

  setCheck('check-auth', true);
  setCheck('check-chats', (cfg.watchedChats || []).length > 0);
  setCheck('check-rules', (cfg.rules || []).length > 0);

  updateMonitorButton();
}

function setCheck(id, done) {
  const container = $(id);
  const svgDone    = container.querySelector('.check-svg-done');
  const svgPending = container.querySelector('.check-svg-pending');
  if (svgDone)    svgDone.style.display    = done ? 'block' : 'none';
  if (svgPending) svgPending.style.display = done ? 'none'  : 'block';
}

function updateMonitorButton() {
  const btn = $('btn-toggle-monitor');
  if (state.isMonitoring) {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="3" width="3" height="8" rx="1" fill="currentColor"/><rect x="8" y="3" width="3" height="8" rx="1" fill="currentColor"/></svg> Stop Monitoring`;
    btn.classList.add('stopping');
    $('status-dot').className = 'status-indicator active';
    $('status-text').textContent = 'Monitoring';
    show($('live-dot'));
  } else {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polygon points="3,2 12,7 3,12" fill="currentColor"/></svg> Start Monitoring`;
    btn.classList.remove('stopping');
    $('status-dot').className = 'status-indicator idle';
    $('status-text').textContent = 'Idle';
    hide($('live-dot'));
  }
}

/* ── Monitor ─────────────────────────────────────────────────────────────────── */
async function toggleMonitor() {
  if (state.isMonitoring) {
    await window.api.stopMonitor();
    state.isMonitoring = false;
    state.config.monitoringActive = false;
    updateMonitorButton();
    addActivity({ type: 'info', message: 'Monitoring stopped' });
  } else {
    const res = await window.api.startMonitor();
    console.log('[toggleMonitor] start result:', res);
    if (res.success) {
      state.isMonitoring = true;
      state.config.monitoringActive = true;
      updateMonitorButton();
      addActivity({ type: 'info', message: 'Monitoring started' });
    } else {
      alert('Could not start monitoring: ' + (res.error || 'Unknown error'));
    }
  }
}

/* ── Activity feed ───────────────────────────────────────────────────────────── */
function addActivity(item) {
  const feed = $('activity-feed');
  const empty = feed.querySelector('.empty-state');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = `activity-item${item.type === 'error' ? ' error' : item.percent !== undefined ? ' progress' : ''}`;

  if (item.fileName) {
    const ext = item.fileName.split('.').pop() || '?';
    div.innerHTML = `
      <span class="ext-chip">${ext.toUpperCase()}</span>
      <div>
        <div class="file-name">${item.fileName}</div>
        <div class="file-meta">${
          item.type === 'complete'
            ? `Saved to ${item.folder} · ${formatBytes(item.size)}`
            : item.percent !== undefined
              ? `Downloading… ${item.percent}%`
              : 'Downloading…'
        }</div>
      </div>`;
  } else {
    div.innerHTML = `
      <span class="ext-chip" style="background:var(--bg-raised);color:var(--text-secondary)">•</span>
      <div class="file-name">${item.message || item.error || 'Event'}</div>`;
  }

  feed.insertBefore(div, feed.firstChild);
  const items = feed.querySelectorAll('.activity-item');
  if (items.length > 30) items[items.length - 1].remove();
}

/* ── Chats ───────────────────────────────────────────────────────────────────── */
async function loadChats() {
  const btn = $('btn-load-chats');
  btn.disabled = true;
  btn.textContent = 'Loading…';

  const res = await window.api.loadChats();

  btn.disabled = false;
  btn.innerHTML = `${RELOAD_ICON} Load Chats`;

  if (!res.success) { alert(res.error); return; }
  state.allChats = res.chats;
  renderAllChats();
}

function renderAllChats(filter = '') {
  const list = $('all-chats-list');
  const watched = state.config.watchedChats || [];
  const chats = state.allChats.filter(c =>
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  $('chat-count').textContent = chats.length;
  list.innerHTML = '';

  if (!chats.length) {
    list.innerHTML = '<div class="empty-state"><span>No chats found</span></div>';
    return;
  }

  chats.forEach(chat => {
    const isWatching = watched.some(w => w.id === chat.id);
    const initial = (chat.title || '?')[0].toUpperCase();
    const avatarClass = chat.type === 'group' ? 'group' : chat.type === 'channel' ? 'channel' : '';
    const div = document.createElement('div');
    div.className = `chat-item${isWatching ? ' watching' : ''}`;
    div.innerHTML = `
      <div class="chat-avatar ${avatarClass}">${initial}</div>
      <div class="chat-info">
        <div class="chat-name">${chat.title}</div>
        <div class="chat-type">${chat.type}</div>
      </div>
      <span class="chat-action">${isWatching ? '−' : '+'}</span>`;
    div.addEventListener('click', () => toggleWatchChat(chat));
    list.appendChild(div);
  });
}

function renderWatchedChats() {
  const list = $('watched-chats-list');
  const watched = state.config.watchedChats || [];
  $('watched-count').textContent = watched.length;
  list.innerHTML = '';

  if (!watched.length) {
    list.innerHTML = '<div class="empty-state"><span>No chats selected yet</span></div>';
    return;
  }

  watched.forEach(chat => {
    const initial = (chat.title || '?')[0].toUpperCase();
    const avatarClass = chat.type === 'group' ? 'group' : chat.type === 'channel' ? 'channel' : '';
    const div = document.createElement('div');
    div.className = 'chat-item watching';
    div.innerHTML = `
      <div class="chat-avatar ${avatarClass}">${initial}</div>
      <div class="chat-info">
        <div class="chat-name">${chat.title}</div>
        <div class="chat-type">${chat.type}</div>
      </div>
      <span class="chat-action">−</span>`;
    div.addEventListener('click', () => toggleWatchChat(chat));
    list.appendChild(div);
  });
}

async function toggleWatchChat(chat) {
  const watched = state.config.watchedChats || [];
  const idx = watched.findIndex(w => w.id === chat.id);
  if (idx >= 0) {
    watched.splice(idx, 1);
  } else {
    watched.push({ id: chat.id, title: chat.title, type: chat.type });
  }
  state.config.watchedChats = watched;
  await window.api.setConfig('watchedChats', watched);
  renderAllChats($('chat-search').value);
  renderWatchedChats();
  refreshDashboard();
}

/* ── Rules ───────────────────────────────────────────────────────────────────── */
function renderRules() {
  const list = $('rules-list');
  const rules = state.config.rules || [];
  list.innerHTML = '';

  if (!rules.length) {
    list.innerHTML = `<div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="5" width="24" height="22" rx="3" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
        <path d="M9 12h14M9 17.5h10M9 23h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5"/>
      </svg>
      <span>No rules yet — add your first rule</span>
    </div>`;
    return;
  }

  rules.forEach((rule, i) => {
    const div = document.createElement('div');
    div.className = 'rule-row';
    div.innerHTML = `
      <span class="rule-ext">${rule.ext}</span>
      <span class="rule-arrow">→</span>
      <span class="rule-folder" title="${rule.folder}">${rule.folder}</span>
      <div class="rule-actions">
        <button class="icon-btn" title="Edit" data-edit="${i}">✎</button>
        <button class="icon-btn delete" title="Delete" data-delete="${i}">✕</button>
      </div>`;
    list.appendChild(div);
  });

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openRuleModal(parseInt(btn.dataset.edit)));
  });
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteRule(parseInt(btn.dataset.delete)));
  });
}

function openRuleModal(editIndex = null) {
  state.editingRuleIndex = editIndex;
  const rules = state.config.rules || [];
  $('modal-title').textContent = editIndex !== null ? 'Edit Rule' : 'Add Rule';
  $('rule-ext').value = editIndex !== null ? rules[editIndex].ext : '';
  $('rule-folder').value = editIndex !== null ? rules[editIndex].folder : '';
  show($('rule-modal'));
  $('rule-ext').focus();
}

function closeRuleModal() {
  hide($('rule-modal'));
  state.editingRuleIndex = null;
}

async function saveRule() {
  const ext = $('rule-ext').value.trim().replace(/^\./, '').toLowerCase();
  const folder = $('rule-folder').value.trim();
  if (!ext || !folder) { alert('Please fill in both fields'); return; }

  const rules = [...(state.config.rules || [])];
  const rule = { ext, folder };

  if (state.editingRuleIndex !== null) {
    rules[state.editingRuleIndex] = rule;
  } else {
    const dup = rules.findIndex(r => r.ext === ext);
    if (dup >= 0) { rules[dup] = rule; } else { rules.push(rule); }
  }

  state.config.rules = rules;
  await window.api.setConfig('rules', rules);
  closeRuleModal();
  renderRules();
  refreshDashboard();
}

async function deleteRule(idx) {
  const rules = [...(state.config.rules || [])];
  rules.splice(idx, 1);
  state.config.rules = rules;
  await window.api.setConfig('rules', rules);
  renderRules();
  refreshDashboard();
}

/* ── History ─────────────────────────────────────────────────────────────────── */
function renderHistory(filter = '') {
  const list = $('history-list');
  const history = state.config.downloadHistory || [];
  const filtered = filter
    ? history.filter(h =>
        h.fileName.toLowerCase().includes(filter.toLowerCase()) ||
        h.chatTitle.toLowerCase().includes(filter.toLowerCase()))
    : history;

  list.innerHTML = '';

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.3"/>
        <path d="M16 10v6.5l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.5"/>
      </svg>
      <span>${filter ? `No results for "${filter}"` : 'No downloads yet'}</span>
    </div>`;
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.title = 'Click to show in folder';
    div.innerHTML = `
      <span class="history-ext ${extColorClass(item.ext)}">${item.ext?.toUpperCase() || '?'}</span>
      <div class="history-info">
        <div class="history-name">${item.fileName}</div>
        <div class="history-meta">
          <span>${item.chatTitle}</span>
          ${item.size ? `<span class="history-size">${formatBytes(item.size)}</span>` : ''}
        </div>
      </div>
      <span class="history-time">${timeAgo(item.date)}</span>`;
    div.addEventListener('click', () => window.api.openFile(item.filePath));
    list.appendChild(div);
  });
}

/* ── Settings ────────────────────────────────────────────────────────────────── */
function renderSettings() {
  $('settings-user').textContent = 'Connected';
  $('toggle-minimized').checked = state.config.startMinimized || false;
  $('toggle-auto-monitor').checked = state.config.monitoringActive || false;
  show($('user-info'));
  $('user-name').textContent = 'Connected';
  $('user-avatar').textContent = '✓';
}

function setupToggleSettings() {
  $('toggle-minimized').addEventListener('change', e => {
    window.api.setConfig('startMinimized', e.target.checked);
  });
  $('toggle-auto-monitor').addEventListener('change', e => {
    window.api.setConfig('monitoringActive', e.target.checked);
  });
}

/* ── QR Login ────────────────────────────────────────────────────────────────── */

async function handleStartQr() {
  clearError('qr-api-error');
  const apiId   = $('qr-api-id').value.trim();
  const apiHash = $('qr-api-hash').value.trim();
  if (!apiId || !apiHash) {
    showError('qr-api-error', 'API ID and Hash are required');
    return;
  }
  const btn = $('btn-start-qr');
  btn.disabled = true;
  btn.textContent = 'Connecting…';

  const res = await window.api.startQr(apiId, apiHash);

  btn.disabled = false;
  btn.textContent = 'Generate QR Code →';

  if (!res.success) {
    showError('qr-api-error', res.error || 'Failed to start QR login');
    return;
  }

  hide($('qr-api-fields'));
  show($('qr-display'));
  $('qr-status').textContent = 'Generating QR code…';
}

async function handleCancelQr() {
  await window.api.cancelQr();
  show($('qr-api-fields'));
  hide($('qr-display'));
  $('qr-image').src = '';
}

/* ── Auth ────────────────────────────────────────────────────────────────────── */

async function handle2FA() {
  console.log('[handle2FA] called');
  clearError('twofa-error');

  const pass = $('input-2fa').value;
  if (!pass) { showError('twofa-error', 'Enter your password'); return; }

  const btn = $('btn-2fa');
  btn.disabled = true;
  btn.textContent = 'Checking…';

  const res = await window.api.submit2FA(pass);
  console.log('[handle2FA] result:', res);

  btn.disabled = false;
  btn.textContent = 'Confirm →';

  if (!res.success) {
    showError('twofa-error', res.error || 'Wrong password');
    return;
  }

  await afterLogin();
}

async function afterLogin() {
  state.config = await window.api.getConfig();
  setupLoggedInUI();
}

async function handleLogout() {
  if (!confirm('Log out from Telegram?')) return;
  await window.api.stopMonitor();
  await window.api.cancelQr();
  await window.api.logout();
  state.config = {};
  state.isMonitoring = false;
  $('qr-api-id').value = '';
  $('qr-api-hash').value = '';
  showLoginPage();
}

/* ── Main event wiring (post-login) ──────────────────────────────────────────── */
function setupMainEvents() {
  $('btn-toggle-monitor').addEventListener('click', toggleMonitor);

  $('btn-load-chats').addEventListener('click', loadChats);
  $('chat-search').addEventListener('input', e => renderAllChats(e.target.value));

  $('btn-add-rule').addEventListener('click', () => openRuleModal());
  $('btn-close-modal').addEventListener('click', closeRuleModal);
  $('btn-cancel-rule').addEventListener('click', closeRuleModal);
  $('btn-save-rule').addEventListener('click', saveRule);
  $('btn-pick-folder').addEventListener('click', async () => {
    const folder = await window.api.pickFolder();
    if (folder) $('rule-folder').value = folder;
  });
  $('rule-modal').addEventListener('click', e => {
    if (e.target === $('rule-modal')) closeRuleModal();
  });
  $('rule-ext').addEventListener('keydown', e => { if (e.key === 'Enter') $('rule-folder').focus(); });

  $('btn-clear-history').addEventListener('click', async () => {
    if (!confirm('Clear all download history?')) return;
    await window.api.clearHistory();
    state.config.downloadHistory = [];
    renderHistory();
    refreshDashboard();
  });
  $('history-search').addEventListener('input', e => renderHistory(e.target.value));

  $('btn-logout').addEventListener('click', handleLogout);

  window.api.on('download:progress', data => addActivity({ ...data, type: 'progress' }));
  window.api.on('download:complete', data => {
    addActivity({ ...data, type: 'complete' });
    state.config.downloadHistory = state.config.downloadHistory || [];
    state.config.downloadHistory.unshift(data);
    $('stat-total').textContent = state.config.downloadHistory.length;
    const today = new Date().toDateString();
    $('stat-today').textContent = state.config.downloadHistory
      .filter(h => new Date(h.date).toDateString() === today).length;
  });
  window.api.on('download:error', data => addActivity({ type: 'error', message: data.error }));
}

/* ── Boot ────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);