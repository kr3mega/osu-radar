import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

function renderCleanSliderS_Abs(x, y, scale = 1, strokeWidth = 11, stroke = '#FF66AA') {
  const p1x = (x + 11 * scale).toFixed(1);
  const p1y = (y - 18 * scale).toFixed(1);
  const c1x = (x + 5 * scale).toFixed(1);
  const c1y = (y - 23 * scale).toFixed(1);
  const c2x = (x - 7 * scale).toFixed(1);
  const c2y = (y - 18 * scale).toFixed(1);
  const p2x = (x - 7 * scale).toFixed(1);
  const p2y = (y - 7 * scale).toFixed(1);

  const c3x = (x - 7 * scale).toFixed(1);
  const c3y = (y + 5 * scale).toFixed(1);
  const c4x = (x + 13 * scale).toFixed(1);
  const c4y = (y + 1 * scale).toFixed(1);
  const p3x = (x + 13 * scale).toFixed(1);
  const p3y = (y + 12 * scale).toFixed(1);

  const c5x = (x + 13 * scale).toFixed(1);
  const c5y = (y + 23 * scale).toFixed(1);
  const c6x = (x + 0 * scale).toFixed(1);
  const c6y = (y + 24 * scale).toFixed(1);
  const p4x = (x - 9 * scale).toFixed(1);
  const p4y = (y + 18 * scale).toFixed(1);

  return `<path d="M ${p1x},${p1y} C ${c1x},${c1y} ${c2x},${c2y} ${p2x},${p2y} C ${c3x},${c3y} ${c4x},${c4y} ${p3x},${p3y} C ${c5x},${c5y} ${c6x},${c6y} ${p4x},${p4y}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderCleanSliderK_Abs(x, y, scale = 1, strokeWidth = 11, stroke = '#FF66AA') {
  const x0 = x.toFixed(1);
  const yTop = (y - 22 * scale).toFixed(1);
  const yBot = (y + 18 * scale).toFixed(1);

  const armTopX = (x + 15 * scale).toFixed(1);
  const armTopY = (y - 17 * scale).toFixed(1);
  const armMidX = (x + 3 * scale).toFixed(1);
  const armMidY = (y - 1 * scale).toFixed(1);
  const armBotX = (x + 15 * scale).toFixed(1);
  const armBotY = (y + 18 * scale).toFixed(1);

  return `
    <path d="M ${x0},${yTop} L ${x0},${yBot}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="M ${armTopX},${armTopY} L ${armMidX},${armMidY} L ${armBotX},${armBotY}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth * 0.94}" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function renderCleanSliderI_Abs(x, y, scale = 1, strokeWidth = 11, stroke = '#FF66AA') {
  const x0 = x.toFixed(1);
  const dotY = (y - 21 * scale).toFixed(1);
  const stemTopY = (y - 3 * scale).toFixed(1);
  const stemBotY = (y + 18 * scale).toFixed(1);
  const r = (strokeWidth * 0.72).toFixed(1);

  return `
    <circle cx="${x0}" cy="${dotY}" r="${r}" fill="${stroke}"/>
    <path d="M ${x0},${stemTopY} L ${x0},${stemBotY}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  `;
}

