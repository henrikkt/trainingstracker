import { Check, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sucheUebungen } from '../domain/katalog.ts';
import { GERAETE_NAMEN, MUSKELGRUPPEN, MUSKELGRUPPEN_NAMEN, type Muskelgruppe, type Uebung } from '../domain/typen.ts';
import { Chip } from './Auswahl.tsx';

/** Suchfeld + Muskelgruppen-Filter + Liste. Wird im Katalog und in der Übungsauswahl genutzt. */
export function UebungsListe({
  uebungen,
  onWaehlen,
  ausgewaehlt,
  onNeu,
}: {
  uebungen: readonly Uebung[];
  onWaehlen: (uebung: Uebung) => void;
  /** Bei Mehrfachauswahl: IDs mit Haken */
  ausgewaehlt?: ReadonlySet<string>;
  /** Zeigt „Neue Übung anlegen“; bekommt Suchtext und Muskelfilter als Vorschlag mit */
  onNeu?: (vorschlag: { name: string; muskel: Muskelgruppe | null }) => void;
}) {
  const [suche, setSuche] = useState('');
  const [muskel, setMuskel] = useState<Muskelgruppe | null>(null);

  const gefiltert = useMemo(
    () => sucheUebungen(uebungen, suche).filter((u) => !muskel || u.muskel === muskel),
    [uebungen, suche, muskel],
  );

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
          onClick={() => onNeu({ name: suche.trim(), muskel })}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-linie px-4 font-semibold hover:bg-flaeche-hoch"
        >
          <Plus aria-hidden size={20} />
          Neue Übung anlegen
        </button>
      )}
      {gefiltert.length === 0 ? (
        <p className="py-8 text-center text-text-leise">
          {onNeu && suche.trim() ? `Keine Übung gefunden – leg „${suche.trim()}“ über den Knopf oben neu an.` : 'Keine Übung gefunden.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {gefiltert.map((u) => {
            const gewaehlt = ausgewaehlt?.has(u.id) ?? false;
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
