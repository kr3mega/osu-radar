import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  shell,
} from 'electron';
import {
  RunningLocalAppServer,
  startLocalAppServer,
} from './localAppServer';
import {
  createDesktopLogger,
  DesktopLogger,
} from './logger';

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

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'osu:', 'osulazer:']);

app.setName('osu!skills');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.osuskills.desktop');
}

// Configurações de aceleração gráfica seguras e compatíveis para Desktop
// Habilita aceleração por padrão mantendo estabilidade caso a GPU esteja inativa ou em fallback de software
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder');
}

let mainWindow: BrowserWindow | null = null;
let localServer: RunningLocalAppServer | null = null;
let stopDistWatcher: (() => void) | null = null;
let activeAppOrigin = '';

function getAppRoot(): string {
  // Compiled file lives at <root>/dist-electron/electron/main.js
  return path.resolve(__dirname, '../..');
}

const appRoot = getAppRoot();
let userDataDir: string | undefined;
try {
  userDataDir = app.getPath('userData');
} catch {
  // Ignore if userData is unavailable early
}

const logger = createDesktopLogger({
  appRoot,
  userDataDir,
});

process.on('uncaughtException', (err) => {
  logger.error('Main', 'Exceção não tratada capturada (uncaughtException):', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Main', 'Promise rejeitada sem tratamento (unhandledRejection):', reason);
});

process.on('warning', (warning) => {
  logger.warn('Main', `Aviso de processo Node (${warning.name}): ${warning.message}`);
});

function logSystemDiagnostics(appLogger: DesktopLogger, root: string) {
  const totalMemGb = (os.totalmem() / 1024 ** 3).toFixed(2);
  const freeMemGb = (os.freemem() / 1024 ** 3).toFixed(2);
  const memUsage = process.memoryUsage();
  const rssMb = (memUsage.rss / 1024 ** 2).toFixed(1);
  const heapUsedMb = (memUsage.heapUsed / 1024 ** 2).toFixed(1);
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Desconhecido';

  appLogger.system('System', `================================================================================`);
  appLogger.system('System', `DIAGNÓSTICO COMPLETO DO AMBIENTE DESKTOP (PID: ${process.pid})`);
  appLogger.system('System', `================================================================================`);
  appLogger.system('System', `OS: ${os.type()} ${os.release()} (${os.arch()}) | Hostname: ${os.hostname()}`);
  appLogger.system('System', `CPU: ${cpuModel} (${cpus.length} núcleos lógicos)`);
  appLogger.system('System', `Memória RAM: ${freeMemGb} GB livres de ${totalMemGb} GB`);
  appLogger.system('System', `Memória Processo: RSS ${rssMb} MB | Heap Usado ${heapUsedMb} MB`);
  appLogger.system('System', `Versões: Node ${process.versions.node} | Electron ${process.versions.electron} | Chrome ${process.versions.chrome} | V8 ${process.versions.v8}`);
  appLogger.system('System', `Linha de Comando (argv): ${JSON.stringify(process.argv)}`);
  appLogger.system('System', `Diretório de Trabalho (cwd): ${process.cwd()}`);
  appLogger.system('System', `Diretório Raiz do App: ${root}`);
  try {
    appLogger.system('System', `Diretório UserData: ${app.getPath('userData')}`);
    appLogger.system('System', `Diretório AppData: ${app.getPath('appData')}`);
    appLogger.system('System', `Diretório Temp: ${app.getPath('temp')}`);
    appLogger.system('System', `Executável Electron: ${app.getPath('exe')}`);
  } catch {}
  appLogger.system('System', `Log Primário (Projeto): ${appLogger.getPrimaryLogPath()}`);
  const sec = appLogger.getSecondaryLogPath();
  if (sec) {
    appLogger.system('System', `Log Secundário (AppData): ${sec}`);
  }
  appLogger.system('System', `================================================================================`);
}

function logDisplayDiagnostics(appLogger: DesktopLogger) {
  try {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    appLogger.system(
      'Display',
      `Monitores detectados (${displays.length}): Primário ${primary.bounds.width}x${primary.bounds.height} (Escala: ${Math.round(primary.scaleFactor * 100)}%, Taxa: ${primary.displayFrequency || 60}Hz)`
    );
    displays.forEach((d, idx) => {
      appLogger.system(
        'Display',
        `  -> Monitor #${idx + 1} (ID ${d.id}): ${d.bounds.width}x${d.bounds.height} em (${d.bounds.x}, ${d.bounds.y}) | Área útil: ${d.workArea.width}x${d.workArea.height}`
      );
    });
  } catch (err) {
    appLogger.warn('Display', 'Não foi possível ler as métricas dos monitores:', err);
  }
}

async function logGPUDiagnostics(appLogger: DesktopLogger) {
  try {
    const status = app.getGPUFeatureStatus();
    appLogger.system(
      'GPU',
      `Aceleração de Hardware: Canvas 2D: ${status['2d_canvas']} | WebGL: ${status.webgl} | WebGL2: ${status.webgl2} | Rasterização GPU: ${status.rasterization} | Video Decode: ${status.video_decode}`
    );
    const gpuInfo = await app.getGPUInfo('basic');
    if (gpuInfo) {
      const devices = (gpuInfo as any).gpuDevice || [];
      if (Array.isArray(devices) && devices.length > 0) {
        devices.forEach((dev: any, i: number) => {
          const vendorHex = (dev.vendorId || 0).toString(16).toUpperCase();
          const deviceHex = (dev.deviceId || 0).toString(16).toUpperCase();
          appLogger.system(
            'GPU',
            `  -> Adaptador Gráfico #${i + 1}: Vendor ID 0x${vendorHex} | Device ID 0x${deviceHex} | Ativo: ${dev.active ? 'SIM' : 'NÃO'}`
          );
        });
      }
    }
  } catch (err) {
    appLogger.warn('GPU', 'Não foi possível ler status detalhado da GPU:', err);
  }
}

function getWindowStatePath(): string {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState(): PersistedWindowState {
  try {
    const filePath = getWindowStatePath();
    if (!fs.existsSync(filePath)) {
      logger.info('Window', `Nenhum estado prévio de janela salvo em ${filePath}. Usando padrão 1480x920.`);
      return { ...DEFAULT_WINDOW_STATE };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const width =
      typeof parsed.width === 'number' && parsed.width >= 900
        ? parsed.width
        : DEFAULT_WINDOW_STATE.width;
    const height =
      typeof parsed.height === 'number' && parsed.height >= 600
        ? parsed.height
        : DEFAULT_WINDOW_STATE.height;
    const state: PersistedWindowState = {
      width,
      height,
      x: typeof parsed.x === 'number' ? parsed.x : undefined,
      y: typeof parsed.y === 'number' ? parsed.y : undefined,
      isMaximized: Boolean(parsed.isMaximized),
    };
    logger.info(
      'Window',
      `Preferências de janela carregadas: ${state.width}x${state.height} (maximizada: ${state.isMaximized}, x: ${state.x}, y: ${state.y})`
    );
    return state;
  } catch (err) {
    logger.warn('Window', 'Erro ao ler arquivo de estado da janela:', err);
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
    logger.debug(
      'Window',
      `Preferências de janela salvas com sucesso: ${payload.width}x${payload.height} (maximizada: ${payload.isMaximized})`
    );
  } catch (err) {
    logger.warn('Window', 'Não foi possível salvar o estado da janela em disco:', err);
  }
}

function resolveAppIcon(targetRoot: string): string | undefined {
  const candidates = [
    path.join(targetRoot, 'dist', 'images', 'layout', 'osu-logo@2x.png'),
    path.join(targetRoot, 'public', 'images', 'layout', 'osu-logo@2x.png'),
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
      logger.info('Navigation', `Abrindo URL externa no navegador padrão do sistema: ${rawUrl}`);
      shell.openExternal(rawUrl).catch((err) => {
        logger.warn('Navigation', `Falha ao abrir URL externa: ${rawUrl}`, err);
      });
    } else {
      logger.warn('Navigation', `Protocolo externo não autorizado bloqueado: ${parsed.protocol}`);
    }
  } catch {
    logger.warn('Navigation', `URL externa malformada ignorada: ${rawUrl}`);
  }
}

function registerIpcHandlers(appLogger: DesktopLogger): void {
  const handleBoth = (
    action: string,
    handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any
  ) => {
    ipcMain.handle(`osu-skills:${action}`, handler);
    ipcMain.handle(`osu-radar:${action}`, handler);
  };

  handleBoth('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
    appLogger.ipc('window-minimize', 'Comando de minimizar janela recebido via barra de título');
  });

  handleBoth('window-toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      appLogger.ipc('window-toggle-maximize', 'Janela restaurada ao tamanho normal');
      return false;
    }
    win.maximize();
    appLogger.ipc('window-toggle-maximize', 'Janela maximizada');
    return true;
  });

  handleBoth('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    appLogger.ipc('window-close', 'Comando de fechar janela recebido via barra de título');
    win?.close();
  });

  handleBoth('window-is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const max = Boolean(win?.isMaximized());
    appLogger.ipc('window-is-maximized', `Consulta de estado maximizado: ${max}`);
    return max;
  });

  handleBoth(
    'select-directory',
    async (event, options?: { title?: string; defaultPath?: string }) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const dialogTitle = options?.title || 'Selecionar Pasta';
      appLogger.ipc('select-directory', `Abrindo diálogo de pasta: "${dialogTitle}" (default: ${options?.defaultPath || 'nenhum'})`);
      const dialogOpts: Electron.OpenDialogOptions = {
        title: dialogTitle,
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
        appLogger.ipc('select-directory', 'Seleção cancelada pelo usuário.');
        return null;
      }
      const chosen = result.filePaths[0];
      appLogger.ipc('select-directory', `Pasta selecionada: ${chosen}`);
      return chosen;
    }
  );

  handleBoth('open-external', async (_event, url: string) => {
    appLogger.ipc('open-external', `Solicitação de link externo: ${url}`);
    if (typeof url === 'string' && url.trim()) {
      openExternalSafely(url.trim());
    }
  });

  handleBoth('get-gpu-status', () => {
    appLogger.ipc('get-gpu-status', 'Consulta de aceleração de hardware solicitada pela interface');
    return app.getGPUFeatureStatus();
  });

  handleBoth(
    'log',
    (_event, payload?: { level?: string; tag?: string; message?: string; extra?: any }) => {
      if (!payload || !payload.message) return;
      const level = (payload.level || 'info').toLowerCase();
      const tag = payload.tag || 'UI';
      if (level === 'error') {
        appLogger.error(tag, payload.message, payload.extra);
      } else if (level === 'warn') {
        appLogger.warn(tag, payload.message, payload.extra);
      } else if (level === 'debug') {
        appLogger.debug(tag, payload.message, payload.extra);
      } else {
        appLogger.info(tag, payload.message, payload.extra);
      }
    }
  );
}

