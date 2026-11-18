import { ClipboardList } from 'lucide-react';
import { LeererZustand, SeitenKopf } from '../components/ui.tsx';

/** Platzhalter bis E3 (Vorlagen und Übungskatalog). */
export function PlaeneSeite() {
  return (
    <>
      <SeitenKopf titel="Pläne" unterzeile="Vorlagen wie Push, Pull, Beine oder Ganzkörper." />
      <LeererZustand
        icon={ClipboardList}
        titel="Noch keine Vorlagen"
        text="Lege Vorlagen mit Übungen, Ziel-Sätzen und Wiederholungen an – Start mit einem Tipp."
      />
    </>
  );
}
