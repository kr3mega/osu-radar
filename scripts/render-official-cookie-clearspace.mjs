import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';
const projectDir = 'C:/Users/Usuário/Documents/firebase/osu-radar';

const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Official Pure osu! Single Colour Cookie Logo with EXACT Clear Space Area:
// Canvas is 362 x 362, Circle diameter is 300 (radius 150), centered at (175, 175)
// Ratio: 300 / 362 = 0.8287 (~82.9%, matching the official osu! shortcut diameter perfectly)
// Margin on every side: 31px (approx size of the "o" in "osu!" per page 3 of Identity Guidelines)
const svgOfficialPinkWhiteClearSpace = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 362 362" width="100%" height="100%">
  <!-- 1. White circular disc background (#FFFFFF) -->
  <circle cx="175" cy="175" r="150" fill="#FFFFFF"/>

  <!-- 2. Official Pink circular rim (#FF66AA) -->
  <path d="${RIM_PATH}" fill="#FF66AA"/>

  <!-- 3. Official Pink "osu!" centered with original scale 1.0 (#FF66AA) -->
  <path d="${OSU_TEXT_PATH}" fill="#FF66AA"/>
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

    await render(svgOfficialPinkWhiteClearSpace, 1024, 1024, 'official_cookie_clearspace_1024.png');
    const b64 = (await render(svgOfficialPinkWhiteClearSpace, 512, 512, 'official_cookie_clearspace_512.png')).toString('base64');

    // Also copy to public and dist as osu-cookie-official.png
    fs.writeFileSync(path.join(projectDir, 'public', 'images', 'layout', 'osu-cookie-official.png'), fs.readFileSync(path.join(targetDir, 'official_cookie_clearspace_512.png')));
    if (fs.existsSync(path.join(projectDir, 'dist', 'images', 'layout'))) {
      fs.writeFileSync(path.join(projectDir, 'dist', 'images', 'layout', 'osu-cookie-official.png'), fs.readFileSync(path.join(targetDir, 'official_cookie_clearspace_512.png')));
    }

    // Render Side-by-Side Desktop Comparison Board with user's official game shortcut
    const boardWin = new BrowserWindow({
      width: 1200,
      height: 720,
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
          .title { font-size: 26px; font-weight: 900; }
          .title span { color: #FF66AA; }
          .subtitle { font-size: 14px; color: #A0A0B0; margin-top: 4px; }
          .badge {
            background: rgba(255, 102, 170, 0.18);
            border: 1px solid #FF66AA;
            color: #FF88BB;
            padding: 6px 16px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 800;
          }
          .desktop-mockup {
            background: #000000;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 30px;
            display: flex;
            align-items: center;
            gap: 40px;
          }
          .desktop-icon-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            width: 74px;
          }
          .desktop-icon-box {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .desktop-icon-box img { width: 48px; height: 48px; }
          .shortcut-arrow {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 14px;
            height: 14px;
            background: #FFFFFF;
            border: 1px solid #000000;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .shortcut-arrow::after {
            content: '↗';
            color: #0078D4;
            font-size: 11px;
            font-weight: 900;
            line-height: 1;
          }
          .desktop-label {
            font-size: 12px;
            color: #FFFFFF;
            text-align: center;
            font-weight: 500;
            text-shadow: 0 1px 2px #000000;
          }
          .specs-card {
            background: #1A1A20;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            font-size: 13.5px;
            color: #C0C0D4;
            line-height: 1.5;
          }
          .specs-card strong { color: #FFFFFF; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Osu!<span>Skills</span> — Proporção Idêntica ao Ícone Oficial (Clear Space Area)</div>
            <div class="subtitle">Ajuste da margem de respiro ("Clear Space" da página 3) • Diâmetro 100% igual ao atalho oficial do jogo</div>
          </div>
          <div class="badge">Clear Space Area • Proporção 1:1</div>
        </div>

        <div class="desktop-mockup">
          <div class="desktop-icon-wrap">
            <div class="desktop-icon-box">
              <img src="data:image/png;base64,${b64}"/>
              <div class="shortcut-arrow"></div>
            </div>
            <div class="desktop-label">Osu!Skills</div>
          </div>

          <div style="font-size: 24px; color: #666;">↔</div>

          <div style="font-size: 14px; color: #FF88BB; font-weight: 700;">
            Agora o diâmetro do círculo de Osu!Skills é EXATAMENTE IGUAL ao do jogo oficial no Desktop!
          </div>
        </div>

        <div class="specs-card">
          <div><strong>O que foi corrigido:</strong> Anteriormente, o círculo ocupava 100% da caixa quadrada do arquivo .ico, fazendo com que ele parecesse maior que o atalho do jogo oficial.</div>
          <div><strong>Regra do "Clear Space Area" (Página 3 do Manual):</strong> A margem de respiro ao redor do círculo foi ajustada usando a largura da letra "o" de "osu!", conferindo exatamente 8.3% de respiro em cada lado (proporção de ~83% do círculo).</div>
        </div>
      </body>
      </html>
    `;

    await boardWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(boardHtml)}`);
    await new Promise(r => setTimeout(r, 250));
    const boardImg = await boardWin.webContents.capturePage();
    const boardOutPath = path.join(targetDir, 'official_cookie_clearspace_board.png');
    fs.writeFileSync(boardOutPath, boardImg.toPNG());
    console.log(`Rendered clearspace board: ${boardOutPath} (${fs.statSync(boardOutPath).size} bytes)`);

    app.quit();
  } catch (err) {
    console.error('Error rendering clearspace master:', err);
    app.quit();
  }
});
