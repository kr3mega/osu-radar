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

// Clean Slider Glyphs (No dots on ends, smooth stroke-linecap round, dot of 'i' is clean solid circle)
function renderCleanSliderS(x, y, scale = 1, strokeWidth = 11, stroke = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

function renderCleanSliderK(x, y, scale = 1, strokeWidth = 11, stroke = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth * 0.94}" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;
}

function renderCleanSliderI(x, y, scale = 1, strokeWidth = 11, stroke = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <circle cx="0" cy="-21" r="${strokeWidth * 0.72}" fill="${stroke}"/>
      <path d="M 0,-3 L 0,18" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>
  `;
}

function renderCleanSliderL(x, y, scale = 1, strokeWidth = 11, stroke = '#FFFFFF') {
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
  strokeWidth = 11.2,
  scale = 1.0,
  spreadFactor = 0.90,
  stroke = '#FFFFFF'
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

const COMMON_DEFS = `
  <defs>
    <!-- Deep Obsidian Disc Background -->
    <radialGradient id="kdaObsidianDark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1A1524"/>
      <stop offset="75%" stop-color="#0E0B14"/>
      <stop offset="100%" stop-color="#07050A"/>
    </radialGradient>

    <!-- Obsidian Velvet (Pitch Black Center with Midnight Violet Edge) -->
    <radialGradient id="kdaObsidianVelvet" cx="50%" cy="45%" r="52%">
      <stop offset="0%" stop-color="#15101E"/>
      <stop offset="85%" stop-color="#09070D"/>
      <stop offset="100%" stop-color="#050308"/>
    </radialGradient>

    <!-- Variation 1: Vector Prism Grad (userSpaceOnUse so all lines and curves render perfectly) -->
    <linearGradient id="prismGrad" gradientUnits="userSpaceOnUse" x1="45" y1="45" x2="305" y2="305">
      <stop offset="0%" stop-color="#80DCF5"/>    <!-- Luminous Icy Cyan -->
      <stop offset="25%" stop-color="#C2BAF8"/>   <!-- Soft Periwinkle Lavender -->
      <stop offset="50%" stop-color="#FFFFFF"/>   <!-- High Diamond Glint -->
      <stop offset="72%" stop-color="#9EE4F5"/>   <!-- Sky Aqua -->
      <stop offset="100%" stop-color="#D7CAFD"/>  <!-- Pearlescent Violet Opal -->
    </linearGradient>

    <!-- Variation 2: Crystalline Faceted Glint (Extra white diamond sparkles & high contrast) -->
    <linearGradient id="crystallineGrad" gradientUnits="userSpaceOnUse" x1="50" y1="35" x2="300" y2="315">
      <stop offset="0%" stop-color="#6FE3FA"/>
      <stop offset="18%" stop-color="#FFFFFF"/>
      <stop offset="38%" stop-color="#B8AEF8"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="68%" stop-color="#7EE7F8"/>
      <stop offset="84%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#D2BFFC"/>
    </linearGradient>

    <!-- Variation 3: Authentic K/DA Diamond Silk Texture Pattern -->
    <pattern id="kdaSilkFill" patternUnits="userSpaceOnUse" width="304" height="304" x="23" y="23">
      <image href="${kdaB64}" x="-120" y="-30" width="600" height="360" preserveAspectRatio="xMidYMid slice"/>
    </pattern>

    <!-- Variation 4: Opal Diamond (Soft pastel cyan, peach glint, and lavender diamond) -->
    <linearGradient id="opalDiamondGrad" gradientUnits="userSpaceOnUse" x1="30" y1="50" x2="320" y2="300">
      <stop offset="0%" stop-color="#A5ECFD"/>
      <stop offset="30%" stop-color="#EBE5FC"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="70%" stop-color="#BAF2FD"/>
      <stop offset="100%" stop-color="#DFD2FD"/>
    </linearGradient>

    <!-- Subtle Luminous Glow for Variation 4 -->
    <filter id="diamondNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#80DCF5" flood-opacity="0.45"/>
      <feDropShadow dx="0" dy="0" stdDeviation="7.5" flood-color="#C2BAF8" flood-opacity="0.30"/>
    </filter>
  </defs>
`;

// 4 Variations of Dark Background + Diamond Elements:

// 1. Prisma K/DA Clássico (Recomendado)
const svgDark1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${COMMON_DEFS}
  <!-- Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaObsidianDark)"/>
  
  <!-- Outer Rim in Prism Diamond -->
  <path d="${RIM_PATH}" fill="url(#prismGrad)"/>

  <!-- "osu!" in Prism Diamond -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="url(#prismGrad)"/>
  </g>

  <!-- "skills" Clean Sliders in Prism Diamond -->
  ${buildCleanSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: 'url(#prismGrad)'
  })}
</svg>
`;

// 2. Diamante Cristalino (Facetas com Brilho Especular Branco Intenso)
const svgDark2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${COMMON_DEFS}
  <!-- Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaObsidianVelvet)"/>
  
  <!-- Outer Rim in Crystalline Diamond -->
  <path d="${RIM_PATH}" fill="url(#crystallineGrad)"/>

  <!-- "osu!" in Crystalline Diamond -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="url(#crystallineGrad)"/>
  </g>

  <!-- "skills" Clean Sliders in Crystalline Diamond -->
  ${buildCleanSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: 'url(#crystallineGrad)'
  })}
