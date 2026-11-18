import { WifiOff } from 'lucide-react';
import { useSitzung } from '../daten/sitzung.ts';
import { useOnline } from '../hooks/useOnline.ts';

/**
 * Banner, solange das Gerät offline ist. Den laufenden Sync-Status zeigt zusätzlich das Symbol
 * im Seitenkopf (SyncPunkt) bzw. die Karte im Profil.
 */
export function VerbindungsStatus() {
  const online = useOnline();
  const sitzung = useSitzung();
  if (online) return null;
  return (
    <div role="status" className="pt-sicher sticky top-0 z-10 bg-flaeche-hoch px-4 pb-2 text-center text-sm text-text">
      <span className="inline-flex items-center gap-2">
        <WifiOff aria-hidden size={16} className="text-akzent" />
        {sitzung.status === 'angemeldet' ? 'Offline – alles wird gespeichert und später synchronisiert.' : 'Offline – alles wird auf dem Gerät gespeichert.'}
      </span>
    </div>
  );
}
