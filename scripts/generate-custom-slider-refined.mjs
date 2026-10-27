import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Helper: render in-game osu! hitcircle
function renderHitcircle(cx, cy, {
  r = 8,
  fill = '#FFFFFF',
  coreFill = '#FF66AB',
  number = null,
  showApproach = false,
  approachR = 12.5,
  fontSize = null
}) {
  const fSize = fontSize || (r * 1.08);
  return `
    <g transform="translate(${cx}, ${cy})">
      ${showApproach ? `
        <circle cx="0" cy="0" r="${approachR}" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.9" stroke-dasharray="2.5,2"/>
      ` : ''}
      <circle cx="0" cy="0" r="${r}" fill="${fill}"/>
      ${coreFill ? `
        <circle cx="0" cy="0" r="${r * 0.72}" fill="${coreFill}"/>
      ` : ''}
      ${number !== null ? `
        <text x="0" y="${r * 0.36}" font-family="'Torus', 'Aller', 'Segoe UI', system-ui, sans-serif" font-size="${fSize}" font-weight="900" fill="#FFFFFF" text-anchor="middle">${number}</text>
      ` : ''}
    </g>
  `;
}

// Helper: render osu! Repeat Arrow inside a circle or standalone
function renderRepeatArrow(cx, cy, angleDeg = 0, size = 5.5) {
  return `
    <g transform="translate(${cx}, ${cy}) rotate(${angleDeg})">
      <circle cx="0" cy="0" r="${size}" fill="#FFFFFF"/>
      <!-- Repeat Triangle pointing to the left (180deg default) -->
      <polygon points="${size*0.35},-${size*0.42} -${size*0.45},0 ${size*0.35},${size*0.42}" fill="#FF66AB"/>
    </g>
  `;
}

// 1. Slider 's'
function renderLetterS(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  comboNum = '1',
  showApproach = true,
  showRepeat = false
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- S Slider track -->
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Head with combo number -->
      ${renderHitcircle(11, -18, {
        r: 8.0,
        coreFill: '#FF66AB',
        number: comboNum,
        showApproach,
        approachR: 12.8
      })}

      <!-- Tail -->
      ${showRepeat ? `
        ${renderRepeatArrow(-9, 18, 0, 5.8)}
      ` : `
        <g transform="translate(-9, 18)">
          <circle cx="0" cy="0" r="5.6" fill="#FFFFFF"/>
          <circle cx="0" cy="0" r="2.8" fill="#FF66AB"/>
        </g>
      `}
    </g>
  `;
}

// 2. Letter 'k' as requested:
// - Top stem: Hitcircle head [2]
// - Bottom stem: Repeat arrow pointing up! (No pink dot)
// - Junction to upper branch: tip has Repeat arrow pointing down-left! (No pink dot)
// - Junction to lower branch: tip has the SLIDER END CIRCLE (marked in red square with pink dot)!
function renderLetterK(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  comboNum = '2'
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Stem Vertical Slider track -->
      <path d="M 0,-22 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>

      <!-- Arms Chevron Slider track -->
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth * 0.92}" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- 1. Top stem: Hitcircle Head with Combo '2' -->
      ${renderHitcircle(0, -22, { r: 8.0, coreFill: '#FF66AB', number: comboNum })}

      <!-- 2. Bottom stem: Repeat Arrow pointing UP (no pink dot!) -->
      ${renderRepeatArrow(0, 18, 90, 5.6)}

      <!-- 3. Upper branch tip: Repeat Arrow pointing DOWN-LEFT (no pink dot!) -->
      ${renderRepeatArrow(15, -17, -40, 5.4)}

      <!-- 4. Lower branch tip: The FINAL SLIDER END POINT (white circle with pink core dot) -->
      <g transform="translate(15, 18)">
        <circle cx="0" cy="0" r="5.8" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="3.2" fill="#FF66AB"/>
      </g>
    </g>
  `;
}

