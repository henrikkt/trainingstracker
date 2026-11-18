import type { Steigerung, Uebung } from './typen.ts';

/**
 * Standard-Steigerung je Übungstyp (pro Übung in den Einstellungen überschreibbar):
 *  - schwere Unterkörper-Grundübungen (Kniebeuge, Kreuzheben, Beinpresse …): +5 kg
 *  - Langhantel / SZ-Stange sonst: +2,5 kg
 *  - Kurzhantel: +2 kg (pro Hantel)
 *  - Kettlebell: +4 kg (übliche Abstufung)
 *  - Maschine / Kabel: +2,5 kg
 *  - Körpergewicht: +1 Wiederholung
 */
export function standardSteigerung(uebung: Uebung): Steigerung {
  if (uebung.geraet === 'koerpergewicht') return { art: 'wdh', anzahl: 1 };
  if (uebung.grosseSteigerung) return { art: 'gewicht', kg: 5 };
  switch (uebung.geraet) {
    case 'kurzhantel':
      return { art: 'gewicht', kg: 2 };
    case 'kettlebell':
      return { art: 'gewicht', kg: 4 };
    case 'langhantel':
    case 'sz-stange':
    case 'maschine':
    case 'kabel':
      return { art: 'gewicht', kg: 2.5 };
  }
}

/** Steigerung unter Berücksichtigung einer persönlichen Einstellung. */
export function steigerungFuer(uebung: Uebung, eigeneEinstellung?: Steigerung): Steigerung {
  return eigeneEinstellung ?? standardSteigerung(uebung);
}
