import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Helper to build the SVG icon
function createSkillsBarsIcon({
  scaleOsu = 0.82,
  offsetY = -24,
  barWidth = 14,
  barGap = 9,
  barHeights = [22, 38, 54],
  baseY = 256,
  addUnderline = false
}) {
  const totalW = barWidth * 3 + barGap * 2;
  const startX = 175 - totalW / 2;

  const bar1X = startX;
  const bar2X = startX + barWidth + barGap;
  const bar3X = startX + (barWidth + barGap) * 2;

  const h1 = barHeights[0];
  const h2 = barHeights[1];
  const h3 = barHeights[2];

  const rx = barWidth / 2;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <filter id="iconDrop" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
      </filter>
    </defs>

    <g transform="translate(81, 81)">
      <!-- Main circular pink disc -->
      <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#iconDrop)"/>
      <path d="${RIM_PATH}" fill="#FFFFFF"/>

      <!-- "osu!" text centered and positioned in upper portion -->
      <g transform="translate(175, 175) scale(${scaleOsu}) translate(-175, -175) translate(0, ${offsetY})">
        <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
      </g>

      <!-- 3 Ascending Skill Bars in lower portion -->
      <g fill="#FFFFFF">
        <!-- Low Bar -->
        <rect x="${bar1X.toFixed(1)}" y="${(baseY - h1).toFixed(1)}" width="${barWidth}" height="${h1}" rx="${rx}"/>
        <!-- Mid Bar -->
        <rect x="${bar2X.toFixed(1)}" y="${(baseY - h2).toFixed(1)}" width="${barWidth}" height="${h2}" rx="${rx}"/>
        <!-- High Bar -->
        <rect x="${bar3X.toFixed(1)}" y="${(baseY - h3).toFixed(1)}" width="${barWidth}" height="${h3}" rx="${rx}"/>

        ${addUnderline ? `<rect x="${(startX - 6).toFixed(1)}" y="${(baseY + 6).toFixed(1)}" width="${(totalW + 12).toFixed(1)}" height="4.5" rx="2.25"/>` : ''}
      </g>
    </g>
  </svg>
  `;
}

// 4 Variations of the User's Idea:
// Var 1: Equilibrada Clássica (proporção idêntica ao exemplo do teclado do Mania)
const svgVar1 = createSkillsBarsIcon({
  scaleOsu: 0.82,
  offsetY: -22,
  barWidth: 14,
  barGap: 9,
  barHeights: [20, 36, 52],
  baseY: 254,
  addUnderline: false
});

// Var 2: Barras Mais Encorpadas (destaque maior no desktop para ícones menores)
const svgVar2 = createSkillsBarsIcon({
  scaleOsu: 0.80,
  offsetY: -24,
  barWidth: 17,
  barGap: 10,
  barHeights: [24, 42, 60],
  baseY: 256,
  addUnderline: false
});

// Var 3: Com Traço Base de Suporte (estilo base do piano de Mania)
const svgVar3 = createSkillsBarsIcon({
  scaleOsu: 0.82,
  offsetY: -24,
  barWidth: 13,
  barGap: 8,
  barHeights: [18, 34, 48],
  baseY: 248,
  addUnderline: true
});

// Var 4: 4 Barras de Nível Progressivo (níveis 1, 2, 3, 4 de maestria)
function create4BarsIcon() {
  const barWidth = 12;
  const barGap = 7;
  const totalW = barWidth * 4 + barGap * 3;
  const startX = 175 - totalW / 2;
  const heights = [16, 28, 42, 56];
  const baseY = 255;
  const rx = barWidth / 2;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <filter id="iconDrop4" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
      </filter>
    </defs>
    <g transform="translate(81, 81)">
      <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#iconDrop4)"/>
      <path d="${RIM_PATH}" fill="#FFFFFF"/>
      <g transform="translate(175, 175) scale(0.80) translate(-175, -175) translate(0, -24)">
        <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
      </g>
      <g fill="#FFFFFF">
        ${heights.map((h, i) => {
          const x = startX + i * (barWidth + barGap);
          return `<rect x="${x.toFixed(1)}" y="${(baseY - h).toFixed(1)}" width="${barWidth}" height="${h}" rx="${rx}"/>`;
        }).join('\n        ')}
      </g>
    </g>
  </svg>
  `;
}
const svgVar4 = create4BarsIcon();

