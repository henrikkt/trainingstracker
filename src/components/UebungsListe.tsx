import { Check, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sucheUebungen } from '../domain/katalog.ts';
import { gibtEsImStudio, type Studio } from '../domain/studios.ts';
import { GERAETE_NAMEN, MUSKELGRUPPEN, MUSKELGRUPPEN_NAMEN, type Muskelgruppe, type Uebung } from '../domain/typen.ts';
import { Chip, Segment } from './Auswahl.tsx';

export interface NeuVorschlag {
  name: string;
  muskel: Muskelgruppe | null;
  /** true, wenn gerade nur das Studio angezeigt wird */
  imStudio: boolean;
}

/**
 * Suchfeld + Studio-Umschalter + Muskelgruppen-Filter + Liste. Wird im Katalog und in der Übungsauswahl genutzt.
 * Mit `studio` startet die Liste mit „nur dieses Studio“; „Alle Übungen“ zeigt den ganzen Katalog.
 */
export function UebungsListe({
  uebungen,
  onWaehlen,
  ausgewaehlt,
  onNeu,
  studio,
  fotoVon,
}: {
  uebungen: readonly Uebung[];
  onWaehlen: (uebung: Uebung) => void;
  /** Bei Mehrfachauswahl: IDs mit Haken */
  ausgewaehlt?: ReadonlySet<string>;
  /** Zeigt „Neue Übung anlegen“; bekommt Suchtext und Filter als Vorschlag mit */
  onNeu?: (vorschlag: NeuVorschlag) => void;
  /** Studio aus dem Profil (Filter ist anfangs aktiv) */
  studio?: Studio;
  /** Vorschaubild je Übung */
  fotoVon?: (uebung: Uebung) => string | undefined;
}) {
  const [suche, setSuche] = useState('');
  const [muskel, setMuskel] = useState<Muskelgruppe | null>(null);
  const [nurStudio, setNurStudio] = useState(true);
  const studioAktiv = Boolean(studio && nurStudio);

  const ohneStudioFilter = useMemo(() => sucheUebungen(uebungen, suche).filter((u) => !muskel || u.muskel === muskel), [uebungen, suche, muskel]);
  const gefiltert = useMemo(
    () => (studio && studioAktiv ? ohneStudioFilter.filter((u) => gibtEsImStudio(u, studio)) : ohneStudioFilter),
    [ohneStudioFilter, studio, studioAktiv],
  );
  const ausserhalb = ohneStudioFilter.length - gefiltert.length;

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Übung suchen</span>
        <Search aria-hidden size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-leise" />
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Übung suchen …"
          autoComplete="off"
          className="min-h-12 w-full rounded-2xl border border-linie bg-flaeche pr-4 pl-12 text-base outline-none placeholder:text-text-leise focus:border-akzent"
        />
      </label>
      {studio && (
        <Segment
          label="Übungen anzeigen"
          labelVersteckt
          wert={nurStudio ? 'studio' : 'alle'}
          optionen={[
            { wert: 'studio', text: studio.name },
            { wert: 'alle', text: 'Alle Übungen' },
          ]}
          onChange={(w) => setNurStudio(w === 'studio')}
        />
      )}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Nach Muskelgruppe filtern">
        <Chip aktiv={muskel === null} onClick={() => setMuskel(null)}>
          Alle
        </Chip>
        {MUSKELGRUPPEN.map((m) => (
          <Chip key={m} aktiv={muskel === m} onClick={() => setMuskel(muskel === m ? null : m)}>
            {MUSKELGRUPPEN_NAMEN[m]}
          </Chip>
        ))}
      </div>
      {onNeu && (
        <button
          type="button"
          onClick={() => onNeu({ name: suche.trim(), muskel, imStudio: studioAktiv })}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-linie px-4 font-semibold hover:bg-flaeche-hoch"
        >
          <Plus aria-hidden size={20} />
          Neue Übung anlegen
        </button>
      )}
      {gefiltert.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-text-leise">
          <p>
            {studio && studioAktiv && ausserhalb > 0
              ? `Bei ${studio.name} nicht dabei – ${ausserhalb === 1 ? '1 Treffer' : `${ausserhalb} Treffer`} unter „Alle Übungen“.`
              : onNeu && suche.trim()
                ? `Keine Übung gefunden – leg „${suche.trim()}“ über den Knopf oben neu an.`
                : 'Keine Übung gefunden.'}
          </p>
          {studio && studioAktiv && ausserhalb > 0 && (
            <button type="button" onClick={() => setNurStudio(false)} className="min-h-12 rounded-2xl px-4 font-semibold text-akzent hover:underline">
              Alle Übungen zeigen
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {gefiltert.map((u) => {
            const gewaehlt = ausgewaehlt?.has(u.id) ?? false;
            const foto = fotoVon?.(u);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onWaehlen(u)}
                  aria-pressed={ausgewaehlt ? gewaehlt : undefined}
                  className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 py-2 text-left transition-colors ${
                    gewaehlt ? 'border-akzent bg-flaeche-hoch' : 'border-transparent bg-flaeche hover:bg-flaeche-hoch'
                  }`}
                >
                  {foto && <img src={foto} alt="" className="-ml-2 h-12 w-12 shrink-0 rounded-xl object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{u.name}</span>
                    <span className="block text-sm text-text-leise">
                      {MUSKELGRUPPEN_NAMEN[u.muskel]} · {GERAETE_NAMEN[u.geraet]}
                      {u.eigene ? ' · eigene' : ''}
                    </span>
                  </span>
                  {ausgewaehlt && (
                    <span
                      aria-hidden
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                        gewaehlt ? 'border-akzent bg-akzent text-akzent-text' : 'border-linie'
                      }`}
                    >
                      {gewaehlt && <Check size={18} strokeWidth={3} />}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
