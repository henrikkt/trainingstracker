import { expect, test, type Locator, type Page } from '@playwright/test';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });
const vorlagenUebungen = (page: Page) => page.getByRole('list', { name: 'Übungen der Vorlage' }).getByRole('listitem');
/** Zahlenfeld eines Steppers (nicht die –/+-Knöpfe, deren Name den Feldnamen enthält) */
const feld = (scope: Page | Locator, name: string) => scope.getByRole('textbox', { name, exact: true });

test('Beispielvorlage übernehmen, bearbeiten und nach Neuladen wiederfinden', async ({ page }) => {
  await page.goto('./#/plaene');
  await expect(page.getByText('Noch keine Vorlagen')).toBeVisible();

  await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible();
  const uebungen = vorlagenUebungen(page);
  await expect(uebungen).toHaveCount(5);

  // Erste Übung: Sätze 3 → 4, zweite Übung entfernen, Namen ändern
  const erste = uebungen.first();
  await expect(erste).toContainText('Bankdrücken (Langhantel)');
  await erste.getByRole('button', { name: 'Sätze erhöhen' }).click();
  await expect(feld(erste, 'Sätze')).toHaveValue('4');
  await page.getByRole('button', { name: 'Schrägbankdrücken (Kurzhantel) entfernen' }).click();
  await expect(uebungen).toHaveCount(4);
  await page.getByLabel('Name der Vorlage', { exact: true }).fill('Push Montag');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Push Montag' })).toBeVisible();
  await expect(vorlagenUebungen(page)).toHaveCount(4);
  await expect(feld(vorlagenUebungen(page).first(), 'Sätze')).toHaveValue('4');

  await page.getByRole('link', { name: 'Zurück' }).click();
  await expect(page.getByRole('link', { name: /Push Montag/ })).toContainText('4 Übungen');
});

test('Neue Vorlage mit Übungsauswahl (Suche + Mehrfachauswahl)', async ({ page }) => {
  await page.goto('./#/plaene');
  await page.getByRole('button', { name: 'Neue Vorlage' }).click();
  await page.getByRole('button', { name: 'Übungen hinzufügen' }).click();

  const dialog = page.getByRole('dialog', { name: 'Übungen hinzufügen' });
  await dialog.getByPlaceholder('Übung suchen …').fill('kniebeuge');
  await dialog.getByRole('button', { name: /Kniebeuge \(Langhantel\)/ }).click();
  await dialog.getByPlaceholder('Übung suchen …').fill('');
  await dialog.getByRole('button', { name: 'Waden', exact: true }).click();
  await dialog.getByRole('button', { name: /Wadenheben sitzend/ }).click();
  await dialog.getByRole('button', { name: '2 Übungen hinzufügen' }).click();

  await expect(dialog).toBeHidden();
  const liste = vorlagenUebungen(page);
  await expect(liste).toHaveCount(2);
  // Ziel übernimmt den Wiederholungsbereich der Übung (Kniebeuge 5–8)
  await expect(feld(liste.first(), 'Wdh. von')).toHaveValue('5');
  await expect(feld(liste.first(), 'Wdh. bis')).toHaveValue('8');
});

test('Eigene Übung anlegen und Übungseinstellungen dauerhaft ändern', async ({ page }) => {
  await page.goto('./#/plaene/uebungen');
  await page.getByRole('button', { name: 'Eigene Übung anlegen' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Landmine Press');
  await page.getByLabel('Muskelgruppe', { exact: true }).selectOption({ label: 'Schultern' });
  await page.getByRole('button', { name: 'Trizeps', exact: true }).click();
  await page.getByRole('button', { name: 'Übung anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Landmine Press' })).toBeVisible();
  await expect(page.getByText('Schultern · Langhantel – außerdem Trizeps')).toBeVisible();

  await page.getByRole('link', { name: 'Zurück' }).click();
  await page.getByPlaceholder('Übung suchen …').fill('landmine');
  await expect(page.getByRole('button', { name: /Landmine Press/ })).toContainText('eigene');

  // Einstellungen einer Katalog-Übung: Kniebeuge +5 kg → 4,5 kg
  await page.getByPlaceholder('Übung suchen …').fill('kniebeuge lang');
  await page.getByRole('button', { name: /^Kniebeuge \(Langhantel\)/ }).click();
  await expect(feld(page, 'Steigerung')).toHaveValue('5');
  await page.getByRole('button', { name: 'Steigerung verringern' }).click();
  await expect(feld(page, 'Steigerung')).toHaveValue('4,5');

  await page.reload();
  await expect(feld(page, 'Steigerung')).toHaveValue('4,5');
  await page.getByRole('button', { name: 'Auf Standard zurücksetzen' }).click();
  await expect(feld(page, 'Steigerung')).toHaveValue('5');
});

test('Profil-Einstellungen bleiben nach Neuladen erhalten', async ({ page }) => {
  await page.goto('./#/profil');
  await page.getByRole('radio', { name: 'RPE (1–10)' }).click();
  await page.getByRole('radio', { name: '1,25 kg' }).click();
  await feld(page, 'Standard-Pause').fill('90');
  await feld(page, 'Standard-Pause').press('Enter');
  await expect(page.getByText('1:30 min – pro Übung anpassbar.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'RPE (1–10)' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: '1,25 kg' })).toHaveAttribute('aria-checked', 'true');
  await expect(feld(page, 'Standard-Pause')).toHaveValue('90');
  await nav(page).getByRole('link', { name: 'Training' }).click();
});
