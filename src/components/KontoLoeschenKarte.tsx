import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { eigenesKontoLoeschen } from '../daten/admin.ts';
import { useSitzung } from '../daten/sitzung.ts';
import { useOnline } from '../hooks/useOnline.ts';
import { Karte, Knopf } from './ui.tsx';

/** Eigenes Konto inklusive aller Daten löschen (DSGVO: Recht auf Löschung, ohne Admin). */
export function KontoLoeschenKarte() {
  const sitzung = useSitzung();
  const online = useOnline();
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  if (sitzung.status !== 'angemeldet') return null;

  const loeschen = async () => {
    const eingabe = window.prompt(
      'Dein Konto und ALLE deine Trainingsdaten werden endgültig gelöscht – auf dem Server und auf diesem Gerät. Exportiere vorher deine Daten, wenn du sie behalten willst.\n\nZum Bestätigen LÖSCHEN eingeben:',
    );
    if (eingabe?.trim().toUpperCase() !== 'LÖSCHEN') return;
    setLaeuft(true);
    setFehler('');
    try {
      await eigenesKontoLoeschen();
    } catch (e) {
      setFehler((e as Error).message);
      setLaeuft(false);
    }
  };

  return (
    <Karte className="flex flex-col gap-3 border border-fehler/40">
      <h2 className="font-display text-xl font-bold">Konto löschen</h2>
      <p className="text-sm text-text-leise">Löscht dein Konto und alle Trainingsdaten endgültig. Das lässt sich nicht rückgängig machen.</p>
      {fehler && (
        <p role="alert" className="text-sm text-fehler">
          {fehler}
        </p>
      )}
      <Knopf variante="sekundaer" icon={Trash2} className="text-fehler!" disabled={laeuft || !online} onClick={() => void loeschen()}>
        {online ? 'Konto und alle Daten löschen' : 'Konto löschen (nur online)'}
      </Knopf>
    </Karte>
  );
}
