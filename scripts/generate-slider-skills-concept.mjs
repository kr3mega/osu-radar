import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Function to construct a slider 's' SVG glyph
// It's an S-curve path with an osu! slider head (circle) at the start
function createSliderS(x, y, scale = 1, showHeadDot = true) {
  // S-shaped slider curve centered around (x, y)
  // Height approx 42px, width approx 28px
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Outer/Inner Slider Track Path -->
      <path d="M 22,-18 C 12,-24 0,-18 0,-8 C 0,4 24,0 24,12 C 24,22 10,24 0,18" 
            fill="none" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Slider Head Hitcircle (Circle with inner ring/dot at the top start) -->
      <circle cx="22" cy="-18" r="7" fill="#FFFFFF"/>
      ${showHeadDot ? `<circle cx="22" cy="-18" r="3" fill="#FF66AB"/>` : ''}
      <!-- Slider End Circle -->
      <circle cx="0" cy="18" r="5" fill="#FFFFFF"/>
    </g>
  `;
}

// Function to construct the letter 'i' with a hitcircle as the dot!
function createHitcircleI(x, y, scale = 1, showNumberOne = true) {
  return `
    <g transform="translate(${x}, ${y}) scale(${scale})">
      <!-- Stem of the letter 'i' -->
      <rect x="-4" y="-4" width="8" height="28" rx="4" fill="#FFFFFF"/>
      
      <!-- Hitcircle as the dot of the 'i' -->
      <g transform="translate(0, -18)">
        <!-- Outer Approach Ring -->
        <circle cx="0" cy="0" r="11" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="2,2" opacity="0.8"/>
        <!-- Solid Hitcircle Body -->
        <circle cx="0" cy="0" r="8" fill="#FFFFFF"/>
        <!-- Number 1 inside the hitcircle in pink! -->
        ${showNumberOne ? `
          <text x="0" y="3.2" font-family="'Torus', 'Aller', 'Segoe UI', system-ui, sans-serif" font-size="9" font-weight="900" fill="#FF66AB" text-anchor="middle">1</text>
        ` : `
          <circle cx="0" cy="0" r="3" fill="#FF66AB"/>
        `}
      </g>
    </g>
  `;
}

// Full "skills" word crafted with Sliders for 's' and Hitcircle for 'i'
function createCustomSkillsWord({
  startX = 70,
  baseY = 246,
  sliderScale = 0.95,
  showHeadDot = true,
  showNumberOne = true
}) {
  // Let's place letters horizontally:
  // s (slider) -> k -> i (hitcircle) -> l -> l -> s (slider)
  return `
    <g id="customSkills">
      <!-- 1st 's' as a Slider -->
      ${createSliderS(startX + 8, baseY - 6, sliderScale, showHeadDot)}

      <!-- 'k' in Torus font -->
      <text x="${startX + 48}" y="${baseY + 8}" font-family="'Torus', 'Aller', 'Comfortaa', sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle">k</text>

      <!-- 'i' with Hitcircle Dot (and number 1) -->
      ${createHitcircleI(startX + 82, baseY - 4, sliderScale, showNumberOne)}

      <!-- 1st 'l' -->
      <text x="${startX + 114}" y="${baseY + 8}" font-family="'Torus', 'Aller', 'Comfortaa', sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle">l</text>

      <!-- 2nd 'l' -->
      <text x="${startX + 144}" y="${baseY + 8}" font-family="'Torus', 'Aller', 'Comfortaa', sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle">l</text>

      <!-- 2nd 's' as a Slider -->
      ${createSliderS(startX + 180, baseY - 6, sliderScale, showHeadDot)}
    </g>
  `;
}

// Build the full icon with osu! on top and the custom gameplay "skills" word below
function buildCustomGameplayIcon({
  scaleOsu = 0.88,
  osuOffsetY = -36,
  skillsBaseY = 244,
  startX = 70,
  sliderScale = 0.95,
  showHeadDot = true,
  showNumberOne = true
}) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <filter id="gameplayDrop" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.4"/>
      </filter>
    </defs>

    <g transform="translate(81, 81)">
      <!-- 1. Main circular pink disc -->
      <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#gameplayDrop)"/>
      <path d="${RIM_PATH}" fill="#FFFFFF"/>

      <!-- 2. "osu!" Big and Bold in the upper section with generous breathing room -->
      <g transform="translate(175, 175) scale(${scaleOsu}) translate(-175, -175) translate(0, ${osuOffsetY})">
        <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
      </g>

      <!-- 3. Custom "skills" word in the lower section (Sliders for 's', Hitcircle 1 for 'i') -->
      ${createCustomSkillsWord({
        startX,
        baseY: skillsBaseY,
        sliderScale,
        showHeadDot,
        showNumberOne
      })}
    </g>
  </svg>
  `;
}

