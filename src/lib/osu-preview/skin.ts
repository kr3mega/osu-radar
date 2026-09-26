import { rgb } from './functions';
import { OsuSkin, SkinIni } from './types';

const DEFAULT_COMBO_COLORS: Array<[number, number, number]> = [
  [255, 102, 170], // Pink
  [0, 240, 255],   // Cyan
  [166, 226, 46],  // Lime
  [255, 153, 0],   // Orange
  [189, 94, 255],  // Purple
];

export function tintImage(
  img: HTMLImageElement | HTMLCanvasElement,
  color: [number, number, number]
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

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

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Create empty 1x1 image fallback
      const fallback = new Image();
      resolve(fallback);
    };
    img.src = url;
  });
}

export function parseSkinIni(text: string): SkinIni {
  const ini: SkinIni = {
    General: {
      AllowSliderBallTint: '1',
      SliderBallFlip: '1',
      CursorCenter: '1',
      CursorRotate: '1',
      CursorTrailRotate: '0',
      LayeredHitSounds: '1',
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

  const lines = text.split('\n');
  let currentCategory = '';
  const parsedCombos: Array<[number, number, number]> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentCategory = line.slice(1, -1).trim();
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();

    if (currentCategory === 'General') {
      (ini.General as any)[key] = val;
    } else if (currentCategory === 'Colours') {
      ini.Colours[key] = val;
      if (key.startsWith('Combo')) {
        const parsed = rgb(val);
        if (parsed) parsedCombos.push(parsed);
      }
    } else if (currentCategory === 'Fonts') {
      if (key === 'HitCircleOverlap') ini.Fonts.HitCircleOverlap = parseInt(val, 10) || -2;
      else if (key === 'HitCirclePrefix') ini.Fonts.HitCirclePrefix = val;
    }
  }

  if (parsedCombos.length > 0) {
    ini.combos = parsedCombos;
  }

  return ini;
}

let cachedSkin: OsuSkin | null = null;
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

    // Load base images in parallel
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
      loadImage(`${basePath}/hitcircle.png`),
      loadImage(`${basePath}/hitcircleoverlay.png`),
      loadImage(`${basePath}/approachcircle.png`),
      loadImage(`${basePath}/sliderfollowcircle.png`),
      loadImage(`${basePath}/sliderscorepoint.png`),
      loadImage(`${basePath}/reversearrow.png`),
      loadImage(`${basePath}/sliderb0.png`),
      loadImage(`${basePath}/cursor.png`),
      loadImage(`${basePath}/cursortrail.png`),
    ]);

    // Load combo numbers 0-9
    const digits: Record<string, HTMLImageElement> = {};
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        loadImage(`${basePath}/default-${i}.png`).then((img) => {
          digits[`default-${i}`] = img;
        })
      )
    );

    // Tint sprites for each combo color
    const hitcircleTinted = ini.combos.map((color) => tintImage(hitcircleImg, color));
    const approachcircleTinted = ini.combos.map((color) => tintImage(approachcircleImg, color));
    const sliderstartcircleTinted = [...hitcircleTinted];
    const sliderendcircleTinted = [...hitcircleTinted];

    // Slider ball tinting
    const sliderbTinted = [
      ini.combos.map((color) => tintImage(sliderb0Img, color)),
    ];

    // Follow points
    const followpointImg = await loadImage(`${basePath}/followpoint.png`).catch(() => new Image());

    const skin: OsuSkin = {
      ini,
      isOldSpinner: false,
      isLongerCursorTrail: false,
      LayeredHitSounds: parseInt(ini.General.LayeredHitSounds || '1', 10),
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