let reloadDebounceTimer: NodeJS.Timeout | null = null;
function requestWindowReload(appLogger: DesktopLogger, reason: string, delayMs = 350): void {
  if (reloadDebounceTimer) {
    clearTimeout(reloadDebounceTimer);
  }
  reloadDebounceTimer = setTimeout(() => {
    reloadDebounceTimer = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      appLogger.info('AutoReload', `Recarregando interface (${reason})...`);
      mainWindow.webContents.reloadIgnoringCache();
    }
  }, delayMs);
}

function setupAutoReloadWatcher(
  targetRoot: string,
  appLogger: DesktopLogger,
  getWindow: () => BrowserWindow | null
): () => void {
  const distDir = path.join(targetRoot, 'dist');
  const indexHtml = path.join(distDir, 'index.html');

  let pollInterval: NodeJS.Timeout | null = null;
  let watcher: fs.FSWatcher | null = null;
  let lastMtime = 0;
  let isWatching = true;

  try {
    if (fs.existsSync(indexHtml)) {
      lastMtime = fs.statSync(indexHtml).mtimeMs;
    }
  } catch {}

  const triggerReload = (reason: string) => {
    if (!isWatching) return;
    const win = getWindow();
    if (!win || win.isDestroyed()) return;

    try {
      if (!fs.existsSync(indexHtml)) return;
      const stat = fs.statSync(indexHtml);
      if (stat.size === 0) return;
      lastMtime = stat.mtimeMs;
      requestWindowReload(appLogger, `[ATUALIZAÇÃO DETECTADA] ${reason}`, 500);
    } catch (err) {
      appLogger.warn('AutoReload', 'Erro ao validar index.html para recarregamento:', err);
    }
  };

  // 1. fs.watch no diretório dist/
  try {
    if (fs.existsSync(distDir)) {
      watcher = fs.watch(distDir, { recursive: true }, (_eventType, filename) => {
        if (!filename) return;
        const norm = filename.replace(/\\/g, '/');
        if (norm.endsWith('index.html') || norm === 'index.html') {
          triggerReload(`Arquivo ${filename} modificado em disco`);
        }
      });
      appLogger.info('AutoReload', `Monitor de compilação ativo em: ${distDir}`);
    }
  } catch (err) {
    appLogger.warn('AutoReload', 'Aviso ao iniciar fs.watch em dist/:', err);
  }

  // 2. Polling secundário por mtimeMs de index.html a cada 1.5s
  pollInterval = setInterval(() => {
    if (!isWatching) return;
    try {
      if (fs.existsSync(indexHtml)) {
        const currentMtime = fs.statSync(indexHtml).mtimeMs;
        if (lastMtime > 0 && currentMtime > lastMtime + 50) {
          lastMtime = currentMtime;
          triggerReload('Timestamp de modificação (mtime) de dist/index.html atualizado');
        } else if (lastMtime === 0) {
          lastMtime = currentMtime;
        }
      }
    } catch {}
  }, 1500);

  return () => {
    isWatching = false;
    if (pollInterval) clearInterval(pollInterval);
    if (watcher) {
      try {
        watcher.close();
      } catch {}
    }
  };
}

