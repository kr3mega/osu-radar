import { unzipSync, strFromU8 } from 'fflate';
import { rgb } from './functions';
import { OsuSkin, SkinIni } from './types';

const DEFAULT_COMBO_COLORS: Array<[number, number, number]> = [
  [255, 102, 170], // Pink
  [0, 240, 255],   // Cyan
  [166, 226, 46],  // Lime
  [255, 153, 0],   // Orange
  [189, 94, 255],  // Purple
];

const HITSOUND_SETS = ['soft', 'normal', 'drum'] as const;
const HITSOUND_TYPES = ['hitnormal', 'hitclap', 'hitfinish', 'hitwhistle', 'slidertick'] as const;
const HITSOUND_EXTS = ['wav', 'ogg', 'mp3'] as const;

export function getSpriteLogicalWidth(
  sprite: HTMLImageElement | HTMLCanvasElement
): number {
  const scale = (sprite as any).logicalScale ?? 1;
  return sprite.width * scale;
}

export function getSpriteLogicalHeight(
  sprite: HTMLImageElement | HTMLCanvasElement
): number {
  const scale = (sprite as any).logicalScale ?? 1;
  return sprite.height * scale;
}

export function imageToCanvas(
  img: HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.width || 1);
  canvas.height = Math.max(1, img.height || 1);
  (canvas as any).logicalScale = (img as any).logicalScale ?? 1;
  const ctx = canvas.getContext('2d');
  if (ctx && img.width > 0 && img.height > 0) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0);
  }
  return canvas;
}

export function tintImage(
  img: HTMLImageElement | HTMLCanvasElement,
  color: [number, number, number]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.width || 1);
  canvas.height = Math.max(1, img.height || 1);
  (canvas as any).logicalScale = (img as any).logicalScale ?? 1;
  const ctx = canvas.getContext('2d');
  if (!ctx || img.width === 0 || img.height === 0) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);

  // Tinting via source-in composite
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Now multiply with original luminosity
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(img, 0, 0);

  return canvas;
}

export async function loadImage(url: string, logicalScale: number = 1): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    (img as any).logicalScale = logicalScale;
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      (fallback as any).logicalScale = 1;
      resolve(fallback);
    };
    img.src = url;
  });
}

/**
 * Loads the high-resolution @2x sprite when available in the skin folder,
 * preserving 1x logical dimensions via `logicalScale = 0.5` so playfield sizing
 * stays identical while rendering with 4x the pixel density.
 */
