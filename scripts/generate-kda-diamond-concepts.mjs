import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Load K/DA image as base64 data URI
const kdaImgPath = path.join(targetDir, '.user_uploaded', 'media_1793039926915_99016031.jpg');
const kdaB64 = fs.existsSync(kdaImgPath) ? `data:image/jpeg;base64,${fs.readFileSync(kdaImgPath).toString('base64')}` : '';

// Clean Slider Glyphs (No dots on ends, only stroke-linecap round, except dot of 'i')
function renderCleanSliderS(x, y, scale = 1, strokeWidth = 11, stroke = '#000000') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

function renderCleanSliderK(x, y, scale = 1, strokeWidth = 11, stroke = '#000000') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth * 0.94}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

function renderCleanSliderI(x, y, scale = 1, strokeWidth = 11, stroke = '#000000') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <circle cx="0" cy="-21" r="${strokeWidth * 0.72}" fill="${stroke}"/>
      <path d="M 0,-3 L 0,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>
  `;
}

function renderCleanSliderL(x, y, scale = 1, strokeWidth = 11, stroke = '#000000') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,12.5 C 0,17 2.5,18.5 6.5,18.5" 
            fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

function buildCleanSkillsWord({
  centerX = 175,
  baseY = 232,
  strokeWidth = 11,
  scale = 1.0,
  spreadFactor = 0.90,
  stroke = '#000000'
}) {
  const x_s1 = centerX - 84 * spreadFactor * scale;
  const x_k  = centerX - 53 * spreadFactor * scale;
  const x_i  = centerX - 15 * spreadFactor * scale;
  const x_l1 = centerX + 13 * spreadFactor * scale;
  const x_l2 = centerX + 43 * spreadFactor * scale;
  const x_s2 = centerX + 84 * spreadFactor * scale;

  return `
    <g id="kdaSkillsWord">
      ${renderCleanSliderS(x_s1, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderK(x_k, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderI(x_i, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderL(x_l1, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderL(x_l2, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderS(x_s2, baseY, scale, strokeWidth, stroke)}
    </g>
  `;
}

// K/DA Gradient Definitions (Icy Sky Cyan, Pearlescent Lavender, Pale Opal Mint, and Diamond Silk)
const KDA_DEFS = `
  <defs>
    <!-- Pattern using actual authentic K/DA texture mapped to circle -->
    <pattern id="kdaSilkPattern" patternUnits="userSpaceOnUse" width="304" height="304" x="23" y="23">
      <image href="${kdaB64}" x="-120" y="-30" width="600" height="360" preserveAspectRatio="xMidYMid slice"/>
    </pattern>

    <pattern id="kdaSilkPatternAlt" patternUnits="userSpaceOnUse" width="304" height="304" x="23" y="23">
      <image href="${kdaB64}" x="-260" y="-20" width="600" height="360" preserveAspectRatio="xMidYMid slice"/>
    </pattern>

    <!-- Vector Multi-Stop K/DA Holographic Prism Gradient -->
    <linearGradient id="kdaPrismGrad" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="310" y2="310">
      <stop offset="0%" stop-color="#80DCF5"/>    <!-- Luminous Icy Cyan -->
      <stop offset="28%" stop-color="#C2BAF8"/>   <!-- Soft Periwinkle Lavender -->
      <stop offset="50%" stop-color="#FFFFFF"/>   <!-- High Diamond Glint -->
      <stop offset="72%" stop-color="#9EE4F5"/>   <!-- Sky Aqua -->
      <stop offset="100%" stop-color="#D7CAFD"/>  <!-- Pearlescent Violet Opal -->
    </linearGradient>

    <!-- K/DA Dark Obsidian Background -->
    <radialGradient id="kdaObsidian" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1B1724"/>
      <stop offset="80%" stop-color="#0E0B14"/>
      <stop offset="100%" stop-color="#07050A"/>
    </radialGradient>

    <!-- Clip Path for the 150-radius circular disc -->
    <clipPath id="circleDiscClip">
      <circle cx="175" cy="175" r="150"/>
    </clipPath>

    <!-- Drop Shadow for light text on diamond texture -->
    <filter id="kdaTextShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" flood-color="#09060E" flood-opacity="0.55"/>
    </filter>
  </defs>
`;

// 4 Distinct K/DA Diamond Variations:

// Variação 1: "K/DA ALL OUT Puro (Estilo Exato da Imagem)"
// O fundo circular é a Seda de Diamante Holográfica K/DA; o anel e as letras são em Preto Obsidiana (#0F0C16) nítido como o logo KDA!
const svgKda1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${KDA_DEFS}

  <!-- 1. K/DA Iridescent Diamond Silk Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaSilkPattern)"/>
  
  <!-- Subtle iridescent rim overlay -->
  <circle cx="175" cy="175" r="150" fill="none" stroke="#FFFFFF" stroke-width="2.5" opacity="0.6"/>

  <!-- 2. Rim in Deep Obsidian (like KDA logo) -->
  <path d="${RIM_PATH}" fill="#110D18"/>

  <!-- 3. "osu!" in Sharp Obsidian Jet Black -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="#110D18"/>
  </g>

  <!-- 4. "skills" Clean Sliders in Sharp Obsidian Jet Black -->
  ${buildCleanSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: '#110D18'
  })}
</svg>
`;

// Variação 2: "K/DA Diamond Silk com Letras Brancas Cristalinas"
// O fundo é a Seda K/DA, mas as letras e o anel são em Branco Puro (#FFFFFF) com sombra suave em obsidiana!
const svgKda2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${KDA_DEFS}

  <!-- 1. K/DA Iridescent Diamond Silk Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaSilkPatternAlt)"/>
  <circle cx="175" cy="175" r="150" fill="#0E0B14" opacity="0.12"/>

  <!-- 2. Rim in Pure White -->
  <path d="${RIM_PATH}" fill="#FFFFFF" filter="url(#kdaTextShadow)"/>

  <!-- 3. "osu!" in Pure White with soft shadow -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)" filter="url(#kdaTextShadow)">
    <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
  </g>

  <!-- 4. "skills" Clean Sliders in Pure White with soft shadow -->
  <g filter="url(#kdaTextShadow)">
    ${buildCleanSkillsWord({
      centerX: 175,
      baseY: 232,
      strokeWidth: 11.0,
      scale: 1.0,
      spreadFactor: 0.90,
      stroke: '#FFFFFF'
    })}
  </g>
</svg>
`;

// Variação 3: "K/DA Obsidian Glow (Fundo Escuro com Letras em Diamante K/DA)"
// Fundo Obsidiana Profundo (#0E0B14); o anel e as letras são preenchidos com o gradiente Diamante K/DA!
const svgKda3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${KDA_DEFS}

  <!-- 1. Deep Obsidian Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaObsidian)"/>
  
  <!-- 2. Rim in K/DA Holographic Prism -->
  <path d="${RIM_PATH}" fill="url(#kdaPrismGrad)"/>

  <!-- 3. "osu!" in K/DA Holographic Prism -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="url(#kdaPrismGrad)"/>
  </g>

  <!-- 4. "skills" Clean Sliders in K/DA Holographic Prism -->
  ${buildCleanSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: 'url(#kdaPrismGrad)'
  })}
</svg>
`;

// Variação 4: "K/DA Liquid Hologram (Vector Prism Puro)"
// Vetorial puro estilizado com as ondas de gradiente K/DA (Ciano Gelo -> Lavanda -> Branco Diamante)
const svgKda4 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${KDA_DEFS}

  <!-- 1. Liquid Prism Vector Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaPrismGrad)"/>
  
  <!-- 2. Rim in Sharp Obsidian Jet Black -->
  <path d="${RIM_PATH}" fill="#0F0C16"/>

  <!-- 3. "osu!" in Sharp Obsidian Jet Black -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="#0F0C16"/>
  </g>

  <!-- 4. "skills" Clean Sliders in Sharp Obsidian Jet Black -->
  ${buildCleanSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: '#0F0C16'
  })}
</svg>
`;

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
      await new Promise(r => setTimeout(r, 220));
      const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
      const outPath = path.join(targetDir, filename);
      fs.writeFileSync(outPath, image.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
      return image.toPNG();
    };

    const v1Png1024 = await renderSvg(svgKda1, 1024, 1024, 'kda_var1_all_out_1024.png');
    const v1B64 = (await renderSvg(svgKda1, 512, 512, 'kda_var1_all_out.png')).toString('base64');
    const v2B64 = (await renderSvg(svgKda2, 512, 512, 'kda_var2_diamond_white.png')).toString('base64');
    const v3B64 = (await renderSvg(svgKda3, 512, 512, 'kda_var3_obsidian_glow.png')).toString('base64');
    const v4B64 = (await renderSvg(svgKda4, 512, 512, 'kda_var4_liquid_vector.png')).toString('base64');

    // Create Comparison Board Window
    const boardWin = new BrowserWindow({
      width: 1200,
      height: 940,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#0E0B12',
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
            background: #0B0810;
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
            border-bottom: 2px solid #221B2B;
            padding-bottom: 14px;
          }
          .title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .title span {
            background: linear-gradient(90deg, #80DCF5, #C2BAF8, #FFFFFF, #9EE4F5);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 14px;
            color: #B5AAB6;
            margin-top: 4px;
          }
          .badge {
            background: linear-gradient(135deg, rgba(128,220,245,0.2), rgba(194,186,248,0.2));
            border: 1px solid rgba(128,220,245,0.5);
            color: #A3EDFC;
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
            background: #15101C;
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
            border: 2px solid #80DCF5;
            background: #1C1626;
          }
          .card.highlight::before {
            content: 'ESTILO EXATO DO K/DA';
            position: absolute;
            top: -10px;
            background: linear-gradient(90deg, #80DCF5, #C2BAF8);
            color: #0E0A16;
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
            background-color: #100C16;
            background-image: 
              linear-gradient(45deg, #181220 25%, transparent 25%), 
              linear-gradient(-45deg, #181220 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #181220 75%), 
              linear-gradient(-45deg, transparent 75%, #181220 75%);
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
            color: #80DCF5;
            margin-bottom: 6px;
          }
          .card-desc {
            font-size: 11.5px;
            color: #9E93A0;
            line-height: 1.4;
          }
          .taskbar-mockup-panel {
            background: #15101C;
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
            background: #08060B;
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
            background: #80DCF5;
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
            <div class="title">osu!<span>skills</span> — Estilo Oficial K/DA (Diamante Holográfico)</div>
            <div class="subtitle">Seda iridescente de diamante extraída da arte oficial de K/DA • Sliders limpos sem pontas extras</div>
          </div>
          <div class="badge">Aparência de Diamante • Estilo K/DA</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. K/DA ALL OUT Puro</div>
            <div class="card-sub">Recomendada (Estilo KDA)</div>
            <div class="card-desc">Fundo em Seda de Diamante Holográfica K/DA, com as letras e anel em Preto Obsidiana (#110D18) nítido, exatamente como o logo KDA!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Diamante &amp; Branco</div>
            <div class="card-sub">Seda com Branco Perolado</div>
            <div class="card-desc">Fundo em Seda de Diamante K/DA, com anel e letras em Branco Puro (#FFFFFF) com sombra sutil de profundidade. Visual etéreo!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. K/DA Obsidian Glow</div>
            <div class="card-sub">O Inverso Escuro</div>
            <div class="card-desc">Fundo em Obsidiana profundo (#0E0B14), com anel e letras preenchidos pelo gradiente holográfico de diamante K/DA.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Prisma Vetorial</div>
            <div class="card-sub">Ciano, Lavanda e Obsidiana</div>
            <div class="card-desc">Degradê vetorial geométrico puro (ciano gelo, lavanda e prata) com letras em preto obsidiana marcante.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) no Estilo K/DA Diamante</span>
            <span style="color:#A098A2; font-weight:500;">Brilho iridescente autêntico • Sliders fluidos</span>
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
          <div>Arte de referência: K/DA ALL OUT (Riot Games) • Textura de Seda Holográfica de Diamante</div>
          <div>Geometria: Sliders limpos sem pontas extras (exceto pingo do 'i') • Ícones 100% inteiros e transparentes</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'kda_diamond_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered K/DA diamond comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering K/DA diamond concepts:', err);
    app.quit();
  }
});
