import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';

app.disableHardwareAcceleration();

// Official osu! logo SVG paths from Adobe Illustrator source (viewBox 0 0 350 350, center 175, 175)
const OSU_TEXT_PATH = `M100.1,206.4c-4.7,0-8.8-0.8-12.3-2.3s-6.4-3.7-8.6-6.4 c-2.3-2.7-4-5.9-5.2-9.6c-1.2-3.7-1.7-7.6-1.7-11.9c0-4.3,0.6-8.3,1.7-12c1.2-3.7,2.9-7,5.2-9.7c2.3-2.7,5.2-4.9,8.6-6.5 s7.6-2.4,12.3-2.4c4.7,0,8.8,0.8,12.3,2.4c3.5,1.6,6.4,3.7,8.8,6.5c2.3,2.7,4,6,5.2,9.7c1.1,3.7,1.7,7.7,1.7,12 c0,4.3-0.6,8.2-1.7,11.9c-1.1,3.7-2.8,6.9-5.2,9.6c-2.3,2.7-5.2,4.9-8.8,6.4C109,205.7,104.8,206.4,100.1,206.4z M100.1,194.3 c4.2,0,7.2-1.6,9-4.7c1.8-3.1,2.7-7.6,2.7-13.4c0-5.8-0.9-10.3-2.7-13.4c-1.8-3.1-4.8-4.7-9-4.7c-4.1,0-7.1,1.6-8.9,4.7 c-1.8,3.1-2.7,7.6-2.7,13.4c0,5.8,0.9,10.3,2.7,13.4C93,192.8,96,194.3,100.1,194.3z M151.9,179.8c-4.2-1.2-7.5-3-9.8-5.3 c-2.4-2.4-3.5-5.9-3.5-10.6c0-5.7,2-10.1,6.1-13.4c4.1-3.2,9.6-4.8,16.7-4.8c2.9,0,5.8,0.3,8.6,0.8c2.8,0.5,5.7,1.3,8.6,2.4 c-0.2,1.9-0.5,4-1.1,6.1c-0.6,2.1-1.3,3.9-2.1,5.5c-1.8-0.7-3.8-1.4-5.9-2c-2.2-0.6-4.5-0.8-6.8-0.8c-2.5,0-4.5,0.4-5.9,1.2 c-1.4,0.8-2.1,2-2.1,3.8c0,1.6,0.5,2.8,1.5,3.5c1,0.7,2.4,1.3,4.3,1.9l6.4,1.9c2.1,0.6,4,1.3,5.7,2.2c1.7,0.9,3.1,1.9,4.3,3.2 c1.2,1.3,2.1,2.8,2.8,4.7c0.7,1.9,1,4.2,1,6.8c0,2.8-0.6,5.3-1.7,7.7c-1.2,2.4-2.8,4.5-5,6.2c-2.2,1.8-4.9,3.1-8,4.2 c-3.1,1-6.7,1.5-10.7,1.5c-1.8,0-3.4-0.1-4.9-0.2c-1.5-0.1-2.9-0.3-4.3-0.6c-1.4-0.3-2.7-0.6-4.1-1c-1.3-0.4-2.8-0.9-4.4-1.5 c0.1-2,0.5-4.1,1.1-6.1c0.6-2.1,1.3-4.1,2.2-6c2.5,1,4.8,1.7,7,2.2c2.2,0.5,4.5,0.7,6.9,0.7c1,0,2.2-0.1,3.4-0.3 c1.2-0.2,2.4-0.5,3.4-1c1-0.5,1.9-1.1,2.6-1.9c0.7-0.8,1.1-1.8,1.1-3.1c0-1.8-0.5-3.1-1.6-3.9c-1.1-0.8-2.6-1.5-4.5-2.1L151.9,179.8 z M191.2,147.1c2.7-0.4,5.3-0.7,8-0.7c2.6,0,5.3,0.2,8,0.7v30.7c0,3.1,0.2,5.6,0.7,7.6c0.5,2,1.2,3.6,2.2,4.7c1,1.2,2.3,2,3.8,2.5 c1.5,0.5,3.3,0.7,5.3,0.7c2.8,0,5.1-0.3,7-0.8v-45.4c2.7-0.4,5.3-0.7,7.9-0.7c2.6,0,5.3,0.2,8,0.7v55.8c-2.4,0.8-5.6,1.6-9.5,2.4 c-3.9,0.8-8,1.2-12.3,1.2c-3.8,0-7.5-0.3-11-0.9c-3.5-0.6-6.6-1.9-9.3-3.8c-2.7-1.9-4.8-4.8-6.3-8.5c-1.6-3.7-2.4-8.7-2.4-14.9 V147.1z M257.1,205.1c-0.4-2.8-0.7-5.5-0.7-8.2c0-2.7,0.2-5.5,0.7-8.3c2.8-0.4,5.5-0.7,8.2-0.7c2.7,0,5.5,0.2,8.3,0.7 c0.4,2.8,0.7,5.6,0.7,8.2c0,2.8-0.2,5.5-0.7,8.3c-2.8,0.4-5.6,0.7-8.2,0.7C262.6,205.7,259.9,205.5,257.1,205.1z M256.7,124.4 c2.9-0.4,5.8-0.7,8.6-0.7c2.9,0,5.8,0.2,8.8,0.7l-1.1,54.9c-2.6,0.4-5.1,0.7-7.5,0.7c-2.5,0-5.1-0.2-7.6-0.7L256.7,124.4z`;

