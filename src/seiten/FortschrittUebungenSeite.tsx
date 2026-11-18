import { ChevronRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { LeererZustand, Reiter, SeitenKopf } from '../components/ui.tsx';
import { useTrainings, useUebungsNachschlag } from '../daten/hooks.ts';
import { uebungsUebersicht } from '../domain/fortschritt.ts';
import { formatiereDatum, formatiereGewicht } from '../lib/format.ts';
import { FORTSCHRITT_REITER } from './FortschrittSeite.tsx';

/** Alle trainierten Übungen – Tipp öffnet Verlauf, Diagramm und Rekorde. */
export function FortschrittUebungenSeite() {
  const trainings = useTrainings();
  const nachschlag = useUebungsNachschlag();
  if (trainings === undefined) return null;
  const liste = uebungsUebersicht(trainings);

  return (
    <>
      <SeitenKopf titel="Fortschritt" unterzeile="Verlauf und Rekorde pro Übung." />
      <Reiter ziele={FORTSCHRITT_REITER} />
      {liste.length === 0 ? (
        <LeererZustand icon={TrendingUp} titel="Noch keine Übungen" text="Sobald du Sätze abgehakt hast, erscheinen hier deine Übungen." />
      ) : (
        <ul aria-label="Trainierte Übungen" className="flex flex-col gap-2 pb-6">
          {liste.map((s) => (
            <li key={s.uebungId}>
              <Link to={`/fortschritt/uebungen/${s.uebungId}`} className="flex items-center gap-3 rounded-2xl bg-flaeche p-4 hover:bg-flaeche-hoch">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{nachschlag(s.uebungId)?.name ?? 'Unbekannte Übung'}</span>
                  <span className="block text-sm text-text-leise tabular-nums">
                    {s.einheiten} {s.einheiten === 1 ? 'Einheit' : 'Einheiten'} · zuletzt {formatiereDatum(s.zuletzt)}
                    {s.bestesE1rm > 0 ? ` · 1RM ≈ ${formatiereGewicht(Math.round(s.bestesE1rm))}` : ''}
                  </span>
                </span>
                <ChevronRight aria-hidden className="shrink-0 text-text-leise" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
