import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-End-Tests gegen den GitHub-Pages-Build (npm run build:pages).
 * Lokal (Windows) wird der installierte Microsoft Edge verwendet; in CI und Codespaces
 * setzt man PW_CHANNEL= (leer) und nutzt das mitgelieferte Chromium
 * ("npx playwright install --with-deps chromium").
 * PW_BASE_URL=https://<benutzer>.github.io/trainingstracker/ testet direkt die Live-Seite.
 * Screenshots sparsam: nur die Projekte "handy" (375 px) und "desktop".
 */
const kanal = process.env.PW_CHANNEL ?? 'msedge';
const extern = process.env.PW_BASE_URL;
const basis = extern ?? 'http://localhost:4174/trainingstracker/';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: basis,
    channel: kanal || undefined,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    serviceWorkers: 'allow',
  },
  webServer: extern
    ? undefined
    : {
        command: 'npm run preview:pages',
        url: basis,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
  projects: [
    {
      name: 'handy',
      use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium', channel: kanal || undefined, viewport: { width: 375, height: 667 } },
    },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
});
