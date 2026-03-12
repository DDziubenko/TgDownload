const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Config
  getConfig:  ()                     => ipcRenderer.invoke('config:get'),
  setConfig:  (key, value)           => ipcRenderer.invoke('config:set', key, value),

  // Auth
  submit2FA:  (password)   => ipcRenderer.invoke('auth:submit2FA', password),
  logout:     ()           => ipcRenderer.invoke('auth:logout'),
  startQr:    (apiId, apiHash) => ipcRenderer.invoke('auth:startQr', apiId, apiHash),
  cancelQr:   ()           => ipcRenderer.invoke('auth:cancelQr'),

  // Client
  connect:    ()                      => ipcRenderer.invoke('client:connect'),

  // Chats
  loadChats:  ()                      => ipcRenderer.invoke('chats:load'),

  // Dialog
  pickFolder: ()                      => ipcRenderer.invoke('dialog:pickFolder'),

  // Monitor
  startMonitor: ()                    => ipcRenderer.invoke('monitor:start'),
  stopMonitor:  ()                    => ipcRenderer.invoke('monitor:stop'),

  // History
  clearHistory: ()                    => ipcRenderer.invoke('history:clear'),
  openFile:     (p)                   => ipcRenderer.invoke('history:openFile', p),

  // Events from main process → renderer
  on: (channel, cb) => {
    const allowed = [
      'download:progress', 'download:complete', 'download:error',
      'auth:qrToken', 'auth:qrDone', 'auth:qrError', 'auth:qrNeed2FA'
    ];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => cb(data));
    }
  },
  off: (channel) => ipcRenderer.removeAllListeners(channel)
});