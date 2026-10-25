export interface OsuSkillsDesktopBridge {
  isElectron: boolean;
  platform: string;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (maximized: boolean) => void) => () => void;
  selectDirectory: (options?: {
    title?: string;
    defaultPath?: string;
  }) => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;
  log?: (
    level: 'info' | 'warn' | 'error' | 'debug',
    tag: string,
    message: string,
    extra?: any
  ) => Promise<void>;
  getGPUStatus?: () => Promise<Record<string, string>>;
}

export type OsuRadarDesktopBridge = OsuSkillsDesktopBridge;

declare global {
  interface Window {
    osuSkillsDesktop?: OsuSkillsDesktopBridge;
    osuRadarDesktop?: OsuSkillsDesktopBridge;
  }
}

export {};
