import { CloudAlert, CloudCheck, CloudOff, CloudUpload, RefreshCw, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { useSitzung } from '../daten/sitzung.ts';
import { useOnline } from '../hooks/useOnline.ts';
import { useSyncStatus, type SyncStatus } from '../sync/dienst.ts';

interface Darstellung {
  icon: LucideIcon;
  text: string;
  farbe: string;
  dreht?: boolean;
}

/** Kurzer, sichtbarer Sync-Status: synchronisiert / n ausstehend / läuft / offline / Fehler. */
export function syncDarstellung(status: SyncStatus, online: boolean): Darstellung {
  const offen = status.ausstehend;
  if (!online || status.zustand === 'offline') {
    return { icon: CloudOff, text: offen > 0 ? `Offline – ${offen} ${offen === 1 ? 'Änderung wartet' : 'Änderungen warten'}` : 'Offline', farbe: 'text-text-leise' };
  }
  if (status.zustand === 'fehler') return { icon: CloudAlert, text: status.meldung ?? 'Sync-Fehler', farbe: 'text-fehler' };
  if (status.zustand === 'laeuft') return { icon: RefreshCw, text: 'Synchronisiere …', farbe: 'text-text-leise', dreht: true };
  if (offen > 0) return { icon: CloudUpload, text: `${offen} ${offen === 1 ? 'Änderung' : 'Änderungen'} ausstehend`, farbe: 'text-text-leise' };
  return { icon: CloudCheck, text: 'Synchronisiert', farbe: 'text-akzent' };
}

/** Kleines Sync-Symbol (z. B. im Seitenkopf); Tipp führt zu den Details im Profil. Nur mit Konto sichtbar. */
export function SyncPunkt() {
  const sitzung = useSitzung();
  const status = useSyncStatus();
  const online = useOnline();
  if (sitzung.status !== 'angemeldet') return null;
  const d = syncDarstellung(status, online);
  const Icon = d.icon;
  return (
    <Link
      to="/profil"
      role="status"
      aria-label={`Sync-Status: ${d.text}`}
      title={d.text}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-flaeche hover:bg-flaeche-hoch"
    >
      <Icon aria-hidden size={22} className={`${d.farbe} ${d.dreht ? 'animate-spin motion-reduce:animate-none' : ''}`} />
      {status.ausstehend > 0 && status.zustand !== 'laeuft' && (
        <span aria-hidden className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-akzent px-1 text-center text-xs font-bold text-akzent-text tabular-nums">
          {status.ausstehend > 99 ? '99+' : status.ausstehend}
        </span>
      )}
    </Link>
  );
}
