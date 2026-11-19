import { pruefeSeite } from './a11y.ts';
import { expect, test } from './fixtures.ts';
import { gespeichert, legeTrainingsAn } from './hilfen.ts';

/**
 * Barrierefreiheit (WCAG 2.2 AA via axe-core) und Touch-Ziele auf allen wichtigen Seiten – mit Beispieldaten.
 * Läuft im lokalen Modus (ohne Backend). Login/Einladung prüft auth.spec.ts im Supabase-CI-Job.
 */
test('alle Hauptseiten: WCAG 2.2 AA und Touch-Ziele', async ({ page }, info) => {
  test.setTimeout(120_000);
  const handy = info.project.name === 'handy';
  page.on('dialog', (d) => void d.accept());
  await legeTrainingsAn(page, [
    { vorTagen: 7, titel: 'Beine', uebungen: { kniebeuge: [{ gewicht: 100, wdh: 5 }, { gewicht: 100, wdh: 5 }] } },
    { vorTagen: 0, titel: 'Beine', uebungen: { kniebeuge: [{ gewicht: 105, wdh: 5 }], 'bankdruecken-lh': [{ gewicht: 80, wdh: 8 }] } },
  ]);

  await pruefeSeite(page, 'Training', handy);

  await page.goto('./#/plaene');
  await pruefeSeite(page, 'Pläne', handy);
  await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible();
  await pruefeSeite(page, 'Vorlage bearbeiten', handy);

  await page.getByRole('button', { name: 'Übungen hinzufügen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await pruefeSeite(page, 'Übungsauswahl (Dialog)', handy);
  await page.keyboard.press('Escape');

  await page.goto('./#/plaene/uebungen');
  await pruefeSeite(page, 'Übungskatalog', handy);
  await page.goto('./#/plaene/uebungen/kniebeuge');
  await pruefeSeite(page, 'Übungseinstellungen', handy);
  await page.goto('./#/plaene/uebungen/neu');
  await pruefeSeite(page, 'Eigene Übung', handy);

  await page.goto('./#/training');
  await page.getByRole('button', { name: 'Vorlage Push starten' }).click();
  await expect(page.getByRole('region', { name: 'Satz 1 bearbeiten' })).toBeVisible();
  await page.getByRole('region', { name: 'Satz 1 bearbeiten' }).getByRole('button', { name: 'Satz abhaken' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await pruefeSeite(page, 'Laufendes Training mit Pausentimer', handy);
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Stark gemacht!' })).toBeVisible();
  await pruefeSeite(page, 'Zusammenfassung', handy);

  await page.goto('./#/fortschritt');
  await pruefeSeite(page, 'Fortschritt – Übersicht', handy);
  await page.goto('./#/fortschritt/uebungen');
  await pruefeSeite(page, 'Fortschritt – Übungen', handy);
  await page.goto('./#/fortschritt/uebungen/kniebeuge');
  await page.locator('figure svg .recharts-line-curve').first().waitFor();
  await pruefeSeite(page, 'Verlauf einer Übung (Diagramm)', handy);
  await page.goto('./#/fortschritt/koerpergewicht');
  await pruefeSeite(page, 'Körpergewicht', handy);

  await page.goto('./#/profil');
  await pruefeSeite(page, 'Profil', handy);
  await gespeichert(page);
});