const RIM_PATH = `M175,25C92.2,25,25,92.2,25,175c0,82.8,67.2,150,150,150c82.8,0,150-67.2,150-150 C325,92.2,257.8,25,175,25z M175,310c-74.6,0-135-60.4-135-135c0-74.6,60.4-135,135-135s135,60.4,135,135 C310,249.6,249.6,310,175,310z`;

// Generate Hexagon points for radius R centered at (cx, cy)
function getHexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * (Math.PI / 180);
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

// -------------------------------------------------------------
// Concept 1: The Official Sub-Brand ("osu!skills" Minimalist Badge)
// Authentic pink circle + white rim + official "osu!" + sleek dark pill badge with "skills"
// -------------------------------------------------------------
const svg1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Main osu! Circle -->
  <g transform="translate(81, 81)">
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#softShadow)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>
    <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    
    <!-- Minimalist Peppy-style "skills" Sub-Badge -->
    <g transform="translate(175, 298)">
      <!-- Dark slate pill with white outline -->
      <rect x="-65" y="-18" width="130" height="36" rx="18" fill="#1C171A" stroke="#FFFFFF" stroke-width="4"/>
      <!-- Crisp rounded typography -->
      <text x="0" y="6" font-family="'Torus', 'Comfortaa', 'Aller', 'Segoe UI', system-ui, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">SKILLS</text>
    </g>
  </g>
</svg>
`;

// -------------------------------------------------------------
// Concept 2: The Hex-Rim Hitcircle (O Suave Hexágono de Treino)
// Authentic pink circle, but the white border elegantly shapes into a rounded 6-sided skill hexagon
// -------------------------------------------------------------
const hexRimPoints = getHexPoints(175, 175, 145);
const innerHexPoints = getHexPoints(175, 175, 130);

const svg2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softShadow2" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g transform="translate(81, 81)">
    <!-- Solid circular disc -->
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#softShadow2)"/>

    <!-- Integrated 6-sided Skill Hexagon Rim -->
    <polygon points="${hexRimPoints}" fill="none" stroke="#FFFFFF" stroke-width="16" stroke-linejoin="round"/>
    
    <!-- 6 Subtle Vertex Skill Dots -->
    ${[0, 60, 120, 180, 240, 300].map(deg => {
      const rad = (deg - 30) * (Math.PI / 180);
      const x = 175 + 145 * Math.cos(rad);
      const y = 175 + 145 * Math.sin(rad);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#FFFFFF"/>`;
    }).join('\n    ')}

    <!-- Official osu! letters in center -->
    <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
  </g>
