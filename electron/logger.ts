import fs from 'fs';
import path from 'path';

export type LogLevel =
  | 'INFO'
  | 'WARN'
  | 'ERROR'
  | 'DEBUG'
  | 'HTTP'
  | 'RENDERER'
  | 'IPC'
  | 'SYSTEM'
  | 'PERF';

export interface DesktopLogger {
  info: (tag: string, message: string, ...extra: any[]) => void;
  warn: (tag: string, message: string, ...extra: any[]) => void;
  error: (tag: string, message: string, ...extra: any[]) => void;
  debug: (tag: string, message: string, ...extra: any[]) => void;
  system: (tag: string, message: string, ...extra: any[]) => void;
  ipc: (channel: string, message: string, ...extra: any[]) => void;
  perf: (operation: string, durationMs: number, ...extra: any[]) => void;
  http: (
    method: string,
    url: string,
    status: number,
    durationMs?: number,
    details?: { bytes?: number; mime?: string; range?: string; clientIp?: string }
  ) => void;
  renderer: (level: string, message: string, source?: string, line?: number) => void;
  getPrimaryLogPath: () => string;
  getSecondaryLogPath: () => string | null;
  close: () => void;
}

function formatTwoDigits(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatTimestamp(d = new Date()): string {
  const year = d.getFullYear();
  const month = formatTwoDigits(d.getMonth() + 1);
  const day = formatTwoDigits(d.getDate());
  const hours = formatTwoDigits(d.getHours());
  const minutes = formatTwoDigits(d.getMinutes());
  const seconds = formatTwoDigits(d.getSeconds());
  const millis = d.getMilliseconds().toString().padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${millis}`;
}

function stringifyExtra(extra: any[]): string {
  if (!extra || extra.length === 0) return '';
  const valid = extra.filter((item) => item !== undefined);
  if (valid.length === 0) return '';
  return (
    ' ' +
    valid
      .map((item) => {
        if (item === null) return 'null';
        if (item instanceof Error) {
          return item.stack || item.message;
        }
        if (typeof item === 'object') {
          try {
            return JSON.stringify(item);
          } catch {
            return String(item);
          }
        }
        return String(item);
      })
      .join(' ')
  );
}

/**
 * Creates a dual-output persistent logger that writes to both the active terminal
 * and persistent log files on disk (<projectRoot>/logs/electron-desktop.log and
 * <userData>/logs/electron-desktop.log) with automatic session headers and error capture.
 */
export function createDesktopLogger(options: {
  appRoot: string;
  userDataDir?: string;
  silentConsole?: boolean;
}): DesktopLogger {
  const projectLogsDir = path.join(options.appRoot, 'logs');
  try {
    fs.mkdirSync(projectLogsDir, { recursive: true });
  } catch {}

  const primaryLogFile = path.join(projectLogsDir, 'electron-desktop.log');

  let secondaryLogFile: string | null = null;
  if (options.userDataDir) {
    const userLogsDir = path.join(options.userDataDir, 'logs');
    try {
      fs.mkdirSync(userLogsDir, { recursive: true });
      secondaryLogFile = path.join(userLogsDir, 'electron-desktop.log');
    } catch {}
  }

  // Session header banner
  const sessionBanner = `\n================================================================================\n[${formatTimestamp()}] NOVO INÍCIO DE SESSÃO DO OSU!SKILLS DESKTOP (PID: ${process.pid})\n================================================================================\n`;

  try {
    fs.appendFileSync(primaryLogFile, sessionBanner, 'utf8');
    if (secondaryLogFile) {
      fs.appendFileSync(secondaryLogFile, sessionBanner, 'utf8');
    }
  } catch (err) {
    console.error('Falha ao inicializar arquivo de log:', err);
  }

  function writeToFiles(line: string) {
    try {
      fs.appendFileSync(primaryLogFile, line + '\n', 'utf8');
    } catch {}
    if (secondaryLogFile) {
      try {
        fs.appendFileSync(secondaryLogFile, line + '\n', 'utf8');
      } catch {}
    }
  }

  function emit(level: LogLevel, tag: string, message: string, ...extra: any[]) {
    const ts = formatTimestamp();
    const tagFormatted = `[${tag}]`.padEnd(14, ' ');
    const extraStr = stringifyExtra(extra);
    const line = `[${ts}] [${level.padEnd(5, ' ')}] ${tagFormatted} ${message}${extraStr}`;

    if (!options.silentConsole) {
      if (level === 'ERROR') {
        console.error(line);
      } else if (level === 'WARN') {
        console.warn(line);
      } else {
        console.log(line);
      }
    }

    writeToFiles(line);
  }

  return {
    info(tag, message, ...extra) {
      emit('INFO', tag, message, ...extra);
    },
    warn(tag, message, ...extra) {
      emit('WARN', tag, message, ...extra);
    },
    error(tag, message, ...extra) {
      emit('ERROR', tag, message, ...extra);
    },
    debug(tag, message, ...extra) {
      emit('DEBUG', tag, message, ...extra);
    },
    system(tag, message, ...extra) {
      emit('SYSTEM', tag, message, ...extra);
    },
    ipc(channel, message, ...extra) {
      emit('IPC', channel, message, ...extra);
    },
    perf(operation, durationMs, ...extra) {
      emit('PERF', 'Metric', `${operation} finalizado em ${durationMs.toFixed(1)}ms`, ...extra);
    },
    http(method, url, status, durationMs, details) {
      const dur = durationMs !== undefined ? ` (${durationMs}ms)` : '';
      const statusText = status >= 400 ? `ERRO ${status}` : `${status} OK`;
      const metaParts: string[] = [];
      if (details?.bytes !== undefined) {
        metaParts.push(`${details.bytes}B`);
      }
      if (details?.range) {
        metaParts.push(`Range: ${details.range}`);
      }
      if (details?.mime) {
        metaParts.push(details.mime);
      }
      if (details?.clientIp && details.clientIp !== '127.0.0.1' && details.clientIp !== '::1') {
        metaParts.push(`IP: ${details.clientIp}`);
      }
      const metaStr = metaParts.length > 0 ? ` [${metaParts.join(' | ')}]` : '';
      emit('HTTP', 'Server', `${method} ${url} -> ${statusText}${dur}${metaStr}`);
    },
    renderer(level, message, source, line) {
      const loc = source ? ` @ ${path.basename(source)}:${line ?? 0}` : '';
      // Se a mensagem já contiver um marcador de store/component como [SkinStore] ou [PoolStore], extraímos para a tag
      const customTagMatch = message.match(/^\[([a-zA-Z0-9_\-]+)\]\s*(.*)$/);
      if (customTagMatch) {
        const customTag = customTagMatch[1];
        const restMsg = customTagMatch[2];
        emit('RENDERER', customTag, `[${level}] ${restMsg}${loc}`);
      } else {
        emit('RENDERER', 'UI', `[${level}] ${message}${loc}`);
      }
    },
    getPrimaryLogPath() {
      return primaryLogFile;
    },
    getSecondaryLogPath() {
      return secondaryLogFile;
    },
    close() {
      emit('INFO', 'Main', 'Sessão finalizada normalmente.');
    },
  };
}
