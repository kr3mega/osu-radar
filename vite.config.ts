import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localSongsPlugin } from './src/server/localSongsPlugin';
import { localSkinsPlugin } from './src/server/localSkinsPlugin';
import { localLazerPlugin } from './src/server/localLazerPlugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localSongsPlugin(), localSkinsPlugin(), localLazerPlugin()],
  resolve: {
    alias: [
      { find: /^~@fonts/, replacement: path.resolve(__dirname, 'src/osu-web/fonts') },
      { find: /^@fonts/, replacement: path.resolve(__dirname, 'src/osu-web/fonts') },
      { find: /^~@images/, replacement: path.resolve(__dirname, 'src/osu-web/images') },
      { find: /^@images/, replacement: path.resolve(__dirname, 'src/osu-web/images') },
      { find: /^~@image_resources/, replacement: path.resolve(__dirname, 'src/osu-web/images') },
      { find: /^@image_resources/, replacement: path.resolve(__dirname, 'src/osu-web/images') },
      { find: /^\.\.\/webfonts/, replacement: path.resolve(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts') },
      { find: /^\.\.\/fonts\/glyphicons/, replacement: path.resolve(__dirname, 'node_modules/bootstrap/fonts/glyphicons') },
      { find: /^~@fortawesome/, replacement: path.resolve(__dirname, 'node_modules/@fortawesome') },
      { find: /^~bootstrap/, replacement: path.resolve(__dirname, 'node_modules/bootstrap') },
      { find: /^~inter-ui/, replacement: path.resolve(__dirname, 'node_modules/inter-ui') },
      { find: /^~photoswipe/, replacement: path.resolve(__dirname, 'node_modules/photoswipe') },
    ],
  },
  css: {
    preprocessorOptions: {
      less: {
        math: 'parens-division',
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
  },
});
