const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');

// Service modules
const audioSourceManager = require('./services/AudioSourceManager');
const RecorderService = require('./services/RecorderService');
const settingsStore = require('./services/SettingsStore');

// Instantiate services
const recorderService = new RecorderService();

// TriggerEngine is instantiated after other services
const TriggerEngine = require('./services/TriggerEngine');
const triggerEngine = new TriggerEngine(recorderService, settingsStore);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools by default for debugging
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          click: () => mainWindow.webContents.send('open-settings')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Audio',
      submenu: [
        {
          label: 'Refresh Audio Devices',
          click: () => {
            audioSourceManager.refresh();
            mainWindow.webContents.send('refresh-devices');
          }
        },
        {
          label: 'System Audio Setup Guide',
          click: () => {
            mainWindow.webContents.send('show-system-audio-guide');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => mainWindow.webContents.send('open-about')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('get-audio-sources', async () => {
  console.log("[IPC] Requested audio sources");
  const sources = audioSourceManager.getSources();
  console.log("[IPC] Returning sources:", sources);
  return sources;
});

ipcMain.handle('get-system-audio-info', async () => {
  console.log("[IPC] Requested system audio information");
  const info = audioSourceManager.getSystemAudioCaptureInstructions();
  console.log("[IPC] Returning system audio info:", info);
  return info;
});

ipcMain.handle('start-recording', async (event, options) => {
  console.log("[IPC] Starting recording with options:", options);
  const id = recorderService.startRecording(options);
  return id ? { success: true, id } : { success: false, message: "Failed to start recording" };
});

ipcMain.handle('stop-recording', async (event, recordingId) => {
  console.log("[IPC] Stopping recording:", recordingId);
  return recorderService.stopRecording(recordingId);
});

ipcMain.handle('get-active-recordings', async () => {
  console.log("[IPC] Getting active recordings");
  return recorderService.getActiveRecordings();
});

ipcMain.handle('save-settings', async (event, settings) => {
  console.log("[IPC] Saving settings:", settings);
  settingsStore.set('settings', settings);
  return true;
});

ipcMain.handle('get-settings', async () => {
  console.log("[IPC] Getting settings");
  const settings = settingsStore.get('settings') || {};
  console.log("[IPC] Returning settings:", settings);
  return settings;
});

ipcMain.handle('add-trigger', async (event, triggerConfig) => {
  console.log("[IPC] Adding trigger:", triggerConfig);
  return triggerEngine.addTrigger(triggerConfig);
});

ipcMain.handle('remove-trigger', async (event, triggerId) => {
  console.log("[IPC] Removing trigger:", triggerId);
  return triggerEngine.removeTrigger(triggerId);
});

ipcMain.handle('list-triggers', async () => {
  console.log("[IPC] Listing triggers");
  const triggers = triggerEngine.listTriggers();
  console.log("[IPC] Returning triggers:", triggers);
  return triggers;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Recordings Folder'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});