</svg>
`;

// -------------------------------------------------------------
// Concept 3: The Subtle Skill Radar Watermark (Peppy / flyte style)
// Authentic pink circle and white rim, with a delicate 6-axis skill web watermarked behind "osu!"
// -------------------------------------------------------------
const radarOuter = getHexPoints(175, 175, 115);
const radarMid = getHexPoints(175, 175, 75);
const radarInner = getHexPoints(175, 175, 38);

const svg3 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softShadow3" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g transform="translate(81, 81)">
    <!-- Main osu! Circle -->
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#softShadow3)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>

    <!-- Subtle Peppy-style Radar Grid Watermark (pure white with soft opacity) -->
    <g opacity="0.45" stroke="#FFFFFF" fill="none" stroke-width="2">
      <!-- 6 Axes from center to vertices -->
      ${[0, 60, 120, 180, 240, 300].map(deg => {
        const rad = (deg - 30) * (Math.PI / 180);
        const x = 175 + 115 * Math.cos(rad);
        const y = 175 + 115 * Math.sin(rad);
        return `<line x1="175" y1="175" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
      }).join('\n      ')}

      <!-- Concentric Hexagons -->
      <polygon points="${radarInner}" stroke-dasharray="3,3"/>
      <polygon points="${radarMid}"/>
      <polygon points="${radarOuter}" stroke-width="3"/>
    </g>

    <!-- Vertex Dots (the 6 skill nodes) -->
    <g fill="#FFFFFF" opacity="0.8">
      ${[0, 60, 120, 180, 240, 300].map(deg => {
        const rad = (deg - 30) * (Math.PI / 180);
        const x = 175 + 115 * Math.cos(rad);
        const y = 175 + 115 * Math.sin(rad);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/>`;
      }).join('\n      ')}
    </g>

    <!-- Official osu! letters in crisp solid white on top -->
    <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
  </g>
</svg>
`;

// -------------------------------------------------------------
// Concept 4: The 5th Mode Discipline Disc (Estilo Modo Oficial)
// Dark obsidian disc (#1F1921) with vibrant osu! pink rim (#FF66AB), featuring the radar hitcircle
// -------------------------------------------------------------
const radarFill = getHexPoints(175, 175, 95);

const svg4 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softShadow4" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g transform="translate(81, 81)">
    <!-- Dark Mode Disc -->
    <circle cx="175" cy="175" r="148" fill="#1C171A" filter="url(#softShadow4)"/>
    
    <!-- Vibrant osu! Pink Rim -->
    <circle cx="175" cy="175" r="140" fill="none" stroke="#FF66AB" stroke-width="16"/>

    <!-- Skill Radar polygon in translucent pink -->
    <polygon points="${radarFill}" fill="#FF66AB" fill-opacity="0.25" stroke="#FF66AB" stroke-width="3"/>
    
    <!-- 6 Skill Node Dots -->
    ${[0, 60, 120, 180, 240, 300].map(deg => {
      const rad = (deg - 30) * (Math.PI / 180);
      const x = 175 + 95 * Math.cos(rad);
      const y = 175 + 95 * Math.sin(rad);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#FF66AB"/>`;
    }).join('\n    ')}

    <!-- Official osu! letters in crisp white in center -->
    <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
  </g>
</svg>
`;

// -------------------------------------------------------------
// Concept 5: The Pure Vector Sub-Logo (osu! + skills em Torus puro, sem pill)
// Estilo direto de marcas oficiais como osu!stream e osu!academy
// -------------------------------------------------------------
const svg5 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="softShadow5" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <g transform="translate(81, 81)">
    <!-- Main osu! Circle -->
    <circle cx="175" cy="175" r="148" fill="#FF66AB" filter="url(#softShadow5)"/>
    <path d="${RIM_PATH}" fill="#FFFFFF"/>
    
    <!-- Shifted slightly upward so "skills" breathes comfortably below -->
    <g transform="translate(0, -14)">
      <path d="${OSU_TEXT_PATH}" fill="#FFFFFF"/>
    </g>

    <!-- Clean, human, minimalist "skills" label in Torus / Aller font -->
    <text x="175" y="246" font-family="'Torus', 'Comfortaa', 'Aller', 'Segoe UI', system-ui, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">skills</text>
  </g>
</svg>
`;

const concepts = [
  { name: 'peppy_concept_1_sub_brand.png', svg: svg1 },
  { name: 'peppy_concept_2_hex_rim.png', svg: svg2 },
  { name: 'peppy_concept_3_radar_watermark.png', svg: svg3 },
  { name: 'peppy_concept_4_mode_discipline.png', svg: svg4 },
  { name: 'peppy_concept_5_direct_sublogo.png', svg: svg5 },
];

const targetDir = 'C:/Users/Usuário/.gemini/antigravity/brain/2b0fa344-e226-46ab-9900-ff771c54090d';

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false,
      transparent: true,
      webPreferences: { backgroundThrottling: false }
    });

    for (const c of concepts) {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { background: transparent; display:flex; align-items:center; justify-content:center; width:512px; height:512px; overflow:hidden; }
          </style>
        </head>
        <body>${c.svg}</body>
        </html>
      `;
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(r => setTimeout(r, 150));
      const img = await win.webContents.capturePage();
      const outPath = path.join(targetDir, c.name);
      fs.writeFileSync(outPath, img.toPNG());
      console.log(`Rendered: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    }

    console.log('All 4 peppy-style concepts rendered successfully!');
    app.quit();
  } catch (err) {
    console.error('Error rendering concepts:', err);
    app.quit();
  }
});
