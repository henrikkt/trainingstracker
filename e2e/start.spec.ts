import { expect, test } from '@playwright/test';

test('Startseite lädt mit Titel und strikter CSP ohne Konsolenfehler', async ({ page }) => {
  const fehler: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(e.message));

  await page.goto('./');
  await expect(page).toHaveTitle('Stemm');
  await expect(page.getByRole('heading', { name: /Stemm/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Training starten' })).toBeVisible();

  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("script-src 'self'");

  expect(fehler).toEqual([]);
});
