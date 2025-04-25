const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Service modules
const AudioSourceManager = require('./services/AudioSourceManager');
const RecorderService = require('./services/RecorderService');
const SettingsStore = require('./services/SettingsStore');
const TriggerEngine = require('./services/TriggerEngine');

// Instantiate services
const audioSourceManager = new AudioSourceManager();
const recorderService = new RecorderService();
const settingsStore = new SettingsStore();
const triggerEngine = new TriggerEngine();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

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
  return audioSourceManager.getSources();
});

ipcMain.handle('start-recording', async (event, options) => {
  return recorderService.startRecording(options);
});

ipcMain.handle('stop-recording', async (event, recordingId) => {
  return recorderService.stopRecording(recordingId);
});

ipcMain.handle('save-settings', async (event, settings) => {
  return settingsStore.save(settings);
});

ipcMain.handle('get-settings', async () => {
  return settingsStore.get();
});

ipcMain.handle('add-trigger', async (event, triggerConfig) => {
  return triggerEngine.addTrigger(triggerConfig);
});

ipcMain.handle('remove-trigger', async (event, triggerId) => {
  return triggerEngine.removeTrigger(triggerId);
});

ipcMain.handle('list-triggers', async () => {
  return triggerEngine.getTriggers();
});