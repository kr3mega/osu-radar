import { app, BrowserWindow } from 'electron';
import fs from 'fs';

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 512,
      height: 512,
      show: false
    });

    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <circle cx="256" cy="256" r="230" fill="#FF66AB"/>
      <circle cx="256" cy="256" r="230" fill="none" stroke="#FFFFFF" stroke-width="24"/>
      <text x="256" y="270" font-family="sans-serif" font-size="72" font-weight="bold" fill="#FFFFFF" text-anchor="middle">osu!</text>
    </svg>`;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:transparent;overflow:hidden;">
        ${testSvg}
      </body>
      </html>
    `)}`);

    // Give it 100ms to finish rendering
    await new Promise(r => setTimeout(r, 200));

    const image = await win.webContents.capturePage();
    fs.writeFileSync('test_render.png', image.toPNG());
    console.log('Success! Saved test_render.png, size:', fs.statSync('test_render.png').size);
    app.quit();
  } catch (err) {
    console.error('Render error:', err);
    app.quit();
  }
});
