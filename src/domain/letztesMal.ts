import { formatiereGewicht } from '../lib/format.ts';
import { zaehlendeSaetze } from './kennzahlen.ts';
import type { Satz } from './typen.ts';

/**
 * Kompakte Zusammenfassung erledigter Sätze für „Letztes Mal: …“.
 *  - alle gleich:              "3 × 8 × 80 kg"
 *  - gleiches Gewicht:         "80 kg × 8/8/7"
 *  - unterschiedliche Gewichte: "60 kg × 10 · 70 kg × 8 · 80 kg × 6"
 *  - ohne Gewicht (Körpergew.): "3 × 12" bzw. "12/10/9"
 */
export function fasseSaetzeZusammen(saetze: readonly Satz[]): string {
  const s = zaehlendeSaetze(saetze);
  if (s.length === 0) return '–';
  const erstes = s[0]!;
  const gleichesGewicht = s.every((x) => x.gewicht === erstes.gewicht);
  const gleicheWdh = s.every((x) => x.wdh === erstes.wdh);

  if (gleichesGewicht && erstes.gewicht === 0) {
    return gleicheWdh ? `${s.length} × ${erstes.wdh}` : s.map((x) => x.wdh).join('/');
  }
  if (gleichesGewicht && gleicheWdh) return `${s.length} × ${erstes.wdh} × ${formatiereGewicht(erstes.gewicht)}`;
  if (gleichesGewicht) return `${formatiereGewicht(erstes.gewicht)} × ${s.map((x) => x.wdh).join('/')}`;
  return s.map((x) => `${formatiereGewicht(x.gewicht)} × ${x.wdh}`).join(' · ');
}
