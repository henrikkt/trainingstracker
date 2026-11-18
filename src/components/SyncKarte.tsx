import { RefreshCw } from 'lucide-react';
import { useSitzung } from '../daten/sitzung.ts';
import { useJetzt } from '../lib/geraet.ts';
import { useOnline } from '../hooks/useOnline.ts';
import { jetztSynchronisieren, useSyncStatus } from '../sync/dienst.ts';
import { syncDarstellung } from './SyncAnzeige.tsx';
import { Karte, Knopf } from './ui.tsx';

function vorWieLangerZeit(iso: string, jetzt: number): string {
  const sek = Math.max(0, Math.round((jetzt - Date.parse(iso)) / 1000));
  if (sek < 60) return 'gerade eben';
  const min = Math.round(sek / 60);
  if (min < 60) return `vor ${min} min`;
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/** Sync-Details im Profil mit „Jetzt synchronisieren“. */
export function SyncKarte() {
  const sitzung = useSitzung();
  const status = useSyncStatus();
  const online = useOnline();
  const jetzt = useJetzt(15_000);
  if (sitzung.status !== 'angemeldet') return null;
  const d = syncDarstellung(status, online);
  const Icon = d.icon;

  return (
    <Karte className="flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <Icon aria-hidden className={`mt-0.5 shrink-0 ${d.farbe} ${d.dreht ? 'animate-spin motion-reduce:animate-none' : ''}`} />
        <div>
          <h2 className="font-display text-xl font-bold">Synchronisierung</h2>
          <p className="mt-1 text-sm" aria-live="polite">
            {d.text}
          </p>
          <p className="mt-1 text-sm text-text-leise">
            {status.letzterSync ? `Zuletzt synchronisiert ${vorWieLangerZeit(status.letzterSync, jetzt)}.` : 'Noch nicht synchronisiert.'} Alles wird zuerst auf diesem Gerät gespeichert und
            automatisch hochgeladen, sobald Internet da ist.
          </p>
        </div>
      </div>
      <Knopf variante="sekundaer" icon={RefreshCw} disabled={!online || status.zustand === 'laeuft'} onClick={() => void jetztSynchronisieren()}>
        Jetzt synchronisieren
      </Knopf>
    </Karte>
  );
}
