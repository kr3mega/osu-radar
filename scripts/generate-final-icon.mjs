import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

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

function renderRepeatArrow(cx, cy, angleDeg = 0, size = 5.5) {
  return `
    <g transform="translate(${cx}, ${cy}) rotate(${angleDeg})">
      <circle cx="0" cy="0" r="${size}" fill="#FFFFFF"/>
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
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      ${renderHitcircle(11, -18, {
        r: 8.0,
        coreFill: '#FF66AB',
        number: comboNum,
        showApproach,
        approachR: 12.8
      })}
      ${showRepeat ? `
        ${renderRepeatArrow(-9, 18, 0, 5.8)}
      ` : `
        <!-- End of Slider Circle (bolinha de finalização) -->
        <g transform="translate(-9, 18)">
          <circle cx="0" cy="0" r="5.6" fill="#FFFFFF"/>
          <circle cx="0" cy="0" r="2.8" fill="#FF66AB"/>
        </g>
      `}
    </g>
  `;
}

// 2. Letter 'k' with repeat arrows and final point
function renderLetterK(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  comboNum = '2'
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth * 0.92}" stroke-linecap="round" stroke-linejoin="round"/>
      ${renderHitcircle(0, -22, { r: 8.0, coreFill: '#FF66AB', number: comboNum })}
      ${renderRepeatArrow(0, 18, 90, 5.6)}
      ${renderRepeatArrow(15, -17, -40, 5.4)}
      <g transform="translate(15, 18)">
        <circle cx="0" cy="0" r="5.8" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="3.2" fill="#FF66AB"/>
      </g>
    </g>
  `;
}

// 3. Letter 'i' with [3] dot and [4] stem
function renderLetterI(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  dotNum = '3',
  stemNum = '4'
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-3 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round"/>
      ${renderHitcircle(0, -21, {
        r: 8.0,
        coreFill: '#FF66AB',
        number: dotNum
      })}
      ${renderHitcircle(0, -3, {
        r: 7.2,
        coreFill: '#FF66AB',
        number: stemNum,
        fontSize: 7.6
      })}
      <g transform="translate(0, 18)">
        <circle cx="0" cy="0" r="5.4" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="2.8" fill="#FF66AB"/>
      </g>
    </g>
  `;
}

