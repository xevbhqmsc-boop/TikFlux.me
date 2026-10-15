const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const net = require('net');
const childProcess = require('child_process');
const http = require('http');
const https = require('https');

let mainWindow = null;
let serverProcess = null;
let serverPort = null;
let isQuitting = false;

const SERVER_START_TIMEOUT = 20000;
const APP_NAME = 'Tiklinux Desktop';
const isPackaged = app.isPackaged;

function getRootDir() {
  if (isPackaged) {
    return path.dirname(app.getPath('exe'));
  }
  return path.join(__dirname, '..');
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function startServer() {
  serverPort = await findAvailablePort();
  console.log(`[Tiklinux] Starting server on port ${serverPort}`);

  let serverPath;
  if (isPackaged) {
    serverPath = path.join(app.getAppPath(), 'server.js');
  } else {
    serverPath = path.join(__dirname, '..', 'server.js');
  }

  console.log(`[Tiklinux] Server path: ${serverPath}`);

  serverProcess = childProcess.fork(serverPath, [], {
    env: { ...process.env, PORT: serverPort },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    silent: true,
  });

  serverProcess.stdout?.on('data', d => console.log('[Server]', d.toString().trim()));
  serverProcess.stderr?.on('data', d => console.error('[Server]', d.toString().trim()));

  serverProcess.on('error', err => {
    console.error('[Tiklinux] Server error:', err.message);
  });

  serverProcess.on('exit', (code) => {
    console.log(`[Tiklinux] Server exited code=${code}`);
    serverProcess = null;
  });

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const sock = net.createConnection(serverPort, '127.0.0.1');
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() - start > SERVER_START_TIMEOUT) {
          reject(new Error('Server start timeout'));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('[Tiklinux] Stopping server...');
    try { serverProcess.kill('SIGTERM'); } catch(e) {}
    serverProcess = null;
  }
}

function checkInternet() {
  return new Promise((resolve) => {
    const req = https.get('https://www.google.com/generate_204', { timeout: 5000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 204 || res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: APP_NAME,
    icon: isPackaged
      ? path.join(process.resourcesPath, 'icon.ico')
      : path.join(__dirname, '..', 'tiktok-logo.png'),
    backgroundColor: '#080E10',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    frame: true,
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[Tiklinux] Window ready');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('unresponsive', () => {
    console.log('[Tiklinux] Window unresponsive, reloading...');
    setTimeout(() => {
      if (mainWindow) mainWindow.reload();
    }, 5000);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    const appUrl = `http://127.0.0.1:${serverPort}`;
    if (!url.startsWith(appUrl)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

let internetCheckInterval = null;

function startInternetMonitor() {
  let lastStatus = true;

  internetCheckInterval = setInterval(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const online = await checkInternet();
    if (online !== lastStatus) {
      lastStatus = online;
      mainWindow.webContents.send('internet-status', online);
      console.log(`[Tiklinux] Internet ${online ? 'connected' : 'disconnected'}`);
    }
  }, 10000);
}

function stopInternetMonitor() {
  if (internetCheckInterval) {
    clearInterval(internetCheckInterval);
    internetCheckInterval = null;
  }
}

app.whenReady().then(async () => {
  try {
    console.log('[Tiklinux] Starting...');
    console.log('[Tiklinux] Packaged:', isPackaged);
    await startServer();
    createWindow();
    startInternetMonitor();

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        try {
          const { checkForUpdates } = require('./updater');
          checkForUpdates(mainWindow);
        } catch(e) {
          console.log('[Tiklinux] Updater not available:', e.message);
        }
      }
    }, 8000);
  } catch(e) {
    console.error('[Tiklinux] Failed to start:', e.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopInternetMonitor();
  stopServer();
  app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  stopInternetMonitor();
  stopServer();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-name', () => APP_NAME);
ipcMain.handle('restart-app', () => {
  stopServer();
  app.relaunch();
  app.quit();
});
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('check-internet', () => checkInternet());

process.on('uncaughtException', (err) => {
  console.error('[Tiklinux] Uncaught:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Tiklinux] Unhandled:', err);
});
