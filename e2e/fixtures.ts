import { test as basis, expect } from '@playwright/test';

/**
 * Gemeinsame Test-Basis für alle E2E-Tests: Ein automatischer „Wachposten“ lässt jeden Test scheitern,
 * wenn im Browser ein CSP-Verstoß, ein unbehandelter JavaScript-Fehler oder ein unerwarteter
 * Konsolenfehler auftritt. Netzwerkfehler sind erlaubt (Offline-Tests, absichtlich falsches Passwort).
 */
const ERLAUBTE_KONSOLENFEHLER = [/Failed to load resource/, /net::ERR_/, /Failed to fetch/, /NetworkError/];

export const test = basis.extend<{ wachposten: void }>({
  wachposten: [
    async ({ page }, verwenden) => {
      const fehler: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          console.error(`CSP-Verstoß: ${e.violatedDirective} blockiert ${e.blockedURI || '(inline)'}`);
        });
      });
      page.on('console', (m) => {
        if (m.type() === 'error' && !ERLAUBTE_KONSOLENFEHLER.some((r) => r.test(m.text()))) fehler.push(`Konsole: ${m.text()}`);
      });
      page.on('pageerror', (e) => fehler.push(`JavaScript: ${e.message}`));
      await verwenden();
      expect(fehler, 'Fehler im Browser (CSP, JavaScript oder Konsole)').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