function renderCleanSliderL_Abs(x, y, scale = 1, strokeWidth = 11, stroke = '#FF66AA') {
  const x0 = x.toFixed(1);
  const yTop = (y - 22 * scale).toFixed(1);
  const yCurveStart = (y + 12.5 * scale).toFixed(1);
  const c1x = x0;
  const c1y = (y + 17 * scale).toFixed(1);
  const c2x = (x + 2.5 * scale).toFixed(1);
  const c2y = (y + 18.5 * scale).toFixed(1);
  const endX = (x + 6.5 * scale).toFixed(1);
  const endY = (y + 18.5 * scale).toFixed(1);

  return `<path d="M ${x0},${yTop} L ${x0},${yCurveStart} C ${c1x},${c1y} ${c2x},${c2y} ${endX},${endY}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function buildCleanSkillsWord_Abs({
  centerX = 175,
  baseY = 232,
  strokeWidth = 11.2,
  scale = 1.0,
  spreadFactor = 0.90,
  stroke = '#FF66AA'
}) {
  const x_s1 = centerX - 84 * spreadFactor * scale;
  const x_k  = centerX - 53 * spreadFactor * scale;
  const x_i  = centerX - 15 * spreadFactor * scale;
  const x_l1 = centerX + 13 * spreadFactor * scale;
  const x_l2 = centerX + 43 * spreadFactor * scale;
  const x_s2 = centerX + 84 * spreadFactor * scale;

  return `
    <g id="kdaSkillsWord">
      ${renderCleanSliderS_Abs(x_s1, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderK_Abs(x_k, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderI_Abs(x_i, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderL_Abs(x_l1, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderL_Abs(x_l2, baseY, scale, strokeWidth, stroke)}
      ${renderCleanSliderS_Abs(x_s2, baseY, scale, strokeWidth, stroke)}
    </g>
  `;
}

// Single Colour Cookie Rosa Oficial com FUNDO BRANCO PURO (#FFFFFF) no disco circular
// Fora do círculo r=150, é 100% transparente
const svgPinkWhite = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="23 23 304 304" width="100%" height="100%">
  <!-- 1. Fundo Circular Branco Puro (#FFFFFF) -->
  <circle cx="175" cy="175" r="150" fill="#FFFFFF"/>

  <!-- 2. Anel em Rosa Oficial (#FF66AA) -->
  <path d="${RIM_PATH}" fill="#FF66AA"/>

  <!-- 3. "osu!" em Rosa Oficial (#FF66AA) -->
  <g transform="translate(175, 175) scale(0.88) translate(-175, -175) translate(0, -28)">
    <path d="${OSU_TEXT_PATH}" fill="#FF66AA"/>
  </g>

  <!-- 4. "skills" em Rosa Oficial (#FF66AA) com Sliders Limpos -->
  ${buildCleanSkillsWord_Abs({
    centerX: 175,
    baseY: 232,
    strokeWidth: 11.2,
    scale: 1.0,
    spreadFactor: 0.90,
    stroke: '#FF66AA'
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

    const render = async (svgStr, width, height, filename) => {
      win.setSize(width, height);
      const sizedSvg = svgStr.replace('width="100%" height="100%"', `width="${width}" height="${height}"`);
      const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent;width:${width}px;height:${height}px;}</style></head><body>${sizedSvg}</body></html>`;
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(r => setTimeout(r, 220));
      const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
      const outPath = path.join(targetDir, filename);
      fs.writeFileSync(outPath, image.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
      return image.toPNG();
    };

    await render(svgPinkWhite, 1024, 1024, 'osu_skills_pink_white_1024.png');
    const b64 = (await render(svgPinkWhite, 512, 512, 'osu_skills_pink_white_512.png')).toString('base64');

    // Also copy to public and dist in project
    fs.writeFileSync(path.join(projectDir, 'public', 'osu_skills_pink_white_master.png'), fs.readFileSync(path.join(targetDir, 'osu_skills_pink_white_1024.png')));

    // Render Preview & Taskbar Board
    const boardWin = new BrowserWindow({
      width: 1200,
      height: 780,
      show: false,
      frame: false,
      transparent: false,
      backgroundColor: '#121214',
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
            background: #141416;
            color: #FFFFFF;
            padding: 34px 44px;
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #282830;
            padding-bottom: 16px;
          }
          .title {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .title span {
            color: #FF66AA;
          }
          .subtitle {
            font-size: 14px;
            color: #A0A0B0;
            margin-top: 4px;
          }
          .badge {
            background: rgba(255, 102, 170, 0.18);
            border: 1px solid #FF66AA;
            color: #FF88BB;
            padding: 6px 16px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
          }
          .content-grid {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 28px;
            align-items: center;
          }
          .hero-card {
            background: #1A1A20;
            border: 2px solid #FF66AA;
            border-radius: 16px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 10px 30px rgba(255, 102, 170, 0.2);
          }
          .icon-checker {
            width: 250px;
            height: 250px;
            background-color: #222228;
            background-image: 
              linear-gradient(45deg, #2A2A34 25%, transparent 25%), 
              linear-gradient(-45deg, #2A2A34 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #2A2A34 75%), 
              linear-gradient(-45deg, transparent 75%, #2A2A34 75%);
            background-size: 16px 16px;
            background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }
          .icon-checker img { width: 236px; height: 236px; }
          .hero-title {
            font-size: 18px;
            font-weight: 800;
            color: #FF66AA;
          }
          .hero-sub {
            font-size: 13px;
            color: #C0C0D0;
            margin-top: 4px;
            text-align: center;
          }
          .specs-column {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .taskbar-box {
            background: #1A1A20;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .tb-label {
            font-size: 13px;
            font-weight: 700;
            color: #D0D0DE;
          }
          .taskbar-dark {
            background: #0E0E12;
            height: 48px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 16px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          .taskbar-light {
            background: #F0F2F5;
            height: 48px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 16px;
            border: 1px solid rgba(0, 0, 0, 0.08);
          }
          .tb-dummy { width: 28px; height: 28px; opacity: 0.5; }
          .tb-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            position: relative;
          }
          .tb-icon.active-dark {
            background: rgba(255, 255, 255, 0.08);
          }
          .tb-icon.active-dark::after {
            content: '';
            position: absolute;
            bottom: 2px;
            width: 14px;
            height: 2px;
            background: #FF66AA;
            border-radius: 2px;
          }
          .tb-icon.active-light {
            background: rgba(0, 0, 0, 0.06);
          }
          .tb-icon.active-light::after {
            content: '';
            position: absolute;
            bottom: 2px;
            width: 14px;
            height: 2px;
            background: #FF66AA;
            border-radius: 2px;
          }
          .tb-icon img { width: 32px; height: 32px; }
          .bullet-card {
            background: #1A1A20;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-size: 13px;
            color: #C5C5D8;
            line-height: 1.5;
          }
          .bullet-card strong { color: #FFFFFF; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">osu!<span>skills</span> — Rosa Oficial com Fundo Branco (#FFFFFF)</div>
            <div class="subtitle">Fundo circular branco sólido • Elementos em Rosa Oficial (#FF66AA) • Transparente nas bordas</div>
          </div>
          <div class="badge">Oficial: Rosa &amp; Branco</div>
        </div>

        <div class="content-grid">
          <div class="hero-card">
            <div class="icon-checker"><img src="data:image/png;base64,${b64}"/></div>
            <div class="hero-title">Fundo Branco &amp; Rosa Oficial</div>
            <div class="hero-sub">Disco preenchido em Branco Puro (#FFFFFF) com anel, osu! e sliders no Rosa Oficial (#FF66AA)</div>
          </div>

          <div class="specs-column">
            <!-- Dark Taskbar -->
            <div class="taskbar-box">
              <div class="tb-label">Simulação na Barra de Tarefas Escura (32px - Padrão do Windows)</div>
              <div class="taskbar-dark">
                <div class="tb-dummy" style="background:#0078D4; border-radius:4px;"></div>
                <div class="tb-dummy" style="background:#4285F4; border-radius:50%;"></div>
                <div class="tb-icon active-dark">
                  <img src="data:image/png;base64,${b64}"/>
                </div>
                <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
                <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
              </div>
            </div>

            <!-- Light Taskbar -->
            <div class="taskbar-box">
              <div class="tb-label">Simulação na Barra de Tarefas Clara (32px)</div>
              <div class="taskbar-light">
                <div class="tb-dummy" style="background:#0078D4; border-radius:4px;"></div>
                <div class="tb-dummy" style="background:#4285F4; border-radius:50%;"></div>
                <div class="tb-icon active-light">
                  <img src="data:image/png;base64,${b64}"/>
                </div>
                <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
                <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
              </div>
            </div>

            <div class="bullet-card">
              <div><strong>Contraste Imbatível:</strong> O disco branco garante destaque instantâneo do rosa em barras escuras e em papéis de parede escuros do desktop.</div>
              <div><strong>Visual Oficial do Cookie:</strong> O interior branco reproduz exatamente a apresentação do manual de identidade da ppy, mantendo os cantos externos transparentes.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'osu_skills_pink_white_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered pink white board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering pink white masters:', err);
    app.quit();
  }
});