// 4 Variations of the User's Gameplay Sliders Idea:

// Var 1: "Gameplay Puro (Hitcircle 1 + Sliders com Cabeça)" - A mais fiel à ideia!
const v1 = buildCustomGameplayIcon({
  scaleOsu: 0.88,
  osuOffsetY: -36,
  skillsBaseY: 242,
  startX: 70,
  sliderScale: 0.95,
  showHeadDot: true,
  showNumberOne: true
});

// Var 2: "Hitcircle com Anel de Aproximação" (Número 1 bem visível)
const v2 = buildCustomGameplayIcon({
  scaleOsu: 0.85,
  osuOffsetY: -38,
  skillsBaseY: 244,
  startX: 68,
  sliderScale: 1.02,
  showHeadDot: true,
  showNumberOne: true
});

// Var 3: "Sliders Minimalistas" (Sliders mais limpos e grossos para taskbar)
const v3 = buildCustomGameplayIcon({
  scaleOsu: 0.90,
  osuOffsetY: -35,
  skillsBaseY: 242,
  startX: 72,
  sliderScale: 0.92,
  showHeadDot: false,
  showNumberOne: true
});

// Var 4: "Max Legibilidade Taskbar" (Elementos ampliados)
const v4 = buildCustomGameplayIcon({
  scaleOsu: 0.88,
  osuOffsetY: -38,
  skillsBaseY: 246,
  startX: 66,
  sliderScale: 1.05,
  showHeadDot: true,
  showNumberOne: true
});