async function createMainWindow(appLogger: DesktopLogger): Promise<void> {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL?.trim();

  let targetUrl: string;
  if (devServerUrl) {
    appLogger.info('Main', `Modo Dev ativo. Carregando interface a partir do Vite: ${devServerUrl}`);
    targetUrl = devServerUrl;
  } else {
    const distDir = path.join(appRoot, 'dist');
    appLogger.info('Main', `Iniciando servidor loopback embutido com suporte nativo (dist: ${distDir})...`);
    localServer = await startLocalAppServer({
      distDir,
      logger: appLogger,
      onReloadRequested: () => {
        requestWindowReload(appLogger, 'solicitação via endpoint /api/dev/reload', 250);
      },
    });
    targetUrl = localServer.url;
    appLogger.info('Main', `Servidor loopback pronto em ${targetUrl} (porta: ${localServer.port})`);

    if (!stopDistWatcher) {
      stopDistWatcher = setupAutoReloadWatcher(appRoot, appLogger, () => mainWindow);
    }
  }

  activeAppOrigin = new URL(targetUrl).origin;

  const savedState = loadWindowState();
  const isMac = process.platform === 'darwin';
  const preloadPath = path.join(__dirname, 'preload.cjs');

  appLogger.info(
    'Window',
    `Criando janela principal (largura: ${savedState.width}, altura: ${savedState.height}, maximizada: ${savedState.isMaximized})`
  );

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
    title: 'osu!skills',
    icon: resolveAppIcon(appRoot),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webgl: true,
    },
  });

  mainWindow = win;

  win.on('resize', () => {
    const [w, h] = win.getSize();
    appLogger.debug('Window', `Janela redimensionada para: ${w}x${h}`);
  });

  win.on('move', () => {
    const [x, y] = win.getPosition();
    appLogger.debug('Window', `Janela movida para coordenadas: (${x}, ${y})`);
  });

  win.on('maximize', () => {
    appLogger.info('Window', 'Janela maximizada pelo usuário');
    win.webContents.send('osu-skills:maximized-changed', true);
    win.webContents.send('osu-radar:maximized-changed', true);
  });

  win.on('unmaximize', () => {
    appLogger.info('Window', 'Janela desmaximizada (restaurada)');
    win.webContents.send('osu-skills:maximized-changed', false);
    win.webContents.send('osu-radar:maximized-changed', false);
  });

  win.on('minimize', () => {
    appLogger.info('Window', 'Janela minimizada para a barra de tarefas');
  });

  win.on('restore', () => {
    appLogger.info('Window', 'Janela restaurada da barra de tarefas');
  });

  win.on('focus', () => {
    appLogger.debug('Window', 'Janela recebeu foco do sistema operacional');
  });

  win.on('blur', () => {
    appLogger.debug('Window', 'Janela perdeu foco');
  });

  win.on('enter-full-screen', () => {
    appLogger.info('Window', 'Janela entrou em modo Tela Cheia (Fullscreen)');
  });

  win.on('leave-full-screen', () => {
    appLogger.info('Window', 'Janela saiu do modo Tela Cheia (Fullscreen)');
  });

  win.on('page-title-updated', (_event, title) => {
    appLogger.debug('Window', `Título da página atualizado: "${title}"`);
  });

  win.on('close', () => {
    appLogger.info('Window', 'Fechamento da janela solicitado. Salvando preferências de tela...');
    saveWindowState(win);
  });

  win.on('closed', () => {
    appLogger.info('Window', 'Janela destruída pelo sistema operacional.');
    mainWindow = null;
  });

  // Intercept renderer console messages and pipe into live terminal and persistent log
  win.webContents.on('console-message', (event: any, ...legacyArgs: any[]) => {
    let level = 0;
    let message = '';
    let line = 0;
    let sourceId = '';

    if (event && typeof event === 'object' && ('message' in event || 'level' in event)) {
      level = event.level ?? 0;
      message = event.message ?? '';
      line = event.lineNumber ?? 0;
      sourceId = event.sourceId ?? '';
    } else {
      level = legacyArgs[0] ?? 0;
      message = legacyArgs[1] ?? '';
      line = legacyArgs[2] ?? 0;
      sourceId = legacyArgs[3] ?? '';
    }

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelStr = levelNames[level] || 'LOG';
    appLogger.renderer(levelStr, message, sourceId, line);
  });

  win.webContents.on('did-start-loading', () => {
    appLogger.debug('Renderer', 'Iniciando carregamento dos recursos da página web...');
  });

  win.webContents.on('dom-ready', () => {
    appLogger.info('Renderer', 'DOM Ready: estrutura HTML e scripts iniciais prontos.');
  });

  win.webContents.on('did-finish-load', () => {
    appLogger.info('Renderer', `Interface web carregada com sucesso (${win.webContents.getURL()})`);
  });

  win.webContents.on('did-stop-loading', () => {
    appLogger.debug('Renderer', 'Carregamento de rede finalizado.');
  });

  win.webContents.on('did-navigate', (_event, url, httpResponseCode) => {
    appLogger.info('Navigation', `Navegação para URL: ${url} (HTTP ${httpResponseCode})`);
  });

  win.webContents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    appLogger.debug('Navigation', `Navegação interna SPA: ${url} (mainFrame: ${isMainFrame})`);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    appLogger.error('Renderer', `Falha ao carregar página: ${errorDescription} (código ${errorCode}) em ${validatedURL}`);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    appLogger.error('Renderer', `Processo de renderização terminou inesperadamente: ${details.reason} (código: ${details.exitCode})`);
  });

  win.webContents.on('media-started-playing', () => {
    appLogger.info('Media', 'Mídia de áudio iniciada no player de preview');
  });

  win.webContents.on('media-paused', () => {
    appLogger.info('Media', 'Mídia de áudio pausada no player');
  });

  win.webContents.on('unresponsive', () => {
    appLogger.warn('Renderer', 'A interface ficou temporariamente sem resposta (unresponsive).');
  });

  win.webContents.on('responsive', () => {
    appLogger.info('Renderer', 'A interface voltou a responder normalmente (responsive).');
  });

  // Keyboard shortcuts: F11 fullscreen toggle, F5 / Ctrl+R reload, Ctrl+Shift+I DevTools
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      event.preventDefault();
      const nextFull = !win.isFullScreen();
      appLogger.info('Window', `Atalho F11 acionado: Tela cheia -> ${nextFull}`);
      win.setFullScreen(nextFull);
    } else if (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r')) {
      event.preventDefault();
      appLogger.info('Window', 'Atalho F5 / Ctrl+R acionado: Recarregando interface...');
      win.webContents.reloadIgnoringCache();
    } else if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
      appLogger.info('Window', 'Atalho Ctrl+Shift+I acionado: alternando DevTools...');
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
    appLogger.info('Window', 'Janela principal renderizada e exibida com sucesso na tela.');
  });

  const showFallbackTimer = setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible() && process.env.OSU_RADAR_SMOKE_TEST !== '1') {
      if (savedState.isMaximized) {
        win.maximize();
      }
      win.show();
      appLogger.warn('Window', 'Janela exibida via timeout de segurança (ready-to-show demorou mais de 2.5s).');
    }
  }, 2500);

  win.once('show', () => {
    clearTimeout(showFallbackTimer);
  });

  if (process.env.OSU_RADAR_SMOKE_TEST === '1') {
    win.webContents.once('did-finish-load', async () => {
      try {
        await new Promise((r) => setTimeout(r, 600));

        appLogger.info('SmokeTest', '=== INICIANDO BATERIA DE VALIDAÇÃO DE LOGS (TESTE AO VIVO) ===');

        // 1. Simula movimentação e redimensionamento de janela
        win.setSize(1520, 940);
        win.setPosition(50, 50);

        // 2. Simula alternância de tela cheia
        win.setFullScreen(true);
        await new Promise((r) => setTimeout(r, 100));
        win.setFullScreen(false);

        // 3. Executa comandos na interface via JavaScript e IPC
        const info = await win.webContents.executeJavaScript(`(async () => {
          if (window.osuRadarDesktop && window.osuRadarDesktop.log) {
            await window.osuRadarDesktop.log('info', 'UI', 'Log direto gerado pelo renderer através do bridge Electron');
            await window.osuRadarDesktop.log('debug', 'Store', 'Validação de sincronicidade de stores React');
          }
          const isMax = window.osuRadarDesktop ? await window.osuRadarDesktop.isMaximized() : false;

          // Dispara requisições HTTP locais para exercitar o servidor loopback e middlewares de API
          try {
            await fetch('/api/local-songs/detect');
            await fetch('/api/local-skins/detect');
          } catch {}

          return {
            hasDesktopBridge: Boolean(window.osuRadarDesktop && window.osuRadarDesktop.isElectron),
            rootLen: (document.getElementById('root')?.innerHTML || '').length,
            title: document.title,
            isMax
          };
        })()`);

        appLogger.info('SmokeTest', `Resultado completo da validação: ${JSON.stringify(info)}`);
        console.log('OSU_RADAR_ELECTRON_READY', JSON.stringify({ url: targetUrl, ...info }));

        // Aguarda brevemente para gravação em disco
        await new Promise((r) => setTimeout(r, 300));
        app.exit(info.hasDesktopBridge && info.rootLen > 0 ? 0 : 1);
      } catch (err) {
        appLogger.error('SmokeTest', 'Erro durante smoke test:', err);
        console.error('OSU_RADAR_ELECTRON_SMOKE_ERROR', err);
        app.exit(1);
      }
    });
  }

  appLogger.info('Window', `Iniciando carregamento da URL principal: ${targetUrl}`);
  await win.loadURL(targetUrl);
}

