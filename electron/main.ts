import fs from 'fs';
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
} from 'electron';
import {
  RunningLocalAppServer,
  startLocalAppServer,
} from './localAppServer';

interface PersistedWindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

const DEFAULT_WINDOW_STATE: PersistedWindowState = {
  width: 1480,
  height: 920,
  isMaximized: false,
};

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'osu:']);

app.setName('osu!radar');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.osuradar.desktop');
}

let mainWindow: BrowserWindow | null = null;
let localServer: RunningLocalAppServer | null = null;
let activeAppOrigin = '';

function getAppRoot(): string {
  // Compiled file lives at <root>/dist-electron/electron/main.js
  return path.resolve(__dirname, '../..');
}

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): PersistedWindowState {
  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf8');
    const parsed = JSON.parse(raw);
    const width =
      typeof parsed.width === 'number' && parsed.width >= 900
        ? parsed.width
        : DEFAULT_WINDOW_STATE.width;
    const height =
      typeof parsed.height === 'number' && parsed.height >= 600
        ? parsed.height
        : DEFAULT_WINDOW_STATE.height;
    return {
      width,
      height,
      x: typeof parsed.x === 'number' ? parsed.x : undefined,
      y: typeof parsed.y === 'number' ? parsed.y : undefined,
      isMaximized: Boolean(parsed.isMaximized),
    };
  } catch {
    return { ...DEFAULT_WINDOW_STATE };
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    const payload: PersistedWindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized,
    };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Ignore write failure on read-only environments
  }
}

function resolveAppIcon(appRoot: string): string | undefined {
  const candidates = [
    path.join(appRoot, 'dist', 'images', 'layout', 'osu-logo@2x.png'),
    path.join(appRoot, 'public', 'images', 'layout', 'osu-logo@2x.png'),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }
  return undefined;
}

function openExternalSafely(rawUrl: string): void {
  try {
    const parsed = new URL(rawUrl);
    if (ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      shell.openExternal(rawUrl).catch(() => {});
    }
  } catch {
    // Ignore malformed URLs
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('osu-radar:window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('osu-radar:window-toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }
    win.maximize();
    return true;
  });

  ipcMain.handle('osu-radar:window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  ipcMain.handle('osu-radar:window-is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return Boolean(win?.isMaximized());
  });

  ipcMain.handle(
    'osu-radar:select-directory',
    async (event, options?: { title?: string; defaultPath?: string }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const dialogOpts: Electron.OpenDialogOptions = {
        title: options?.title || 'Selecionar Pasta',
        defaultPath:
          options?.defaultPath && fs.existsSync(options.defaultPath)
            ? options.defaultPath
            : undefined,
        properties: ['openDirectory', 'dontAddToRecent'],
      };
      const result = win
        ? await dialog.showOpenDialog(win, dialogOpts)
        : await dialog.showOpenDialog(dialogOpts);
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    }
  );

  ipcMain.handle('osu-radar:open-external', async (_event, url: string) => {
    if (typeof url === 'string' && url.trim()) {
      openExternalSafely(url.trim());
    }
  });
}

async function createMainWindow(): Promise<void> {
  const appRoot = getAppRoot();
  const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim();

  let targetUrl: string;
  if (devServerUrl) {
    targetUrl = devServerUrl;
  } else {
    const distDir = path.join(appRoot, 'dist');
    localServer = await startLocalAppServer({ distDir });
    targetUrl = localServer.url;
  }

  activeAppOrigin = new URL(targetUrl).origin;

  const savedState = loadWindowState();
  const isMac = process.platform === 'darwin';
  const preloadPath = path.join(__dirname, 'preload.cjs');

  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 1024,
    minHeight: 660,
    show: false,
    frame: isMac ? true : false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#171316',
    title: 'osu!radar',
    icon: resolveAppIcon(appRoot),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow = win;

  win.on('maximize', () => {
    win.webContents.send('osu-radar:maximized-changed', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('osu-radar:maximized-changed', false);
  });

  win.on('close', () => {
    saveWindowState(win);
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  // Keyboard shortcuts: F11 fullscreen toggle, Ctrl+Shift+I DevTools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    } else if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      win.webContents.toggleDevTools();
    }
  });

  // Route target="_blank" and external / osu:// links cleanly to OS shell
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafely(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== activeAppOrigin) {
        event.preventDefault();
        openExternalSafely(url);
      }
    } catch {
      event.preventDefault();
    }
  });

  win.once('ready-to-show', () => {
    if (process.env.OSU_RADAR_SMOKE_TEST === '1') {
      return;
    }
    if (savedState.isMaximized) {
      win.maximize();
    }
    win.show();
  });

  if (process.env.OSU_RADAR_SMOKE_TEST === '1') {
    win.webContents.once('did-finish-load', async () => {
      try {
        await new Promise((r) => setTimeout(r, 500));
        const info = await win.webContents.executeJavaScript(`({
          hasDesktopBridge: Boolean(window.osuRadarDesktop && window.osuRadarDesktop.isElectron),
          rootLen: (document.getElementById('root')?.innerHTML || '').length,
          title: document.title
        })`);
        console.log('OSU_RADAR_ELECTRON_READY', JSON.stringify({ url: targetUrl, ...info }));
        app.exit(info.hasDesktopBridge && info.rootLen > 0 ? 0 : 1);
      } catch (err) {
        console.error('OSU_RADAR_ELECTRON_SMOKE_ERROR', err);
        app.exit(1);
      }
    });
  }

  await win.loadURL(targetUrl);
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerIpcHandlers();
    await createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow().catch((err) => console.error(err));
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    if (localServer) {
      localServer.close().catch(() => {});
      localServer = null;
    }
  });
}
