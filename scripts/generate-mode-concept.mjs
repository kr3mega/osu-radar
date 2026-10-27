import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

// Helper for 5-point star
function getStarPath(cx, cy, outerR, innerR) {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * 36 - 90) * (Math.PI / 180);
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    p += (i === 0 ? `M${x.toFixed(2)},${y.toFixed(2)}` : ` L${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return p + ' Z';
}

// -------------------------------------------------------------
// Official 4 mode SVGs (viewBox 0 0 100 100, center 50, 50, stroke width 8)
// -------------------------------------------------------------
// 1. Taiko: Drum split in half
const TAIKO_ICON = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="50" cy="50" r="26" fill="none" stroke="#FFFFFF" stroke-width="7"/>
  <line x1="50" y1="24" x2="50" y2="76" stroke="#FFFFFF" stroke-width="7"/>
`;

// 2. Standard: Solid hitcircle
const STANDARD_ICON = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="50" cy="50" r="25" fill="#FFFFFF"/>
`;

// 3. Mania: 3 vertical pill keys (short, tall, short)
const MANIA_ICON = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <rect x="30" y="36" width="8" height="28" rx="4" fill="#FFFFFF"/>
  <rect x="46" y="27" width="8" height="46" rx="4" fill="#FFFFFF"/>
  <rect x="62" y="36" width="8" height="28" rx="4" fill="#FFFFFF"/>
`;

// 4. Catch: 3 circular dots in a triangle
const CATCH_ICON = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="38" cy="42" r="6.5" fill="#FFFFFF"/>
  <circle cx="62" cy="42" r="6.5" fill="#FFFFFF"/>
  <circle cx="50" cy="62" r="6.5" fill="#FFFFFF"/>
`;

// -------------------------------------------------------------
// The 4 Candidates for the 5th "osu!skills" Game Mode:
// -------------------------------------------------------------

// Candidate A: "The Bullseye / Precision Target"
// Outer ring + inner ring + solid center dot (alvo de precisão / aim & accuracy)
const SKILLS_A_TARGET = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="50" cy="50" r="26" fill="none" stroke="#FFFFFF" stroke-width="6"/>
  <circle cx="50" cy="50" r="9" fill="#FFFFFF"/>
`;

// Candidate B: "The Canonical Star" (A Estrela de Habilidade / Star Rating)
// Outer ring + solid 5-pointed difficulty star
const starPath = getStarPath(50, 50, 27, 12);
const SKILLS_B_STAR = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <path d="${starPath}" fill="#FFFFFF"/>
`;

// Candidate C: "The Ascending Skill Bars" (Gráfico de Nível / Progressão)
// Outer ring + 3 vertical capsules in ascending staircase (crescimento de habilidade)
const SKILLS_C_LEVELS = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <rect x="30" y="52" width="8" height="18" rx="4" fill="#FFFFFF"/>
  <rect x="46" y="40" width="8" height="30" rx="4" fill="#FFFFFF"/>
  <rect x="62" y="28" width="8" height="42" rx="4" fill="#FFFFFF"/>
`;

// Candidate D: "The Precision Reticle" (Mira Cruzada Minimalista)
// Outer ring + 4 clean ticks + center hitcircle
const SKILLS_D_RETICLE = `
  <circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" stroke-width="8"/>
  <circle cx="50" cy="50" r="16" fill="none" stroke="#FFFFFF" stroke-width="6"/>
  <line x1="50" y1="12" x2="50" y2="24" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
  <line x1="50" y1="76" x2="50" y2="88" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
  <line x1="12" y1="50" x2="24" y2="50" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
  <line x1="76" y1="50" x2="88" y2="50" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
`;

// Generate the 5-mode bar SVG for a given 5th candidate
function build5ModeBar(fifthSvg, label) {
  return `
  <div style="display:flex; flex-direction:column; align-items:center; background:#1C171A; border:1px solid rgba(255,255,255,0.1); border-radius:28px; padding:18px 14px; width:120px;">
    <div style="font-size:11px; font-weight:800; color:#FF66AB; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px; text-align:center;">${label}</div>
    <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
      <svg width="72" height="72" viewBox="0 0 100 100" opacity="0.45">${TAIKO_ICON}</svg>
      <svg width="72" height="72" viewBox="0 0 100 100" opacity="0.45">${STANDARD_ICON}</svg>
      <svg width="72" height="72" viewBox="0 0 100 100" opacity="0.45">${MANIA_ICON}</svg>
      <svg width="72" height="72" viewBox="0 0 100 100" opacity="0.45">${CATCH_ICON}</svg>
      <div style="width:72px; height:2px; background:rgba(255,102,171,0.3); margin:4px 0;"></div>
      <div style="background:rgba(255,102,171,0.15); border:2px solid #FF66AB; border-radius:50%; width:80px; height:80px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px rgba(255,102,171,0.4);">
        <svg width="70" height="70" viewBox="0 0 100 100">${fifthSvg}</svg>
      </div>
    </div>
  </div>
  `;
}

// Generate the high-res app icon mockup for a given candidate
function buildAppIconSvg(innerGlyph, bgFill = '#FF66AB') {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <filter id="iconShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.4"/>
      </filter>
    </defs>
    <circle cx="256" cy="256" r="224" fill="${bgFill}" filter="url(#iconShadow)"/>
    <g transform="translate(96, 96) scale(3.2)">
      ${innerGlyph}
    </g>
  </svg>
  `;
}

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 1240,
      height: 780,
      show: false,
      backgroundColor: '#120E12',
      webPreferences: { backgroundThrottling: false }
    });

    const userUploadedBase64 = fs.readFileSync('C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d/.user_uploaded/media_1793032967944_6dee5528.png').toString('base64');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family:'Torus', 'Comfortaa', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body {
            background: linear-gradient(180deg, #161216 0%, #0D0A0D 100%);
            color: #FFFFFF;
            width: 1240px;
            height: 780px;
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
          .main-content {
            display: flex;
            gap: 28px;
            align-items: center;
            justify-content: center;
            margin: 18px 0;
          }
          .original-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
            border: 1px dashed rgba(255, 255, 255, 0.15);
            border-radius: 24px;
            padding: 16px 20px;
          }
          .original-label {
            font-size: 11px;
            color: #8C848E;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
          }
          .modes-grid {
            display: flex;
            gap: 20px;
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
            <div class="title">osu!<span>skills</span> — O 5º Modo Oficial de Jogo</div>
            <div class="subtitle">Como o ícone seria se o osu!skills fosse nativamente um modo dentro do seletor oficial do osu!</div>
          </div>
          <div class="badge">Linguagem Oficial de Modos</div>
        </div>

        <div class="main-content">
          <div class="original-box">
            <div class="original-label">Sua Imagem (4 Modos Oficiais)</div>
            <img src="data:image/png;base64,${userUploadedBase64}" style="height: 380px; object-fit: contain; border-radius: 18px;"/>
          </div>

          <div class="modes-grid">
            ${build5ModeBar(SKILLS_A_TARGET, 'A. O Alvo (Target)')}
            ${build5ModeBar(SKILLS_B_STAR, 'B. A Estrela (Star)')}
            ${build5ModeBar(SKILLS_C_LEVELS, 'C. Níveis (Bars)')}
            ${build5ModeBar(SKILLS_D_RETICLE, 'D. Retículo (Aim)')}
          </div>
        </div>

        <div class="footer">
          <div>Taiko: Tambor dividido • Standard: Círculo puro • Mania: Teclas • Catch: 3 Frutas • <b>Skills: Alvo / Estrela / Níveis</b></div>
          <div>100% Geometria Circular • Mesma espessura de traço e raio dos modos originais</div>
        </div>
      </body>
      </html>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(r => setTimeout(r, 250));
    const img = await win.webContents.capturePage();
    const outPath = path.join(targetDir, 'mode_icons_comparison_board.png');
    fs.writeFileSync(outPath, img.toPNG());
    console.log(`Rendered mode comparison board: ${outPath} (${fs.statSync(outPath).size} bytes)`);

    // Also export the standalone desktop app icons for each of the 4 candidates
    const appIcons = [
      { name: 'mode_icon_candidate_a_target.png', svg: buildAppIconSvg(SKILLS_A_TARGET) },
      { name: 'mode_icon_candidate_b_star.png', svg: buildAppIconSvg(SKILLS_B_STAR) },
      { name: 'mode_icon_candidate_c_levels.png', svg: buildAppIconSvg(SKILLS_C_LEVELS) },
      { name: 'mode_icon_candidate_d_reticle.png', svg: buildAppIconSvg(SKILLS_D_RETICLE) },
    ];

    const iconWin = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      transparent: true,
      webPreferences: { backgroundThrottling: false }
    });

    for (const item of appIcons) {
      const iconHtml = `
        <!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:512px;height:512px;overflow:hidden;">${item.svg}</body></html>
      `;
      await iconWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(iconHtml)}`);
      await new Promise(r => setTimeout(r, 150));
      const iconImg = await iconWin.webContents.capturePage();
      const p = path.join(targetDir, item.name);
      fs.writeFileSync(p, iconImg.toPNG());
      console.log(`Rendered standalone app icon: ${p} (${fs.statSync(p).size} bytes)`);
    }

    app.quit();
  } catch (err) {
    console.error('Mode render error:', err);
    app.quit();
  }
});
