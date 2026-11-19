import { type Page } from '@playwright/test';
import { test } from './fixtures.ts';
import { legeTrainingsAn } from './hilfen.ts';

/**
 * Screenshots zur Sichtprüfung – nur auf Anfrage (SCREENSHOTS=1 npm run test:e2e),
 * jeweils Handy (375 px) und Desktop. Ablage: e2e/screenshots/ (nicht committed).
 * SCREENSHOTS_SEITEN: Routen (z. B. "training,plaene") oder "live" = laufendes Training mit Pausentimer.
 * SCREENSHOTS_DATEN=1: vorher Beispieltrainings der letzten Wochen anlegen (für Fortschritt-Seiten).
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
    if (process.env.SCREENSHOTS_DATEN) {
      const saetze = (kg: number, wdh: number[]) => wdh.map((w) => ({ gewicht: kg, wdh: w }));
      await legeTrainingsAn(page, [
        { vorTagen: 21, titel: 'Beine', uebungen: { kniebeuge: saetze(95, [5, 5, 5]), beinpresse: saetze(160, [10, 10, 9]) } },
        { vorTagen: 16, titel: 'Push', uebungen: { 'bankdruecken-lh': saetze(75, [8, 8, 7]), 'seitheben-kh': saetze(10, [15, 14, 12]) } },
        { vorTagen: 14, titel: 'Beine', uebungen: { kniebeuge: saetze(100, [5, 5, 5]), beinpresse: saetze(165, [10, 9, 9]) } },
        { vorTagen: 9, titel: 'Push', uebungen: { 'bankdruecken-lh': saetze(77.5, [8, 7, 7]), 'trizepsdruecken-seil': saetze(25, [12, 12, 11]) } },
        { vorTagen: 7, titel: 'Beine', uebungen: { kniebeuge: saetze(105, [5, 5, 4]), 'beinbeuger-liegend': saetze(45, [10, 10, 9]) } },
        { vorTagen: 2, titel: 'Pull', uebungen: { klimmzuege: saetze(0, [8, 7, 6]), 'rudern-lh': saetze(70, [10, 9, 8]) } },
        { vorTagen: 0, titel: 'Beine', uebungen: { kniebeuge: saetze(107.5, [5, 5, 5]), beinpresse: saetze(170, [10, 10, 10]) } },
      ]);
    }
    if (seite === 'live') await laufendesTraining(page);
    else await page.goto(`./#/${seite}`);
    await page.evaluate(() => document.fonts.ready);
    // nachgeladene Diagramme abwarten (falls die Seite eines hat)
    await page.locator('figure svg .recharts-line-curve').first().waitFor({ timeout: 3000 }).catch(() => undefined);
    const datei = seite.replace(/\//g, '-');
    // Live-Training: nur der sichtbare Bereich, damit fixierte Leisten (Pause, Navigation) korrekt erscheinen
    await page.screenshot({ path: `e2e/screenshots/${datei}-${info.project.name}.png`, fullPage: seite !== 'live' });
  });
}
