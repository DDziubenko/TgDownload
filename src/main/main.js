const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Pre-require telegram modules once at startup to avoid lazy-loading race conditions
const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');

const store = new Store();

let mainWindow = null;
let tray = null;
let telegramClient = null;
let isMonitoring = false;

async function destroyClient() {
  if (telegramClient) {
    try { telegramClient.removeEventHandler(); } catch {}
    try { await telegramClient.disconnect(); } catch {}
    telegramClient = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 800,
    minHeight: 580,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' || isMonitoring) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin') icon = icon.resize({ width: 16, height: 16 });
  } catch {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon);
  updateTrayMenu();
  tray.on('click', () => {
    if (mainWindow.isVisible()) { mainWindow.hide(); } else { mainWindow.show(); mainWindow.focus(); }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: isMonitoring ? '● Monitoring active' : '○ Not monitoring', enabled: false },
    { type: 'separator' },
    { label: 'Open', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(isMonitoring ? 'TG Downloader — Monitoring' : 'TG Downloader — Idle');
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => { if (!mainWindow.isVisible()) mainWindow.show(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
  stopMonitoring();
});

// ── IPC: Config ───────────────────────────────────────────────────────────────

ipcMain.handle('config:get', () => {
  return {
    apiId:            store.get('apiId'),
    apiHash:          store.get('apiHash'),
    sessionString:    store.get('sessionString', ''),
    watchedChats:     store.get('watchedChats', []),
    rules:            store.get('rules', []),
    downloadHistory:  store.get('downloadHistory', []),
    monitoringActive: store.get('monitoringActive', false),
    startMinimized:   store.get('startMinimized', false),
    isLoggedIn:       !!store.get('sessionString', ''),
    isMonitoring
  };
});

ipcMain.handle('config:set', (_, key, value) => {
  store.set(key, value);
  return true;
});

// ── IPC: Auth ─────────────────────────────────────────────────────────────────

ipcMain.handle('auth:startQr', async (_, apiId, apiHash) => {
  console.log('[auth:startQr] called');
  try {
    await destroyClient();
    const QRCode = require('qrcode');
    const session = new StringSession('');
    telegramClient = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
      useWSS: false,
      sequentialUpdates: false
    });
    await telegramClient.connect();
    store.set('apiId', parseInt(apiId));
    store.set('apiHash', apiHash);

    telegramClient.signInUserWithQrCode(
      { apiId: parseInt(apiId), apiHash },
      {
        qrCode: async ({ token, expires }) => {
          const tokenB64 = Buffer.from(token)
            .toString('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
          const qrUrl = `tg://login?token=${tokenB64}`;
          const dataUrl = await QRCode.toDataURL(qrUrl, {
            width: 200, margin: 2,
            color: { dark: '#ffffff', light: '#161616' }
          });
          sendToRenderer('auth:qrToken', { dataUrl, expires });
        },
        onError: (err) => {
          if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') return true;
          sendToRenderer('auth:qrError', { error: err.message });
          return false;
        }
      }
    )
    .then(async () => {
      const sessionString = telegramClient.session.save();
      store.set('sessionString', sessionString);
      console.log('[auth:startQr] success');
      sendToRenderer('auth:qrDone', {});
    })
    .catch(err => {
      if (err && err.message === 'USER_CANCELLED') return;
      if (err && err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        sendToRenderer('auth:qrNeed2FA', {});
        return;
      }
      console.error('[auth:startQr] error:', err?.message);
      sendToRenderer('auth:qrError', { error: err?.message || 'QR login failed' });
    });

    return { success: true };
  } catch (err) {
    console.error('[auth:startQr] connect error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('auth:cancelQr', async () => {
  await destroyClient();
  return { success: true };
});

ipcMain.handle('auth:submit2FA', async (_, password) => {
  console.log('[auth:submit2FA] called');
  try {
    const { computeCheck } = require('telegram/Password');
    const r = await telegramClient.invoke(new Api.account.GetPassword());
    const check = await computeCheck(r, password);
    await telegramClient.invoke(new Api.auth.CheckPassword({ password: check }));
    const sessionString = telegramClient.session.save();
    store.set('sessionString', sessionString);
    return { success: true };
  } catch (err) {
    console.error('[auth:submit2FA] ERROR:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('auth:logout', async () => {
  try {
    await destroyClient();
    store.set('sessionString', '');
    store.set('watchedChats', []);
    isMonitoring = false;
    updateTrayMenu();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Client ───────────────────────────────────────────────────────────────

ipcMain.handle('client:connect', async () => {
  const sessionString = store.get('sessionString', '');
  if (!sessionString) return { success: false, error: 'No session' };
  return connectClient();
});

// ── IPC: Chats ────────────────────────────────────────────────────────────────

ipcMain.handle('chats:load', async () => {
  if (!telegramClient) return { success: false, error: 'Not connected' };
  try {
    const dialogs = await telegramClient.getDialogs({ limit: 100 });
    const chats = dialogs.map(d => ({
      id: String(d.id),
      title: d.title || d.name || `User ${d.id}`,
      type: d.isGroup ? 'group' : d.isChannel ? 'channel' : 'dm',
      unreadCount: d.unreadCount
    }));
    return { success: true, chats };
  } catch (err) {
    console.error('[chats:load] ERROR:', err.message);
    return { success: false, error: err.message };
  }
});

// ── IPC: Dialog ───────────────────────────────────────────────────────────────

ipcMain.handle('dialog:pickFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// ── IPC: Monitor ──────────────────────────────────────────────────────────────

ipcMain.handle('monitor:start', async () => {
  if (!telegramClient) {
    const res = await connectClient();
    if (!res.success) return res;
  }
  return startMonitoring();
});

ipcMain.handle('monitor:stop', () => {
  stopMonitoring();
  return { success: true };
});

// ── IPC: History ──────────────────────────────────────────────────────────────

ipcMain.handle('history:clear', () => {
  store.set('downloadHistory', []);
  return true;
});

ipcMain.handle('history:openFile', (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// ── Monitoring ────────────────────────────────────────────────────────────────

async function connectClient() {
  const sessionString = store.get('sessionString', '');
  if (!sessionString) return { success: false, error: 'No session saved' };
  try {
    await destroyClient();
    telegramClient = new TelegramClient(
      new StringSession(sessionString),
      store.get('apiId'),
      store.get('apiHash'),
      { connectionRetries: 5, useWSS: false, sequentialUpdates: false }
    );
    await telegramClient.connect();

    // Suppress noisy TIMEOUT errors from the update loop — they are non-fatal
    telegramClient.catch = (err) => {
      if (err && err.message === 'TIMEOUT') return;
      console.error('[telegramClient] unhandled error:', err?.message);
    };

    return { success: true };
  } catch (err) {
    console.error('[connectClient] ERROR:', err.message);
    return { success: false, error: err.message };
  }
}

async function startMonitoring() {
  try {
    const { NewMessage } = require('telegram/events');
    const watchedChats = store.get('watchedChats', []);
    const rules = store.get('rules', []);

    if (!watchedChats.length) return { success: false, error: 'No chats selected' };
    if (!rules.length) return { success: false, error: 'No download rules configured' };

    const me = await telegramClient.getMe();
    const myId = String(me.id);

    // Track processed message IDs to prevent duplicates
    const processedIds = new Set();

    telegramClient.addEventHandler(async (event) => {
      try {
        const msg = event.message;
        if (!msg || !msg.media) return;

        // Deduplicate by message ID
        const msgId = String(msg.id);
        if (processedIds.has(msgId)) return;
        processedIds.add(msgId);

        // Trim the set so it doesn't grow forever
        if (processedIds.size > 500) {
          const first = processedIds.values().next().value;
          processedIds.delete(first);
        }

        // Skip messages sent by me
        const senderId = String(msg.senderId || msg.fromId?.userId);
        if (senderId === myId) return;

        // Check if chat is watched
        const chatId = String(msg.chatId || msg.peerId?.channelId || msg.peerId?.chatId || msg.peerId?.userId);
        const isWatched = watchedChats.some(c => c.id === chatId || c.id === `-100${chatId}`);
        if (!isWatched) return;

        // Get file attributes
        let fileName = null;
        let fileExt = null;

        const doc = msg.media?.document;
        if (doc) {
          const nameAttr = doc.attributes?.find(a => a.fileName);
          if (nameAttr) {
            fileName = nameAttr.fileName;
            fileExt = path.extname(fileName).toLowerCase().replace('.', '');
          }
        } else if (msg.media?.photo) {
          fileExt = 'jpg';
          fileName = `photo_${Date.now()}.jpg`;
        }

        if (!fileExt) return;

        // Find matching rule
        const rule = rules.find(r => r.ext.toLowerCase() === fileExt);
        if (!rule) return;

        // Ensure folder exists
        if (!fs.existsSync(rule.folder)) {
          fs.mkdirSync(rule.folder, { recursive: true });
        }

        const baseName = fileName || `file_${Date.now()}.${fileExt}`;
        const ext = path.extname(baseName);
        const nameWithoutExt = path.basename(baseName, ext);

        // If file exists, append v-1, v-2, v-3... until we find a free name
        let finalName = baseName;
        let destPath = path.join(rule.folder, finalName);
        let version = 1;
        while (fs.existsSync(destPath)) {
          finalName = `${nameWithoutExt} v-${version}${ext}`;
          destPath = path.join(rule.folder, finalName);
          version++;
        }

        sendToRenderer('download:progress', { fileName: finalName, status: 'downloading' });

        const buffer = await telegramClient.downloadMedia(msg.media, {
          progressCallback: (recv, total) => {
            if (total > 0) {
              sendToRenderer('download:progress', {
                fileName: finalName,
                status: 'downloading',
                percent: Math.round((recv / total) * 100)
              });
            }
          }
        });

        if (buffer) {
          fs.writeFileSync(destPath, buffer);

          const historyEntry = {
            id: msgId,
            fileName: finalName,
            ext: fileExt,
            folder: rule.folder,
            filePath: destPath,
            chatId,
            chatTitle: watchedChats.find(c => c.id === chatId || c.id === `-100${chatId}`)?.title || 'Unknown',
            size: buffer.length,
            date: new Date().toISOString()
          };

          // Deduplicate history by message ID before saving
          const history = store.get('downloadHistory', []);
          if (!history.some(h => h.id === msgId)) {
            history.unshift(historyEntry);
            if (history.length > 500) history.splice(500);
            store.set('downloadHistory', history);
            sendToRenderer('download:complete', historyEntry);
            new Notification({ title: 'File Downloaded', body: `${finalName} → ${rule.folder}` }).show();
          }
        }
      } catch (err) {
        console.error('[monitor] handler error:', err.message);
        sendToRenderer('download:error', { error: err.message });
      }
    }, new NewMessage({}));

    isMonitoring = true;
    store.set('monitoringActive', true);
    updateTrayMenu();
    return { success: true };
  } catch (err) {
    console.error('[startMonitoring] ERROR:', err.message);
    return { success: false, error: err.message };
  }
}

function stopMonitoring() {
  if (telegramClient) {
    try { telegramClient.removeEventHandler(); } catch {}
  }
  isMonitoring = false;
  store.set('monitoringActive', false);
  updateTrayMenu();
}

// Suppress TIMEOUT errors that leak from gramjs _updateLoop — these are non-fatal
process.on('uncaughtException', (err) => {
  if (err && err.message === 'TIMEOUT') return;
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (err) => {
  if (err && err.message === 'TIMEOUT') return;
  console.error('[unhandledRejection]', err);
});

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}