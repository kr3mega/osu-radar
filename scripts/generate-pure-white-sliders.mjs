import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Pure White Slider Glyphs (No numbers, no inner dots, no repeat arrows — pure high-contrast solid white slider geometry)

// 1. Pure White Slider 's'
function renderPureWhiteS(x, y, scale = 1, strokeWidth = 10.5) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- S Slider track with rounded ends -->
      <path d="M 11,-18 C 5,-23 -7,-18 -7,-7 C -7,5 13,1 13,12 C 13,23 0,24 -9,18" 
            fill="none" stroke="#FFFFFF" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Solid White Slider Head Circle -->
      <circle cx="11" cy="-18" r="${strokeWidth * 0.72}" fill="#FFFFFF"/>
      <!-- Solid White Slider Tail Circle -->
      <circle cx="-9" cy="18" r="${strokeWidth * 0.65}" fill="#FFFFFF"/>
    </g>
  `;
}

// 2. Pure White Slider 'k'
function renderPureWhiteK(x, y, scale = 1, strokeWidth = 10.5) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Vertical Stem Slider -->
      <path d="M 0,-22 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <!-- Solid White Stem Head & Tail Bulbs -->
      <circle cx="0" cy="-22" r="${strokeWidth * 0.68}" fill="#FFFFFF"/>
      <circle cx="0" cy="18" r="${strokeWidth * 0.62}" fill="#FFFFFF"/>

      <!-- Chevron Arms Slider -->
      <path d="M 15,-17 L 3,-1 L 15,18" fill="none" stroke="#FFFFFF" stroke-width="${strokeWidth * 0.92}" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="15" cy="-17" r="${strokeWidth * 0.58}" fill="#FFFFFF"/>
      <circle cx="15" cy="18" r="${strokeWidth * 0.58}" fill="#FFFFFF"/>
    </g>
  `;
}

// 3. Pure White Slider 'i'
function renderPureWhiteI(x, y, scale = 1, strokeWidth = 10.5) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Dot: Solid White Hitcircle -->
      <circle cx="0" cy="-21" r="${strokeWidth * 0.75}" fill="#FFFFFF"/>

      <!-- Stem Slider -->
      <path d="M 0,-3 L 0,18" fill="none" stroke="#FFFFFF" stroke-width="${strokeWidth}" stroke-linecap="round"/>
      <circle cx="0" cy="-3" r="${strokeWidth * 0.65}" fill="#FFFFFF"/>
      <circle cx="0" cy="18" r="${strokeWidth * 0.62}" fill="#FFFFFF"/>
    </g>
  `;
}

// 4. Pure White Slider 'l' with curved bottom
function renderPureWhiteL(x, y, scale = 1, strokeWidth = 10.5) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Curved l track -->
      <path d="M 0,-22 L 0,12.5 C 0,17 2.5,18.5 6.5,18.5" 
            fill="none" stroke="#FFFFFF" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Top Bulb -->
      <circle cx="0" cy="-22" r="${strokeWidth * 0.68}" fill="#FFFFFF"/>
      <!-- Curved Tail Bulb -->
      <circle cx="6.5" cy="18.5" r="${strokeWidth * 0.60}" fill="#FFFFFF"/>
    </g>
  `;
}

