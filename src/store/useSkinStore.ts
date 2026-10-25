import { create } from 'zustand';
import { db, StoredCustomSkin } from '../db';
import {
  extractSkinArchive,
  extractSkinFromFileList,
  loadDefaultSkin,
  loadSkinFromAssetResolver,
  OsuSkin,
} from '../lib/osu-preview';

export interface AvailableSkinOption {
  id: string;
  name: string;
  source: 'default' | 'local_osu' | 'imported';
  folderPath?: string;
  dbSkinId?: string;
}

const SELECTED_SKIN_STORAGE_KEY = 'osu_skills_selected_skin_id';
const CUSTOM_SKINS_DIR_STORAGE_KEY = 'osu_skills_custom_skins_dir';
const LEGACY_SELECTED_SKIN_STORAGE_KEY = 'osu_radar_selected_skin_id';
const LEGACY_CUSTOM_SKINS_DIR_STORAGE_KEY = 'osu_radar_custom_skins_dir';

const loadedSkinsMemoryCache = new Map<string, OsuSkin>();
const importedSkinObjectUrls = new Map<string, string[]>();

function revokeObjectUrlsForSkin(skinKey: string) {
  const urls = importedSkinObjectUrls.get(skinKey);
  if (urls) {
    for (const u of urls) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
    importedSkinObjectUrls.delete(skinKey);
  }
  loadedSkinsMemoryCache.delete(skinKey);
}

interface SkinStoreState {
  availableSkins: AvailableSkinOption[];
  selectedSkinId: string;
  detectedSkinsDir: string;
  localBridgeAvailable: boolean;
  isLoadingSkin: boolean;
  isInitialized: boolean;

  initSkins: () => Promise<void>;
  refreshSkins: (overrideSkinsDir?: string) => Promise<void>;
  selectSkin: (skinId: string) => void;
  resolveSkinById: (skinId: string) => Promise<OsuSkin>;
  importSkinOskOrZip: (file: File) => Promise<AvailableSkinOption>;
  importSkinFolder: (files: FileList | File[]) => Promise<AvailableSkinOption>;
  removeImportedSkin: (optionId: string) => Promise<void>;
}

const DEFAULT_SKIN_OPTION: AvailableSkinOption = {
  id: 'default',
  name: 'osu!skills (Padrão)',
  source: 'default',
};

function readInitialSelectedSkin(): string {
  try {
    return (
      localStorage.getItem(SELECTED_SKIN_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_SELECTED_SKIN_STORAGE_KEY) ||
      'default'
    );
  } catch {
    return 'default';
  }
}

function readSavedCustomSkinsDir(): string {
  try {
    return (
      localStorage.getItem(CUSTOM_SKINS_DIR_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_CUSTOM_SKINS_DIR_STORAGE_KEY) ||
      ''
    );
  } catch {
    return '';
  }
}

