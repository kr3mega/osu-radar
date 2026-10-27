import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Slider Glyphs supporting stroke/fill color customization:
function renderCustomColorS(x, y, scale = 1, strokeWidth = 10.5, color = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="11" cy="-18" r="${strokeWidth * 0.72}" fill="${color}"/>
      <circle cx="-9" cy="18" r="${strokeWidth * 0.65}" fill="${color}"/>
    </g>
  `;
}

function renderCustomColorK(x, y, scale = 1, strokeWidth = 10.5, color = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,18" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <circle cx="0" cy="-22" r="${strokeWidth * 0.68}" fill="${color}"/>
      <circle cx="0" cy="18" r="${strokeWidth * 0.62}" fill="${color}"/>
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="${color}" stroke-width="${strokeWidth * 0.92}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="15" cy="-17" r="${strokeWidth * 0.58}" fill="${color}"/>
      <circle cx="15" cy="18" r="${strokeWidth * 0.58}" fill="${color}"/>
    </g>
  `;
}

function renderCustomColorI(x, y, scale = 1, strokeWidth = 10.5, color = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <circle cx="0" cy="-21" r="${strokeWidth * 0.75}" fill="${color}"/>
      <path d="M 0,-3 L 0,18" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <circle cx="0" cy="-3" r="${strokeWidth * 0.65}" fill="${color}"/>
      <circle cx="0" cy="18" r="${strokeWidth * 0.62}" fill="${color}"/>
    </g>
  `;
}

function renderCustomColorL(x, y, scale = 1, strokeWidth = 10.5, color = '#FFFFFF') {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,12.5 C 0,17 2.5,18.5 6.5,18.5" 
            fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="0" cy="-22" r="${strokeWidth * 0.68}" fill="${color}"/>
      <circle cx="6.5" cy="18.5" r="${strokeWidth * 0.60}" fill="${color}"/>
    </g>
  `;
}

function buildCustomColorSkillsWord({
  centerX = 175,
  baseY = 232,
  strokeWidth = 10.5,
  scale = 1.0,
  spreadFactor = 0.90,
  color = '#FFFFFF'
}) {
  const x_s1 = centerX - 84 * spreadFactor * scale;
  const x_k  = centerX - 53 * spreadFactor * scale;
  const x_i  = centerX - 15 * spreadFactor * scale;
  const x_l1 = centerX + 13 * spreadFactor * scale;
  const x_l2 = centerX + 43 * spreadFactor * scale;
  const x_s2 = centerX + 84 * spreadFactor * scale;

  return `
    <g id="colorSkillsWord">
      ${renderCustomColorS(x_s1, baseY, scale, strokeWidth, color)}
      ${renderCustomColorK(x_k, baseY, scale, strokeWidth, color)}
      ${renderCustomColorI(x_i, baseY, scale, strokeWidth, color)}
      ${renderCustomColorL(x_l1, baseY, scale, strokeWidth, color)}
      ${renderCustomColorL(x_l2, baseY, scale, strokeWidth, color)}
      ${renderCustomColorS(x_s2, baseY, scale, strokeWidth, color)}
    </g>
  `;
}

// Common Diamond Gradient Defs
const DIAMOND_DEFS = `
  <defs>
    <!-- 1. Diagonal Diamond Prism / Opal Spectrum (sampled from reference) -->
    <linearGradient id="diamondPrism" x1="15%" y1="90%" x2="85%" y2="10%">
      <stop offset="0%" stop-color="#EED5B3"/>    <!-- Champagne Peach Gold -->
      <stop offset="25%" stop-color="#FFA8DC"/>   <!-- Opal Rose Pink -->
      <stop offset="50%" stop-color="#F2E6FC"/>   <!-- Pearlescent White Diamond -->
      <stop offset="72%" stop-color="#C29BFF"/>   <!-- Lilac Amethyst -->
      <stop offset="100%" stop-color="#8FE8FF"/>  <!-- Sky Opal Cyan -->
    </linearGradient>

    <!-- 2. Richer Multi-Angle Diamond Specular -->
    <linearGradient id="diamondSheen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#99E8FF"/>    <!-- Cyan Top Left -->
      <stop offset="30%" stop-color="#D9B7FF"/>   <!-- Violet -->
      <stop offset="55%" stop-color="#FFFFFF"/>   <!-- High Diamond Glint -->
      <stop offset="75%" stop-color="#FFB0E0"/>   <!-- Soft Pink -->
      <stop offset="100%" stop-color="#FFDEAF"/>  <!-- Golden Champagne -->
    </linearGradient>

    <!-- 3. Obsidian Background for contrast (as in reference image) -->
    <radialGradient id="obsidianBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#24192F"/>
      <stop offset="85%" stop-color="#140F1B"/>
      <stop offset="100%" stop-color="#0E0A13"/>
    </radialGradient>

    <!-- 4. Deep Violet-Blue Velvet Base -->
    <linearGradient id="velvetBase" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#2B1A3A"/>
      <stop offset="50%" stop-color="#1E122B"/>
      <stop offset="100%" stop-color="#110A1A"/>
    </linearGradient>

    <!-- 5. Diamond Rim Gradient -->
    <linearGradient id="rimDiamond" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFDCB8"/>
      <stop offset="35%" stop-color="#FFFFFF"/>
      <stop offset="65%" stop-color="#B894FF"/>
      <stop offset="100%" stop-color="#80E3FF"/>
    </linearGradient>

    <!-- Soft glow filter -->
    <filter id="diamondGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
`;