</svg>
`;

// 3. Seda K/DA Autêntica (A textura original da Riot recortada nos elementos)
const svgDark3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${COMMON_DEFS}
  <!-- Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaObsidianDark)"/>
  
  <!-- Outer Rim in Authentic K/DA Silk -->
  <path d="${RIM_PATH}" fill="url(#kdaSilkFill)"/>

  <!-- "osu!" in Authentic K/DA Silk -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="url(#kdaSilkFill)"/>
  </g>

  <!-- "skills" Clean Sliders in Authentic K/DA Silk -->
  ${buildCleanSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: 'url(#kdaSilkFill)'
  })}
</svg>
`;

// 4. Diamante Aura Neon (Com halo luminoso sutil em volta dos elementos)
const svgDark4 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  ${COMMON_DEFS}
  <!-- Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#kdaObsidianDark)"/>
  
  <g filter="url(#diamondNeonGlow)">
    <!-- Outer Rim -->
    <path d="${RIM_PATH}" fill="url(#opalDiamondGrad)"/>

    <!-- "osu!" -->
    <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
      <path d="${OSU_TEXT_PATH}" fill="url(#opalDiamondGrad)"/>
    </g>

    <!-- "skills" Clean Sliders -->
    ${buildCleanSkillsWord({
      centerX: 175,
      baseY: 232,
      strokeWidth: 11.2,
      scale: 1.0,
      spreadFactor: 0.90,
      stroke: 'url(#opalDiamondGrad)'
    })}
  </g>
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

    // Render 1024 master and 512 previews for all 4
    await renderSvg(svgDark1, 1024, 1024, 'dark_kda_var1_prism_1024.png');
    const v1B64 = (await renderSvg(svgDark1, 512, 512, 'dark_kda_var1_prism.png')).toString('base64');

    await renderSvg(svgDark2, 1024, 1024, 'dark_kda_var2_crystalline_1024.png');
    const v2B64 = (await renderSvg(svgDark2, 512, 512, 'dark_kda_var2_crystalline.png')).toString('base64');

    await renderSvg(svgDark3, 1024, 1024, 'dark_kda_var3_silk_1024.png');
    const v3B64 = (await renderSvg(svgDark3, 512, 512, 'dark_kda_var3_silk.png')).toString('base64');

    await renderSvg(svgDark4, 1024, 1024, 'dark_kda_var4_aura_1024.png');
    const v4B64 = (await renderSvg(svgDark4, 512, 512, 'dark_kda_var4_aura.png')).toString('base64');

    // Also copy var1 to project dist/public for master icon compilation
    fs.writeFileSync(path.join(projectDir, 'public', 'dark_kda_master.png'), fs.readFileSync(path.join(targetDir, 'dark_kda_var1_prism_1024.png')));

    // Render Comparison Board
    const boardWin = new BrowserWindow({
      width: 1200,
      height: 940,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#09070E',
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
            background: #08060C;
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
            border-bottom: 2px solid #201A2A;
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
            background: #130F1A;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            position: relative;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          }
          .card.highlight {
            border: 2px solid #80DCF5;
            background: #191424;
          }
          .card.highlight::before {
            content: 'RECOMENDADA • PURO K/DA';
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
            background-color: #0C0912;
            background-image: 
              linear-gradient(45deg, #151020 25%, transparent 25%), 
              linear-gradient(-45deg, #151020 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #151020 75%), 
              linear-gradient(-45deg, transparent 75%, #151020 75%);
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
            background: #130F1A;
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
            background: #060408;
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
            <div class="title">osu!<span>skills</span> — Fundo Escuro com Diamante K/DA</div>
            <div class="subtitle">Fundo Obsidiana Profundo • Elementos em Gradiente Diamante Holográfico (Ciano, Lavanda e Prata)</div>
          </div>
          <div class="badge">K/DA ALL OUT • Fundo Escuro</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Prisma K/DA Puro</div>
            <div class="card-sub">Recomendada (Oficial)</div>
            <div class="card-desc">Fundo Obsidiana Profundo (#0E0B14) com anel e sliders no degradê contínuo ciano gelo, lavanda e glint branco diamante.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Diamante Cristalino</div>
            <div class="card-sub">Brilho Especular Intenso</div>
            <div class="card-desc">Fundo preto veludo (#09070D) com múltiplos flashes brancos (#FFFFFF) cruzando as letras, como facetas de um diamante lapidado.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Seda K/DA Original</div>
            <div class="card-sub">Textura da Riot Games</div>
            <div class="card-desc">As letras e o anel recortam a textura real de seda holográfica da arte oficial K/DA ALL OUT. Estilo idêntico ao wallpaper!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Diamante Aura Neon</div>
            <div class="card-sub">Halo Luminoso Suave</div>
            <div class="card-desc">Degradê diamante com glow ciano e lavanda etéreo que faz o anel e as letras flutuarem sobre o fundo escuro.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) com Fundo Escuro</span>
            <span style="color:#A098A2; font-weight:500;">Contraste perfeito • Sliders 100% legíveis sem pontas extras</span>
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
          <div>Arte de referência: K/DA ALL OUT (Riot Games) • Fundo Escuro + Elementos Diamante</div>
          <div>Geometria: Sliders limpos sem pontas extras (exceto pingo do 'i') • Ícone 100% inteiro e transparente fora da borda</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'dark_kda_diamond_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered dark K/DA diamond comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering dark K/DA diamond concepts:', err);
    app.quit();
  }
});
