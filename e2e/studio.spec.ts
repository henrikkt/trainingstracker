import { type Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { gespeichert } from './hilfen.ts';

/** Erzeugt im Browser ein großes Testbild (wie ein Handyfoto) und gibt es als PNG-Datei zurück. */
async function testFoto(page: Page) {
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1200;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `hsl(${i * 9}, 70%, 50%)`;
      ctx.fillRect((i % 8) * 200, Math.floor(i / 8) * 240, 200, 240);
    }
    return c.toDataURL('image/png').split(',')[1]!;
  });
  return { name: 'maschine.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

test('Studio-Filter: vorausgewählt, umschaltbar, im Profil abschaltbar; eigene Übung im Studio', async ({ page }) => {
  await page.goto('./#/plaene/uebungen');
  await expect(page.getByRole('radio', { name: 'Kraftkultur' })).toBeChecked();
  await expect(page.getByRole('button', { name: /^Bankdrücken \(Langhantel\)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Brustpresse/ })).toBeHidden();

  // Suche findet nur außerhalb des Studios → Hinweis mit Umschalter
  await page.getByPlaceholder('Übung suchen …').fill('brustpresse');
  await expect(page.getByText('Bei Kraftkultur nicht dabei – 1 Treffer unter „Alle Übungen“.')).toBeVisible();
  await page.getByRole('button', { name: 'Alle Übungen zeigen' }).click();
  await expect(page.getByRole('button', { name: /Brustpresse/ })).toBeVisible();

  // Eigene Übung: „Gibt es bei Kraftkultur“ ist beim Anlegen angehakt
  await page.goto('./#/plaene/uebungen/neu');
  await page.getByRole('textbox', { name: 'Name' }).fill('Hip Thrust Maschine');
  await expect(page.getByRole('checkbox', { name: 'Gibt es bei Kraftkultur' })).toBeChecked();
  await page.getByRole('button', { name: 'Übung anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hip Thrust Maschine' })).toBeVisible();
  await page.goto('./#/plaene/uebungen');
  await page.getByPlaceholder('Übung suchen …').fill('hip thrust maschine');
  await expect(page.getByRole('button', { name: /Hip Thrust Maschine/ })).toBeVisible();

  // Profil: kein Studio → kein Umschalter, alles sichtbar
  await page.goto('./#/profil');
  await page.getByRole('radio', { name: 'Keins' }).click();
  await gespeichert(page);
  await page.goto('./#/plaene/uebungen');
  await expect(page.getByRole('radio', { name: 'Kraftkultur' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Brustpresse/ })).toBeVisible();
});

test('Foto und Einstellungsnotiz: in den Übungseinstellungen, im Training, nach Neuladen', async ({ page }) => {
  await page.goto('./#/plaene/uebungen/kniebeuge');
  await page.getByRole('textbox', { name: 'Einstellung an der Maschine' }).fill('Ablage Loch 7');
  await page.getByLabel('Foto auswählen').setInputFiles(await testFoto(page));
  const vorschau = page.getByRole('button', { name: 'Foto Kniebeuge (Langhantel) ansehen' });
  await expect(vorschau).toBeVisible();
  // stark verkleinert: JPEG, höchstens 480 px
  const groesse = await vorschau.locator('img').evaluate((img: HTMLImageElement) => ({ src: img.src.slice(0, 23), b: img.naturalWidth, h: img.naturalHeight, laenge: img.src.length }));
  expect(groesse).toMatchObject({ src: 'data:image/jpeg;base64,', b: 480, h: 360 });
  expect(groesse.laenge).toBeLessThanOrEqual(60_000);

  await gespeichert(page);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Einstellung an der Maschine' })).toHaveValue('Ablage Loch 7');
  await expect(vorschau).toBeVisible();

  // Vorschaubild auch in der Übungsliste
  await page.goto('./#/plaene/uebungen');
  await page.getByPlaceholder('Übung suchen …').fill('kniebeuge lang');
  await expect(page.getByRole('button', { name: /Kniebeuge \(Langhantel\)/ }).locator('img')).toBeVisible();

  // Im Training: Foto und Notiz sichtbar, Notiz dort änderbar
  await page.goto('./#/training');
  await page.getByRole('button', { name: 'Freies Training starten' }).click();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  const auswahl = page.getByRole('dialog', { name: 'Übungen hinzufügen' });
  await auswahl.getByPlaceholder('Übung suchen …').fill('kniebeuge lang');
  await auswahl.getByRole('button', { name: /Kniebeuge \(Langhantel\)/ }).click();
  await auswahl.getByRole('button', { name: '1 Übung hinzufügen' }).click();

  // Leiste „Jetzt dran“: Foto und Einstellung immer sichtbar
  const leiste = page.getByRole('group', { name: 'Jetzt dran' });
  await expect(leiste).toContainText('Ablage Loch 7');
  await leiste.getByRole('button', { name: 'Foto Kniebeuge (Langhantel) ansehen' }).click();
  await expect(page.getByRole('dialog', { name: 'Kniebeuge (Langhantel)' }).getByRole('img', { name: 'Foto Kniebeuge (Langhantel)' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Einstellung: Ablage Loch 7 – bearbeiten' }).click();
  await page.getByRole('textbox', { name: 'Einstellung an der Maschine' }).fill('Ablage Loch 8');
  await page.getByRole('button', { name: 'Fertig' }).click();
  await expect(page.getByRole('button', { name: 'Einstellung: Ablage Loch 8 – bearbeiten' })).toBeVisible();

  // Foto entfernen
  await page.goto('./#/plaene/uebungen/kniebeuge');
  await expect(page.getByRole('textbox', { name: 'Einstellung an der Maschine' })).toHaveValue('Ablage Loch 8');
  await page.getByRole('button', { name: 'Foto entfernen' }).click();
  await expect(page.getByRole('button', { name: 'Foto aufnehmen' })).toBeVisible();
  await expect(vorschau).toHaveCount(0);
});

test('Einstellung direkt im Training notieren (ohne vorherige Notiz)', async ({ page }) => {
  await page.goto('./#/training');
  await page.getByRole('button', { name: 'Freies Training starten' }).click();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  const auswahl = page.getByRole('dialog', { name: 'Übungen hinzufügen' });
  await auswahl.getByPlaceholder('Übung suchen …').fill('klimmz');
  await auswahl.getByRole('button', { name: /Klimmzüge/ }).click();
  await auswahl.getByRole('button', { name: '1 Übung hinzufügen' }).click();

  await page.getByRole('button', { name: 'Einstellung für Klimmzüge notieren' }).click();
  await page.getByRole('textbox', { name: 'Einstellung an der Maschine' }).fill('Griff eng');
  await page.getByRole('button', { name: 'Fertig' }).click();
  await gespeichert(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Einstellung: Griff eng – bearbeiten' })).toBeVisible();
});