// Variation 1: "Full Diamond Disc" (O círculo principal é o Diamante Prismático, com textos e borda em branco puro de alto contraste)
const svgDiamondVar1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="1024" height="1024">
  ${DIAMOND_DEFS}
  <!-- 1. Diamond Prismatic Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#diamondPrism)"/>
  
  <!-- 2. Crisp White Rim with subtle opacity -->
  <path d="${RIM_PATH}" fill="#FFFFFF"/>

  <!-- 3. osu! Letters in Deep Obsidian Velvet for stunning contrast on diamond -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="#1D1226"/>
  </g>

  <!-- 4. skills Slider Art in Deep Obsidian Velvet -->
  ${buildCustomColorSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 10.5,
    scale: 1.0,
    spreadFactor: 0.90,
    color: '#1D1226'
  })}
</svg>
`;

// Variation 2: "Obsidian & Diamond (Estilo Exato da Imagem de Referência)"
// Fundo escuro obsidiana + Anel e letras em Diamante Prismático reluzente!
const svgDiamondVar2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="1024" height="1024">
  ${DIAMOND_DEFS}
  <!-- 1. Deep Obsidian Velvet Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#obsidianBg)"/>
  
  <!-- 2. Diamond Prismatic Rim -->
  <path d="${RIM_PATH}" fill="url(#rimDiamond)"/>

  <!-- 3. osu! in Diamond Prism -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="url(#diamondSheen)"/>
  </g>

  <!-- 4. skills Slider Art in Diamond Prism with subtle glow -->
  <g filter="url(#diamondGlow)">
    ${buildCustomColorSkillsWord({
      centerX: 175,
      baseY: 232,
      strokeWidth: 10.5,
      scale: 1.0,
      spreadFactor: 0.90,
      color: 'url(#diamondPrism)'
    })}
  </g>
</svg>
`;

// Variation 3: "Diamond Cookie (Biscoito Diamante com Letras Brancas Puras)"
// O fundo é o espectro suave de diamante, e as letras e a borda são branco puro brilhante com sombra sutil!
const svgDiamondVar3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="1024" height="1024">
  ${DIAMOND_DEFS}
  <!-- 1. Soft Opal Diamond Disc -->
  <circle cx="175" cy="175" r="150" fill="url(#diamondSheen)"/>
  
  <!-- Subtle inner radial gradient for depth and focus -->
  <circle cx="175" cy="175" r="148" fill="#FFFFFF" opacity="0.18"/>
  <circle cx="175" cy="175" r="148" fill="#8F56B0" opacity="0.12"/>

  <!-- 2. Pure White Rim -->
  <path d="${RIM_PATH}" fill="#FFFFFF"/>

  <!-- 3. osu! in Pure White with soft drop shadow for readability -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)" filter="drop-shadow(0 2px 5px rgba(50,20,70,0.35))">
    <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
  </g>

  <!-- 4. skills Slider Art in Pure White with soft shadow -->
  <g filter="drop-shadow(0 2px 5px rgba(50,20,70,0.35))">
    ${buildCustomColorSkillsWord({
      centerX: 175,
      baseY: 232,
      strokeWidth: 10.5,
      scale: 1.0,
      spreadFactor: 0.90,
      color: '#FFFFFF'
    })}
  </g>
