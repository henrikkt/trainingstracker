import { CalendarDays, Play, ClipboardList } from 'lucide-react';
import { Karte, Knopf, LeererZustand, SeitenKopf } from '../components/ui.tsx';

/** Platzhalter bis E4 (Training erfassen). */
export function TrainingSeite() {
  return (
    <>
      <SeitenKopf titel="Training" unterzeile="Bereit für die nächste Einheit?" />
      <div className="flex flex-col gap-4">
        <Karte className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Los geht's</h2>
          <Knopf gross icon={Play} disabled title="Kommt in Kürze">
            Freies Training starten
          </Knopf>
          <Knopf gross variante="sekundaer" icon={ClipboardList} disabled title="Kommt in Kürze">
            Aus Vorlage starten
          </Knopf>
          <p className="text-sm text-text-leise">Das Erfassen von Trainings wird gerade gebaut.</p>
        </Karte>
        <LeererZustand icon={CalendarDays} titel="Noch keine Trainings" text="Hier erscheinen deine letzten Einheiten mit Dauer, Volumen und Rekorden." />
      </div>
    </>
  );
}