export async function loadHiResSkinImage(
  basePath: string,
  name: string,
  has2xVariant: boolean = true
): Promise<HTMLImageElement> {
  if (has2xVariant) {
    const hiRes = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      (img as any).logicalScale = 0.5;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${basePath}/${name}@2x.png`;
    });
    if (hiRes && hiRes.naturalWidth > 0) {
      return hiRes;
    }
  }
  return loadImage(`${basePath}/${name}.png`, 1);
}

/**
 * Parses an osu! `skin.ini` file, handling UTF-8 BOM, inline `//` comments,
 * `Combo1..Combo8`, `SliderTrackOverride`, `HitCirclePrefix` (including subfolder paths),
 * `CursorCentre`/`CursorCenter`, and `HitCircleOverlayAboveNumber`/`HitCircleOverlayAboveNumer`.
 */
export function parseSkinIni(text: string): SkinIni {
  const ini: SkinIni = {
    General: {
      AllowSliderBallTint: '1',
      SliderBallFlip: '1',
      CursorCenter: '1',
      CursorCentre: '1',
      CursorRotate: '1',
      CursorTrailRotate: '0',
      LayeredHitSounds: '1',
      HitCircleOverlayAboveNumber: '1',
    },
    Colours: {
      SliderBorder: '255,255,255',
      SliderTrackOverride: false,
    },
    Fonts: {
      HitCirclePrefix: 'default',
      HitCircleOverlap: -2,
    },
    combos: [...DEFAULT_COMBO_COLORS],
  };

  if (!text) return ini;
  const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = cleanText.split(/\r?\n/);
  let currentCategory = '';
  const numberedCombos = new Map<number, [number, number, number]>();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Strip inline // comments (e.g. `SliderBorder: 255, 255, 255 // white`)
    const inlineCommentIdx = trimmed.indexOf('//');
    const line = (inlineCommentIdx !== -1 ? trimmed.slice(0, inlineCommentIdx) : trimmed).trim();
    if (!line) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentCategory = line.slice(1, -1).trim().toLowerCase();
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();

    if (currentCategory === 'general') {
      ini.General[key] = val;
      if (key === 'CursorCentre' || key === 'CursorCenter') {
        ini.General.CursorCenter = val;
        ini.General.CursorCentre = val;
      } else if (key === 'HitCircleOverlayAboveNumer' || key === 'HitCircleOverlayAboveNumber') {
        ini.General.HitCircleOverlayAboveNumber = val;
        ini.General.HitCircleOverlayAboveNumer = val;
      }
    } else if (currentCategory === 'colours') {
      ini.Colours[key] = val;
      const comboMatch = key.match(/^Combo(\d+)$/i);
      if (comboMatch) {
        const parsed = rgb(val);
        if (parsed) {
          numberedCombos.set(parseInt(comboMatch[1], 10), parsed);
        }
      }
    } else if (currentCategory === 'fonts') {
      if (key === 'HitCircleOverlap') {
        const parsedOverlap = parseInt(val, 10);
        ini.Fonts.HitCircleOverlap = Number.isNaN(parsedOverlap) ? -2 : parsedOverlap;
      } else if (key === 'HitCirclePrefix') {
        ini.Fonts.HitCirclePrefix =
          val.replace(/^"|"$/g, '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || 'default';
      }
    }
  }

  if (numberedCombos.size > 0) {
    ini.combos = Array.from(numberedCombos.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, color]) => color);
  }

  return ini;
}

interface DefaultRawSprites {
  hitcircleImg: HTMLImageElement;
  hitcircleoverlayImg: HTMLImageElement;
  approachcircleImg: HTMLImageElement;
  sliderfollowcircleImg: HTMLImageElement;
  sliderscorepointImg: HTMLImageElement;
  reversearrowImg: HTMLImageElement;
  sliderb0Img: HTMLImageElement;
  cursorImg: HTMLImageElement;
  cursortrailImg: HTMLImageElement;
  followpointImg: HTMLImageElement;
  digits: Record<string, HTMLImageElement>;
}

let cachedSkin: OsuSkin | null = null;
let cachedDefaultRaw: DefaultRawSprites | null = null;
let skinLoadingPromise: Promise<OsuSkin> | null = null;