// 4. Letter 'l' with curved bottom
function renderLetterL(x, y, {
  scale = 1,
  bodyWidth = 9.5,
  comboNum = '5'
}) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <path d="M 0,-22 L 0,12.5 C 0,17 2.5,18.5 6.5,18.5" 
            fill="none" stroke="#FFFFFF" stroke-width="${bodyWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      ${renderHitcircle(0, -22, {
        r: 8.0,
        coreFill: '#FF66AB',
        number: comboNum
      })}
      <g transform="translate(6.5, 18.5)">
        <circle cx="0" cy="0" r="5.4" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="2.8" fill="#FF66AB"/>
      </g>
    </g>
  `;
}

function buildFinalApprovedSkillsWord({
  centerX = 175,
  baseY = 232,
  bodyWidth = 9.5,
  scale = 1.0,
  spreadFactor = 0.90
}) {
  const x_s1 = centerX - 84 * spreadFactor * scale;
  const x_k  = centerX - 53 * spreadFactor * scale;
  const x_i  = centerX - 15 * spreadFactor * scale;
  const x_l1 = centerX + 13 * spreadFactor * scale;
  const x_l2 = centerX + 43 * spreadFactor * scale;
  const x_s2 = centerX + 84 * spreadFactor * scale;

  return `
    <g id="finalApprovedSkillsWord">
      <!-- [1] s (head 1 with approach circle, end circle at bottom) -->
      ${renderLetterS(x_s1, baseY, { scale, bodyWidth, comboNum: '1', showApproach: true, showRepeat: false })}

      <!-- [2] k (head 2, repeat arrow at bottom stem, repeat arrow at top branch, end circle at bottom branch) -->
      ${renderLetterK(x_k, baseY, { scale, bodyWidth, comboNum: '2' })}

      <!-- [3] i dot & [4] i stem -->
      ${renderLetterI(x_i, baseY, { scale, bodyWidth, dotNum: '3', stemNum: '4' })}

      <!-- [5] l with curved bottom tip -->
      ${renderLetterL(x_l1, baseY, { scale, bodyWidth, comboNum: '5' })}

      <!-- [6] l with curved bottom tip -->
      ${renderLetterL(x_l2, baseY, { scale, bodyWidth, comboNum: '6' })}

      <!-- [7] s (head 7, and END OF SLIDER CIRCLE at tail - bolinha oficial!) -->
      ${renderLetterS(x_s2, baseY, { scale, bodyWidth, comboNum: '7', showApproach: false, showRepeat: false })}
    </g>
  `;
}

// Master Icon SVG:
// The circle diameter is 300 (from 25 to 325 in both X and Y).
// By using viewBox="23 23 304 304", the circle fills 300/304 = 98.7% of the entire icon,
// with a 2px safety margin for smooth anti-aliasing, and 100% TRANSPARENT background outside!
function buildEdgeToEdgeMasterSvg(width = 1024, height = 1024) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="${width}" height="${height}">
    <!-- 1. Circular pink disc (#FF66AB) filling edge-to-edge -->
    <circle cx="175" cy="175" r="150" fill="#FF66AB"/>
    
    <!-- 2. Official crisp white rim -->
    <path d="${RIM_PATH}" fill="#FFFFFF"/>

    <!-- 3. "osu!" Official letters centered -->
    <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>

    <!-- 4. Final approved "skills" combo slider art (with bolinha on 7) -->
    ${buildFinalApprovedSkillsWord({
      centerX: 175,
      baseY: 232,
      bodyWidth: 9.5,
      scale: 1.0,
      spreadFactor: 0.90
    })}
  </svg>
  `;
}

