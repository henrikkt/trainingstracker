import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { expect } from './fixtures.ts';

/** Gemeinsame Prüfungen: WCAG 2.2 AA (axe-core) und Touch-Ziele (Handy). */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function pruefeAxe(page: Page, seite: string) {
  const ergebnis = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const verstoesse = ergebnis.violations.map((v) => `${seite}: ${v.id} (${v.impact}) – ${v.help} – ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect.soft(verstoesse, `WCAG-Verstöße auf ${seite}`).toEqual([]);
}

/**
 * Interaktive Elemente kleiner als 44 × 44 px (unsere Regel: ≥ 48, Haupt-Aktionen 56; WCAG 2.2 AA verlangt ≥ 24).
 * Ausgenommen: Links im Fließtext (WCAG-Ausnahme „inline“).
 */
export async function zuKleineZiele(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ergebnis: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input, select, [role="radio"]')) {
      const r = el.getBoundingClientRect();
      const stil = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || stil.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
      if (el.tagName === 'A' && el.closest('p')) continue; // Link im Fließtext
      if (Math.min(r.width, r.height) < 44) {
        const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? el.tagName;
        ergebnis.push(`${el.tagName.toLowerCase()} „${name}“ ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return ergebnis;
  });
}

export async function pruefeSeite(page: Page, seite: string, istHandy: boolean) {
  await page.evaluate(() => document.fonts.ready);
  await pruefeAxe(page, seite);
  if (istHandy) expect.soft(await zuKleineZiele(page), `zu kleine Touch-Ziele auf ${seite}`).toEqual([]);
}
