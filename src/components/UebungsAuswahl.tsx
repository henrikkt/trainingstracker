import { useState } from 'react';
import { useAlleUebungen, useFotoVon, useMeinStudio } from '../daten/hooks.ts';
import { neueId, speichereEigeneUebung } from '../daten/repo.ts';
import { EigeneUebungFormular, type UebungsDaten } from './EigeneUebungFormular.tsx';
import { Knopf } from './ui.tsx';
import { UebungsListe } from './UebungsListe.tsx';
import { Vollbild } from './Vollbild.tsx';

/**
 * Mehrfachauswahl von Übungen (Reihenfolge = Reihenfolge des Antippens).
 * Fehlt eine Übung, lässt sie sich direkt hier anlegen – sie ist danach gleich ausgewählt.
 * Die Liste bleibt dabei im Hintergrund erhalten (Suche und Filter gehen nicht verloren).
 */
export function UebungsAuswahl({ onFertig, onSchliessen }: { onFertig: (uebungIds: string[]) => void; onSchliessen: () => void }) {
  const uebungen = useAlleUebungen();
  const studio = useMeinStudio();
  const fotoVon = useFotoVon();
  const [gewaehlt, setGewaehlt] = useState<string[]>([]);
  /** Gesetzt = Formular „Neue Übung“ ist offen (mit Vorschlag aus Suche/Filter) */
  const [neu, setNeu] = useState<Partial<UebungsDaten> | null>(null);

  const umschalten = (id: string) => setGewaehlt((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  return (
    <Vollbild
      titel={neu ? 'Neue Übung' : 'Übungen hinzufügen'}
      onSchliessen={neu ? () => setNeu(null) : onSchliessen}
      fuss={
        neu ? undefined : (
          <Knopf gross className="w-full" disabled={gewaehlt.length === 0} onClick={() => onFertig(gewaehlt)}>
            {gewaehlt.length === 0 ? 'Übungen antippen' : gewaehlt.length === 1 ? '1 Übung hinzufügen' : `${gewaehlt.length} Übungen hinzufügen`}
          </Knopf>
        )
      }
    >
      {neu && (
        <div className="p-4">
          <EigeneUebungFormular
            start={neu}
            fokus
            studio={studio}
            knopfText="Anlegen und auswählen"
            onSpeichern={async (daten) => {
              const id = neueId();
              await speichereEigeneUebung({ id, ...daten });
              setGewaehlt((g) => [...g, id]);
              setNeu(null);
            }}
          />
        </div>
      )}
      <div className="p-4" hidden={Boolean(neu)}>
        <UebungsListe
          uebungen={uebungen}
          ausgewaehlt={new Set(gewaehlt)}
          onWaehlen={(u) => umschalten(u.id)}
          studio={studio}
          fotoVon={fotoVon}
          onNeu={({ name, muskel, imStudio }) => setNeu({ name, ...(muskel ? { muskel } : {}), studios: imStudio && studio ? [studio.id] : [] })}
        />
      </div>
    </Vollbild>
  );
}