export async function loadDefaultSkin(basePath: string = '/skin/default'): Promise<OsuSkin> {
  if (cachedSkin) return cachedSkin;
  if (skinLoadingPromise) return skinLoadingPromise;

  skinLoadingPromise = (async () => {
    let iniText = '';
    try {
      const res = await fetch(`${basePath}/skin.ini`);
      if (res.ok) iniText = await res.text();
    } catch {
      // Use defaults
    }

    const ini = parseSkinIni(iniText);

    const [
      hitcircleImg,
      hitcircleoverlayImg,
      approachcircleImg,
      sliderfollowcircleImg,
      sliderscorepointImg,
      reversearrowImg,
      sliderb0Img,
      cursorImg,
      cursortrailImg,
    ] = await Promise.all([
      loadHiResSkinImage(basePath, 'hitcircle', true),
      loadHiResSkinImage(basePath, 'hitcircleoverlay', true),
      loadHiResSkinImage(basePath, 'approachcircle', true),
      loadHiResSkinImage(basePath, 'sliderfollowcircle', true),
      loadHiResSkinImage(basePath, 'sliderscorepoint', true),
      loadHiResSkinImage(basePath, 'reversearrow', true),
      loadHiResSkinImage(basePath, 'sliderb0', true),
      loadHiResSkinImage(basePath, 'cursor', true),
      loadHiResSkinImage(basePath, 'cursortrail', false),
    ]);

    const digits: Record<string, HTMLImageElement> = {};
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        loadHiResSkinImage(basePath, `default-${i}`, true).then((img) => {
          digits[`default-${i}`] = img;
        })
      )
    );

    const followpointImg = await loadImage(`${basePath}/followpoint.png`).catch(() => new Image());

    cachedDefaultRaw = {
      hitcircleImg,
      hitcircleoverlayImg,
      approachcircleImg,
      sliderfollowcircleImg,
      sliderscorepointImg,
      reversearrowImg,
      sliderb0Img,
      cursorImg,
      cursortrailImg,
      followpointImg,
      digits,
    };

    const hitcircleTinted = ini.combos.map((color) => tintImage(hitcircleImg, color));
    const approachcircleTinted = ini.combos.map((color) => tintImage(approachcircleImg, color));
    const sliderstartcircleTinted = [...hitcircleTinted];
    const sliderendcircleTinted = [...hitcircleTinted];
    const sliderbTinted = [ini.combos.map((color) => tintImage(sliderb0Img, color))];

    const skin: OsuSkin = {
      id: 'default',
      name: 'osu!radar (Padrão)',
      ini,
      isOldSpinner: false,
      isLongerCursorTrail: false,
      LayeredHitSounds: parseInt(ini.General.LayeredHitSounds || '1', 10),
      hitCircleOverlayAboveNumber: ini.General.HitCircleOverlayAboveNumber !== '0',
      hasCustomDigits: false,
      hitcircle: hitcircleTinted,
      hitcircleoverlay: hitcircleoverlayImg,
      sliderstartcircle: sliderstartcircleTinted,
      sliderstartcircleoverlay: hitcircleoverlayImg,
      sliderendcircle: sliderendcircleTinted,
      sliderendcircleoverlay: hitcircleoverlayImg,
      approachcircle: approachcircleTinted,
      sliderfollowcircle: sliderfollowcircleImg,
      sliderscorepoint: sliderscorepointImg,
      reversearrow: reversearrowImg,
      sliderb: sliderbTinted,
      followpoint: [followpointImg],
      cursor: cursorImg,
      cursortrail: cursortrailImg,
      ...digits,
    };

    cachedSkin = skin;
    return skin;
  })();

  return skinLoadingPromise;
}

/**
 * Loads a custom osu! skin (either from `/api/local-skins` or an imported `.osk` archive)
 * using an asset resolver map so missing @2x or optional sprites never cause 404 requests
 * and cleanly fall back to the built-in osu!radar default skin per element.
 */
