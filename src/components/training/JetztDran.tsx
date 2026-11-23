import { ChevronRight, StickyNote } from 'lucide-react';
import type { Satz } from '../../domain/typen.ts';
import { formatiereGewicht } from '../../lib/format.ts';
import { FotoKnopf } from '../Foto.tsx';

/** Selektor des Satz-Editors einer Übung (siehe UebungImTraining: Karte mit data-uebungskarte, Editor mit aria-label). */
export const satzEditorSelektor = (uebung: number, satz: number) => `[data-uebungskarte="${uebung}"] section[aria-label="Satz ${satz + 1} bearbeiten"]`;

/**
 * Feste Leiste unter der Kopfzeile: der Satz, an dem man gerade dran ist – mit Foto, Gewicht × Wdh.
 * (vorbelegt mit der Empfehlung) und der Notiz zur Übung. Tipp springt zum Satz und klappt ihn auf.
 */
export function JetztDran({
  name,
  satzNummer,
  saetzeGesamt,
  satz,
  empfohlen,
  foto,
  notiz,
  onSpringen,
}: {
  name: string;
  satzNummer: number;
  saetzeGesamt: number;
  satz: Satz;
  /** true, wenn das Gewicht aus der Empfehlung stammt (nicht erstes Mal) */
  empfohlen: boolean;
  foto?: string;
  notiz?: string;
  onSpringen: () => void;
}) {
  const werte = satz.gewicht > 0 ? `${formatiereGewicht(satz.gewicht)} × ${satz.wdh}` : `${satz.wdh} Wdh.`;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-akzent bg-flaeche p-1.5" role="group" aria-label="Jetzt dran">
      {foto && <FotoKnopf src={foto} name={name} groesse="h-12 w-12" />}
      <button type="button" onClick={onSpringen} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl pl-1.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {name} · Satz {satzNummer}/{saetzeGesamt}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="shrink-0 font-bold text-akzent tabular-nums">{werte}</span>
            {empfohlen && <span className="shrink-0 text-text-leise">empfohlen</span>}
          </span>
          {notiz && (
            // Notiz zur Übung immer vollständig lesbar (bricht um statt abzuschneiden)
            <span className="flex items-start gap-1.5 text-sm text-text">
              <StickyNote aria-hidden size={14} className="mt-0.5 shrink-0 text-akzent" />
              <span className="min-w-0 break-words">{notiz}</span>
            </span>
          )}
        </span>
        <ChevronRight aria-hidden size={20} className="shrink-0 text-text-leise" />
        <span className="sr-only">– zum Satz springen</span>
      </button>
    </div>
  );
}
