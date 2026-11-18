import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Segment } from '../components/Auswahl.tsx';
import { kurzDatum, Verlauf, type DiagrammPunkt } from '../components/Diagramm.tsx';
import { Karte, SeitenKopf } from '../components/ui.tsx';
import { useTrainings, useUebungsNachschlag } from '../daten/hooks.ts';
import { verlaufFuerUebung, zaehlendeSaetze } from '../domain/kennzahlen.ts';
import { fasseSaetzeZusammen } from '../domain/letztesMal.ts';
import { REKORD_NAMEN, rekordeFuerUebung, type RekordArt } from '../domain/rekorde.ts';
import { formatiereDatum, formatiereGewicht, formatiereVolumen } from '../lib/format.ts';
import { rekordWert } from './TrainingDetailSeite.tsx';

type Kennzahl = 'e1rm' | 'top' | 'volumen';

const KENNZAHLEN: { wert: Kennzahl; text: string; titel: string; einheit: string }[] = [
  { wert: 'e1rm', text: '1RM', titel: 'Geschätztes 1RM (Epley)', einheit: 'kg' },
  { wert: 'top', text: 'Top-Satz', titel: 'Gewicht des besten Satzes', einheit: 'kg' },
  { wert: 'volumen', text: 'Volumen', titel: 'Volumen pro Training', einheit: 'kg' },
];

/** Verlauf einer Übung: Diagramm (umschaltbar), persönliche Rekorde, alle Einheiten als Liste. */
export function FortschrittUebungSeite() {
  const { id = '' } = useParams();
  const trainings = useTrainings();
  const nachschlag = useUebungsNachschlag();
  const [kennzahl, setKennzahl] = useState<Kennzahl>('e1rm');
  if (trainings === undefined) return null;

  const uebung = nachschlag(id);
  const abgeschlossen = trainings.filter((t) => t.ende);
  const verlauf = verlaufFuerUebung(abgeschlossen, id);
  const rekorde = rekordeFuerUebung(abgeschlossen, id);
  const ohneGewicht = verlauf.every((p) => p.topSatz.gewicht === 0);
  const k = KENNZAHLEN.find((x) => x.wert === kennzahl)!;

  const punkte: DiagrammPunkt[] = verlauf.map((p) => ({
    x: kurzDatum(p.datum),
    y: kennzahl === 'e1rm' ? p.e1rm : kennzahl === 'top' ? p.topSatz.gewicht : p.volumen,
    info: `${formatiereDatum(p.datum)} · ${formatiereGewicht(p.topSatz.gewicht)} × ${p.topSatz.wdh}`,
  }));
  const erster = punkte[0];
  const letzter = punkte.at(-1);
  const beschreibung =
    erster && letzter ? `${k.titel}: von ${Math.round(erster.y)} auf ${Math.round(letzter.y)} ${k.einheit} über ${punkte.length} Trainings` : k.titel;

  const rekordArten = (Object.keys(REKORD_NAMEN) as RekordArt[]).filter((a) => rekorde[a]);
  const einheiten = abgeschlossen
    .filter((t) => t.uebungen.some((ue) => ue.uebungId === id && zaehlendeSaetze(ue.saetze).length > 0))
    .sort((a, b) => b.start.localeCompare(a.start));

  return (
    <>
      <SeitenKopf titel={uebung?.name ?? 'Übung'} zurueck="/fortschritt/uebungen" unterzeile={`${verlauf.length} ${verlauf.length === 1 ? 'Einheit' : 'Einheiten'}`} />
      <div className="flex flex-col gap-4 pb-6">
        {!ohneGewicht && (
          <Karte className="flex flex-col gap-3 p-4!">
            <Segment label="Kennzahl" wert={kennzahl} optionen={KENNZAHLEN} onChange={setKennzahl} />
            <h2 className="font-display text-xl font-bold">{k.titel}</h2>
            <Verlauf punkte={punkte} einheit={k.einheit} beschreibung={beschreibung} />
          </Karte>
        )}

        {rekordArten.length > 0 && (
          <section aria-label="Persönliche Rekorde" className="grid grid-cols-2 gap-2">
            {rekordArten.map((a) => {
              const r = rekorde[a]!;
              return (
                <div key={a} className="flex flex-col gap-1 rounded-2xl bg-flaeche p-3">
                  <span className="flex items-center gap-1 text-xs text-text-leise">
                    <Trophy aria-hidden size={14} className="text-rekord" /> {REKORD_NAMEN[a]}
                  </span>
                  <span className="font-display text-2xl font-bold tabular-nums">{rekordWert(r)}</span>
                  <span className="text-xs text-text-leise">{formatiereDatum(r.datum)}</span>
                </div>
              );
            })}
          </section>
        )}

        <Karte className="flex flex-col gap-2 p-4!">
          <h2 className="font-display text-xl font-bold">Alle Einheiten</h2>
          <ul aria-label="Alle Einheiten" className="flex flex-col divide-y divide-linie">
            {einheiten.map((t) => {
              const saetze = t.uebungen.filter((ue) => ue.uebungId === id).flatMap((ue) => ue.saetze);
              const punkt = verlauf.find((p) => p.trainingId === t.id);
              return (
                <li key={t.id} className="flex flex-col py-2">
                  <span className="text-sm text-text-leise">{formatiereDatum(t.start)}</span>
                  <span className="font-semibold tabular-nums">{fasseSaetzeZusammen(saetze)}</span>
                  {punkt && punkt.e1rm > 0 && (
                    <span className="text-xs text-text-leise tabular-nums">
                      1RM ≈ {formatiereGewicht(Math.round(punkt.e1rm * 10) / 10)} · Volumen {formatiereVolumen(punkt.volumen)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Karte>
      </div>
    </>
  );
}