const items = [
  { name: 'gameplay_skills_var1_classic.png', svg: v1 },
  { name: 'gameplay_skills_var2_approach.png', svg: v2 },
  { name: 'gameplay_skills_var3_minimal_sliders.png', svg: v3 },
  { name: 'gameplay_skills_var4_max_taskbar.png', svg: v4 },
];

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      transparent: true,
      webPreferences: { backgroundThrottling: false }
    });

    for (const it of items) {
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:512px;height:512px;overflow:hidden;">${it.svg}</body></html>`;
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(r => setTimeout(r, 150));
      const img = await win.webContents.capturePage();
      const outPath = path.join(targetDir, it.name);
      fs.writeFileSync(outPath, img.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    }

    // Render comparison board with Windows Taskbar Simulation
    const boardWin = new BrowserWindow({
      width: 1240,
      height: 800,
      show: false,
      backgroundColor: '#120E12',
      webPreferences: { backgroundThrottling: false }
    });

    const v1B64 = fs.readFileSync(path.join(targetDir, 'gameplay_skills_var1_classic.png')).toString('base64');
    const v2B64 = fs.readFileSync(path.join(targetDir, 'gameplay_skills_var2_approach.png')).toString('base64');
    const v3B64 = fs.readFileSync(path.join(targetDir, 'gameplay_skills_var3_minimal_sliders.png')).toString('base64');
    const v4B64 = fs.readFileSync(path.join(targetDir, 'gameplay_skills_var4_max_taskbar.png')).toString('base64');

    const boardHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family:'Torus', 'Comfortaa', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body {
            background: linear-gradient(180deg, #161216 0%, #0E0B0E 100%);
            color: #FFFFFF;
            width: 1240px;
            height: 800px;
            padding: 30px 40px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid rgba(255, 102, 171, 0.2);
            padding-bottom: 12px;
          }
          .title { font-size: 26px; font-weight: 800; color: #FFFFFF; }
          .title span { color: #FF66AB; }
          .subtitle { font-size: 13px; color: #A098A2; font-weight: 500; }
          .badge {
            background: rgba(255, 102, 171, 0.15);
            color: #FF66AB;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin: 14px 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 16px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .card.highlight {
            border-color: rgba(255, 102, 171, 0.6);
            background: rgba(255, 102, 171, 0.06);
            box-shadow: 0 0 20px rgba(255, 102, 171, 0.15);
          }
          .icon-wrap {
            width: 124px;
            height: 124px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
          }
          .icon-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45));
          }
          .card-title {
            font-size: 14px;
            font-weight: 800;
            color: #FFFFFF;
            margin-bottom: 2px;
          }
          .card-sub {
            font-size: 10px;
            color: #FF66AB;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .card-desc {
            font-size: 11px;
            color: #A99EA8;
            line-height: 1.35;
          }
          .taskbar-mockup-panel {
            background: rgba(20, 16, 22, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 14px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .taskbar-title {
            font-size: 11px;
            font-weight: 800;
            color: #FF66AB;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            justify-content: space-between;
          }
          .taskbar-strip {
            height: 52px;
            background: rgba(30, 26, 32, 0.85);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            padding: 0 16px;
          }
          .tb-icon {
            width: 38px;
            height: 38px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .tb-icon.active {
            background: rgba(255, 102, 171, 0.22);
            border-bottom: 2px solid #FF66AB;
          }
          .tb-icon img {
            width: 32px;
            height: 32px;
            object-fit: contain;
          }
          .tb-dummy {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            opacity: 0.45;
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
            <div class="title">osu!<span>skills</span> — Sliders como 'S' e Hitcircle (1) no Pingo do 'i'</div>
            <div class="subtitle">A essência pura da gameplay de osu! standard incorporada na palavra 'skills'</div>
          </div>
          <div class="badge">Sua Nova Ideia • 100% Gameplay Standard</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Clássica (Recomendada)</div>
            <div class="card-sub">Hitcircle 1 + Sliders</div>
            <div class="card-desc">Os dois 's' em curva de slider com cabeça redonda; pingo do 'i' como um hitcircle com número 1 em rosa!</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Com Anel de Ritmo</div>
            <div class="card-sub">Approach Circle no 'i'</div>
            <div class="card-desc">O pingo do 'i' ganha um anel de aproximação pontilhado em volta do hitcircle 1, destacando a mecânica de timing.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. Sliders Puros</div>
            <div class="card-sub">Traço Sólido</div>
            <div class="card-desc">Sliders mais grossos e sem o ponto interno na cabeça, otimizados para máxima legibilidade rápida de longe.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Max Taskbar</div>
            <div class="card-sub">Escala Expandida</div>
            <div class="card-desc">Elementos em escala 1.05 para leitura ainda mais encorpada na barra de tarefas do Windows.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação na Barra de Tarefas (32px) com Sliders e Hitcircle</span>
            <span style="color:#A098A2; font-weight:500;">Zero confusão com Mania • 100% osu! Standard</span>
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

            <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
          </div>
        </div>

        <div class="footer">
          <div>Elementos da Gameplay: 's' = Slider em curva • Pingo do 'i' = Hitcircle com o número '1' • 'k', 'l', 'l' = Tipografia Torus</div>
          <div>Cores padronizadas: Rosa #FF66AB e Branco #FFFFFF • Formato 100% Círculo Oficial</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'gameplay_skills_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered gameplay skills board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering gameplay skills:', err);
    app.quit();
  }
});
