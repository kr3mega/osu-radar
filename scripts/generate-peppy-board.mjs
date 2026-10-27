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

    const imgOriginal = fs.readFileSync(path.join(targetDir, 'peppy_concept_1_sub_brand.png')).toString('base64');
    const img1 = fs.readFileSync(path.join(targetDir, 'peppy_concept_1_sub_brand.png')).toString('base64');
    const img2 = fs.readFileSync(path.join(targetDir, 'peppy_concept_2_hex_rim.png')).toString('base64');
    const img3 = fs.readFileSync(path.join(targetDir, 'peppy_concept_3_radar_watermark.png')).toString('base64');
    const img4 = fs.readFileSync(path.join(targetDir, 'peppy_concept_4_mode_discipline.png')).toString('base64');
    const img5 = fs.readFileSync(path.join(targetDir, 'peppy_concept_5_direct_sublogo.png')).toString('base64');

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
            grid-template-columns: repeat(5, 1fr);
            gap: 18px;
            margin-top: 24px;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 20px 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            transition: all 0.2s ease;
          }
          .card.highlight {
            border-color: rgba(255, 102, 171, 0.5);
            background: rgba(255, 102, 171, 0.05);
          }
          .icon-wrap {
            width: 130px;
            height: 130px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
          }
          .icon-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
          }
          .card-title {
            font-size: 14px;
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
            <div class="title">osu!<span>skills</span> — Diretrizes de Design Estilo Peppy</div>
            <div class="subtitle">Explorações vetoriais minimalistas fiéis à linguagem visual oficial do osu! e osu!lazer</div>
          </div>
          <div class="badge">Vetor Humano • Peppy Minimalist</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img1}"/>
            </div>
            <div class="card-title">1. Sub-Brand Pill</div>
            <div class="card-sub">Oficial Companion</div>
            <div class="card-desc">Círculo clássico com pill escuro de sobreposição na borda, como em osu!tourney.</div>
          </div>

          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img2}"/>
            </div>
            <div class="card-title">2. Hex-Rim Hitcircle</div>
            <div class="card-sub">Anel Hexagonal</div>
            <div class="card-desc">O anel branco externo se molda em um hexágono suave com os 6 vértices de treino.</div>
          </div>

          <div class="card highlight">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img3}"/>
            </div>
            <div class="card-title">3. Radar Watermark</div>
            <div class="card-sub">Marca D'água</div>
            <div class="card-desc">Círculo padrão com o gráfico de radar sutilmente translúcido atrás das letras brancas.</div>
          </div>

          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img5}"/>
            </div>
            <div class="card-title">4. Direct Sub-Logo</div>
            <div class="card-sub">Tipografia Torus</div>
            <div class="card-desc">O texto "skills" integrado diretamente abaixo de "osu!" no mesmo padrão de osu!stream.</div>
          </div>

          <div class="card">
            <div class="icon-wrap">
              <img src="data:image/png;base64,${img4}"/>
            </div>
            <div class="card-title">5. Mode Discipline</div>
            <div class="card-sub">Disco de Modo</div>
            <div class="card-desc">Disco obsidiana com aro rosa vibrante, no padrão dos discos de modo (Taiko, Mania).</div>
          </div>
        </div>

        <div class="footer">
          <div>Geometria vetorial exata extraída do arquivo oficial Illustrator do osu!</div>
          <div>Cores padronizadas: Rosa #FF66AB • Branco #FFFFFF • Grafite #1C171A</div>
        </div>
      </body>
      </html>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise(r => setTimeout(r, 250));
    const img = await win.webContents.capturePage();
    const outPath = path.join(targetDir, 'peppy_concepts_comparison_board.png');
    fs.writeFileSync(outPath, img.toPNG());
    console.log(`Rendered comparison board: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    app.quit();
  } catch (err) {
    console.error('Board render error:', err);
    app.quit();
  }
});
