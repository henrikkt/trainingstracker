import { test, type Page } from '@playwright/test';

/**
 * Screenshots zur Sichtprüfung – nur auf Anfrage (SCREENSHOTS=1 npm run test:e2e),
 * jeweils Handy (375 px) und Desktop. Ablage: e2e/screenshots/ (nicht committed).
 * SCREENSHOTS_SEITEN: Routen (z. B. "training,plaene") oder "live" = laufendes Training mit Pausentimer.
 */
test.skip(!process.env.SCREENSHOTS, 'Screenshots nur mit SCREENSHOTS=1');

const seiten = (process.env.SCREENSHOTS_SEITEN ?? 'training').split(',');

/** Bereitet ein laufendes Push-Training vor: Satz 1 mit 80 kg × 8 abgehakt, Pause läuft. */
async function laufendesTraining(page: Page) {
  await page.goto('./#/plaene');
  await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
  await page.goto('./#/training');
  await page.getByRole('button', { name: 'Vorlage Push starten' }).click();
  const satz1 = page.getByRole('region', { name: 'Satz 1 bearbeiten' });
  await satz1.getByRole('textbox', { name: 'Gewicht', exact: true }).fill('80');
  await satz1.getByRole('textbox', { name: 'Gewicht', exact: true }).press('Enter');
  await satz1.getByRole('textbox', { name: 'Wiederholungen', exact: true }).fill('8');
  await satz1.getByRole('textbox', { name: 'Wiederholungen', exact: true }).press('Enter');
  await satz1.getByRole('button', { name: 'Satz abhaken' }).click();
  await page.waitForTimeout(1000); // sanftes Scrollen zum nächsten Satz abwarten
}

for (const seite of seiten) {
  test(`Screenshot ${seite}`, async ({ page }, info) => {
    if (seite === 'live') await laufendesTraining(page);
    else await page.goto(`./#/${seite}`);
    await page.evaluate(() => document.fonts.ready);
    const datei = seite.replace(/\//g, '-');
    // Live-Training: nur der sichtbare Bereich, damit fixierte Leisten (Pause, Navigation) korrekt erscheinen
    await page.screenshot({ path: `e2e/screenshots/${datei}-${info.project.name}.png`, fullPage: seite !== 'live' });
  });
}