const variations = [
  { name: 'skills_bars_var1_balanced.png', svg: svgVar1 },
  { name: 'skills_bars_var2_bold.png', svg: svgVar2 },
  { name: 'skills_bars_var3_underlined.png', svg: svgVar3 },
  { name: 'skills_bars_var4_four_bars.png', svg: svgVar4 },
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

    // Now render the comparison board showing user inspiration and the 4 variations
    const boardWin = new BrowserWindow({
      width: 1240,
      height: 760,
      show: false,
      backgroundColor: '#120E12',
      webPreferences: { backgroundThrottling: false }
    });

    const insp1 = fs.readFileSync('C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d/.user_uploaded/media_1793033351678_4c42767e.png').toString('base64');
    const insp2 = fs.readFileSync('C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d/.user_uploaded/media_1793033360794_f2a648de.png').toString('base64');

    const v1b64 = fs.readFileSync(path.join(targetDir, 'skills_bars_var1_balanced.png')).toString('base64');
    const v2b64 = fs.readFileSync(path.join(targetDir, 'skills_bars_var2_bold.png')).toString('base64');
    const v3b64 = fs.readFileSync(path.join(targetDir, 'skills_bars_var3_underlined.png')).toString('base64');
    const v4b64 = fs.readFileSync(path.join(targetDir, 'skills_bars_var4_four_bars.png')).toString('base64');

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
            height: 760px;
            padding: 32px 40px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid rgba(255, 102, 171, 0.2);
            padding-bottom: 14px;
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
          .main-row {
            display: flex;
            gap: 24px;
            align-items: center;
            justify-content: center;
            margin: 16px 0;
          }
          .insp-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 16px;
            width: 220px;
          }
          .insp-title {
            font-size: 11px;
            color: #FF66AB;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
            text-align: center;
          }
          .insp-imgs {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
          }
          .insp-img-wrap {
            width: 110px;
            height: 110px;
            border-radius: 14px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
            border: 1px solid rgba(255,255,255,0.1);
          }
          .insp-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .arrow {
            font-size: 28px;
            color: #FF66AB;
            font-weight: 900;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            flex: 1;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            padding: 20px 14px;
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
            width: 125px;
            height: 125px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
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
            margin-bottom: 3px;
          }
          .card-sub {
            font-size: 10px;
            color: #FF66AB;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .card-desc {
            font-size: 11px;
            color: #A99EA8;
            line-height: 1.4;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 14px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 12px;
            color: #7A727C;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">osu!<span>skills</span> — A Ideia Perfeita: "osu!" + Barras de Nível</div>
            <div class="subtitle">Fusão da composição oficial de modo com as barras de progressão de habilidades</div>
          </div>
          <div class="badge">Sua Ideia • 100% Círculo</div>
        </div>

        <div class="main-row">
          <div class="insp-panel">
            <div class="insp-title">Sua Inspiração</div>
            <div class="insp-imgs">
              <div class="insp-img-wrap"><img src="data:image/png;base64,${insp1}"/></div>
              <div style="font-size:16px; font-weight:900; color:#FF66AB;">+</div>
              <div class="insp-img-wrap"><img src="data:image/png;base64,${insp2}"/></div>
            </div>
          </div>

          <div class="arrow">➔</div>

          <div class="cards-grid">
            <div class="card highlight">
              <div class="icon-wrap"><img src="data:image/png;base64,${v1b64}"/></div>
              <div class="card-title">1. Equilibrada</div>
              <div class="card-sub">Recomendada</div>
              <div class="card-desc">Proporção áurea perfeita. O texto osu! respira confortavelmente e as 3 barras ficam harmoniosas no centro.</div>
            </div>

            <div class="card">
              <div class="icon-wrap"><img src="data:image/png;base64,${v2b64}"/></div>
              <div class="card-title">2. Barras Encorpadas</div>
              <div class="card-sub">Alta Visibilidade</div>
              <div class="card-desc">Barras mais grossas e compridas para leitura máxima em tamanhos pequenos (16px / 32px na taskbar).</div>
            </div>

            <div class="card">
              <div class="icon-wrap"><img src="data:image/png;base64,${v3b64}"/></div>
              <div class="card-title">3. Com Base</div>
              <div class="card-sub">Estilo Teclado</div>
              <div class="card-desc">As 3 barras descansam sobre uma fina linha de base branca, no estilo da base do piano de Mania.</div>
            </div>

            <div class="card">
              <div class="icon-wrap"><img src="data:image/png;base64,${v4b64}"/></div>
              <div class="card-title">4. Quatro Barras</div>
              <div class="card-sub">Nível 1, 2, 3, 4</div>
              <div class="card-desc">4 barras em progressão, transmitindo sinal de treino e subida gradual de habilidades.</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>Geometria 100% oficial • Rosa #FF66AB e Branco Puro #FFFFFF • Zero Hexágonos</div>
          <div>Perfeita fusão entre a identidade clássica do osu! e o DNA de treino do osu!skills</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'skills_bars_comparison_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered skills bars board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering skills bars:', err);
    app.quit();
  }
});
