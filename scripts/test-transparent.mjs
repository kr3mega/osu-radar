import { app, BrowserWindow } from 'electron';
import fs from 'fs';

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><circle cx="128" cy="128" r="120" fill="#FF66AB"/></svg>`;
  await win.loadURL(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  await new Promise(r => setTimeout(r, 150));
  const img = await win.webContents.capturePage();
  fs.writeFileSync('test_transparent.png', img.toPNG());
  console.log('Capture success, bytes:', img.toPNG().length);
  app.quit();
});
