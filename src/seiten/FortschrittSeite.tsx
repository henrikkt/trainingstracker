import { TrendingUp } from 'lucide-react';
import { LeererZustand, SeitenKopf } from '../components/ui.tsx';

/** Platzhalter bis E5 (Diagramme, Rekorde, Kalender). */
export function FortschrittSeite() {
  return (
    <>
      <SeitenKopf titel="Fortschritt" unterzeile="Rekorde, Verlauf und Volumen pro Muskelgruppe." />
      <LeererZustand
        icon={TrendingUp}
        titel="Noch nichts zu sehen"
        text="Nach deinen ersten Trainings findest du hier Diagramme und persönliche Rekorde."
      />
    </>
  );
}
