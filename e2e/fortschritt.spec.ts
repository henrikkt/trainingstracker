import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { gespeichert, legeTrainingsAn } from './hilfen.ts';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });
const drei = (gewicht: number, wdh: number) => [1, 2, 3].map(() => ({ gewicht, wdh }));

async function dreiKniebeugeTrainings(page: Page) {
  await legeTrainingsAn(page, [
    { vorTagen: 14, titel: 'Beine', uebungen: { kniebeuge: drei(100, 5) } },
    { vorTagen: 7, titel: 'Beine', uebungen: { kniebeuge: drei(105, 5) } },
    { vorTagen: 0, titel: 'Beine', uebungen: { kniebeuge: [{ gewicht: 110, wdh: 5 }, { gewicht: 110, wdh: 4 }], 'bankdruecken-lh': drei(80, 8) } },
  ]);
}

test('Übersicht: diese Woche, Kalender mit Trainingstagen, Volumen pro Muskel', async ({ page }) => {
  await dreiKniebeugeTrainings(page);
  await nav(page).getByRole('link', { name: 'Fortschritt' }).click();

  const woche = page.getByRole('region', { name: 'Diese Woche' });
  await expect(woche).toContainText('1Training diese Woche');
  await expect(woche).toContainText('5Sätze diese Woche');

  // Heutiger Tag ist markiert; Tipp zeigt das Training des Tages
  const kalender = page.getByRole('grid', { name: 'Trainingskalender' });
  const tag = kalender.getByRole('button', { name: /1 Training$/ }).last();
  await tag.click();
  await expect(page.getByRole('list', { name: 'Trainings am gewählten Tag' })).toContainText('Beine');

  const muskeln = page.getByRole('list', { name: 'Arbeitssätze pro Muskelgruppe' });
  await expect(muskeln).toContainText('Brust');
  await expect(muskeln).toContainText('Quadrizeps');
  await expect(muskeln.getByRole('listitem').first()).toContainText('3 Sätze'); // Brust 3 = Quadrizeps 2 + …; sortiert nach Sätzen

  // Vorige Woche: nur Kniebeuge (3 Sätze Quadrizeps, Gesäß/Adduktoren je 1,5)
  await page.getByRole('button', { name: 'Vorige Woche' }).click();
  await expect(muskeln.getByRole('listitem').first()).toContainText('Quadrizeps');
  await expect(muskeln).toContainText('1,5 Sätze');
  await expect(muskeln).not.toContainText('Brust');
});

test('Übung: Diagramm (umschaltbar), Rekorde mit Datum und alle Einheiten', async ({ page }) => {
  // Recharts darf unter der strikten CSP keine Fehler erzeugen
  const fehler: string[] = [];
  page.on('console', (m) => void (m.type() === 'error' && fehler.push(m.text())));
  page.on('pageerror', (e) => fehler.push(e.message));
  await dreiKniebeugeTrainings(page);
  await page.goto('./#/fortschritt/uebungen');
  await expect(page.getByRole('list', { name: 'Trainierte Übungen' }).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('link', { name: /Kniebeuge \(Langhantel\)/ }).click();

  const diagramm = page.getByRole('figure');
  await expect(diagramm).toHaveAttribute('aria-label', 'Geschätztes 1RM (Epley): von 117 auf 128 kg über 3 Trainings');
  await expect(diagramm.locator('svg .recharts-line-curve')).toBeVisible();

  await page.getByRole('radio', { name: 'Volumen' }).click();
  await expect(diagramm).toHaveAttribute('aria-label', 'Volumen pro Training: von 1500 auf 990 kg über 3 Trainings');

  const rekorde = page.getByRole('region', { name: 'Persönliche Rekorde' });
  await expect(rekorde).toContainText('Schwerstes Gewicht110 kg');
  await expect(rekorde).toContainText('Bester Satz (kg × Wdh.)110 kg × 5');
  await expect(page.getByRole('list', { name: 'Alle Einheiten' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('list', { name: 'Alle Einheiten' })).toContainText('110 kg × 5/4');
  expect(fehler).toEqual([]);
});

test('Körpergewicht eintragen, überschreiben und als Verlauf sehen', async ({ page }) => {
  await page.goto('./#/fortschritt/koerpergewicht');
  const kg = page.getByRole('textbox', { name: 'Körpergewicht', exact: true });
  await kg.fill('82,4');
  await kg.press('Enter');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('list', { name: 'Einträge' }).getByRole('listitem')).toHaveCount(1);

  // Gestern nachtragen
  const gestern = new Date(Date.now() - 86_400_000);
  const tag = `${gestern.getFullYear()}-${String(gestern.getMonth() + 1).padStart(2, '0')}-${String(gestern.getDate()).padStart(2, '0')}`;
  await page.getByLabel('Datum').fill(tag);
  await kg.fill('83');
  await kg.press('Enter');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const eintraege = page.getByRole('list', { name: 'Einträge' }).getByRole('listitem');
  await expect(eintraege).toHaveCount(2);
  await expect(eintraege.first()).toContainText('82,4 kg');
  await expect(eintraege.first()).toContainText('−0,6');
  await expect(page.getByRole('figure')).toHaveAttribute('aria-label', 'Körpergewicht: von 83 auf 82,4 kg');

  await gespeichert(page);
  await page.reload();
  await expect(eintraege).toHaveCount(2);
});

test('Export als CSV und JSON', async ({ page }) => {
  await dreiKniebeugeTrainings(page);
  await page.goto('./#/profil');

  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV' }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^stemm-saetze-\d{4}-\d{2}-\d{2}\.csv$/);
  const csvText = await readFile((await csv.path())!, 'utf8');
  const zeilen = csvText.trim().split('\r\n');
  expect(zeilen).toHaveLength(1 + 3 + 3 + 2 + 3);
  expect(csvText).toContain(';Beine;Kniebeuge (Langhantel);kniebeuge;Quadrizeps;1;100;5;;;500;');

  const [json] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'JSON' }).click()]);
  expect(json.suggestedFilename()).toMatch(/^stemm-export-\d{4}-\d{2}-\d{2}\.json$/);
  const daten = JSON.parse(await readFile((await json.path())!, 'utf8'));
  expect(daten).toMatchObject({ app: 'stemm', formatVersion: 1 });
  expect(daten.trainings).toHaveLength(3);
  expect(JSON.stringify(daten)).not.toContain('ausstehend');
});
