import { devices, type Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { legeTrainingsAn } from './hilfen.ts';

/**
 * Layout auf echten iPhone-Größen mit WebKit (Safari-Engine) – Projekt „iphone“ in playwright.config.ts.
 * Notch/Dynamic Island/Home-Balken kann der Testbrowser nicht nachbilden; deshalb werden die sicheren
 * Ränder über die CSS-Variablen --sicher-oben/--sicher-unten mit den Werten des jeweiligen Geräts gesetzt
 * (Apple Human Interface Guidelines, Hochformat, Home-Bildschirm-App). Mit SCREENSHOTS=1 entstehen
 * zusätzlich Bilder mit nachgebildeter Statusleiste.
 */
const GERAETE = [
  { name: 'iPhone SE (3rd gen)', oben: 20, unten: 0 },
  { name: 'iPhone 13 Mini', oben: 50, unten: 34 },
  { name: 'iPhone 15 Pro', oben: 59, unten: 34 },
  { name: 'iPhone 15 Pro Max', oben: 59, unten: 34 },
  { name: 'iPhone 16 Pro', oben: 62, unten: 34 },
] as const;

async function simuliereIphone(page: Page, oben: number, unten: number, mitStatusleiste: boolean) {
  await page.addInitScript(
    ([o, u, leiste]) => {
      const setze = () => {
        document.documentElement.style.setProperty('--sicher-oben', `${o}px`);
        document.documentElement.style.setProperty('--sicher-unten', `${u}px`);
      };
      // WebKit führt Init-Skripte aus, bevor <html> existiert
      if (document.documentElement) setze();
      else
        new MutationObserver((_, beobachter) => {
          if (!document.documentElement) return;
          setze();
          beobachter.disconnect();
        }).observe(document, { childList: true });
      if (!leiste) return;
      // Nur für Screenshots: Statusleiste mit Uhrzeit und Dynamic Island über der App einzeichnen
      document.addEventListener('DOMContentLoaded', () => {
        // Über die DOM-API (CSSOM) gebaut – Inline-style-Attribute würde die strikte CSP zu Recht blockieren
        const s = document.createElement('div');
        s.style.cssText = `position:fixed;top:0;left:0;right:0;height:${o}px;z-index:9999;pointer-events:none;color:#fff;font:600 17px -apple-system,system-ui;display:flex;align-items:center;justify-content:space-between;padding:0 32px`;
        const uhr = document.createElement('span');
        uhr.textContent = '9:41';
        const insel = document.createElement('span');
        insel.style.cssText = 'width:125px;height:36px;border-radius:20px;background:#000;position:absolute;left:50%;transform:translateX(-50%);top:11px';
        const akku = document.createElement('span');
        akku.textContent = '●●● 100%';
        s.append(uhr, insel, akku);
        document.body.append(s);
      });
    },
    [oben, unten, mitStatusleiste] as const,
  );
}

/** Prüft das Layout der aktuellen Seite; liefert eine Liste von Problemen. */
async function layoutProbleme(page: Page, oben: number, unten: number): Promise<string[]> {
  return page.evaluate(
    ([o, u]) => {
      const probleme: string[] = [];
      const breite = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > breite) probleme.push(`seitlicher Überlauf: ${document.documentElement.scrollWidth} > ${breite}`);
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > breite + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[class*="overflow-x-auto"]')) {
          probleme.push(`ragt rechts heraus: <${el.tagName.toLowerCase()}> ${el.textContent?.trim().slice(0, 30)}`);
          break;
        }
      }
      const h1 = document.querySelector('h1');
      if (h1 && h1.getBoundingClientRect().top < o) probleme.push(`Überschrift unter der Statusleiste (top ${Math.round(h1.getBoundingClientRect().top)} < ${o})`);
      const vorHoehe = parseFloat(getComputedStyle(document.body, '::before').height);
      if (Math.round(vorHoehe) !== o) probleme.push(`Fläche hinter Statusleiste ${vorHoehe}px statt ${o}px`);
      const nav = document.querySelector<HTMLElement>('nav[aria-label="Hauptnavigation"]');
      if (nav) {
        const r = nav.getBoundingClientRect();
        if (Math.round(r.bottom) !== window.innerHeight) probleme.push(`Navigation nicht am unteren Rand (${r.bottom} ≠ ${window.innerHeight})`);
        const letzterLink = nav.querySelector('a:last-of-type')?.getBoundingClientRect();
        if (letzterLink && letzterLink.bottom > window.innerHeight - u + 1) probleme.push('Navigation reicht in den Home-Balken');
      }
      const pause = document.querySelector('[role="timer"]')?.getBoundingClientRect();
      if (pause && nav && pause.bottom > nav.getBoundingClientRect().top) probleme.push('Pausentimer überlappt die Navigation');
      return probleme;
    },
    [oben, unten] as const,
  );
}

