import { test } from '@playwright/test';

/**
 * Screenshots zur Sichtprüfung – nur auf Anfrage (SCREENSHOTS=1 npm run test:e2e),
 * jeweils Handy (375 px) und Desktop. Ablage: e2e/screenshots/ (nicht committed).
 */
test.skip(!process.env.SCREENSHOTS, 'Screenshots nur mit SCREENSHOTS=1');

const seiten = (process.env.SCREENSHOTS_SEITEN ?? 'training').split(',');

for (const seite of seiten) {
  test(`Screenshot ${seite}`, async ({ page }, info) => {
    await page.goto(`./#/${seite}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `e2e/screenshots/${seite}-${info.project.name}.png`, fullPage: true });
  });
}
