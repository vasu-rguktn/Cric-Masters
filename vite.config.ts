import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // Dynamic relative base URL for GitHub Pages deployment
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cric.png', 'favicon.svg'],
      manifest: {
        name: 'Cric Masters — Faculty Cricket',
        short_name: 'Cric Masters',
        description: 'Faculty Cricket Team Generator & Coin Toss App',
        theme_color: '#0b1d13',
        background_color: '#06110a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'cric.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'cric.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'cric.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
});