export async function loadSkinFromAssetResolver(options: {
  id: string;
  fallbackName: string;
  iniText: string;
  resolveAssetUrl: (lowerRelPath: string) => string | undefined;
  defaultBasePath?: string;
}): Promise<OsuSkin> {
  await loadDefaultSkin(options.defaultBasePath || '/skin/default');
  const rawDefault = cachedDefaultRaw!;
  const ini = parseSkinIni(options.iniText);

  async function tryLoadCustomSprite(
    relBaseName: string
  ): Promise<{ img: HTMLImageElement; found: boolean }> {
    const cleanBase = relBaseName.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const url2x = options.resolveAssetUrl(`${cleanBase}@2x.png`);
    if (url2x) {
      const img = await loadImage(url2x, 0.5);
      return { img, found: true };
    }
    const url1x = options.resolveAssetUrl(`${cleanBase}.png`);
    if (url1x) {
      const img = await loadImage(url1x, 1);
      return { img, found: true };
    }
    const empty = new Image();
    (empty as any).logicalScale = 1;
    return { img: empty, found: false };
  }

  const [
    customHitcircle,
    customHitcircleOverlay,
    customApproachCircle,
    customSliderStartCircle,
    customSliderStartOverlay,
    customSliderEndCircle,
    customSliderEndOverlay,
    customSliderFollow,
    customSliderScorePoint,
    customReverseArrow,
    customSliderB0,
    customSliderB,
    customCursor,
    customCursorMiddle,
    customCursorTrail,
    customFollowPoint,
  ] = await Promise.all([
    tryLoadCustomSprite('hitcircle'),
    tryLoadCustomSprite('hitcircleoverlay'),
    tryLoadCustomSprite('approachcircle'),
    tryLoadCustomSprite('sliderstartcircle'),
    tryLoadCustomSprite('sliderstartcircleoverlay'),
    tryLoadCustomSprite('sliderendcircle'),
    tryLoadCustomSprite('sliderendcircleoverlay'),
    tryLoadCustomSprite('sliderfollowcircle'),
    tryLoadCustomSprite('sliderscorepoint'),
    tryLoadCustomSprite('reversearrow'),
    tryLoadCustomSprite('sliderb0'),
    tryLoadCustomSprite('sliderb'),
    tryLoadCustomSprite('cursor'),
    tryLoadCustomSprite('cursormiddle'),
    tryLoadCustomSprite('cursortrail'),
    tryLoadCustomSprite('followpoint'),
  ]);

  const hitcircleBase = customHitcircle.found ? customHitcircle.img : rawDefault.hitcircleImg;
  const hitcircleOverlayImg = customHitcircleOverlay.found
    ? customHitcircleOverlay.img
    : rawDefault.hitcircleoverlayImg;
  const approachCircleBase = customApproachCircle.found
    ? customApproachCircle.img
    : rawDefault.approachcircleImg;

  const hitcircleTinted = ini.combos.map((color) => tintImage(hitcircleBase, color));
  const approachcircleTinted = ini.combos.map((color) => tintImage(approachCircleBase, color));

  const sliderstartcircleTinted = customSliderStartCircle.found
    ? ini.combos.map((color) => tintImage(customSliderStartCircle.img, color))
    : hitcircleTinted;

  const sliderstartcircleOverlayImg = customSliderStartOverlay.found
    ? customSliderStartOverlay.img
    : hitcircleOverlayImg;

  // In osu!stable, skins like WhiteCat/Rafis provide a transparent `sliderendcircle.png`
  // without `sliderendcircleoverlay.png` to achieve clean ring-free slider tails.
  const sliderendcircleTinted = customSliderEndCircle.found
    ? ini.combos.map((color) => tintImage(customSliderEndCircle.img, color))
    : hitcircleTinted;

  const emptyImg = new Image();
  (emptyImg as any).logicalScale = 1;
  const sliderendcircleOverlayImg = customSliderEndOverlay.found
    ? customSliderEndOverlay.img
    : customSliderEndCircle.found
    ? emptyImg
    : hitcircleOverlayImg;

  // Slider ball (`sliderb0` or `sliderb`), respecting `AllowSliderBallTint`
  const sliderBallBase = customSliderB0.found
    ? customSliderB0.img
    : customSliderB.found
    ? customSliderB.img
    : rawDefault.sliderb0Img;
  const allowSliderBallTint = ini.General.AllowSliderBallTint !== '0';
  const sliderbFrames = allowSliderBallTint
    ? [ini.combos.map((color) => tintImage(sliderBallBase, color))]
    : [ini.combos.map(() => imageToCanvas(sliderBallBase))];

  // HitCircle digits (`HitCirclePrefix`, e.g. `Assets/default/default` or `default` or `score`)
  const digitPrefix = ini.Fonts.HitCirclePrefix || 'default';
  const digits: Record<string, HTMLImageElement> = {};
  let foundCustomDigitCount = 0;

  await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      let loaded = await tryLoadCustomSprite(`${digitPrefix}-${i}`);
      if (!loaded.found && digitPrefix.toLowerCase() !== 'default') {
        loaded = await tryLoadCustomSprite(`default-${i}`);
      }
      if (loaded.found) {
        foundCustomDigitCount++;
        digits[`default-${i}`] = loaded.img;
      } else {
        digits[`default-${i}`] = rawDefault.digits[`default-${i}`];
      }
    })
  );

  // Resolve custom hitsound URLs (.wav, .ogg, .mp3)
  const hitsoundUrls: Record<string, string> = {};
  for (const setName of HITSOUND_SETS) {
    for (const soundType of HITSOUND_TYPES) {
      const soundKey = `${setName}-${soundType}`;
      for (const ext of HITSOUND_EXTS) {
        const foundUrl = options.resolveAssetUrl(`${soundKey}.${ext}`);
        if (foundUrl) {
          hitsoundUrls[soundKey] = foundUrl;
          break;
        }
      }
    }
  }

  return {
    id: options.id,
    name: ini.General.Name || options.fallbackName,
    ini,
    isOldSpinner: false,
    isLongerCursorTrail: false,
    LayeredHitSounds: parseInt(ini.General.LayeredHitSounds || '1', 10),
    hitCircleOverlayAboveNumber: ini.General.HitCircleOverlayAboveNumber !== '0',
    hasCustomDigits: foundCustomDigitCount > 0,
    hitsoundUrls,
    hitcircle: hitcircleTinted,
    hitcircleoverlay: hitcircleOverlayImg,
    sliderstartcircle: sliderstartcircleTinted,
    sliderstartcircleoverlay: sliderstartcircleOverlayImg,
    sliderendcircle: sliderendcircleTinted,
    sliderendcircleoverlay: sliderendcircleOverlayImg,
    approachcircle: approachcircleTinted,
    sliderfollowcircle: customSliderFollow.found
      ? customSliderFollow.img
      : rawDefault.sliderfollowcircleImg,
    sliderscorepoint: customSliderScorePoint.found
      ? customSliderScorePoint.img
      : rawDefault.sliderscorepointImg,
    reversearrow: customReverseArrow.found ? customReverseArrow.img : rawDefault.reversearrowImg,
    sliderb: sliderbFrames,
    followpoint: [customFollowPoint.found ? customFollowPoint.img : rawDefault.followpointImg],
    cursor: customCursor.found ? customCursor.img : rawDefault.cursorImg,
    cursormiddle: customCursorMiddle.found ? customCursorMiddle.img : undefined,
    cursortrail: customCursor.found
      ? customCursorTrail.found
        ? customCursorTrail.img
        : emptyImg
      : rawDefault.cursortrailImg,
    ...digits,
  };
}

