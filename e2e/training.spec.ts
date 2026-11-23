import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

/** Wartet, bis alle Schreibvorgänge in IndexedDB abgeschlossen sind (vor Neuladen!). */
const gespeichert = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-schreibt', '0');

const feld = (scope: Page | Locator, name: string) => scope.getByRole('textbox', { name, exact: true });
const karte = (page: Page, uebung: string) => page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: uebung, exact: true }) });

async function setzeWert(scope: Page | Locator, name: string, wert: string) {
  await feld(scope, name).fill(wert);
  await feld(scope, name).press('Enter');
}

async function beispielUebernehmen(page: Page, name: string) {
  await page.goto('./#/plaene');
  await page.getByRole('button', { name: `Beispiel ${name} übernehmen` }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

test('Training aus Vorlage erfassen, nach Neuladen fortsetzen, Zusammenfassung und Vorschlag fürs nächste Mal', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await beispielUebernehmen(page, 'Beine');

  // Start aus Vorlage
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Training' }).click();
  await page.getByRole('button', { name: 'Vorlage Beine starten' }).click();
  await expect(page).toHaveURL(/#\/training\/laufend$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Beine' })).toBeVisible();

  const kniebeuge = karte(page, 'Kniebeuge (Langhantel)');
  await expect(kniebeuge).toContainText('Letztes Mal: noch nie gemacht');

  // Satz 1: Gewicht 100 (wird in die weiteren Sätze übernommen), 8 Wdh., abhaken
  const satz1 = page.getByRole('region', { name: 'Satz 1 bearbeiten' });
  await setzeWert(satz1, 'Gewicht', '100');
  await setzeWert(satz1, 'Wiederholungen', '8');
  await satz1.getByRole('button', { name: 'Satz abhaken' }).click();
  await expect(page.getByRole('timer', { name: 'Pausentimer' })).toContainText(/[12]:\d\d/);

  // Satz 2 ist automatisch aufgeklappt und hat 100 kg übernommen
  const satz2 = page.getByRole('region', { name: 'Satz 2 bearbeiten' });
  await expect(feld(satz2, 'Gewicht')).toHaveValue('100');
  await setzeWert(satz2, 'Wiederholungen', '8');
  await satz2.getByRole('button', { name: 'Satz abhaken' }).click();

  // Neuladen mitten im Training: nichts geht verloren, Pause läuft weiter
  await gespeichert(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Beine' })).toBeVisible();
  await expect(kniebeuge).toContainText('2/3 Sätze');
  await expect(page.getByRole('timer', { name: 'Pausentimer' })).toBeVisible();

  const satz3 = page.getByRole('region', { name: 'Satz 3 bearbeiten' });
  await setzeWert(satz3, 'Wiederholungen', '8');
  await satz3.getByRole('button', { name: 'Satz abhaken' }).click();
  await page.getByRole('button', { name: 'Pause beenden' }).click();
  await expect(page.getByRole('timer')).toBeHidden();

  // Beenden (offene Sätze der anderen Übungen werden verworfen – Dialog wird bestätigt)
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Stark gemacht!' })).toBeVisible();
  const kennzahlen = page.getByRole('region', { name: 'Kennzahlen' });
  await expect(kennzahlen).toContainText('2.400 kg');
  await expect(kennzahlen).toContainText('3Sätze');
  await expect(page.getByText('3 × 8 × 100 kg')).toBeVisible();

  // Zweites Training: „Letztes Mal“ und nachvollziehbarer Vorschlag (+5 kg bei Kniebeuge)
  await page.getByRole('link', { name: 'Zurück' }).click();
  await expect(page.getByRole('list', { name: 'Letzte Trainings' })).toContainText('Beine');
  await page.getByRole('button', { name: 'Vorlage Beine starten' }).click();
  await expect(kniebeuge).toContainText('Letztes Mal:');
  await expect(page.getByRole('list', { name: 'Frühere Trainings Kniebeuge (Langhantel)' }).getByRole('listitem')).toHaveText([/^\d\d\.\d\d\.3 × 8 × 100 kg$/]);
  await expect(kniebeuge).toContainText('Heute: 105 kg × 5 Wdh.');
  await expect(kniebeuge).toContainText('Alle 3 Sätze mit 8 Wdh. bei 100 kg geschafft → +5 kg, Ziel wieder 5 Wdh.');
  await expect(feld(page.getByRole('region', { name: 'Satz 1 bearbeiten' }), 'Gewicht')).toHaveValue('105');
  // Leiste „Jetzt dran“: aktueller Satz mit vorausgewähltem empfohlenem Gewicht
  await expect(page.getByRole('group', { name: 'Jetzt dran' })).toContainText('Kniebeuge (Langhantel) · Satz 1/3');
  await expect(page.getByRole('group', { name: 'Jetzt dran' })).toContainText('105 kg × 5empfohlen');
});

test('Leiste „Jetzt dran“ folgt dem aktuellen Satz und springt nach dem Zuklappen wieder hin', async ({ page }) => {
  await page.goto('./#/plaene');
  await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible();
  await page.goto('./#/training');
  await page.getByRole('button', { name: 'Vorlage Push starten' }).click();
  const leiste = page.getByRole('group', { name: 'Jetzt dran' });
  await expect(leiste).toContainText('Bankdrücken (Langhantel) · Satz 1/3');

  await page.getByRole('region', { name: 'Satz 1 bearbeiten' }).getByRole('button', { name: 'Satz abhaken' }).click();
  await expect(leiste).toContainText('Bankdrücken (Langhantel) · Satz 2/3');

  // Zuklappen: kein Satz offen, die Leiste zeigt trotzdem den aktuellen; Tipp klappt ihn wieder auf
  await page.getByRole('button', { name: 'Zuklappen' }).click();
  await expect(page.getByRole('region', { name: /Satz \d bearbeiten/ })).toHaveCount(0);
  await expect(leiste).toContainText('Satz 2/3');
  await leiste.getByRole('button', { name: /zum Satz springen/ }).click();
  await expect(page.getByRole('region', { name: 'Satz 2 bearbeiten' })).toBeInViewport();
});

test('Freies Training komplett offline erfassen', async ({ page, context }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((ok) => navigator.serviceWorker.addEventListener('controllerchange', () => ok(), { once: true }));
    }
  });
  await context.setOffline(true);
  await gespeichert(page);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Offline');

  await page.getByRole('button', { name: 'Freies Training starten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Freies Training' })).toBeVisible();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Übungen hinzufügen' });
  await dialog.getByPlaceholder('Übung suchen …').fill('klimmz');
  await dialog.getByRole('button', { name: /Klimmzüge/ }).click();
  await dialog.getByRole('button', { name: '1 Übung hinzufügen' }).click();

  const klimmzuege = karte(page, 'Klimmzüge');
  await expect(klimmzuege).toContainText('Ziel 3 × 5–10');
  await setzeWert(page.getByRole('region', { name: 'Satz 1 bearbeiten' }), 'Wiederholungen', '10');
  await page.getByRole('group', { name: /^RIR/ }).getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('region', { name: 'Satz 1 bearbeiten' }).getByRole('button', { name: 'Satz abhaken' }).click();
  // Satz 2 direkt in der kompakten Zeile abhaken (ein Tipp)
  await page.getByRole('button', { name: 'Zuklappen' }).click();
  await page.getByRole('button', { name: 'Satz 2 abhaken' }).click();

  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Stark gemacht!' })).toBeVisible();
  await expect(page.getByText('10/5')).toBeVisible();
  await context.setOffline(false);
});