app.whenReady().then(async () => {
  try {
    const finalSvg = buildEdgeToEdgeMasterSvg(1024, 1024);
    const finalSvgPath = path.join(targetDir, 'osu_skills_final_icon.svg');
    fs.writeFileSync(finalSvgPath, finalSvg, 'utf8');
    console.log(`Saved master SVG (edge-to-edge): ${finalSvgPath}`);

    // Create Transparent BrowserWindow for pristine PNG capture
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

    const finalPng1024 = await renderSvg(finalSvg, 1024, 1024, 'osu_skills_final_icon_1024.png');
    const finalPng512 = await renderSvg(finalSvg, 512, 512, 'osu_skills_final_icon.png');
    const v1B64 = finalPng512.toString('base64');

    // Write high-res transparent PNG to public/app.png and dist/app.png
    fs.writeFileSync(path.join(projectDir, 'public', 'app.png'), finalPng512);
    if (fs.existsSync(path.join(projectDir, 'dist'))) {
      fs.writeFileSync(path.join(projectDir, 'dist', 'app.png'), finalPng512);
    }
    console.log(`Copied transparent PNG to public/app.png and dist/app.png`);

    // Create Final Showcase Board
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
            background: rgba(255, 102, 171, 0.2);
            border: 1px solid #FF66AB;
            color: #FF66AB;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
          }
          .main-showcase {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 28px;
            background: #1C171E;
            border: 2px solid #FF66AB;
            border-radius: 14px;
            padding: 24px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          }
          .hero-icon {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            /* Checkerboard pattern to prove 100% transparency outside the circle */
            background-color: #1a161d;
            background-image: 
              linear-gradient(45deg, #241d27 25%, transparent 25%), 
              linear-gradient(-45deg, #241d27 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #241d27 75%), 
              linear-gradient(-45deg, transparent 75%, #241d27 75%);
            background-size: 16px 16px;
            background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
            border-radius: 12px;
            padding: 20px;
          }
          .hero-icon img {
            width: 250px;
            height: 250px;
          }
          .hero-caption {
            font-size: 13px;
            color: #FF66AB;
            font-weight: 800;
            margin-top: 12px;
            letter-spacing: 0.5px;
          }
          .details-panel {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 14px;
          }
          .details-title {
            font-size: 20px;
            font-weight: 800;
            color: #FFFFFF;
          }
          .specs-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 13.5px;
            color: #D6CBD8;
          }
          .specs-list div {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .bullet {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #FF66AB;
            flex-shrink: 0;
          }
          .sizes-strip {
            display: flex;
            align-items: flex-end;
            gap: 20px;
            background: #151117;
            padding: 16px 20px;
            border-radius: 10px;
            margin-top: 6px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .size-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
          }
          .size-label {
            font-size: 11px;
            color: #8C828E;
            font-weight: 600;
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
            <div class="title">osu!<span>skills</span> — Círculo 100% Preenchendo o Ícone (Fundo Transparente)</div>
            <div class="subtitle">Apenas o círculo em PNG puro • Sem bordas ou fundos escuros • Tamanho máximo edge-to-edge</div>
          </div>
          <div class="badge">100% PREENCHIMENTO &amp; TRANSPARÊNCIA</div>
        </div>

        <div class="main-showcase">
          <div class="hero-icon">
            <img src="data:image/png;base64,${v1B64}"/>
            <div class="hero-caption">Círculo Edge-to-Edge (Fundo Transparente)</div>
          </div>
          <div class="details-panel">
            <div class="details-title">Especificações do Ícone Oficial</div>
            <div class="specs-list">
              <div><span class="bullet"></span><span><strong>100% Círculo em PNG:</strong> O círculo preenche quase 100% do canvas do ícone, sem margens pretas.</span></div>
              <div><span class="bullet"></span><span><strong>Fundo Totalmente Transparente:</strong> Sem retângulo de fundo, integrando-se perfeitamente à barra de tarefas e área de trabalho.</span></div>
              <div><span class="bullet"></span><span><strong>Slider 7 com Bolinha Final:</strong> Conclusão perfeita do combo com o círculo oficial.</span></div>
              <div><span class="bullet"></span><span><strong>Visual Gigante e Nítido:</strong> Otimizado para legibilidade máxima em 16px, 24px, 32px e 48px.</span></div>
            </div>

            <div class="sizes-strip">
              <div class="size-item">
                <img src="data:image/png;base64,${v1B64}" style="width: 64px; height: 64px;"/>
                <span class="size-label">64px</span>
              </div>
              <div class="size-item">
                <img src="data:image/png;base64,${v1B64}" style="width: 48px; height: 48px;"/>
                <span class="size-label">48px</span>
              </div>
              <div class="size-item">
                <img src="data:image/png;base64,${v1B64}" style="width: 32px; height: 32px;"/>
                <span class="size-label">32px (Taskbar)</span>
              </div>
              <div class="size-item">
                <img src="data:image/png;base64,${v1B64}" style="width: 24px; height: 24px;"/>
                <span class="size-label">24px</span>
              </div>
              <div class="size-item">
                <img src="data:image/png;base64,${v1B64}" style="width: 16px; height: 16px;"/>
                <span class="size-label">16px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Visualização em Tamanho Real na Barra de Tarefas do Windows (32px)</span>
            <span style="color:#A098A2; font-weight:500;">Círculo grande e imponente • Perfeita silhueta osu!</span>
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

            <!-- osu!skills Final App Icon -->
            <div class="tb-icon active">
              <img src="data:image/png;base64,${v1B64}"/>
            </div>

            <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
          </div>
        </div>

        <div class="footer">
          <div>Fundo 100% transparente (Alpha 0) • Cores: #FF66AB e #FFFFFF</div>
          <div>Compilado: public/app.ico (256, 128, 64, 48, 32, 24, 16px)</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'osu_skills_final_showcase_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered final showcase board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering final icon:', err);
    app.quit();
  }
});
