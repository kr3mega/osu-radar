import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDesktopLogger } from '../electron/logger';
import {
  RunningLocalAppServer,
  startLocalAppServer,
} from '../electron/localAppServer';

describe('Terminal Vivo de Logs & Persistência em Disco do Electron Desktop', () => {
  let tmpRoot: string | null = null;
  let tmpUserData: string | null = null;
  let runningServer: RunningLocalAppServer | null = null;

  afterEach(async () => {
    if (runningServer) {
      await runningServer.close();
      runningServer = null;
    }
    if (tmpRoot) {
      await fs.promises.rm(tmpRoot, { recursive: true, force: true });
      tmpRoot = null;
    }
    if (tmpUserData) {
      await fs.promises.rm(tmpUserData, { recursive: true, force: true });
      tmpUserData = null;
    }
  });

  it('grava sessões com timestamp, níveis e tags nos arquivos primário e secundário de log', async () => {
    tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-logger-root-'));
    tmpUserData = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-logger-user-'));

    const logger = createDesktopLogger({
      appRoot: tmpRoot,
      userDataDir: tmpUserData,
      silentConsole: true,
    });

    const primaryPath = logger.getPrimaryLogPath();
    const secondaryPath = logger.getSecondaryLogPath();

    expect(primaryPath).toBe(path.join(tmpRoot, 'logs', 'electron-desktop.log'));
    expect(secondaryPath).toBe(path.join(tmpUserData, 'logs', 'electron-desktop.log'));

    logger.info('Main', 'osu!radar Desktop iniciado');
    logger.warn('Window', 'Aviso de redimensionamento');
    logger.error('Renderer', 'Erro de renderização simulado');
    logger.debug('IPC', 'Mensagem de IPC de teste');
    logger.renderer('INFO', 'React montado com sucesso', 'src/main.tsx', 42);
    logger.close();

    const primaryContent = await fs.promises.readFile(primaryPath, 'utf8');
    const secondaryContent = secondaryPath
      ? await fs.promises.readFile(secondaryPath, 'utf8')
      : '';

    // Verifica banner de início de sessão
    expect(primaryContent).toContain('NOVO INÍCIO DE SESSÃO DO OSU!RADAR DESKTOP');
    expect(primaryContent).toContain('[INFO ] [Main]         osu!radar Desktop iniciado');
    expect(primaryContent).toContain('[WARN ] [Window]       Aviso de redimensionamento');
    expect(primaryContent).toContain('[ERROR] [Renderer]     Erro de renderização simulado');
    expect(primaryContent).toContain('[DEBUG] [IPC]          Mensagem de IPC de teste');
    expect(primaryContent).toContain('[RENDERER] [UI]           [INFO] React montado com sucesso @ main.tsx:42');
    expect(primaryContent).toContain('[INFO ] [Main]         Sessão finalizada normalmente.');

    // Verifica que o arquivo secundário (AppData) espelhou o mesmo conteúdo
    expect(secondaryContent).toBe(primaryContent);
  });

  it('servidor embutido reporta requisições HTTP e erros ao logger com status e duração', async () => {
    tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-server-log-'));
    await fs.promises.mkdir(path.join(tmpRoot, 'dist'), { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpRoot, 'dist', 'index.html'),
      '<!doctype html><html><body>osu!radar UI</body></html>',
      'utf8'
    );

    const logger = createDesktopLogger({
      appRoot: tmpRoot,
      silentConsole: true,
    });

    runningServer = await startLocalAppServer({
      distDir: path.join(tmpRoot, 'dist'),
      preferredPort: 0,
      logger,
    });

    // Faz requisições para a rota raiz e para uma rota inexistente
    const res200 = await fetch(`${runningServer.url}/`);
    expect(res200.status).toBe(200);

    const res404 = await fetch(`${runningServer.url}/assets/arquivo-inexistente.js`);
    expect(res404.status).toBe(404);

    // Aguarda término da escrita de log no disco
    await new Promise((r) => setTimeout(r, 100));

    const logContent = await fs.promises.readFile(logger.getPrimaryLogPath(), 'utf8');
    expect(logContent).toContain('Servidor local loopback ativo');
    expect(logContent).toContain('GET / -> 200 OK');
    expect(logContent).toContain('GET /assets/arquivo-inexistente.js -> ERRO 404');
  });

  it('formata adequadamente logs de sistema, IPC, performance e tags de stores', async () => {
    tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'osu-radar-logger-detail-'));

    const logger = createDesktopLogger({
      appRoot: tmpRoot,
      silentConsole: true,
    });

    logger.system('Diagnostics', 'OS: Windows_NT 10.0 (x64) | CPU: Intel Core i3 (8 cores)');
    logger.ipc('select-directory', 'Diálogo nativo concluído', { path: 'C:\\osu\\Songs' });
    logger.perf('BeatmapParse', 4.5, { mapCount: 1 });
    logger.renderer('INFO', '[PoolStore] Faixa de Star Rating definida: 4 a 5.5 estrelas');
    logger.renderer('INFO', '[SkinStore] Skin selecionada: local:MySkin');
    logger.renderer('INFO', '[AudioStore] Volume alterado para: 80%');
    logger.close();

    const logContent = await fs.promises.readFile(logger.getPrimaryLogPath(), 'utf8');
    expect(logContent).toContain('[SYSTEM] [Diagnostics]  OS: Windows_NT 10.0');
    expect(logContent).toContain('[IPC  ] [select-directory] Diálogo nativo concluído {"path":"C:\\\\osu\\\\Songs"}');
    expect(logContent).toContain('[PERF ] [Metric]       BeatmapParse finalizado em 4.5ms {"mapCount":1}');
    expect(logContent).toContain('[RENDERER] [PoolStore]    [INFO] Faixa de Star Rating definida: 4 a 5.5 estrelas');
    expect(logContent).toContain('[RENDERER] [SkinStore]    [INFO] Skin selecionada: local:MySkin');
    expect(logContent).toContain('[RENDERER] [AudioStore]   [INFO] Volume alterado para: 80%');
  });
});
