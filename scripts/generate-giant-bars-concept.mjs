import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

function buildGiantBarsLayout({
  id = 'var1',
  bgDiscFill = '#FF66AB',
  rimFill = '#FFFFFF',
  barFill = '#FFFFFF',
  barOpacity = 0.28,
  barWidth = 68,
  barGap = 16,
  barHeights = [140, 205, 270],
  scaleOsu = 0.86,
  osuY = -24,
  skillsText = 'skills',
  skillsFontSize = 44,
  skillsLetterSpacing = 3,
  skillsY = 216,
  textFill = '#FFFFFF',
  textShadowOpacity = 0.45
}) {
  const totalBarW = barWidth * 3 + barGap * 2;
  const startX = 175 - totalBarW / 2;
  const rx = barWidth / 2;

  const b1X = startX;
  const b2X = startX + barWidth + barGap;
  const b3X = startX + (barWidth + barGap) * 2;

  const baseY = 325; // Base of the circle

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <filter id="bigDrop_${id}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.4"/>
      </filter>
      <!-- Text shadow for high readability over the giant bars -->
      <filter id="textShadow_${id}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="${textShadowOpacity}"/>
      </filter>
      <!-- Clip path so giant bars stay perfectly inside the inner circle -->
      <clipPath id="circleClip_${id}">
        <circle cx="175" cy="175" r="135"/>
      </clipPath>
    </defs>

    <g transform="translate(81, 81)">
      <!-- 1. Background Pink Disc -->
      <circle cx="175" cy="175" r="148" fill="${bgDiscFill}" filter="url(#bigDrop_${id})"/>

      <!-- 2. Giant Ascending Bars filling the background of the circle -->
      <g clip-path="url(#circleClip_${id})">
        <g fill="${barFill}" fill-opacity="${barOpacity}">
          <!-- Giant Bar 1 (Left - Ascending) -->
          <rect x="${b1X.toFixed(1)}" y="${(baseY - barHeights[0]).toFixed(1)}" width="${barWidth}" height="${barHeights[0]}" rx="${rx}"/>
          <!-- Giant Bar 2 (Middle - Taller) -->
          <rect x="${b2X.toFixed(1)}" y="${(baseY - barHeights[1]).toFixed(1)}" width="${barWidth}" height="${barHeights[1]}" rx="${rx}"/>
          <!-- Giant Bar 3 (Right - Full Height) -->
          <rect x="${b3X.toFixed(1)}" y="${(baseY - barHeights[2]).toFixed(1)}" width="${barWidth}" height="${barHeights[2]}" rx="${rx}"/>
        </g>
      </g>

      <!-- 3. Outer White Rim -->
      <path d="${RIM_PATH}" fill="${rimFill}"/>

      <!-- 4. Foreground: "osu!" (Linha 1) + "skills" (Linha 2) centered and superposed -->
      <g filter="url(#textShadow_${id})">
        <!-- Linha 1: osu! -->
        <g transform="translate(175, 175) scale(${scaleOsu}) translate(-175, -175) translate(0, ${osuY})">
          <path d="${OSU_TEXT_PATH}" fill="${textFill}"/>
        </g>

        <!-- Linha 2: skills -->
        <text x="175" y="${skillsY}" font-family="'Torus', 'Comfortaa', 'Aller', 'Segoe UI', system-ui, sans-serif" font-size="${skillsFontSize}" font-weight="900" fill="${textFill}" text-anchor="middle" letter-spacing="${skillsLetterSpacing}">${skillsText}</text>
      </g>
    </g>
  </svg>
  `;
}

// 4 Variations of the Giant Background Bars:

// Variação 1: "Silhueta Branca Translúcida (Recomendada)"
// Fundo rosa oficial, 3 barras brancas gigantes com 30% de opacidade subindo pelo círculo, osu! + skills em branco puro sobrepondo
const v1 = buildGiantBarsLayout({
  id: 'v1',
  bgDiscFill: '#FF66AB',
  barFill: '#FFFFFF',
  barOpacity: 0.30,
  barWidth: 68,
  barGap: 14,
  barHeights: [135, 205, 275],
  scaleOsu: 0.88,
  osuY: -22,
  skillsText: 'skills',
  skillsFontSize: 46,
  skillsLetterSpacing: 3,
  skillsY: 218,
  textFill: '#FFFFFF',
  textShadowOpacity: 0.50
});

// Variação 2: "Silhueta Alto Contraste (Opacidade 45%)"
// Barras mais marcadas e largas no fundo, garantindo que mesmo em miniatura a silhueta em degrau seja vista de longe
const v2 = buildGiantBarsLayout({
  id: 'v2',
  bgDiscFill: '#FF66AB',
  barFill: '#FFFFFF',
  barOpacity: 0.45,
  barWidth: 72,
  barGap: 12,
  barHeights: [145, 215, 285],
  scaleOsu: 0.90,
  osuY: -24,
  skillsText: 'skills',
  skillsFontSize: 48,
  skillsLetterSpacing: 2,
  skillsY: 220,
  textFill: '#FFFFFF',
  textShadowOpacity: 0.65
});

// Variação 3: "SKILLS Maiúsculo Sobreposto"
// Com "SKILLS" em caixa alta, barras translúcidas preenchendo o fundo
const v3 = buildGiantBarsLayout({
  id: 'v3',
  bgDiscFill: '#FF66AB',
  barFill: '#FFFFFF',
  barOpacity: 0.32,
  barWidth: 68,
  barGap: 14,
  barHeights: [135, 205, 275],
  scaleOsu: 0.88,
  osuY: -22,
  skillsText: 'SKILLS',
  skillsFontSize: 40,
  skillsLetterSpacing: 5,
  skillsY: 215,
  textFill: '#FFFFFF',
  textShadowOpacity: 0.50
});

// Variação 4: "Barras Grafite Profundo (Dark Underlay)"
// As barras gigantes de fundo em grafite escuro (#1C171A) com 35% de opacidade, dando um tom esportivo e moderno
const v4 = buildGiantBarsLayout({
  id: 'v4',
  bgDiscFill: '#FF66AB',
  barFill: '#1C171A',
  barOpacity: 0.35,
  barWidth: 70,
  barGap: 14,
  barHeights: [140, 210, 280],
  scaleOsu: 0.88,
  osuY: -22,
  skillsText: 'skills',
  skillsFontSize: 46,
  skillsLetterSpacing: 3,
  skillsY: 218,
  textFill: '#FFFFFF',
  textShadowOpacity: 0.40
});

const variations = [
  { name: 'giant_bars_var1_translucent.png', svg: v1 },
  { name: 'giant_bars_var2_high_contrast.png', svg: v2 },
  { name: 'giant_bars_var3_uppercase.png', svg: v3 },
  { name: 'giant_bars_var4_dark_bars.png', svg: v4 },
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

    for (const v of variations) {
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:512px;height:512px;overflow:hidden;">${v.svg}</body></html>`;
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(r => setTimeout(r, 150));
      const img = await win.webContents.capturePage();
      const outPath = path.join(targetDir, v.name);
      fs.writeFileSync(outPath, img.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    }

    // Render comparison board with Taskbar simulation
    const boardWin = new BrowserWindow({
      width: 1240,
      height: 800,
      show: false,
      backgroundColor: '#120E12',
      webPreferences: { backgroundThrottling: false }
    });

    const v1B64 = fs.readFileSync(path.join(targetDir, 'giant_bars_var1_translucent.png')).toString('base64');
    const v2B64 = fs.readFileSync(path.join(targetDir, 'giant_bars_var2_high_contrast.png')).toString('base64');
    const v3B64 = fs.readFileSync(path.join(targetDir, 'giant_bars_var3_uppercase.png')).toString('base64');
    const v4B64 = fs.readFileSync(path.join(targetDir, 'giant_bars_var4_dark_bars.png')).toString('base64');

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
            <div class="title">osu!<span>skills</span> — Barras Gigantes de Fundo + Texto Central Sobreposto</div>
            <div class="subtitle">3 barras crescentes preenchendo o fundo circular com 'osu!' (linha 1) e 'skills' (linha 2) sobrepostos</div>
          </div>
          <div class="badge">Sua Nova Ideia • Fundo Dinâmico</div>
        </div>

        <div class="cards-grid">
          <div class="card highlight">
            <div class="icon-wrap"><img src="data:image/png;base64,${v1B64}"/></div>
            <div class="card-title">1. Translúcida 30%</div>
            <div class="card-sub">Recomendada</div>
            <div class="card-desc">Barras brancas a 30% no fundo preenchendo o círculo; 'osu!' e 'skills' em branco puro com sombra suave.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v2B64}"/></div>
            <div class="card-title">2. Alto Contraste 45%</div>
            <div class="card-sub">Barras Mais Vivas</div>
            <div class="card-desc">Barras a 45% de opacidade, criando degraus gráficos bem marcados atrás do texto central.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v3B64}"/></div>
            <div class="card-title">3. SKILLS Maiúsculo</div>
            <div class="card-sub">Caixa Alta</div>
            <div class="card-desc">Texto 'SKILLS' em caixa alta sobrepondo as barras gigantes de fundo.</div>
          </div>

          <div class="card">
            <div class="icon-wrap"><img src="data:image/png;base64,${v4B64}"/></div>
            <div class="card-title">4. Barras Grafite</div>
            <div class="card-sub">Dark Underlay</div>
            <div class="card-desc">Barras em tom grafite escuro criando profundidade sob o texto branco em primeiro plano.</div>
          </div>
        </div>

        <!-- Taskbar Simulation -->
        <div class="taskbar-mockup-panel">
          <div class="taskbar-title">
            <span>Simulação na Barra de Tarefas (32px) com as Barras Gigantes de Fundo</span>
            <span style="color:#A098A2; font-weight:500;">Destaque imediato do padrão em degrau</span>
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

            <!-- Variação 4 Preview -->
            <div class="tb-icon">
              <img src="data:image/png;base64,${v4B64}"/>
            </div>

            <div class="tb-dummy" style="background:#5865F2; border-radius:50%;"></div>
            <div class="tb-dummy" style="background:#1DB954; border-radius:50%;"></div>
          </div>
        </div>

        <div class="footer">
          <div>Composição em camadas: Círculo Base ➔ Barras Gigantes de Fundo ➔ Aro Branco ➔ 'osu! skills' Sobreposto</div>
          <div>Cores padronizadas: Rosa #FF66AB e Branco Puro #FFFFFF • Formato 100% Círculo</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'giant_bars_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered giant bars board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering giant bars:', err);
    app.quit();
  }
});
