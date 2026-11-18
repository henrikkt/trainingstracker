import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline.ts';

/**
 * Zeigt dezent an, wenn das Gerät offline ist. Ab E7 wird daraus die vollständige Sync-Anzeige
 * (✓ synchronisiert / ↻ n ausstehend / offline).
 */
export function VerbindungsStatus() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="pt-sicher sticky top-0 z-10 bg-flaeche-hoch px-4 pb-2 text-center text-sm text-text">
      <span className="inline-flex items-center gap-2">
        <WifiOff aria-hidden size={16} className="text-akzent" />
        Offline – alles wird auf dem Gerät gespeichert.
      </span>
    </div>
  );
}