export const useSkinStore = create<SkinStoreState>((set, get) => ({
  availableSkins: [DEFAULT_SKIN_OPTION],
  selectedSkinId: readInitialSelectedSkin(),
  detectedSkinsDir: readSavedCustomSkinsDir(),
  localBridgeAvailable: false,
  isLoadingSkin: false,
  isInitialized: false,

  initSkins: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true });
    await get().refreshSkins();
  },

  refreshSkins: async (overrideSkinsDir) => {
    const localOptions: AvailableSkinOption[] = [];
    let detectedDir = overrideSkinsDir ?? get().detectedSkinsDir;
    let bridgeOk = false;

    try {
      if (overrideSkinsDir && overrideSkinsDir.trim()) {
        const res = await fetch('/api/local-skins/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skinsDir: overrideSkinsDir.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          bridgeOk = true;
          detectedDir = data.skinsDir || overrideSkinsDir.trim();
          try {
            localStorage.setItem(CUSTOM_SKINS_DIR_STORAGE_KEY, detectedDir);
          } catch {}
          for (const s of data.skins || []) {
            localOptions.push({
              id: `local:${s.folderPath}`,
              name: s.name,
              source: 'local_osu',
              folderPath: s.folderPath,
            });
          }
        }
      } else {
        const savedDir = readSavedCustomSkinsDir();
        if (savedDir) {
          const res = await fetch('/api/local-skins/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skinsDir: savedDir }),
          });
          if (res.ok) {
            const data = await res.json();
            bridgeOk = true;
            detectedDir = data.skinsDir || savedDir;
            for (const s of data.skins || []) {
              localOptions.push({
                id: `local:${s.folderPath}`,
                name: s.name,
                source: 'local_osu',
                folderPath: s.folderPath,
              });
            }
          }
        }

        if (!bridgeOk) {
          const res = await fetch('/api/local-skins/detect');
          if (res.ok) {
            const data = await res.json();
            bridgeOk = Boolean(data.available);
            if (data.detectedPath) {
              detectedDir = data.detectedPath;
            }
            for (const s of data.skins || []) {
              localOptions.push({
                id: `local:${s.folderPath}`,
                name: s.name,
                source: 'local_osu',
                folderPath: s.folderPath,
              });
            }
          }
        }
      }
    } catch {
      // Static build / offline mode: local skin bridge not present, imported .osk skins still work 100%
    }

    const importedOptions: AvailableSkinOption[] = [];
    try {
      const dbSkins = await db.skins.orderBy('createdAt').reverse().toArray();
      for (const s of dbSkins) {
        importedOptions.push({
          id: `imported:${s.id}`,
          name: s.name,
          source: 'imported',
          dbSkinId: s.id,
        });
      }
    } catch {
      // Ignore IndexedDB error in non-browser environment
    }

    const combined = [DEFAULT_SKIN_OPTION, ...importedOptions, ...localOptions];
    const currentSelected = get().selectedSkinId;
    const stillExists = combined.some((o) => o.id === currentSelected);

    set({
      availableSkins: combined,
      detectedSkinsDir: detectedDir,
      localBridgeAvailable: bridgeOk,
      selectedSkinId: stillExists ? currentSelected : 'default',
    });
  },

  selectSkin: (skinId) => {
    console.log('[SkinStore] Skin selecionada:', skinId);
    try {
      localStorage.setItem(SELECTED_SKIN_STORAGE_KEY, skinId);
    } catch {}
    set({ selectedSkinId: skinId });
  },

  resolveSkinById: async (skinId) => {
    console.log('[SkinStore] Carregando assets da skin ID:', skinId);
    if (!skinId || skinId === 'default') {
      return loadDefaultSkin('/skin/default');
    }

    const cached = loadedSkinsMemoryCache.get(skinId);
    if (cached) return cached;

    set({ isLoadingSkin: true });
    try {
      if (skinId.startsWith('local:')) {
        const folderPath = skinId.slice('local:'.length);
        const res = await fetch(
          `/api/local-skins/manifest?skinDir=${encodeURIComponent(folderPath)}`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const manifest = await res.json();
        const filesMap: Record<string, string> = manifest.files || {};

        const loaded = await loadSkinFromAssetResolver({
          id: skinId,
          fallbackName: manifest.skinName || 'osu! Skin',
          iniText: manifest.iniText || '',
          resolveAssetUrl: (lowerRelPath) => {
            const absPath = filesMap[lowerRelPath.toLowerCase()];
            if (!absPath) return undefined;
            return `/api/local-skins/file?path=${encodeURIComponent(absPath)}`;
          },
        });
        loadedSkinsMemoryCache.set(skinId, loaded);
        return loaded;
      }

      if (skinId.startsWith('imported:')) {
        const dbId = skinId.slice('imported:'.length);
        const record = await db.skins.get(dbId);
        if (!record) {
          throw new Error('Skin importada não encontrada no banco local.');
        }

        const createdUrls: string[] = [];
        const urlMap = new Map<string, string>();
        for (const [lowerRel, blob] of Object.entries(record.files || {})) {
          const objUrl = URL.createObjectURL(blob);
          createdUrls.push(objUrl);
          urlMap.set(lowerRel.toLowerCase(), objUrl);
        }
        importedSkinObjectUrls.set(skinId, createdUrls);

        const loaded = await loadSkinFromAssetResolver({
          id: skinId,
          fallbackName: record.name,
          iniText: record.iniText || '',
          resolveAssetUrl: (lowerRelPath) => urlMap.get(lowerRelPath.toLowerCase()),
        });
        loadedSkinsMemoryCache.set(skinId, loaded);
        return loaded;
      }
    } catch (err) {
      console.warn('Falha ao carregar skin customizada, revertendo para a skin padrão:', err);
    } finally {
      set({ isLoadingSkin: false });
    }

    return loadDefaultSkin('/skin/default');
  },

  importSkinOskOrZip: async (file) => {
    const buf = await file.arrayBuffer();
    const extracted = extractSkinArchive(buf, file.name);
    const dbId = `skin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: StoredCustomSkin = {
      id: dbId,
      name: extracted.name,
      author: extracted.author,
      iniText: extracted.iniText,
      files: extracted.files,
      createdAt: Date.now(),
    };
    await db.skins.put(record);
    await get().refreshSkins();
    const option: AvailableSkinOption = {
      id: `imported:${dbId}`,
      name: record.name,
      source: 'imported',
      dbSkinId: dbId,
    };
    get().selectSkin(option.id);
    return option;
  },

  importSkinFolder: async (files) => {
    const extracted = await extractSkinFromFileList(files);
    const dbId = `skin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: StoredCustomSkin = {
      id: dbId,
      name: extracted.name,
      author: extracted.author,
      iniText: extracted.iniText,
      files: extracted.files,
      createdAt: Date.now(),
    };
    await db.skins.put(record);
    await get().refreshSkins();
    const option: AvailableSkinOption = {
      id: `imported:${dbId}`,
      name: record.name,
      source: 'imported',
      dbSkinId: dbId,
    };
    get().selectSkin(option.id);
    return option;
  },

  removeImportedSkin: async (optionId) => {
    if (!optionId.startsWith('imported:')) return;
    const dbId = optionId.slice('imported:'.length);
    revokeObjectUrlsForSkin(optionId);
    try {
      await db.skins.delete(dbId);
    } catch {}
    if (get().selectedSkinId === optionId) {
      get().selectSkin('default');
    }
    await get().refreshSkins();
  },
}));