function decodeIniBytes(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  let str = strFromU8(bytes);
  if (str.charCodeAt(0) === 0xfeff) {
    str = str.slice(1);
  }
  return str;
}

function getAssetMimeType(lowerPath: string): string {
  if (lowerPath.endsWith('.png')) return 'image/png';
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerPath.endsWith('.webp')) return 'image/webp';
  if (lowerPath.endsWith('.ogg')) return 'audio/ogg';
  if (lowerPath.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerPath.endsWith('.wav')) return 'audio/wav';
  return 'application/octet-stream';
}

/**
 * Extracts an `.osk` or `.zip` osu! skin archive in memory into normalized relative Blob entries + `skin.ini`.
 */
export function extractSkinArchive(
  buffer: ArrayBuffer,
  archiveFileName: string
): {
  name: string;
  author?: string;
  iniText: string;
  files: Record<string, Blob>;
} {
  const uint8 = new Uint8Array(buffer);
  const unzipped = unzipSync(uint8, {
    filter: (f) => {
      const lower = f.name.toLowerCase();
      return /\.(ini|png|jpe?g|webp|wav|ogg|mp3)$/i.test(lower);
    },
  });

  const rawEntries = Object.entries(unzipped).map(([rawPath, data]) => ({
    normPath: rawPath.replace(/\\/g, '/').replace(/^\/+/, ''),
    data,
  }));

  if (rawEntries.length === 0) {
    throw new Error('O pacote selecionado não contém arquivos válidos de skin (.ini, .png, .wav, .ogg).');
  }

  // Detect optional single top-level wrapper folder (e.g. `MySkin/skin.ini`)
  let stripPrefix = '';
  const rootSkinIni = rawEntries.find((e) => e.normPath.toLowerCase() === 'skin.ini');
  if (!rootSkinIni) {
    const nestedSkinIni = rawEntries.find((e) => e.normPath.toLowerCase().endsWith('/skin.ini'));
    if (nestedSkinIni) {
      const slashIdx = nestedSkinIni.normPath.lastIndexOf('/');
      stripPrefix = nestedSkinIni.normPath.slice(0, slashIdx + 1);
    }
  }

  let iniText = '';
  const files: Record<string, Blob> = {};

  for (const entry of rawEntries) {
    let rel = entry.normPath;
    if (stripPrefix && rel.toLowerCase().startsWith(stripPrefix.toLowerCase())) {
      rel = rel.slice(stripPrefix.length);
    }
    const lowerRel = rel.toLowerCase();
    if (!lowerRel) continue;

    if (lowerRel === 'skin.ini') {
      iniText = decodeIniBytes(entry.data);
    } else {
      files[lowerRel] = new Blob([entry.data], { type: getAssetMimeType(lowerRel) });
    }
  }

  const parsedIni = parseSkinIni(iniText);
  const fallbackName = archiveFileName.replace(/\.(osk|zip)$/i, '').trim() || 'Skin Importada';

  return {
    name: parsedIni.General.Name || fallbackName,
    author: parsedIni.General.Author,
    iniText,
    files,
  };
}

