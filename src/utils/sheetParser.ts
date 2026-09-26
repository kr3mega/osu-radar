/**
 * Utility to parse Google Sheets tournament mappool spreadsheets,
 * download .osu files by Beatmap ID, and filter local osu! Songs directories.
 */

export interface SheetBeatmapEntry {
  slot: string; // e.g. "NM1", "HD2", "TB"
  stage: string; // e.g. "Grand Finals", "Qualifiers"
  songInfo: string; // "Artist - Title [Diff]"
  beatmapId: number;
  sr?: number;
  bpm?: number;
  ar?: number;
  cs?: number;
  od?: number;
}

export interface SheetStageGroup {
  stageName: string;
  entries: SheetBeatmapEntry[];
}

/**
 * Parses Google Sheets URL to extract spreadsheet ID and gid.
 */
export function parseGoogleSheetUrl(rawUrl: string): { spreadsheetId: string; gid: string } | null {
  try {
    const trimmed = rawUrl.trim();
    // Pattern: /spreadsheets/d/([a-zA-Z0-9-_]+)
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!idMatch) return null;

    const spreadsheetId = idMatch[1];
    let gid = '0';

    // Pattern: [?&#]gid=([0-9]+)
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
    if (gidMatch) {
      gid = gidMatch[1];
    }

    return { spreadsheetId, gid };
  } catch {
    return null;
  }
}

/**
 * Fetches Google Sheet CSV using direct URL with fallback CORS proxies.
 */
export async function fetchSheetCsv(spreadsheetId: string, gid: string = '0'): Promise<string> {
  const directUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  
  // 1. Try direct fetch
  try {
    const res = await fetch(directUrl, { headers: { Accept: 'text/csv, text/plain, */*' } });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50 && !text.includes('<!DOCTYPE html>')) {
        return text;
      }
    }
  } catch {
    // Ignore and proceed to fallback proxies
  }

  // 2. Try proxy: allorigins
  try {
    const proxyUrl1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(proxyUrl1);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50 && !text.includes('<!DOCTYPE html>')) {
        return text;
      }
    }
  } catch {
    // Ignore and proceed to next proxy
  }

  // 3. Try proxy: corsproxy.io
  try {
    const proxyUrl2 = `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`;
    const res = await fetch(proxyUrl2);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 50 && !text.includes('<!DOCTYPE html>')) {
        return text;
      }
    }
  } catch {
    // All proxies failed
  }

  throw new Error('Não foi possível baixar a planilha diretamente. Verifique se ela possui permissão de leitura pública.');
}

/**
 * Parses a standard CSV string into an array of row tokens, respecting quoted fields.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Known tournament stages pattern detector.
 */
const STAGE_PATTERNS = [
  'GRAND FINALS',
  'FINALS',
  'SEMIFINALS',
  'SEMI FINALS',
  'QUARTERFINALS',
  'QUARTER FINALS',
  'ROUND OF 16',
  'ROUND OF 32',
  'GROUP STAGE',
  'QUALIFIERS',
  'SHOWCASE',
  'PLAYOFFS',
];

/**
 * Checks if a string represents a valid tournament mod slot (NM1, HD2, HR1, DT3, FM1, TB, etc.)
 */
const MOD_SLOT_REGEX = /^(NM|HD|HR|DT|FM|TB|EZ)\d*$/i;

/**
 * Parses tournament sheet CSV into structured stages and beatmap entries.
 */
