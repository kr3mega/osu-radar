import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Pure Clean Slider Glyphs (NO circles/bulbs on tips, ONLY natural round stroke-linecap, EXCEPT the dot on 'i')

// 1. Clean Slider 's'
function renderCleanSliderS(x, y, scale = 1, strokeWidth = 11, stroke = 'url(#pyGrad)') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

// 2. Clean Slider 'k'
function renderCleanSliderK(x, y, scale = 1, strokeWidth = 11, stroke = 'url(#pyGrad)') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth * 0.94}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

// 3. Clean Slider 'i' (Dot is a solid circle; stem is a clean rounded slider line)
function renderCleanSliderI(x, y, scale = 1, strokeWidth = 11, stroke = 'url(#pyGrad)') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Pingo do i: único círculo permitido! -->
      <circle cx="0" cy="-21" r="${strokeWidth * 0.72}" fill="${stroke}"/>
      <!-- Haste reta limpa -->
      <path d="M 0,-3 L 0,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>
  `;
}

// 4. Clean Slider 'l' with organic curved hook bottom
function renderCleanSliderL(x, y, scale = 1, strokeWidth = 11, stroke = 'url(#pyGrad)') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,12.5 C 0,17 2.5,18.5 6.5,18.5" 
            fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

// Build the complete "skills" word with clean sliders
function buildCleanSkillsWord({
  centerX = 175,
  baseY = 232,
  strokeWidth = 11,
  scale = 1.0,
  spreadFactor = 0.90,
  stroke = 'url(#pyGrad)'
}) {
  const x_s1 = centerX - 84 * spreadFactor * scale;
  const x_k  = centerX - 53 * spreadFactor * scale;
  const x_i  = centerX - 15 * spreadFactor * scale;
  const x_l1 = centerX + 13 * spreadFactor * scale;
  const x_l2 = centerX + 43 * spreadFactor * scale;
  const x_s2 = centerX + 84 * spreadFactor * scale;

  return `
    <g id="cleanSkillsWord">
      ${renderCleanSliderS(x_s1, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderK(x_k, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderI(x_i, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderL(x_l1, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderL(x_l2, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderS(x_s2, baseY, scale, strokeWidth, stroke)}
    </g>
  `;
}

// Purple & Yellow Gradients Definition
function getGradientDefs(gradId = 'pyGrad', type = 'diagonal') {
  if (type === 'diagonal') {
    // 135deg diagonal: Purple top-left to Golden Yellow bottom-right (as in reference image)
    return `
      <defs>
        <linearGradient id="${gradId}" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stop-color="#9C5CFF"/>    <!-- Deep Electric Violet -->
          <stop offset="35%" stop-color="#C89DFF"/>   <!-- Luminous Lavender Purple -->
          <stop offset="70%" stop-color="#FFE082"/>   <!-- Soft Champagne Gold -->
          <stop offset="100%" stop-color="#FFC107"/>  <!-- Radiant Amber Yellow -->
        </linearGradient>

        <linearGradient id="${gradId}Rim" x1="10%" y1="5%" x2="90%" y2="95%">
          <stop offset="0%" stop-color="#A875FF"/>
          <stop offset="40%" stop-color="#D4B5FF"/>
          <stop offset="75%" stop-color="#FFE8A3"/>
          <stop offset="100%" stop-color="#FFCA28"/>
        </linearGradient>

        <radialGradient id="obsidianBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1F1528"/>
          <stop offset="80%" stop-color="#140E1B"/>
          <stop offset="100%" stop-color="#0C0812"/>
        </radialGradient>
      </defs>
    `;
  } else if (type === 'vibrant') {
    // Extra punchy Purple to Neon Gold
    return `
      <defs>
        <linearGradient id="${gradId}" x1="10%" y1="15%" x2="90%" y2="85%">
          <stop offset="0%" stop-color="#8A3FFC"/>    <!-- Rich Ultraviolet -->
          <stop offset="40%" stop-color="#BE82FF"/>   <!-- Orchid Purple -->
          <stop offset="72%" stop-color="#FFDF73"/>   <!-- Bright Gold -->
          <stop offset="100%" stop-color="#FFB703"/>  <!-- Vivid Yellow Gold -->
        </linearGradient>

        <linearGradient id="${gradId}Rim" x1="10%" y1="15%" x2="90%" y2="85%">
          <stop offset="0%" stop-color="#8A3FFC"/>
          <stop offset="45%" stop-color="#D4A7FF"/>
          <stop offset="80%" stop-color="#FFE48A"/>
          <stop offset="100%" stop-color="#FFB703"/>
        </linearGradient>

        <radialGradient id="obsidianBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#22172D"/>
          <stop offset="85%" stop-color="#130D1B"/>
          <stop offset="100%" stop-color="#0B0710"/>
        </radialGradient>
      </defs>
    `;
  } else if (type === 'pastel') {
    // Soft pastel lavender to pastel buttercup yellow
    return `
      <defs>
        <linearGradient id="${gradId}" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stop-color="#B886FF"/>
          <stop offset="40%" stop-color="#E2CCFF"/>
          <stop offset="70%" stop-color="#FFF0B3"/>
          <stop offset="100%" stop-color="#FFD15C"/>
        </linearGradient>

        <linearGradient id="${gradId}Rim" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stop-color="#B886FF"/>
          <stop offset="45%" stop-color="#EDE0FF"/>
          <stop offset="75%" stop-color="#FFF3C4"/>
          <stop offset="100%" stop-color="#FFD15C"/>
        </linearGradient>

        <radialGradient id="obsidianBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1E1428"/>
          <stop offset="80%" stop-color="#120C19"/>
          <stop offset="100%" stop-color="#0A060E"/>
        </radialGradient>
      </defs>
    `;
  } else {
    // Horizontal flow: Left Purple to Right Yellow
    return `
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="#9955FF"/>
          <stop offset="45%" stop-color="#D0A8FF"/>
          <stop offset="65%" stop-color="#FFE38F"/>
          <stop offset="100%" stop-color="#FFBE1A"/>
        </linearGradient>

        <linearGradient id="${gradId}Rim" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stop-color="#A566FF"/>
          <stop offset="45%" stop-color="#E0C2FF"/>
          <stop offset="70%" stop-color="#FFE8A3"/>
          <stop offset="100%" stop-color="#FFBE1A"/>
        </linearGradient>

        <radialGradient id="obsidianBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#20152B"/>
          <stop offset="85%" stop-color="#140D1B"/>
          <stop offset="100%" stop-color="#0B0710"/>
        </radialGradient>
      </defs>
    `;
  }
}

// Assemble SVG:
function buildPurpleYellowSvg({
  gradType = 'diagonal',
  strokeWidth = 11.0,
  scaleOsu = 0.88,
  osuOffsetY = -28,
  skillsBaseY = 232,
  skillsScale = 1.0,
  spreadFactor = 0.90
}) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
    ${getGradientDefs('pyGrad', gradType)}

    <!-- 1. Deep Obsidian Velvet Disc (fundo escuro puro) -->
    <circle cx="175" cy="175" r="150" fill="url(#obsidianBg)"/>
    
    <!-- 2. Rim in Purple & Yellow Gradient -->
    <path d="${RIM_PATH}" fill="url(#pyGradRim)"/>

    <!-- 3. "osu!" Official letters in Purple & Yellow Gradient -->
    <g transform="translate(175, 175) scale(${scaleOsu}) translate(-175, -175) translate(0, ${osuOffsetY})">
      <path d="${OSU_TEXT_PATH}" fill="url(#pyGrad)"/>
    </g>

    <!-- 4. Clean Sliders "skills" (NO circle bulbs, only round stroke caps + dot on 'i') -->
    ${buildCleanSkillsWord({
      centerX: 175,
      baseY: skillsBaseY,
      strokeWidth,
      scale: skillsScale,
      spreadFactor,
      stroke: 'url(#pyGrad)'
    })}
  </svg>
  `;
}

// 4 Variations of Purple & Yellow:

// Variação 1: "Diagonal Nobre (Recomendada)" — Roxo no topo esquerdo fluindo para Amarelo Dourado no canto inferior direito
const svgVar1 = buildPurpleYellowSvg({ gradType: 'diagonal', strokeWidth: 11.0 });

// Variação 2: "Vibrante & Saturado" — Roxo ultravioleta e Amarelo ouro com alto contraste
const svgVar2 = buildPurpleYellowSvg({ gradType: 'vibrant', strokeWidth: 11.2 });

// Variação 3: "Pastel Diamante Suave" — Lavanda suave e Dourado champanhe amanteigado
const svgVar3 = buildPurpleYellowSvg({ gradType: 'pastel', strokeWidth: 10.8 });

// Variação 4: "Gradiente Horizontal" — Roxo puro do lado esquerdo passando suavemente para Amarelo do lado direito
const svgVar4 = buildPurpleYellowSvg({ gradType: 'horizontal', strokeWidth: 11.0 });

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 1024,
      height: 1024,
      show: false,
      frame: false,
      transparent: true,
      webPreferences: { offscreen: true }
    });

    const renderSvg = async (svgStr, width, height, filename) => {
      win.setSize(width, height);
      const sizedSvg = svgStr.replace('width="100%" height="100%"', `width="${width}" height="${height}"`);
      const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:${width}px;height:${height}px;}</style></head><body>${sizedSvg}</body></html>`;
      const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await win.loadURL(dataUri);
      await new Promise(r => setTimeout(r, 200));
      const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
      const outPath = path.join(targetDir, filename);
      fs.writeFileSync(outPath, image.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
      return image.toPNG();
    };

    const v1Png1024 = await renderSvg(svgVar1, 1024, 1024, 'py_clean_var1_diagonal_1024.png');
    const v1B64 = (await renderSvg(svgVar1, 512, 512, 'py_clean_var1_diagonal.png')).toString('base64');
    const v2B64 = (await renderSvg(svgVar2, 512, 512, 'py_clean_var2_vibrant.png')).toString('base64');
    const v3B64 = (await renderSvg(svgVar3, 512, 512, 'py_clean_var3_pastel.png')).toString('base64');
    const v4B64 = (await renderSvg(svgVar4, 512, 512, 'py_clean_var4_horizontal.png')).toString('base64');

    // Create Comparison Board Window
    const boardWin = new BrowserWindow({
      width: 1200,
      height: 940,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#120F13',
      webPreferences: { offscreen: true }
    });

    const boardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            background: #0E0A13;
            color: #FFFFFF;
            padding: 30px 40px;
            display: flex;
            flex-direction: column;
            gap: 22px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #281D33;
            padding-bottom: 14px;
          }
          .title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .title span {
            background: linear-gradient(90deg, #A875FF, #FFCA28);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 14px;
            color: #B5AAB6;
            margin-top: 4px;
          }
          .badge {
            background: linear-gradient(135deg, rgba(168,117,255,0.2), rgba(255,202,40,0.2));
            border: 1px solid rgba(255,202,40,0.5);
            color: #FFE082;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .card {
            background: #17101E;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            position: relative;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          }
          .card.highlight {
            border: 2px solid #FFCA28;
            background: #1E1528;
          }
          .card.highlight::before {
            content: 'RECOMENDADA';
            position: absolute;
            top: -10px;
            background: linear-gradient(90deg, #A875FF, #FFCA28);
            color: #120A1A;
            font-size: 10px;
            font-weight: 900;
            padding: 2px 8px;
            border-radius: 6px;
            letter-spacing: 0.5px;
          }
          .icon-wrap {
            width: 170px;
            height: 170px;
            margin-bottom: 12px;
            background-color: #120C18;
            background-image: 
              linear-gradient(45deg, #1A1222 25%, transparent 25%), 
              linear-gradient(-45deg, #1A1222 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #1A1222 75%), 
              linear-gradient(-45deg, transparent 75%, #1A1222 75%);
            background-size: 14px 14px;
            background-position: 0 0, 0 7px, 7px -7px, -7px 0px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-wrap img { width: 160px; height: 160px; }
          .card-title {
            font-size: 16px;
            font-weight: 800;
            color: #FFFFFF;
            margin-bottom: 3px;
          }
          .card-sub {
            font-size: 12px;
            font-weight: 700;
            color: #FFCA28;
            margin-bottom: 6px;
          }
          .card-desc {
            font-size: 11.5px;
            color: #9E93A0;
            line-height: 1.4;
          }
          .taskbar-mockup-panel {
            background: #160F1D;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 14px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .taskbar-title {
            font-size: 13px;
            font-weight: 700;
            color: #D6CBD8;
            display: flex;
            justify-content: space-between;
          }
          .taskbar-strip {
            background: #09060C;
            height: 48px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 14px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .tb-dummy {
            width: 28px;
            height: 28px;
            opacity: 0.4;
          }
          .tb-icon {
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            position: relative;
          }
          .tb-icon.active {
            background: rgba(255, 255, 255, 0.08);
          }
          .tb-icon.active::after {
            content: '';
            position: absolute;
            bottom: 2px;
            width: 14px;
            height: 2px;
            background: #FFCA28;
            border-radius: 2px;
          }
          .tb-icon img {
            width: 32px;
            height: 32px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 12px;
            color: #7A727C;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">osu!<span>skills</span> — Exclusivo Roxo &amp; Amarelo (Sliders Limpos)</div>
            <div class="subtitle">Sem rosa • Sem bolinhas extras nas pontas • Sliders puros e ponta arredondada (exceto pingo do 'i')</div>
          </div>
          <div class="badge">Apenas Roxo &amp; Amarelo • Sliders Lisos</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Diagonal Nobre</div>
            <div class="card-sub">Recomendada</div>
            <div class="card-desc">Roxo ametista fluindo na diagonal para o amarelo ouro. Sliders contínuos e limpos com ponta arredondada e o pingo do 'i' perfeito!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Vibrante &amp; Neon</div>
            <div class="card-sub">Alto Contraste</div>
            <div class="card-desc">Ultravioleta profundo e ouro brilhante, conferindo máxima luminosidade e contraste na barra de tarefas.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Pastel Diamante</div>
            <div class="card-sub">Lavanda &amp; Champanhe</div>
            <div class="card-desc">Tons pastéis mais suaves e etéreos: lavanda delicada e amarelo champanhe mineral.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Fluxo Horizontal</div>
            <div class="card-sub">Da Esquerda para a Direita</div>
            <div class="card-desc">Roxo sólido no lado esquerdo ('o', 's') transicionando suavemente para amarelo ouro no lado direito ('u!', 'lls').</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) com Sliders Limpos em Roxo &amp; Amarelo</span>
            <span style="color:#A098A2; font-weight:500;">Zero bolinhas extras • Leitura fluida e nítida</span>
          </div>
          <div class="taskbar-strip">
            <div class="tb-dummy" style="background:#0078D4; border-radius:4px;"></div>
            <div class="tb-dummy" style="background:#4285F4; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#F2C811; border-radius:4px;"></div>
            
            <!-- Variação 1 Preview -->
            <div class="tb-icon active">
              <img src="data:image/png;base64,${v1B64}"/>
            </div>

            <!-- Variação 2 Preview -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v2B64}"/>
            </div>

            <!-- Variação 3 Preview -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v3B64}"/>
            </div>

            <!-- Variação 4 Preview -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v4B64}"/>
            </div>

            <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
          </div>
        </div>

        <div class="footer">
          <div>Cores: Roxo #9C5CFF → Amarelo #FFC107 • Fundo Obsidiana #140E1B</div>
          <div>Geometria: Sliders puros (stroke-linecap round) • Pingo do 'i' circular • Edge-to-Edge transparente</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'purple_yellow_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered purple yellow comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering purple yellow sliders:', err);
    app.quit();
  }
});