</svg>
`;

// Variation 4: "Osu! Rose Diamond (Fundo Rosa Clássico com Diamante nos Glifos e Anel)"
// Mantém a inconfundível cor oficial rosa do jogo (#FF66AB), mas o anel e as letras são puro Diamante Prismático!
const svgDiamondVar4 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="1024" height="1024">
  ${DIAMOND_DEFS}
  <!-- 1. Official Pink Disc (#FF66AB) with subtle rich depth -->
  <circle cx="175" cy="175" r="150" fill="#FF5EA8"/>
  
  <!-- 2. Diamond Prismatic Rim -->
  <path d="${RIM_PATH}" fill="url(#diamondPrism)"/>

  <!-- 3. osu! Letters in Diamond Prism -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="url(#diamondSheen)"/>
  </g>

  <!-- 4. skills Slider Art in Diamond Prism -->
  ${buildCustomColorSkillsWord({
    centerX: 175,
    baseY: 232,
    strokeWidth: 10.5,
    scale: 1.0,
    spreadFactor: 0.90,
    color: 'url(#diamondPrism)'
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
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
      await win.loadURL(dataUri);
      await new Promise(r => setTimeout(r, 180));
      const image = await win.webContents.capturePage();
      const outPath = path.join(targetDir, filename);
      fs.writeFileSync(outPath, image.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
      return image.toPNG();
    };

    const v1B64 = (await renderSvg(svgDiamondVar1, 512, 512, 'diamond_var1_full_disc.png')).toString('base64');
    const v2B64 = (await renderSvg(svgDiamondVar2, 512, 512, 'diamond_var2_obsidian_reference.png')).toString('base64');
    const v3B64 = (await renderSvg(svgDiamondVar3, 512, 512, 'diamond_var3_opal_white.png')).toString('base64');
    const v4B64 = (await renderSvg(svgDiamondVar4, 512, 512, 'diamond_var4_pink_diamond.png')).toString('base64');

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
            background: #100C13;
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
            border-bottom: 2px solid #281F2F;
            padding-bottom: 14px;
          }
          .title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .title span {
            background: linear-gradient(90deg, #EED5B3, #FFA8DC, #C29BFF, #8FE8FF);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 14px;
            color: #B5AAB6;
            margin-top: 4px;
          }
          .badge {
            background: linear-gradient(135deg, rgba(238,213,179,0.2), rgba(194,155,255,0.2));
            border: 1px solid rgba(194,155,255,0.5);
            color: #DAB9FF;
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
            background: #18121E;
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
            border: 2px solid #C29BFF;
            background: #1F1628;
          }
          .card.highlight::before {
            content: 'ESTILO DA REFERÊNCIA';
            position: absolute;
            top: -10px;
            background: linear-gradient(90deg, #B983FF, #8FE8FF);
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
            background-color: #140E19;
            background-image: 
              linear-gradient(45deg, #1C1523 25%, transparent 25%), 
              linear-gradient(-45deg, #1C1523 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #1C1523 75%), 
              linear-gradient(-45deg, transparent 75%, #1C1523 75%);
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
            color: #C29BFF;
            margin-bottom: 6px;
          }
          .card-desc {
            font-size: 11.5px;
            color: #9E93A0;
            line-height: 1.4;
          }
          .taskbar-mockup-panel {
            background: #18121E;
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
            background: #0D0B0E;
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
            background: #C29BFF;
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
            <div class="title">osu!<span>skills</span> — Espectro de Cores em Diamante Prismático</div>
            <div class="subtitle">Espectro iridescente: Champanhe Dourado • Rosa Opala • Lilás Ametista • Ciano Céu</div>
          </div>
          <div class="badge">Novo Estudo de Cores • Diamante Prismático</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">1. Obsidiana &amp; Diamante</div>
            <div class="card-sub">Estilo da sua Imagem</div>
            <div class="card-desc">Fundo escuro obsidiana (#161320), com anel e letras no gradiente diamante brilhante da sua referência. Visual ultra-premium!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">2. Disco Diamante Puro</div>
            <div class="card-sub">Biscoito em Prisma</div>
            <div class="card-desc">O círculo inteiro é o diamante iridescente, com letras e borda em contraste escuro elegante de alta legibilidade.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Diamante com Branco</div>
            <div class="card-sub">Opal Shimmer</div>
            <div class="card-desc">Fundo em espectro de diamante brilhante, com anel e letras em branco puro reluzente com sombra de profundidade.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Rosa &amp; Diamante</div>
            <div class="card-sub">Identidade osu! + Diamante</div>
            <div class="card-desc">Mantém o icônico rosa oficial (#FF66AB) no fundo, aplicando o gradiente diamante brilhante no anel e nas letras!</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) com o Espectro em Diamante</span>
            <span style="color:#A098A2; font-weight:500;">Gradientes sutis • Elegância iridescente</span>
          </div>
          <div class="taskbar-strip">
            <div class="tb-dummy" style="background:#0078D4; border-radius:4px;"></div>
            <div class="tb-dummy" style="background:#4285F4; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#F2C811; border-radius:4px;"></div>
            
            <!-- Variação 1 (Obsidian Diamond) -->
            <div class="tb-icon active">
              <img src="data:image/png;base64,${v2B64}"/>
            </div>

            <!-- Variação 2 (Full Diamond Disc) -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v1B64}"/>
            </div>

            <!-- Variação 3 (Opal White) -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v3B64}"/>
            </div>

            <!-- Variação 4 (Pink + Diamond) -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v4B64}"/>
            </div>

            <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
          </div>
        </div>

        <div class="footer">
          <div>Espectro: #EED5B3 (Champanhe) → #FFA8DC (Opala) → #C29BFF (Lilás) → #8FE8FF (Ciano)</div>
          <div>Geometria preservada: Sliders orgânicos limpos • Círculo Edge-to-Edge transparente</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'diamond_spectrum_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered diamond spectrum comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering diamond concepts:', err);
    app.quit();
  }
});