// 3. Letter 'i':
// - Dot: Hitcircle [3]
// - Stem: Slider starting with Hitcircle Head [4], sliding down to tail circle
function renderLetterI(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  dotNum = '3',
  stemNum = '4'
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Stem Straight Slider track: from (0, -3) to (0, 18) -->
      <path d="M 0,-3 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>

      <!-- Dot of 'i': Hitcircle [3] -->
      ${renderHitcircle(0, -21, {
        r: 8.0,
        coreFill: '#FF66AB',
        number: dotNum
      })}

      <!-- Head of Stem Slider: Hitcircle [4] -->
      ${renderHitcircle(0, -3, {
        r: 7.2,
        coreFill: '#FF66AB',
        number: stemNum,
        fontSize: 7.6
      })}

      <!-- Tail of Stem Slider -->
      <g transform="translate(0, 18)">
        <circle cx="0" cy="0" r="5.4" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="2.8" fill="#FF66AB"/>
      </g>
    </g>
  `;
}

// 4. Letter 'l':
// - Top: Hitcircle head with combo number
// - Track: vertical with bottom tip curved to the right (as in user's image 3)
// - Tail: slider end circle with pink center
function renderLetterL(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  comboNum = '5'
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Curved l slider track -->
      <path d="M 0,-22 L 0,12.5 C 0,17 2.5,18.5 6.5,18.5" 
            fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Head with combo number -->
      ${renderHitcircle(0, -22, {
        r: 8.0,
        coreFill: '#FF66AB',
        number: comboNum
      })}

      <!-- Curved Tail end circle with pink dot -->
      <g transform="translate(6.5, 18.5)">
        <circle cx="0" cy="0" r="5.4" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="2.8" fill="#FF66AB"/>
      </g>
    </g>
  `;
}

// Build the requested word "skills":
function buildRequestedSkillsWord({
  centerX = 175,
  baseY = 246,
  bodyWidth = 9.5,
  scale = 1.0,
  showFollowPoints = false
}) {
  // Balanced letter horizontal offsets relative to centerX:
  // s: -84, k: -53, i: -15, l1: +12, l2: +42, s2: +84
  const x_s1 = centerX - 84 * scale;
  const x_k  = centerX - 53 * scale;
  const x_i  = centerX - 15 * scale;
  const x_l1 = centerX + 13 * scale;
  const x_l2 = centerX + 43 * scale;
  const x_s2 = centerX + 84 * scale;

  return `
    <g id="skillsComboWord">
      ${showFollowPoints ? `
        <line x1="${x_s1 - 9 * scale}" y1="${baseY + 18 * scale}" x2="${x_k}" y2="${baseY - 22 * scale}" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,3" stroke-opacity="0.4" stroke-linecap="round"/>
        <line x1="${x_k + 15 * scale}" y1="${baseY + 18 * scale}" x2="${x_i}" y2="${baseY - 21 * scale}" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,3" stroke-opacity="0.4" stroke-linecap="round"/>
        <line x1="${x_i}" y1="${baseY + 18 * scale}" x2="${x_l1}" y2="${baseY - 22 * scale}" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,3" stroke-opacity="0.4" stroke-linecap="round"/>
        <line x1="${x_l1 + 6.5 * scale}" y1="${baseY + 18.5 * scale}" x2="${x_l2}" y2="${baseY - 22 * scale}" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,3" stroke-opacity="0.4" stroke-linecap="round"/>
        <line x1="${x_l2 + 6.5 * scale}" y1="${baseY + 18.5 * scale}" x2="${x_s2 + 11 * scale}" y2="${baseY - 18 * scale}" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,3" stroke-opacity="0.4" stroke-linecap="round"/>
      ` : ''}

      <!-- [1] s -->
      ${renderLetterS(x_s1, baseY, { scale, bodyWidth, comboNum: '1', showApproach: true, showRepeat: false })}

      <!-- [2] k (Repeat arrows at bottom of stem and top branch; end circle at bottom branch) -->
      ${renderLetterK(x_k, baseY, { scale, bodyWidth, comboNum: '2' })}

      <!-- [3] i dot & [4] i stem -->
      ${renderLetterI(x_i, baseY, { scale, bodyWidth, dotNum: '3', stemNum: '4' })}

      <!-- [5] l with curved bottom tip -->
      ${renderLetterL(x_l1, baseY, { scale, bodyWidth, comboNum: '5' })}

      <!-- [6] l with curved bottom tip -->
      ${renderLetterL(x_l2, baseY, { scale, bodyWidth, comboNum: '6' })}

      <!-- [7] s with repeat arrow at tail -->
      ${renderLetterS(x_s2, baseY, { scale, bodyWidth, comboNum: '7', showApproach: false, showRepeat: true })}
    </g>
  `;
}

