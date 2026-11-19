import { expect, test } from './fixtures.ts';

/**
 * Rauchtest gegen die veröffentlichte App (nur auf Anfrage):
 *   LIVE=1 PW_BASE_URL=https://henrikkt.github.io/trainingstracker/ npx playwright test live
 * Prüft ohne Konto: Login-Seite lädt ohne CSP-/JS-Fehler (Wachposten), CSP enthält nur das eigene
 * Supabase-Projekt, Manifest + Icons erreichbar, Service Worker aktiv, App-Hülle startet offline.
 */
test.skip(!process.env.LIVE, 'nur mit LIVE=1 gegen die veröffentlichte Seite');

test('Live: Login-Seite, CSP, Manifest, Icons, Service Worker, Offline-Start', async ({ page, request, context }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Stemm');
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();

  const csp = (await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')) ?? '';
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src 'self'");
  expect(csp).toMatch(/connect-src 'self' https:\/\/[a-z0-9]+\.supabase\.co wss:\/\/[a-z0-9]+\.supabase\.co;/);
  expect(csp).toContain("object-src 'none'");

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await request.get(new URL(manifestHref!, page.url()).toString())).json();
  expect(manifest).toMatchObject({ short_name: 'Stemm', display: 'standalone', lang: 'de' });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await request.get(new URL(icon.src, page.url()).toString())).status(), icon.src).toBe(200);
  }
  expect((await request.get(new URL('apple-touch-icon-180x180.png', page.url()).toString())).status()).toBe(200);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((ok) => navigator.serviceWorker.addEventListener('controllerchange', () => ok(), { once: true }));
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
  await expect(page.getByText('Für die Anmeldung brauchst du einmal Internet')).toBeVisible();
  await context.setOffline(false);
});
