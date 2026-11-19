import { type Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

function sammleFehler(page: Page): string[] {
  const fehler: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(e.message));
  return fehler;
}

test('Start leitet auf Training um, strikte CSP, keine Konsolenfehler', async ({ page }) => {
  const fehler = sammleFehler(page);
  await page.goto('./');
  await expect(page).toHaveTitle('Stemm');
  await expect(page).toHaveURL(/#\/training$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();

  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("script-src 'self'");
  expect(fehler).toEqual([]);
});

test('Navigation über alle Tabs', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  for (const titel of ['Pläne', 'Fortschritt', 'Profil', 'Training']) {
    await nav.getByRole('link', { name: titel }).click();
    await expect(page.getByRole('heading', { level: 1, name: titel })).toBeVisible();
    await expect(nav.getByRole('link', { name: titel })).toHaveAttribute('aria-current', 'page');
  }
});

test('Manifest ist installierbar konfiguriert', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const manifest = await (await request.get(new URL(href!, page.url()).toString())).json();
  expect(manifest.short_name).toBe('Stemm');
  expect(manifest.display).toBe('standalone');
  expect(manifest.lang).toBe('de');
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
});

test('App startet nach einmaligem Besuch auch offline', async ({ page, context }) => {
  await page.goto('./');
  // warten, bis der Service Worker aktiv ist und die Seite steuert
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((ok) => navigator.serviceWorker.addEventListener('controllerchange', () => ok(), { once: true }));
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Offline');

  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Fortschritt' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Fortschritt' })).toBeVisible();
  await context.setOffline(false);
});
