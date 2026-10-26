import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElectronTitlebar } from '../src/components/layout/ElectronTitlebar';
import { LocalSongsSyncPanel } from '../src/components/pool/LocalSongsSyncPanel';
import { PoolUploader } from '../src/components/pool/PoolUploader';
import type { OsuSkillsDesktopBridge } from '../src/types/electron';

describe('Arquitetura 100% Electron Desktop Exclusiva (Sem Navegador & Sem Tags Desktop)', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Setup synthetic Electron bridge environment
    const mockBridge: OsuSkillsDesktopBridge = {
      isElectron: true,
      platform: 'win32',
      isMaximized: vi.fn().mockResolvedValue(false),
      toggleMaximize: vi.fn().mockResolvedValue(true),
      minimize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      openExternal: vi.fn().mockResolvedValue(undefined),
      selectDirectory: vi.fn().mockResolvedValue('C:\\Games\\osu!\\Songs'),
      onMaximizedChange: vi.fn().mockReturnValue(() => {}),
    };

    // @ts-expect-error mock window for node environment
    globalThis.window = {
      osuSkillsDesktop: mockBridge,
      osuRadarDesktop: mockBridge,
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it('ElectronTitlebar não renderiza tag ou badge "desktop" visual separada', () => {
    const html = renderToString(<ElectronTitlebar activeSubtitle="Teste de Subtítulo" />);

    // Barra de título deve existir
    expect(html).toContain('osu-skills-titlebar');
    expect(html).toContain('osu!skills');
    expect(html).toContain('Teste de Subtítulo');

    // Não deve conter badge "desktop"
    expect(html).not.toContain('osu-skills-titlebar__badge');
    expect(html).not.toContain('>desktop<');
    expect(html).not.toContain('>DESKTOP<');
  });

  it('LocalSongsSyncPanel removeu completamente o fallback de navegador e o input webkitdirectory', () => {
    const html = renderToString(<LocalSongsSyncPanel />);

    // Não deve conter menções a fallback de navegador ou modo web estático
    expect(html).not.toContain('Modo web estático detectado');
    expect(html).not.toContain('Alternativa: Selecionar Pasta Songs manualmente pelo Navegador');
    expect(html).not.toContain('webkitdirectory');
    expect(html).not.toContain('Escolher Pasta...');

    // Deve conter os controles nativos de sincronização
    expect(html).toContain('Sincronizar Biblioteca Local de Músicas');
    expect(html).toContain('Procurar...');
    expect(html).toContain('osu! (Stable)');
    expect(html).toContain('osu!lazer');
  });

  it('PoolUploader refere-se ao processamento nativo no osu!skills e não no navegador', () => {
    const html = renderToString(<PoolUploader initialTab="files" />);

    // Deve indicar processamento instantâneo no osu!skills
    expect(html).toContain('Processamento instantâneo no osu!skills');
    expect(html).not.toContain('Processamento instantâneo no navegador');
  });

  it('Garante contrato da ponte nativa Electron bridge no ambiente global', () => {
    const bridge = window.osuSkillsDesktop;
    expect(bridge).toBeDefined();
    expect(bridge?.isElectron).toBe(true);
    expect(typeof bridge?.selectDirectory).toBe('function');
    expect(typeof bridge?.minimize).toBe('function');
    expect(typeof bridge?.toggleMaximize).toBe('function');
    expect(typeof bridge?.close).toBe('function');
  });

  it('Barra de progresso utiliza o design temático osu! rosa (bar bar--user-profile e bar__fill) em vez do elemento nativo verde', async () => {
    // 1. Verifica arquivo de estilo osu-skills.less para override estrito de -webkit-progress-value
    const fs = await import('fs');
    const path = await import('path');
    const lessContent = await fs.promises.readFile(
      path.join(process.cwd(), 'src/osu-skills.less'),
      'utf8'
    );
    expect(lessContent).toContain('&::-webkit-progress-value');
    expect(lessContent).toContain('background-color: hsl(var(--hsl-h1))');

    // 2. Verifica que LocalSongsSyncPanel usa o componente de barra BEM customizado com preenchimento rosa
    const panelSource = await fs.promises.readFile(
      path.join(process.cwd(), 'src/components/pool/LocalSongsSyncPanel.tsx'),
      'utf8'
    );
    expect(panelSource).toContain('className="bar bar--user-profile"');
    expect(panelSource).toContain("backgroundColor: 'hsl(var(--hsl-h1))'");
    expect(panelSource).not.toContain('<progress');
  });
});
