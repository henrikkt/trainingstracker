/**
 * Wem gehören die lokalen Daten auf diesem Gerät? Wichtig, wenn sich ein anderes Konto anmeldet:
 *  - gleich:       dieselbe Person wie zuletzt → nichts zu tun
 *  - uebernehmen:  noch kein Besitzer (z. B. bisher lokaler Modus) → lokale Daten gehören ab jetzt diesem Konto
 *  - wechseln:     anderes Konto, alle lokalen Daten sind synchronisiert → lokale Daten löschen, neu laden
 *  - blockiert:    anderes Konto, aber es gibt noch nicht synchronisierte Daten → Anmeldung abbrechen,
 *                  damit nichts verloren geht und keine Daten beim falschen Konto landen
 */
export type BesitzerEntscheidung = 'gleich' | 'uebernehmen' | 'wechseln' | 'blockiert';

export function entscheideBesitzer(bisher: string | undefined, neu: string, ausstehendeAenderungen: number): BesitzerEntscheidung {
  if (bisher === neu) return 'gleich';
  if (!bisher) return 'uebernehmen';
  return ausstehendeAenderungen > 0 ? 'blockiert' : 'wechseln';
}
