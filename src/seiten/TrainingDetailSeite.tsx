import { Clock, Dumbbell, Layers, Trash2, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Karte, Knopf, SeitenKopf } from '../components/ui.tsx';
import { useTraining, useTrainings, useUebungsNachschlag } from '../daten/hooks.ts';
import { loescheTraining } from '../daten/repo.ts';
import { fasseSaetzeZusammen } from '../domain/letztesMal.ts';
import { REKORD_NAMEN, type Rekord } from '../domain/rekorde.ts';
import { zusammenfassen } from '../domain/training.ts';
import { formatiereDatum, formatiereDauer, formatiereGewicht, formatiereVolumen } from '../lib/format.ts';

export function rekordWert(r: Rekord): string {
  switch (r.art) {
    case 'gewicht':
      return formatiereGewicht(r.wert);
    case 'e1rm':
      return formatiereGewicht(Math.round(r.wert * 10) / 10);
    case 'satzVolumen':
      return `${formatiereGewicht(r.gewicht)} × ${r.wdh}`;
    case 'wdh':
      return `${r.wdh} Wdh.`;
  }
}

function Kachel({ icon: Icon, wert, text }: { icon: LucideIcon; wert: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-flaeche p-3 text-center">
      <Icon aria-hidden size={20} className="text-akzent" />
      <span className="font-display text-2xl font-bold tabular-nums">{wert}</span>
      <span className="text-xs text-text-leise">{text}</span>
    </div>
  );
}

/** Zusammenfassung eines abgeschlossenen Trainings (direkt nach dem Beenden mit „?neu=1“). */
export function TrainingDetailSeite() {
  const { id } = useParams();
  const [suche] = useSearchParams();
  const training = useTraining(id);
  const alle = useTrainings();
  const nachschlag = useUebungsNachschlag();
  const navigate = useNavigate();

  if (training === undefined || alle === undefined) return null;
  if (training === null) {
    return (
      <>
        <SeitenKopf titel="Nicht gefunden" zurueck="/training" />
        <p className="text-text-leise">Dieses Training gibt es nicht (mehr).</p>
      </>
    );
  }

  const z = zusammenfassen(training, alle);
  const neu = suche.get('neu') === '1';

  return (
    <>
      <SeitenKopf
        titel={neu ? 'Stark gemacht!' : (training.titel ?? 'Training')}
        unterzeile={`${neu ? `${training.titel ?? 'Training'} · ` : ''}${formatiereDatum(training.start)}`}
        zurueck="/training"
      />
      <div className="flex flex-col gap-4 pb-6">
        <section aria-label="Kennzahlen" className="grid grid-cols-3 gap-2">
          <Kachel icon={Clock} wert={formatiereDauer(z.dauerMin)} text="Dauer" />
          <Kachel icon={Dumbbell} wert={formatiereVolumen(z.volumen)} text="Volumen" />
          <Kachel icon={Layers} wert={String(z.saetze)} text="Sätze" />
        </section>

        {z.neueRekorde.length > 0 && (
          <Karte className="flex flex-col gap-3 border-2 border-rekord">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-rekord">
              <Trophy aria-hidden size={22} /> {z.neueRekorde.length === 1 ? 'Neuer Rekord' : `${z.neueRekorde.length} neue Rekorde`}
            </h2>
            <ul className="flex flex-col gap-2">
              {z.neueRekorde.map((r) => (
                <li key={`${r.uebungId}-${r.rekord.art}`} className="text-sm">
                  <span className="font-semibold">{nachschlag(r.uebungId)?.name ?? 'Übung'}</span>
                  <span className="text-text-leise"> – {REKORD_NAMEN[r.rekord.art]}: </span>
                  <span className="font-bold text-rekord tabular-nums">{rekordWert(r.rekord)}</span>
                  <span className="text-text-leise"> (vorher {rekordWert(r.vorher)})</span>
                </li>
              ))}
            </ul>
          </Karte>
        )}

        <Karte className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Übungen</h2>
          <ul className="flex flex-col divide-y divide-linie">
            {training.uebungen.map((ue, i) => (
              <li key={`${ue.uebungId}-${i}`} className="flex flex-col py-2">
                <span className="font-semibold">{nachschlag(ue.uebungId)?.name ?? 'Unbekannte Übung'}</span>
                <span className="text-sm text-text-leise tabular-nums">{fasseSaetzeZusammen(ue.saetze)}</span>
              </li>
            ))}
          </ul>
        </Karte>

        <Knopf
          variante="leise"
          icon={Trash2}
          className="text-fehler!"
          onClick={async () => {
            if (!window.confirm('Dieses Training löschen?')) return;
            await loescheTraining(training.id);
            navigate('/training', { replace: true });
          }}
        >
          Training löschen
        </Knopf>
      </div>
    </>
  );
}