// Assemble full icon SVG with tunable osu! offset and skills vertical positioning
function buildExactIconSvg({
  scaleOsu = 0.88,
  osuOffsetY = -42,
  skillsBaseY = 244,
  skillsScale = 1.0,
  bodyWidth = 9.5,
  showFollowPoints = false
}) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <filter id="cDropFinal" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
      </filter>
    </defs>

    <g transform="translate(81, 81)">
      <!-- 1. Circular pink disc (#FF66AB) -->
      <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#cDropFinal)"/>
      <path d="${RIM_PATH}" fill="#FFFFFF"/>

      <!-- 2. "osu!" Official letters centered in upper area -->
      <g transform="translate(175, 175) scale(${scaleOsu}) translate(-175, -175) translate(0, ${osuOffsetY})">
        <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
      </g>

      <!-- 3. The exact requested "skills" Combo Slider Art centered with harmonious spacing -->
      ${buildRequestedSkillsWord({
        centerX: 175,
        baseY: skillsBaseY,
        bodyWidth,
        scale: skillsScale,
        showFollowPoints
      })}
    </g>
  </svg>
  `;
}

// 4 Calibrated Spacing/Sizing Variations for the user to review:

// Variação 1: "Espaçamento Equilibrado (Recomendada)"
// Distância harmoniosa de 32px abaixo de 'osu!' e 34px acima da borda branca inferior. Perfeitamente centrado!
const svgVar1 = buildExactIconSvg({
  scaleOsu: 0.88,
  osuOffsetY: -42,
  skillsBaseY: 242,
  skillsScale: 1.0,
  bodyWidth: 9.5,
  showFollowPoints: false
});

// Variação 2: "Com Follow Points Pontilhados"
// Idêntica à Var 1, porém com as linhas pontilhadas de follow points do osu! guiando 1..7!
const svgVar2 = buildExactIconSvg({
  scaleOsu: 0.88,
  osuOffsetY: -42,
  skillsBaseY: 242,
  skillsScale: 1.0,
  bodyWidth: 9.5,
  showFollowPoints: true
});

// Variação 3: "Espaçamento Amplo (Mais Separado do osu!)"
// 'osu!' ligeiramente mais alto (-46) e 'skills' em Y=246, dando máximo respiro entre as duas linhas!
const svgVar3 = buildExactIconSvg({
  scaleOsu: 0.86,
  osuOffsetY: -46,
  skillsBaseY: 246,
  skillsScale: 0.98,
  bodyWidth: 9.2,
  showFollowPoints: false
});

// Variação 4: "Max Taskbar 10.2px (Traço Ultra-Encorpado)"
// Traços de 10.2px com escala 1.02 para máxima presença e impacto na barra de tarefas!
const svgVar4 = buildExactIconSvg({
  scaleOsu: 0.90,
  osuOffsetY: -40,
  skillsBaseY: 242,
  skillsScale: 1.02,
  bodyWidth: 10.2,
  showFollowPoints: false
});

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#1E1B1E',
      webPreferences: { offscreen: true }
    });

    const renderSvgToPng = async (svgStr, filename) => {
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
      await win.loadURL(dataUri);
      await new Promise(r => setTimeout(r, 150));
      const image = await win.webContents.capturePage();
      const outPath = path.join(targetDir, filename);
      fs.writeFileSync(outPath, image.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
      return image.toPNG().toString('base64');
    };

    const v1B64 = await renderSvgToPng(svgVar1, 'skills_custom_slider_var1_balanced.png');
    const v2B64 = await renderSvgToPng(svgVar2, 'skills_custom_slider_var2_followpoints.png');
    const v3B64 = await renderSvgToPng(svgVar3, 'skills_custom_slider_var3_wide_gap.png');
    const v4B64 = await renderSvgToPng(svgVar4, 'skills_custom_slider_var4_max_taskbar.png');

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
            background: #141115;
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
            border-bottom: 2px solid #2A242C;
            padding-bottom: 14px;
          }
          .title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .title span { color: #FF66AB; }
          .subtitle {
            font-size: 14px;
            color: #B5AAB6;
            margin-top: 4px;
          }
          .badge {
            background: rgba(255, 102, 171, 0.15);
            border: 1px solid rgba(255, 102, 171, 0.4);
            color: #FF66AB;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 700;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
          .card {
            background: #1C171E;
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
            border: 2px solid #FF66AB;
            background: #221A25;
          }
          .card.highlight::before {
            content: 'RECOMENDADA';
            position: absolute;
            top: -10px;
            background: #FF66AB;
            color: #FFFFFF;
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
            filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
          }
          .icon-wrap img { width: 100%; height: 100%; }
          .card-title {
            font-size: 16px;
            font-weight: 800;
            color: #FFFFFF;
            margin-bottom: 3px;
          }
          .card-sub {
            font-size: 12px;
            font-weight: 700;
            color: #FF66AB;
            margin-bottom: 6px;
          }
          .card-desc {
            font-size: 11.5px;
            color: #9E93A0;
            line-height: 1.4;
          }
          .taskbar-mockup-panel {
            background: #1A161C;
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
            background: #FF66AB;
            border-radius: 2px;
          }
          .tb-icon img {
            width: 28px;
            height: 28px;
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
            <div class="title">osu!<span>skills</span> — Combo Slider Art com Modificações Solicitadas</div>
            <div class="subtitle">K com setas de retorno • i com combo 3 e 4 • L curvados na ponta • Centralização e espaçamento calibrados</div>
          </div>
          <div class="badge">Combo 1..7 • Todas as Alterações Aplicadas</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Equilibrada</div>
            <div class="card-sub">Recomendada</div>
            <div class="card-desc">Espaçamento harmônico de 32px abaixo de 'osu!', K com setas de retorno e ponto final, i com notas 3 e 4, L entortados e S final com repeat arrow!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Com Follow Points</div>
            <div class="card-sub">Linhas Guia Pontilhadas</div>
            <div class="card-desc">Adiciona os follow points originais do jogo conectando a sequência inteira do combo de 1 até 7.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Espaçamento Amplo</div>
            <div class="card-sub">Respiro Extra Superior</div>
            <div class="card-desc">'osu!' ligeiramente mais no topo e 'skills' com mais folga visual entre os dois blocos.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Max Taskbar 10.2px</div>
            <div class="card-sub">Traço Ultra-Encorpado</div>
            <div class="card-desc">Sliders com 10.2px de espessura para máxima visibilidade e contraste mesmo em tamanhos pequenos de 24px/32px.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) com Todas as Correções</span>
            <span style="color:#A098A2; font-weight:500;">Perfeita proporção • 100% Mecânica do osu!</span>
          </div>
          <div class="taskbar-strip">
            <div class="tb-dummy" style="background:#0078D4; border-radius:4px;"></div>
            <div class="tb-dummy" style="background:#4285F4; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#F2C811; border-radius:4px;"></div>
            
            <!-- osu! Original -->
            <div class="tb-icon">
              <div style="width:28px; height:28px; border-radius:50%; background:#FF66AB; border:2px solid #FFF; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; color:#FFF;">osu!</div>
            </div>

            <div style="width:1px; height:24px; background:rgba(255,255,255,0.15); margin:0 4px;"></div>

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
          <div>Sequência: [1] s → [2] k (multi-repeat) → [3] i (dot) → [4] i (stem) → [5] l (curvo) → [6] l (curvo) → [7] s (repeat)</div>
          <div>Cores oficiais: Rosa #FF66AB e Branco #FFFFFF • Formato 100% Círculo Oficial</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'skills_custom_slider_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered custom slider comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering custom slider:', err);
    app.quit();
  }
});
