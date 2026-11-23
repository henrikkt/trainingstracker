import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Knopf, Reiter, SeitenKopf } from '../components/ui.tsx';
import { UebungsListe } from '../components/UebungsListe.tsx';
import { useAlleUebungen, useFotoVon, useMeinStudio } from '../daten/hooks.ts';
import { PLAENE_REITER } from './PlaeneSeite.tsx';

/** Übungskatalog mit Suche und Filter; Tipp öffnet Details und Einstellungen. */
export function UebungenSeite() {
  const uebungen = useAlleUebungen();
  const navigate = useNavigate();
  const studio = useMeinStudio();
  const fotoVon = useFotoVon();
  return (
    <>
      <SeitenKopf titel="Pläne" unterzeile={`${uebungen.length} Übungen – tippe für Einstellungen.`} />
      <Reiter ziele={PLAENE_REITER} />
      <div className="flex flex-col gap-4 pb-6">
        <Knopf variante="sekundaer" icon={Plus} onClick={() => navigate('/plaene/uebungen/neu')}>
          Eigene Übung anlegen
        </Knopf>
        <UebungsListe uebungen={uebungen} studio={studio} fotoVon={fotoVon} onWaehlen={(u) => navigate(`/plaene/uebungen/${u.id}`)} />
      </div>
    </>
  );
}