// Intercept global Electron application events
app.on('browser-window-created', (_event, window) => {
  logger.debug('App', `Nova janela instanciada pelo Electron (ID: ${window.id})`);
});

app.on('browser-window-focus', (_event, window) => {
  logger.debug('App', `Foco transferido para janela ID ${window.id}`);
});

app.on('web-contents-created', (_event, contents) => {
  logger.debug('App', `Novo WebContents registrado (ID: ${contents.id}, tipo: ${contents.getType()})`);
});

app.on('child-process-gone', (_event, details) => {
  const isGpu = details.type === 'GPU';
  const tag = isGpu ? 'GPU' : 'App';
  logger.warn(tag, `Processo auxiliar do Electron (${details.type}) finalizado: ${details.name || 'desconhecido'} - Motivo: ${details.reason} (Código: ${details.exitCode})`);
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  logger.warn('Main', '================================================================================');
  logger.warn('Main', '[AVISO DE INSTÂNCIA DUPLICADA] Outra instância do osu!skills já está ativa no sistema.');
  logger.warn('Main', 'Sinalizando restauração e foco para a janela já em execução.');
  logger.warn('Main', 'Encerrando esta nova instância para prevenir colisões de portas e bancos IndexedDB.');
  logger.warn('Main', '================================================================================');
  app.quit();
} else {
  logSystemDiagnostics(logger, appRoot);

  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    logger.info(
      'Main',
      `Segunda tentativa de abertura detectada (args: ${commandLine.join(' ')}, cwd: ${workingDirectory}). Focando janela existente.`
    );
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    logger.info('Main', 'app.whenReady() concluído com sucesso.');
    logDisplayDiagnostics(logger);
    await logGPUDiagnostics(logger);
    registerIpcHandlers(logger);
    await createMainWindow(logger);

    app.on('activate', () => {
      logger.info('Main', 'Evento de ativação recebido do sistema operacional.');
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(logger).catch((err) => logger.error('Main', 'Falha ao recriar janela principal:', err));
      }
    });
  });

  app.on('window-all-closed', () => {
    logger.info('Main', 'Todas as janelas foram fechadas pelo usuário.');
    if (process.platform !== 'darwin') {
      logger.info('Main', 'Encerrando ciclo de vida do osu!skills Desktop...');
      app.quit();
    }
  });

  app.on('before-quit', () => {
    logger.info('Main', 'Evento "before-quit": preparando para desligamento...');
  });

  app.on('will-quit', () => {
    logger.info('Main', 'Evento "will-quit": desligando servidor loopback embutido e descarregando logs...');
    if (stopDistWatcher) {
      stopDistWatcher();
      stopDistWatcher = null;
    }
    if (localServer) {
      localServer.close().catch(() => {});
      localServer = null;
    }
    logger.close();
  });

  app.on('quit', (_event, exitCode) => {
    logger.info('Main', `Aplicação finalizada com código de saída: ${exitCode}`);
  });
}
