import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        osu: {
          base: '#18131d',
          panel: '#221c29',
          surface: '#2a2233',
          hover: '#382e44',
          border: 'rgba(255, 255, 255, 0.08)',
          pink: '#ff66aa',
          cyan: '#00d8ff',
          yellow: '#f5a623',
          text: {
            primary: '#ffffff',
            secondary: '#c8b6d6',
            muted: '#806e8f',
          },
        },
        mod: {
          nm: '#5975a4',
          hd: '#e5a100',
          hr: '#ff385c',
          dt: '#9b59b6',
          fm: '#2ecc71',
          tb: '#f39c12',
        },
      },
      fontFamily: {
        torus: ['Torus', 'Exo 2', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 4px 14px rgba(0, 0, 0, 0.35)',
        glowPink: '0 0 16px rgba(255, 102, 170, 0.35)',
        glowCyan: '0 0 16px rgba(0, 216, 255, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
