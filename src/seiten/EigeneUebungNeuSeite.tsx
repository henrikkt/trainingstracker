import { useNavigate } from 'react-router';
import { EigeneUebungFormular } from '../components/EigeneUebungFormular.tsx';
import { SeitenKopf } from '../components/ui.tsx';
import { neueId, speichereEigeneUebung } from '../daten/repo.ts';

export function EigeneUebungNeuSeite() {
  const navigate = useNavigate();
  return (
    <>
      <SeitenKopf titel="Eigene Übung" zurueck="/plaene/uebungen" unterzeile="Fehlt eine Übung im Katalog? Leg sie hier an." />
      <div className="pb-6">
        <EigeneUebungFormular
          knopfText="Übung anlegen"
          onSpeichern={async (daten) => {
            const id = neueId();
            await speichereEigeneUebung({ id, ...daten });
            navigate(`/plaene/uebungen/${id}`, { replace: true });
          }}
        />
      </div>
    </>
  );
}