// Complete "skills" word in pure solid white slider art:
function buildPureWhiteSkillsWord({
  centerX = 175,
  baseY = 232,
  strokeWidth = 10.5,
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
    <g id="pureWhiteSkills">
      ${renderPureWhiteS(x_s1, baseY, scale, strokeWidth)}
      ${renderPureWhiteK(x_k, baseY, scale, strokeWidth)}
      ${renderPureWhiteI(x_i, baseY, scale, strokeWidth)}
      ${renderPureWhiteL(x_l1, baseY, scale, strokeWidth)}
      ${renderPureWhiteL(x_l2, baseY, scale, strokeWidth)}
      ${renderPureWhiteS(x_s2, baseY, scale, strokeWidth)}
    </g>
  `;
}

// Build SVG:
function buildPureWhiteSvg({
  strokeWidth = 10.5,
  scaleOsu = 0.88,
  osuOffsetY = -28,
  skillsBaseY = 232,
  skillsScale = 1.0,
  spreadFactor = 0.90
}) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="1024" height="1024">
    <!-- 1. Circular pink disc (#FF66AB) filling edge-to-edge -->
    <circle cx="175" cy="175" r="150" fill="#FF66AB"/>
    
    <!-- 2. Official crisp white rim -->
    <path d="${RIM_PATH}" fill="#FFFFFF"/>

    <!-- 3. "osu!" Official letters centered -->
    <g transform="translate(175, 175) scale(${scaleOsu}) translate(-175, -175) translate(0, ${osuOffsetY})">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>

    <!-- 4. Pure Solid White Slider Letters -->
    ${buildPureWhiteSkillsWord({
      centerX: 175,
      baseY: skillsBaseY,
      strokeWidth,
      scale: skillsScale,
      spreadFactor
    })}
  </svg>
  `;
}

// 4 Variations of Pure White Sliders:

// Variação 1: "Traço Balanceado (10.5px)" — Recomendada! Super nítida em 32px e 48px
const svgV1 = buildPureWhiteSvg({
  strokeWidth: 10.5,
  scaleOsu: 0.88,
  osuOffsetY: -28,
  skillsBaseY: 232,
  skillsScale: 1.0,
  spreadFactor: 0.90
});

// Variação 2: "Traço Bold Chunky (12px)" — Máxima espessura e punch para quem quer destaque extremo
const svgV2 = buildPureWhiteSvg({
  strokeWidth: 12.0,
  scaleOsu: 0.90,
  osuOffsetY: -28,
  skillsBaseY: 232,
  skillsScale: 1.02,
  spreadFactor: 0.91
});

// Variação 3: "Traço Fino Elegante (9.2px)" — Mais respiro entre as linhas
const svgV3 = buildPureWhiteSvg({
  strokeWidth: 9.2,
  scaleOsu: 0.88,
  osuOffsetY: -28,
  skillsBaseY: 232,
  skillsScale: 0.98,
  spreadFactor: 0.90
});

// Variação 4: "Traço Balanceado com Escala Ampliada (+6%)"
const svgV4 = buildPureWhiteSvg({
  strokeWidth: 11.0,
  scaleOsu: 0.92,
  osuOffsetY: -30,
  skillsBaseY: 234,
  skillsScale: 1.06,
  spreadFactor: 0.88
});

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

    const v1Png = await renderSvg(svgV1, 1024, 1024, 'pure_white_sliders_var1_balanced_1024.png');
    const v1B64 = (await renderSvg(svgV1, 512, 512, 'pure_white_sliders_var1_balanced.png')).toString('base64');
    const v2B64 = (await renderSvg(svgV2, 512, 512, 'pure_white_sliders_var2_chunky.png')).toString('base64');
    const v3B64 = (await renderSvg(svgV3, 512, 512, 'pure_white_sliders_var3_refined.png')).toString('base64');
    const v4B64 = (await renderSvg(svgV4, 512, 512, 'pure_white_sliders_var4_large.png')).toString('base64');

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
            background: rgba(255, 102, 171, 0.2);
            border: 1px solid #FF66AB;
            color: #FF66AB;
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
            /* Checkerboard for transparency */
            background-color: #1a161d;
            background-image: 
              linear-gradient(45deg, #241d27 25%, transparent 25%), 
              linear-gradient(-45deg, #241d27 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #241d27 75%), 
              linear-gradient(-45deg, transparent 75%, #241d27 75%);
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
            <div class="title">osu!<span>skills</span> — Sliders Limpos em Branco Puro (Somente Branco)</div>
            <div class="subtitle">Sem números, sem pontinhos rosa, sem setas • Contraste máximo e leitura cristalina na Taskbar e Desktop</div>
          </div>
          <div class="badge">100% Branco • Nitidez Absoluta</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Balanceado 10.5px</div>
            <div class="card-sub">Recomendada</div>
            <div class="card-desc">Geometria autêntica de trilhos de sliders com extremidades arredondadas em branco puro. Contraste perfeito e zero ruído!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Ultra Bold 12px</div>
            <div class="card-sub">Traço Super Grosso</div>
            <div class="card-desc">Linhas mais espessas que preenchem cada letra com máxima densidade e peso visual, idêntico aos traços do 'osu!'.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Refinado 9.2px</div>
            <div class="card-sub">Traço Leve</div>
            <div class="card-desc">Linhas ligeiramente mais finas, dando mais espaço interno entre as curvas e os braços das letras.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Escala Ampliada</div>
            <div class="card-sub">Presença Marcante (+6%)</div>
            <div class="card-desc">O conjunto inteiro ('osu!' + 'skills') com 6% a mais de escala, ocupando ainda mais o centro com destaque total.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação em Tamanho Real na Barra de Tarefas (32px) e no Desktop (48px)</span>
            <span style="color:#A098A2; font-weight:500;">Zero borrão • Contraste branco/rosa 100% nítido de longe</span>
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
          <div>Geometria de Sliders: Curva S • K em haste e chevron • i em ponto e haste • L com gancho curvo</div>
          <div>Cores: Fundo transparente • Círculo Rosa #FF66AB • Textos e Sliders em Branco Puro #FFFFFF</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'pure_white_sliders_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered pure white sliders comparison board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering pure white sliders:', err);
    app.quit();
  }
});
