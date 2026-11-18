import { expect, type Page } from '@playwright/test';

/** Wartet, bis alle Schreibvorgänge in IndexedDB abgeschlossen sind (vor Neuladen!). */
export const gespeichert = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-schreibt', '0');

export interface TestSatz {
  gewicht: number;
  wdh: number;
}

/**
 * Legt abgeschlossene Trainings direkt in IndexedDB an (schneller als über die Oberfläche)
 * und lädt die Seite neu, damit die App sie liest. `vorTagen` = wie viele Tage vor jetzt.
 */
export async function legeTrainingsAn(page: Page, trainings: { vorTagen: number; titel: string; uebungen: Record<string, TestSatz[]> }[]) {
  await page.goto('./#/training');
  await expect(page.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();
  await page.evaluate(async (liste) => {
    const datenbank = await new Promise<IDBDatabase>((ok, fehler) => {
      const anfrage = indexedDB.open('stemm');
      anfrage.onsuccess = () => ok(anfrage.result);
      anfrage.onerror = () => fehler(anfrage.error);
    });
    const tx = datenbank.transaction('trainings', 'readwrite');
    liste.forEach((t, i) => {
      const start = new Date(Date.now() - t.vorTagen * 86_400_000 - 60_000);
      tx.objectStore('trainings').put({
        id: `test-${i}`,
        start: start.toISOString(),
        ende: new Date(start.getTime() + 3_600_000).toISOString(),
        titel: t.titel,
        uebungen: Object.entries(t.uebungen).map(([uebungId, saetze]) => ({ uebungId, saetze: saetze.map((s) => ({ ...s, erledigt: true })) })),
        aktualisiertUm: start.toISOString(),
        geloeschtUm: null,
        ausstehend: 1,
      });
    });
    await new Promise<void>((ok, fehler) => {
      tx.oncomplete = () => ok();
      tx.onerror = () => fehler(tx.error);
    });
    datenbank.close();
  }, trainings);
  await page.reload();
}
