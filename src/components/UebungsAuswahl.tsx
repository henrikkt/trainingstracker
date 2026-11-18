import { useState } from 'react';
import { useAlleUebungen } from '../daten/hooks.ts';
import { Knopf } from './ui.tsx';
import { UebungsListe } from './UebungsListe.tsx';
import { Vollbild } from './Vollbild.tsx';

/** Mehrfachauswahl von Übungen (Reihenfolge = Reihenfolge des Antippens). */
export function UebungsAuswahl({ onFertig, onSchliessen }: { onFertig: (uebungIds: string[]) => void; onSchliessen: () => void }) {
  const uebungen = useAlleUebungen();
  const [gewaehlt, setGewaehlt] = useState<string[]>([]);

  const umschalten = (id: string) => setGewaehlt((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  return (
    <Vollbild
      titel="Übungen hinzufügen"
      onSchliessen={onSchliessen}
      fuss={
        <Knopf gross className="w-full" disabled={gewaehlt.length === 0} onClick={() => onFertig(gewaehlt)}>
          {gewaehlt.length === 0 ? 'Übungen antippen' : gewaehlt.length === 1 ? '1 Übung hinzufügen' : `${gewaehlt.length} Übungen hinzufügen`}
        </Knopf>
      }
    >
      <div className="p-4">
        <UebungsListe uebungen={uebungen} ausgewaehlt={new Set(gewaehlt)} onWaehlen={(u) => umschalten(u.id)} />
      </div>
    </Vollbild>
  );
}
