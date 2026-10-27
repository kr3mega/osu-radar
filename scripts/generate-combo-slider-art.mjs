import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Helper: render an in-game osu! hitcircle (used for heads, notes, and ticks)
function renderHitcircle(cx, cy, {
  r = 8,
  fill = '#FFFFFF',
  coreFill = '#FF66AB',
  stroke = 'none',
  strokeWidth = 0,
  number = null,
  showApproach = false,
  approachR = 12.5,
  fontSize = null
}) {
  const fSize = fontSize || (r * 1.05);
  return `
    <g transform="translate(${cx}, ${cy})">
      ${showApproach ? `
        <circle cx="0" cy="0" r="${approachR}" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.85" stroke-dasharray="2.5,2"/>
      ` : ''}
      <circle cx="0" cy="0" r="${r}" fill="${fill}" ${stroke !== 'none' ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : ''}/>
      ${coreFill ? `
        <circle cx="0" cy="0" r="${r * 0.72}" fill="${coreFill}"/>
      ` : ''}
      ${number !== null ? `
        <text x="0" y="${r * 0.35}" font-family="'Torus', 'Aller', 'Segoe UI', system-ui, sans-serif" font-size="${fSize}" font-weight="900" fill="#FFFFFF" text-anchor="middle">${number}</text>
      ` : ''}
    </g>
  `;
}

