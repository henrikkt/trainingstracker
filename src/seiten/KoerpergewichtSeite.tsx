import { Scale, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { kurzDatum, Verlauf } from '../components/Diagramm.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { IconKnopf, Karte, Knopf, Reiter, SeitenKopf } from '../components/ui.tsx';
import { useKoerpergewicht } from '../daten/hooks.ts';
import { loescheKoerpergewicht, speichereKoerpergewicht } from '../daten/repo.ts';
import { koerpergewichtVerlauf, tagesSchluessel } from '../domain/fortschritt.ts';
import { formatiereDatum, formatiereGewicht, formatiereZahl } from '../lib/format.ts';
import { FORTSCHRITT_REITER } from './FortschrittSeite.tsx';

/** Datum "YYYY-MM-DD" als lokaler Mittag (vermeidet Zeitzonen-Verschiebung beim Formatieren). */
const tagAlsIso = (tag: string) => {
  const [j, m, t] = tag.split('-').map(Number) as [number, number, number];
  return new Date(j, m - 1, t, 12).toISOString();
};

/** Körpergewicht eintragen (ein Wert pro Tag) und als Verlauf ansehen. */
export function KoerpergewichtSeite() {
  const eintraege = useKoerpergewicht();
  const verlauf = koerpergewichtVerlauf(eintraege ?? []);
  const letzter = verlauf.at(-1);
  const [kg, setKg] = useState<number | null>(null);
  const [datum, setDatum] = useState(() => tagesSchluessel(new Date()));
  const wert = kg ?? letzter?.kg ?? 75;

  return (
    <>
      <SeitenKopf titel="Fortschritt" unterzeile="Körpergewicht – optional, ein Wert pro Tag." />
      <Reiter ziele={FORTSCHRITT_REITER} />
      <div className="flex flex-col gap-4 pb-6">
        <Karte className="flex flex-col gap-3 p-4!">
          <h2 className="font-display text-xl font-bold">Eintragen</h2>
          <Stepper label="Körpergewicht" einheit="kg" wert={wert} schritt={0.1} min={20} max={400} onChange={setKg} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-text-leise">Datum</span>
            <input
              type="date"
              value={datum}
              max={tagesSchluessel(new Date())}
              onChange={(e) => setDatum(e.target.value)}
              className="min-h-12 rounded-2xl border border-linie bg-grund px-4 text-text outline-none [color-scheme:dark] focus:border-akzent"
            />
          </label>
          <Knopf
            gross
            icon={Scale}
            disabled={!datum}
            onClick={async () => {
              await speichereKoerpergewicht(datum, wert);
              setKg(null);
            }}
          >
            Speichern
          </Knopf>
        </Karte>

        {verlauf.length > 0 && (
          <Karte className="flex flex-col gap-3 p-4!">
            <h2 className="font-display text-xl font-bold">Verlauf</h2>
            <Verlauf
              punkte={verlauf.map((e) => ({ x: kurzDatum(tagAlsIso(e.datum)), y: e.kg, info: formatiereDatum(tagAlsIso(e.datum)) }))}
              einheit="kg"
              beschreibung={`Körpergewicht: von ${formatiereZahl(verlauf[0]!.kg)} auf ${formatiereZahl(letzter!.kg)} kg`}
            />
            <ul aria-label="Einträge" className="flex flex-col divide-y divide-linie">
              {[...verlauf].reverse().map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-1">
                  <span className="flex-1 text-sm text-text-leise">{formatiereDatum(tagAlsIso(e.datum))}</span>
                  <span className="font-semibold tabular-nums">{formatiereGewicht(e.kg)}</span>
                  <span className="w-16 text-right text-xs text-text-leise tabular-nums">
                    {e.differenz === null ? '' : `${e.differenz > 0 ? '+' : e.differenz < 0 ? '−' : '±'}${formatiereZahl(Math.abs(e.differenz))}`}
                  </span>
                  <IconKnopf icon={Trash2} label={`Eintrag vom ${formatiereDatum(tagAlsIso(e.datum))} löschen`} onClick={() => void loescheKoerpergewicht(e.id)} />
                </li>
              ))}
            </ul>
          </Karte>
        )}
      </div>
    </>
  );
}