test('Fehlende Übung direkt im laufenden Training anlegen', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Freies Training starten' }).click();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  const auswahl = page.getByRole('dialog', { name: 'Übungen hinzufügen' });
  // Suchtext und Muskelfilter werden ins Formular übernommen
  await auswahl.getByPlaceholder('Übung suchen …').fill('Landmine Press');
  await auswahl.getByRole('group', { name: 'Nach Muskelgruppe filtern' }).getByRole('button', { name: 'Schultern' }).click();
  await expect(auswahl.getByText(/Keine Übung gefunden/)).toBeVisible();
  await auswahl.getByRole('button', { name: 'Neue Übung anlegen' }).click();

  const formular = page.getByRole('dialog', { name: 'Neue Übung' });
  await expect(formular.getByRole('textbox', { name: 'Name' })).toHaveValue('Landmine Press');
  await expect(formular.getByRole('combobox', { name: 'Muskelgruppe' })).toHaveValue('schultern');
  await formular.getByRole('button', { name: 'Anlegen und auswählen' }).click();

  // Zurück in der Auswahl: neue Übung ist bereits gewählt
  await auswahl.getByPlaceholder('Übung suchen …').fill('landmine');
  await expect(auswahl.getByRole('button', { name: /Landmine Press/ })).toHaveAttribute('aria-pressed', 'true');
  await auswahl.getByRole('button', { name: '1 Übung hinzufügen' }).click();
  await expect(karte(page, 'Landmine Press')).toBeVisible();
});