// 1. Slider 's'
function renderSliderS(x, y, {
  scale = 1,
  bodyWidth = 8,
  bodyFill = 'solid', // 'solid' or 'translucent'
  comboNum = null,
  showRepeat = true,
  hasTick = true
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Outer Slider Path -->
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      ${bodyFill === 'translucent' ? `
        <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
              fill="none" stroke="#FF66AB" stroke-width="${bodyWidth * 0.46}" stroke-linecap="round" stroke-linejoin="round"/>
      ` : ''}
      ${hasTick ? `
        <!-- Slider Tick in middle of path -->
        <circle cx="3" cy="2.5" r="1.8" fill="#FFFFFF" opacity="0.9"/>
      ` : ''}
      <!-- Slider Head -->
      ${renderHitcircle(11, -18, { r: 7.5, coreFill: '#FF66AB', number: comboNum })}
      <!-- Slider Tail -->
      <g transform="translate(-9, 18)">
        <circle cx="0" cy="0" r="5.5" fill="#FFFFFF"/>
        ${showRepeat ? `
          <!-- osu! Repeat Arrow -->
          <polygon points="1.8,-2.2 -1.8,0 1.8,2.2" fill="#FF66AB"/>
        ` : `
          <circle cx="0" cy="0" r="2.5" fill="#FF66AB"/>
        `}
      </g>
    </g>
  `;
}

// 2. Pure Sliders & Circles 'k'
function renderSliderK(x, y, {
  scale = 1,
  bodyWidth = 8,
  bodyFill = 'solid',
  stemComboNum = null,
  hasTick = true
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Stem Vertical Slider: from (0, -22) to (0, 18) -->
      <path d="M 0,-22 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>
      ${bodyFill === 'translucent' ? `
        <path d="M 0,-22 L 0,18" fill="none" stroke="#FF66AB" stroke-width="${bodyWidth * 0.46}" stroke-linecap="round"/>
      ` : ''}
      ${hasTick ? `
        <circle cx="0" cy="-2" r="1.8" fill="#FFFFFF" opacity="0.9"/>
      ` : ''}
      <!-- Stem Head Hitcircle (top) -->
      ${renderHitcircle(0, -22, { r: 7.5, coreFill: '#FF66AB', number: stemComboNum })}
      <!-- Stem Tail Circle (bottom) -->
      ${renderHitcircle(0, 18, { r: 4.8, coreFill: '#FF66AB' })}

      <!-- Arms Chevron Slider: from top-right (15, -17) through (3, -1) to bottom-right (15, 18) -->
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth * 0.88}" stroke-linecap="round" stroke-linejoin="round"/>
      ${bodyFill === 'translucent' ? `
        <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="#FF66AB" stroke-width="${bodyWidth * 0.42}" stroke-linecap="round" stroke-linejoin="round"/>
      ` : ''}
      <!-- Upper Arm Circle node -->
      ${renderHitcircle(15, -17, { r: 5.2, coreFill: '#FF66AB' })}
      <!-- Lower Arm Circle node -->
      ${renderHitcircle(15, 18, { r: 5.0, coreFill: '#FF66AB' })}
    </g>
  `;
}

// 3. Pure Hitcircle & Slider 'i'
function renderSliderI(x, y, {
  scale = 1,
  bodyWidth = 8,
  bodyFill = 'solid',
  comboNum = '3',
  showApproach = true,
  hasTick = true
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Stem Straight Slider: from (0, -3) to (0, 18) -->
      <path d="M 0,-3 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>
      ${bodyFill === 'translucent' ? `
        <path d="M 0,-3 L 0,18" fill="none" stroke="#FF66AB" stroke-width="${bodyWidth * 0.46}" stroke-linecap="round"/>
      ` : ''}
      ${hasTick ? `
        <circle cx="0" cy="7.5" r="1.6" fill="#FFFFFF" opacity="0.9"/>
      ` : ''}
      <!-- Stem Head Circle -->
      ${renderHitcircle(0, -3, { r: 5.2, coreFill: '#FF66AB' })}
      <!-- Stem Tail Circle -->
      ${renderHitcircle(0, 18, { r: 4.8, coreFill: '#FF66AB' })}

      <!-- The Hitcircle Note as the Dot! -->
      ${renderHitcircle(0, -21, {
        r: 8.5,
        coreFill: '#FF66AB',
        number: comboNum,
        showApproach,
        approachR: 12.8
      })}
    </g>
  `;
}

// 4. Pure Straight Slider 'l'
function renderSliderL(x, y, {
  scale = 1,
  bodyWidth = 8,
  bodyFill = 'solid',
  comboNum = null,
  curveBottom = false,
  hasTick = true
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      ${curveBottom ? `
        <path d="M 0,-22 L 0,13 C 0,17.5 2.5,18.5 6,18.5" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round" stroke-linejoin="round"/>
        ${bodyFill === 'translucent' ? `
          <path d="M 0,-22 L 0,13 C 0,17.5 2.5,18.5 6,18.5" fill="none" stroke="#FF66AB" stroke-width="${bodyWidth * 0.46}" stroke-linecap="round" stroke-linejoin="round"/>
        ` : ''}
        ${hasTick ? `
          <circle cx="0" cy="-2" r="1.8" fill="#FFFFFF" opacity="0.9"/>
        ` : ''}
        ${renderHitcircle(0, -22, { r: 7.5, coreFill: '#FF66AB', number: comboNum })}
        ${renderHitcircle(6, 18.5, { r: 4.8, coreFill: '#FF66AB' })}
      ` : `
        <path d="M 0,-22 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>
        ${bodyFill === 'translucent' ? `
          <path d="M 0,-22 L 0,18" fill="none" stroke="#FF66AB" stroke-width="${bodyWidth * 0.46}" stroke-linecap="round"/>
        ` : ''}
        ${hasTick ? `
          <circle cx="0" cy="-2" r="1.8" fill="#FFFFFF" opacity="0.9"/>
        ` : ''}
        ${renderHitcircle(0, -22, { r: 7.5, coreFill: '#FF66AB', number: comboNum })}
        ${renderHitcircle(0, 18, { r: 4.8, coreFill: '#FF66AB' })}
      `}
    </g>
  `;
}

// Helper: In-game Follow Points (dashed connector lines between consecutive combo objects)
function renderFollowPoints(x1, y1, x2, y2) {
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
          stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,3" stroke-opacity="0.45" stroke-linecap="round"/>
  `;
}

// Assemble the 100% Beatmap Combo Slider Art for "skills"
function buildFullComboSliderArt({
  baseY = 246,
  bodyWidth = 8.5,
  bodyFill = 'solid',
  curveL = false,
  showFollowPoints = true,
  hasTick = true,
  approachOnOne = true
}) {
  const x_s1 = 82;
  const x_k  = 116;
  const x_i  = 150;
  const x_l1 = 178;
  const x_l2 = 206;
  const x_s2 = 240;

  return `
    <g id="comboSliderArt">
      ${showFollowPoints ? `
        <!-- Follow Points connecting combo 1 -> 2 -> 3 -> 4 -> 5 -> 6 -->
        ${renderFollowPoints(x_s1 - 9, baseY + 18, x_k, baseY - 22)}
        ${renderFollowPoints(x_k + 15, baseY + 18, x_i, baseY - 21)}
        ${renderFollowPoints(x_i, baseY + 18, x_l1, baseY - 22)}
        ${renderFollowPoints(x_l1, baseY + 18, x_l2, baseY - 22)}
        ${renderFollowPoints(x_l2, baseY + 18, x_s2 + 11, baseY - 18)}
      ` : ''}

      <!-- 1. 's' with Combo Note 1 (Active Approach Circle) -->
      ${renderSliderS(x_s1, baseY, {
        scale: 1.02,
        bodyWidth,
        bodyFill,
        comboNum: '1',
        showRepeat: false,
        hasTick
      })}
      ${approachOnOne ? `
        <!-- Approach ring on Note 1 head -->
        <circle cx="${x_s1 + 11 * 1.02}" cy="${baseY - 18 * 1.02}" r="12" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-opacity="0.9" stroke-dasharray="2.5,2"/>
      ` : ''}

      <!-- 2. 'k' with Combo Note 2 on stem head -->
      ${renderSliderK(x_k, baseY, {
        scale: 1.02,
        bodyWidth,
        bodyFill,
        stemComboNum: '2',
        hasTick
      })}

      <!-- 3. 'i' with Combo Note 3 on hitcircle dot -->
      ${renderSliderI(x_i, baseY, {
        scale: 1.02,
        bodyWidth,
        bodyFill,
        comboNum: '3',
        showApproach: false,
        hasTick
      })}

      <!-- 4. 'l' with Combo Note 4 on top head -->
      ${renderSliderL(x_l1, baseY, {
        scale: 1.02,
        bodyWidth,
        bodyFill,
        comboNum: '4',
        curveBottom: curveL,
        hasTick
      })}

      <!-- 5. 'l' with Combo Note 5 on top head -->
      ${renderSliderL(x_l2, baseY, {
        scale: 1.02,
        bodyWidth,
        bodyFill,
        comboNum: '5',
        curveBottom: curveL,
        hasTick
      })}

      <!-- 6. 's' with Combo Note 6 on head + Reverse Repeat Arrow at tail -->
      ${renderSliderS(x_s2, baseY, {
        scale: 1.02,
        bodyWidth,
        bodyFill,
        comboNum: '6',
        showRepeat: true,
        hasTick
      })}
    </g>
  `;
}

// 4 Variations of the User's Vision:

// Variation A: "Authentic Combo Stream" (Solid white sliders + Combo 1..6 + Follow Points) — Recomendada!
const iconVarA = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="cDropA" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
  </defs>
  <g transform="translate(81, 81)">
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#cDropA)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>
    <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -36)">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>
    ${buildFullComboSliderArt({
      baseY: 246,
      bodyWidth: 8.5,
      bodyFill: 'solid',
      curveL: false,
      showFollowPoints: true,
      hasTick: true,
      approachOnOne: true
    })}
  </g>
</svg>
`;

// Variation B: "In-Game Translucent Shader" (Trilho com miolo rosa + Follow Points + Combo 1..6)
const iconVarB = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="cDropB" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
  </defs>
  <g transform="translate(81, 81)">
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#cDropB)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>
    <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -36)">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>
    ${buildFullComboSliderArt({
      baseY: 246,
      bodyWidth: 9.0,
      bodyFill: 'translucent',
      curveL: false,
      showFollowPoints: true,
      hasTick: true,
      approachOnOne: true
    })}
  </g>
</svg>
`;

// Variation C: "Curved 'l' Organic Combo" (Bases arredondadas estilo caligrafia de beatmap)
const iconVarC = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="cDropC" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
  </defs>
  <g transform="translate(81, 81)">
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#cDropC)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>
    <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -36)">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>
    ${buildFullComboSliderArt({
      baseY: 246,
      bodyWidth: 8.5,
      bodyFill: 'solid',
      curveL: true,
      showFollowPoints: true,
      hasTick: true,
      approachOnOne: true
    })}
  </g>
</svg>
`;

// Variation D: "Chunky Taskbar Combo" (Traços mais grossos sem follow points para leitura máxima em 24px/32px)
const iconVarD = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="cDropD" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
    </filter>
  </defs>
  <g transform="translate(81, 81)">
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#cDropD)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>
    <g transform="translate(175, 175) scale(0.90) translate(-175, -175) translate(0, -38)">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>
    ${buildFullComboSliderArt({
      baseY: 246,
      bodyWidth: 9.8,
      bodyFill: 'solid',
      curveL: false,
      showFollowPoints: false,
      hasTick: false,
      approachOnOne: true
    })}
  </g>
</svg>
`;

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

    const v1B64 = await renderSvgToPng(iconVarA, 'combo_slider_art_var1_stream.png');
    const v2B64 = await renderSvgToPng(iconVarB, 'combo_slider_art_var2_translucent.png');
    const v3B64 = await renderSvgToPng(iconVarC, 'combo_slider_art_var3_curved_l.png');
    const v4B64 = await renderSvgToPng(iconVarD, 'combo_slider_art_var4_taskbar_chunky.png');

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
            <div class="title">osu!<span>skills</span> — Combo Slider Art Autêntico (1 ao 6)</div>
            <div class="subtitle">Slider Art completa em sequência de combo • Follow points pontilhados conectando 1 → 2 → 3 → 4 → 5 → 6</div>
          </div>
          <div class="badge">Combo Completo 1..6 • Slider Art</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Combo Stream Puro</div>
            <div class="card-sub">Recomendada</div>
            <div class="card-desc">Combo 1..6 nas notas, anel de aproximação no 1, follow points conectando os objetos e seta de retorno no 6!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. In-Game Shaders</div>
            <div class="card-sub">Trilhos com Miolo Rosa</div>
            <div class="card-desc">Todos os corpos dos sliders possuem o preenchimento translúcido característico do jogo, com slider ticks visíveis.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Curva Orgânica no 'l'</div>
            <div class="card-sub">Sliders com Base Estilizada</div>
            <div class="card-desc">Os dois sliders das letras 'l' terminam com uma suave curva, conferindo um fluxo contínuo e rítmico à palavra.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Foco na Taskbar</div>
            <div class="card-sub">Traço Grosso de Alto Contraste</div>
            <div class="card-desc">Sem follow points e com traços mais encorpados, otimizado para legibilidade instantânea em 24px/32px na barra de tarefas.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) com Combo Slider Art</span>
            <span style="color:#A098A2; font-weight:500;">Padrão 100% jogável do osu! • Zero confusão com Mania</span>
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
          <div>Sequência: [1] s (slider) → [2] k (slider) → [3] i (hitcircle) → [4] l (slider) → [5] l (slider) → [6] s (slider + repeat)</div>
          <div>Cores oficiais: Rosa #FF66AB e Branco #FFFFFF • Formato 100% Círculo Oficial</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'combo_slider_art_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered combo slider art comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering combo slider art:', err);
    app.quit();
  }
});
