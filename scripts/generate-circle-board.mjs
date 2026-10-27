import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 1200,
      height: 720,
      show: false,
      backgroundColor: '#120E12',
      webPreferences: { backgroundThrottling: false }
    });

    const img1 = fs.readFileSync(path.join(targetDir, 'circle_concept_1_pure_sublogo.png')).toString('base64');
    const img2 = fs.readFileSync(path.join(targetDir, 'circle_concept_2_approach_ring.png')).toString('base64');
    const img3 = fs.readFileSync(path.join(targetDir, 'circle_concept_3_star_rating.png')).toString('base64');
    const img4 = fs.readFileSync(path.join(targetDir, 'circle_concept_4_subbrand_pill.png')).toString('base64');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; font-family:'Torus', 'Comfortaa', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body {
            background: linear-gradient(180deg, #161216 0%, #0F0C0F 100%);
            color: #FFFFFF;
            width: 1200px;
            height: 720px;
            padding: 36px 44px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid rgba(255, 102, 171, 0.2);
            padding-bottom: 16px;
          }
          .title { font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }
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
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-top: 24px;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .card.highlight {
            border-color: rgba(255, 102, 171, 0.5);
            background: rgba(255, 102, 171, 0.05);
          }
          .icon-wrap {
            width: 140px;
            height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
          }
          .icon-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
          }
          .card-title {
            font-size: 15px;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 4px;
          }
          .card-sub {
            font-size: 11px;
            color: #FF66AB;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .card-desc {
            font-size: 12px;
            color: #A99EA8;
            line-height: 1.45;
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
            <div class="title">osu!<span>skills</span> — Propostas 100% Circulares (Zero Hexágono)</div>
            <div class="subtitle">Geometria puramente circular, estética oficial Peppy e tipografia humana Torus</div>
          </div>
          <div class="badge">100% Círculo • Zero Radar</div>
        </div>

        <div class="grid">
          <div class="card highlight">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img1}"/>
            </div>
            <div class="card-title">1. Pure Sub-Logo</div>
            <div class="card-sub">Oficial Minimalista</div>
            <div class="card-desc">Círculo clássico do osu! com a inscrição "skills" em fonte Torus original. O mais limpo e natural.</div>
          </div>

          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img2}"/>
            </div>
            <div class="card-title">2. Approach Ring</div>
            <div class="card-sub">Anel de Ritmo</div>
            <div class="card-desc">Círculo clássico envolvido pelo anel de aproximação de gameplay. 100% circular, foco em timing e ritmo.</div>
          </div>

          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img3}"/>
            </div>
            <div class="card-title">3. Star Rating</div>
            <div class="card-sub">Estrela de Habilidade</div>
            <div class="card-desc">Círculo clássico com a tradicional estrela de Star Rating do jogo (símbolo universal de dificuldade e maestria).</div>
          </div>

          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img4}"/>
            </div>
            <div class="card-title">4. Sub-Brand Pill</div>
            <div class="card-sub">Pill Curvo Oficial</div>
            <div class="card-desc">Círculo clássico com uma discreta etiqueta preta na curvatura inferior, idêntico aos logos oficiais do ppy.</div>
          </div>
        </div>

        <div class="footer">
          <div>Zero formas hexagonais • Zero teias de radar • 100% Círculo Oficial</div>
          <div>Cores padronizadas: Rosa #FF66AB • Branco Puro #FFFFFF</div>
        </div>
      </body>
      </html>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(r => setTimeout(r, 250));
    const img = await win.webContents.capturePage();
    const outPath = path.join(targetDir, 'circle_concepts_board.png');
    fs.writeFileSync(outPath, img.toPNG());
    console.log(`Rendered circle comparison board: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    app.quit();
  } catch (err) {
    console.error('Board render error:', err);
    app.quit();
  }
});