export function parseMappoolCsv(csvText: string): SheetStageGroup[] {
  const rows = parseCsvRows(csvText);
  const stages: SheetStageGroup[] = [];

  let currentStageName = 'Etapa Principal';
  let currentEntries: SheetBeatmapEntry[] = [];

  for (const row of rows) {
    if (row.length === 0) continue;

    const rowText = row.join(' ').toUpperCase();

    // 1. Detect Stage Section Header (e.g. "GRAND FINALS", "ROUND OF 16", "QUALIFIERS")
    const matchedStage = STAGE_PATTERNS.find((pattern) => {
      // Must not be a sub-reference cell or column header
      return rowText.includes(pattern) && !rowText.includes('INDIVIDUAL STATS') && !rowText.includes('MULTIPLIER');
    });

    if (matchedStage) {
      if (currentEntries.length > 0) {
        stages.push({
          stageName: currentStageName,
          entries: [...currentEntries],
        });
        currentEntries = [];
      }

      // Title Case stage name
      currentStageName = matchedStage
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      continue;
    }

    // 2. Detect Beatmap Row: Look for a cell that is a valid mod slot (NM1, HD1, TB, etc.)
    let slotIndex = -1;
    let slotValue = '';

    for (let c = 0; c < row.length; c++) {
      const val = row[c].trim().toUpperCase();
      if (MOD_SLOT_REGEX.test(val)) {
        slotIndex = c;
        slotValue = val;
        break;
      }
    }

    if (slotIndex !== -1 && slotValue) {
      // Detect Beatmap ID, SR, BPM and attributes in the row
      let beatmapId = 0;
      let songInfo = '';
      let sr: number | undefined;
      let bpm: number | undefined;
      let cs: number | undefined;
      let ar: number | undefined;
      let od: number | undefined;

      // The song title is usually adjacent to the slot
      if (row[slotIndex + 1] && row[slotIndex + 1].length > 3) {
        songInfo = row[slotIndex + 1];
      }

      for (let c = slotIndex + 1; c < row.length; c++) {
        const cell = row[c].trim();
        if (!cell) continue;

        // Check for Star Rating (e.g. "5.53★" or "5.53")
        if (cell.includes('★') || /^\d+[.,]\d{1,2}$/.test(cell)) {
          const num = parseFloat(cell.replace('★', '').replace(',', '.').trim());
          if (!isNaN(num) && num >= 1.0 && num <= 12.0 && !sr) {
            sr = Math.round(num * 100) / 100;
            continue;
          }
        }

        // Check for Beatmap ID or link
        const linkMatch = cell.match(/(?:osu\.ppy\.sh\/(?:b|beatmaps)\/(\d+)|#osu\/(\d+))/);
        if (linkMatch) {
          beatmapId = parseInt(linkMatch[1] || linkMatch[2], 10);
          continue;
        } else if (/^\d{5,8}$/.test(cell) && !cell.includes(':')) {
          beatmapId = parseInt(cell, 10);
          continue;
        }

        // Check for BPM (e.g. 130, 220)
        if (/^\d{2,3}$/.test(cell)) {
          const num = parseInt(cell, 10);
          if (num >= 60 && num <= 420 && !bpm) {
            bpm = num;
            continue;
          }
        }
      }

      if (beatmapId > 0) {
        currentEntries.push({
          slot: slotValue,
          stage: currentStageName,
          songInfo: songInfo || `Beatmap #${beatmapId}`,
          beatmapId,
          sr,
          bpm,
          cs,
          ar,
          od,
        });
      }
    }
  }

  // Push final group
  if (currentEntries.length > 0) {
    stages.push({
      stageName: currentStageName,
      entries: currentEntries,
    });
  }

  return stages;
}

/**
 * Downloads raw .osu file content by Beatmap ID using high-speed public mirrors.
 */
export async function fetchOsuFileById(beatmapId: number): Promise<string> {
  const mirrors = [
    `https://osu.ppy.sh/osu/${beatmapId}`,
    `https://catboy.best/osu/${beatmapId}`,
    `https://osu.direct/api/osu/${beatmapId}`,
    `https://api.nerinyan.moe/osu/${beatmapId}`,
  ];

  for (const url of mirrors) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('osu file format v')) {
          return text;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  throw new Error(`Não foi possível baixar o mapa ID ${beatmapId} dos mirrors disponíveis.`);
}

/**
 * Extracts BeatmapID and metadata from the header of an .osu text file.
 * Fast parser: stops as soon as [Difficulty] or [HitObjects] is reached.
 */
export function extractQuickOsuMeta(osuText: string): {
  beatmapId: number;
  beatmapSetId: number;
  title: string;
  artist: string;
  version: string;
} {
  let beatmapId = 0;
  let beatmapSetId = 0;
  let title = '';
  let artist = '';
  let version = '';

  const lines = osuText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      if (trimmed === '[TimingPoints]' || trimmed === '[HitObjects]') break;
    }

    if (trimmed.startsWith('BeatmapID:')) {
      beatmapId = parseInt(trimmed.slice(10).trim(), 10) || 0;
    } else if (trimmed.startsWith('BeatmapSetID:')) {
      beatmapSetId = parseInt(trimmed.slice(13).trim(), 10) || 0;
    } else if (trimmed.startsWith('Title:')) {
      title = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('Artist:')) {
      artist = trimmed.slice(7).trim();
    } else if (trimmed.startsWith('Version:')) {
      version = trimmed.slice(8).trim();
    }
  }

  return { beatmapId, beatmapSetId, title, artist, version };
}

/**
 * Matches an .osu file's quick metadata against a list of tournament pool entries.
 * Returns the matching entry if found, or undefined if the difficulty does not belong to the pool.
 */
export function matchOsuFileToTournamentEntry(
  meta: { beatmapId: number; title: string; artist: string; version: string },
  entries: SheetBeatmapEntry[]
): SheetBeatmapEntry | undefined {
  if (entries.length === 0) return undefined;

  // 1. Direct match by BeatmapID
  if (meta.beatmapId > 0) {
    const byId = entries.find((e) => e.beatmapId === meta.beatmapId);
    if (byId) return byId;
  }

  // 2. Fuzzy match by Difficulty / Version and Song Title
  if (!meta.version) return undefined;
  const versionNorm = meta.version.trim().toLowerCase();
  const titleNorm = meta.title.trim().toLowerCase();

  return entries.find((entry) => {
    const songNorm = entry.songInfo.toLowerCase();
    // Does songInfo include the exact diff name like "[collab expurrt *.+^]" or "collab expurrt"?
    const matchesDiff =
      songNorm.includes(`[${versionNorm}]`) ||
      songNorm.includes(versionNorm) ||
      versionNorm.includes(songNorm.slice(songNorm.lastIndexOf('[') + 1, songNorm.lastIndexOf(']')));

    if (matchesDiff) {
      if (!titleNorm || songNorm.includes(titleNorm) || titleNorm.includes(songNorm.slice(0, 12))) {
        return true;
      }
    }
    return false;
  });
}

