import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Erzeugt die App-Icons aus public/favicon.svg:  npx pwa-assets-generator
// (Ergebnis liegt in public/ und wird committed – nur neu erzeugen, wenn sich das Logo ändert.)
const grund = '#0D0F12';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.18, resizeOptions: { background: grund } },
    apple: { ...minimal2023Preset.apple, padding: 0.12, resizeOptions: { background: grund } },
  },
  images: ['public/favicon.svg'],
});
