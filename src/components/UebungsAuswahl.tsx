import { useState } from 'react';
import { useAlleUebungen } from '../daten/hooks.ts';
import { neueId, speichereEigeneUebung } from '../daten/repo.ts';
import { EigeneUebungFormular, type UebungsDaten } from './EigeneUebungFormular.tsx';
import { Knopf } from './ui.tsx';
import { UebungsListe } from './UebungsListe.tsx';
import { Vollbild } from './Vollbild.tsx';

/**
 * Mehrfachauswahl von Übungen (Reihenfolge = Reihenfolge des Antippens).
 * Fehlt eine Übung, lässt sie sich direkt hier anlegen – sie ist danach gleich ausgewählt.
 */
export function UebungsAuswahl({ onFertig, onSchliessen }: { onFertig: (uebungIds: string[]) => void; onSchliessen: () => void }) {
  const uebungen = useAlleUebungen();
  const [gewaehlt, setGewaehlt] = useState<string[]>([]);
  /** Gesetzt = Formular „Neue Übung“ ist offen (mit Vorschlag aus Suche/Filter) */
  const [neu, setNeu] = useState<Partial<UebungsDaten> | null>(null);

  const umschalten = (id: string) => setGewaehlt((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  if (neu) {
    return (
      <Vollbild titel="Neue Übung" onSchliessen={() => setNeu(null)}>
        <div className="p-4">
          <EigeneUebungFormular
            start={neu}
            fokus
            knopfText="Anlegen und auswählen"
            onSpeichern={async (daten) => {
              const id = neueId();
              await speichereEigeneUebung({ id, ...daten });
              setGewaehlt((g) => [...g, id]);
              setNeu(null);
            }}
          />
        </div>
      </Vollbild>
    );
  }

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
        <UebungsListe
          uebungen={uebungen}
          ausgewaehlt={new Set(gewaehlt)}
          onWaehlen={(u) => umschalten(u.id)}
          onNeu={({ name, muskel }) => setNeu({ name, ...(muskel ? { muskel } : {}) })}
        />
      </div>
    </Vollbild>
  );
}