/**
 * Extracts an osu! skin from a browser folder selection (`webkitdirectory` FileList).
 */
export async function extractSkinFromFileList(fileList: FileList | File[]): Promise<{
  name: string;
  author?: string;
  iniText: string;
  files: Record<string, Blob>;
}> {
  const arr = Array.from(fileList);
  const entries = arr
    .map((file) => {
      const rel = ((file as any).webkitRelativePath || file.name)
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');
      return { file, rel };
    })
    .filter(({ rel }) => /\.(ini|png|jpe?g|webp|wav|ogg|mp3)$/i.test(rel));

  if (entries.length === 0) {
    throw new Error('A pasta selecionada não contém arquivos de skin do osu!.');
  }

  let stripPrefix = '';
  let folderFallbackName = 'Skin Importada';
  const firstSlash = entries[0].rel.indexOf('/');
  if (firstSlash !== -1) {
    const topFolder = entries[0].rel.slice(0, firstSlash);
    const allShareTop = entries.every((e) =>
      e.rel.toLowerCase().startsWith(`${topFolder.toLowerCase()}/`)
    );
    if (allShareTop) {
      stripPrefix = `${topFolder}/`;
      folderFallbackName = topFolder;
    }
  }

  let iniText = '';
  const files: Record<string, Blob> = {};

  for (const { file, rel } of entries) {
    const cleanRel =
      stripPrefix && rel.toLowerCase().startsWith(stripPrefix.toLowerCase())
        ? rel.slice(stripPrefix.length)
        : rel;
    const lowerRel = cleanRel.toLowerCase();
    if (!lowerRel) continue;

    if (lowerRel === 'skin.ini') {
      const buf = new Uint8Array(await file.arrayBuffer());
      iniText = decodeIniBytes(buf);
    } else {
      files[lowerRel] = file;
    }
  }

  const parsedIni = parseSkinIni(iniText);

  return {
    name: parsedIni.General.Name || folderFallbackName,
    author: parsedIni.General.Author,
    iniText,
    files,
  };
}