for (const geraet of GERAETE) {
  test.describe(geraet.name, () => {
    const { defaultBrowserType: _b, ...geraetOptionen } = devices[geraet.name];
    test.use(geraetOptionen);

    test(`Layout passt (${geraet.oben}/${geraet.unten} px Ränder)`, async ({ page }) => {
      test.setTimeout(90_000);
      page.on('dialog', (d) => void d.accept());
      await simuliereIphone(page, geraet.oben, geraet.unten, false);
      await legeTrainingsAn(page, [
        { vorTagen: 7, titel: 'Beine', uebungen: { kniebeuge: [{ gewicht: 100, wdh: 5 }, { gewicht: 100, wdh: 5 }] } },
        { vorTagen: 0, titel: 'Beine', uebungen: { kniebeuge: [{ gewicht: 105, wdh: 5 }] } },
      ]);
      const probleme: string[] = [];
      const pruefe = async (seite: string) => probleme.push(...(await layoutProbleme(page, geraet.oben, geraet.unten)).map((p) => `${seite}: ${p}`));

      for (const route of ['training', 'plaene', 'plaene/uebungen', 'plaene/uebungen/kniebeuge', 'fortschritt', 'fortschritt/uebungen/kniebeuge', 'fortschritt/koerpergewicht', 'profil']) {
        await page.goto(`./#/${route}`);
        await expect(page.locator('h1')).toBeVisible();
        await pruefe(route);
      }
      await page.goto('./#/plaene');
      await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible();
      await pruefe('Vorlage bearbeiten');
      await page.goto('./#/training');
      await page.getByRole('button', { name: 'Vorlage Push starten' }).click();
      await page.getByRole('region', { name: 'Satz 1 bearbeiten' }).getByRole('button', { name: 'Satz abhaken' }).click();
      await expect(page.getByRole('timer')).toBeVisible();
      await pruefe('laufendes Training');

      expect(probleme).toEqual([]);
    });

    test('Screenshots mit Statusleiste', async ({ page }) => {
      test.skip(!process.env.SCREENSHOTS, 'Screenshots nur mit SCREENSHOTS=1');
      await simuliereIphone(page, geraet.oben, geraet.unten, true);
      await legeTrainingsAn(page, [{ vorTagen: 0, titel: 'Beine', uebungen: { kniebeuge: [{ gewicht: 105, wdh: 5 }] } }]);
      const datei = geraet.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      await page.goto('./#/fortschritt');
      await page.evaluate(() => document.fonts.ready);
      // gescrollt: Inhalt läuft unter die Statusleiste (WebKit-Mobil ignoriert scrollTo → nativ per scrollIntoView)
      await page.getByRole('heading', { name: 'Volumen pro Muskel' }).scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `e2e/screenshots/iphone-${datei}-fortschritt-gescrollt.png`, caret: 'initial' });
      await page.goto('./#/plaene');
      await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Push' })).toBeVisible();
      await page.goto('./#/training');
      await page.getByRole('button', { name: 'Vorlage Push starten' }).click();
      await page.getByRole('region', { name: 'Satz 1 bearbeiten' }).getByRole('button', { name: 'Satz abhaken' }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `e2e/screenshots/iphone-${datei}-training.png`, caret: 'initial' });
    });
  });
}
