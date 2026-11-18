import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Strikte Content-Security-Policy. GitHub Pages kann keine eigenen HTTP-Header senden,
 * deshalb kommt sie als <meta>-Tag (frame-ancestors ist dort wirkungslos und fehlt daher).
 * connect-src erlaubt zusätzlich nur das eigene Supabase-Projekt (REST + Realtime/WebSocket).
 */
export function baueCsp(supabaseUrl?: string): string {
  const supabase = supabaseUrl ? [supabaseUrl, supabaseUrl.replace(/^https:/, 'wss:')] : [];
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    ["connect-src 'self'", ...supabase].join(' '),
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/** Fügt die CSP nur im Produktions-Build ein (im Dev-Modus braucht Vite Inline-Skripte und -Styles). */
function cspPlugin(csp: string): Plugin {
  return {
    name: 'stemm-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }],
    },
  };
}

/**
 * Modi:
 *  - "pages": GitHub-Pages-Build, base /trainingstracker/ (oder BASE_PATH aus der CI)
 *  - sonst:   base /
 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const base = env.BASE_PATH ?? (mode === 'pages' ? '/trainingstracker/' : '/');

  return {
    base,
    plugins: [react(), tailwindcss(), cspPlugin(baueCsp(env.VITE_SUPABASE_URL))],
    server: { host: true, port: 5174 },
    preview: { port: 4174 },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // keine Inline-Assets als data:-URL in Skripten → strikte CSP bleibt einfach
      assetsInlineLimit: 0,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  };
});
