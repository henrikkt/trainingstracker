import { useLiveQuery } from 'dexie-react-hooks';
import { Download, HardDrive, Smartphone } from 'lucide-react';
import { Segment } from '../components/Auswahl.tsx';
import { Stepper } from '../components/Stepper.tsx';
import { Karte, SeitenKopf } from '../components/ui.tsx';
import { useProfil } from '../daten/hooks.ts';
import { aktualisiereProfil } from '../daten/repo.ts';
import { istSpeicherDauerhaft } from '../daten/speicher.ts';
import { formatierePause, GEWICHTS_SCHRITTE, PAUSE_GRENZEN } from '../domain/einstellungen.ts';
import type { ProfilEinstellungen } from '../domain/typen.ts';
import { formatiereZahl } from '../lib/format.ts';

export function ProfilSeite() {
  const profil = useProfil();
  const dauerhaft = useLiveQuery(istSpeicherDauerhaft);
  const setze = (aenderung: Partial<ProfilEinstellungen>) => void aktualisiereProfil(aenderung);

  return (
    <>
      <SeitenKopf titel="Profil" unterzeile="Einstellungen, Export und Konto." />
      <div className="flex flex-col gap-4 pb-6">
        <Karte className="flex flex-col gap-5">
          <h2 className="font-display text-2xl font-bold">Einstellungen</h2>
          <div className="flex flex-col gap-1">
            <Stepper
              label="Standard-Pause"
              einheit="s"
              wert={profil.pauseSek}
              schritt={PAUSE_GRENZEN.schritt}
              min={PAUSE_GRENZEN.min}
              max={PAUSE_GRENZEN.max}
              onChange={(pauseSek) => setze({ pauseSek })}
            />
            <p className="text-sm text-text-leise">{formatierePause(profil.pauseSek)} – pro Übung anpassbar.</p>
          </div>
          <Segment
            label="Anstrengung erfassen als"
            wert={profil.intensitaet}
            optionen={[
              { wert: 'rir', text: 'RIR (Wdh. im Tank)' },
              { wert: 'rpe', text: 'RPE (1–10)' },
            ]}
            onChange={(intensitaet) => setze({ intensitaet })}
          />
          <Segment
            label="Gewichtsschritt der +/–-Knöpfe"
            wert={profil.gewichtsSchritt}
            optionen={GEWICHTS_SCHRITTE.map((s) => ({ wert: s, text: `${formatiereZahl(s)} kg` }))}
            onChange={(gewichtsSchritt) => setze({ gewichtsSchritt })}
          />
        </Karte>

        <Karte className="flex items-start gap-4">
          <HardDrive aria-hidden className={`mt-0.5 shrink-0 ${dauerhaft ? 'text-akzent' : 'text-text-leise'}`} />
          <div>
            <h2 className="font-display text-xl font-bold">Daten auf diesem Gerät</h2>
            <p className="mt-1 text-sm text-text-leise">
              {dauerhaft
                ? 'Dauerhaft gespeichert – der Browser löscht sie nicht automatisch.'
                : 'Noch nicht dauerhaft gesichert. Installiere die App, damit der Browser die Daten nicht bei Platzmangel löscht.'}
            </p>
          </div>
        </Karte>

        <Karte className="flex items-start gap-4">
          <Smartphone aria-hidden className="mt-0.5 shrink-0 text-akzent" />
          <div>
            <h2 className="font-display text-xl font-bold">App installieren</h2>
            <p className="mt-1 text-sm text-text-leise">
              iPhone: In Safari auf „Teilen“ und dann „Zum Home-Bildschirm“ tippen. Android: Im Chrome-Menü „App installieren“ wählen.
            </p>
          </div>
        </Karte>

        <Karte className="flex items-start gap-4">
          <Download aria-hidden className="mt-0.5 shrink-0 text-text-leise" />
          <div>
            <h2 className="font-display text-xl font-bold">Daten exportieren</h2>
            <p className="mt-1 text-sm text-text-leise">CSV und JSON – kommt in Kürze.</p>
          </div>
        </Karte>
      </div>
    </>
  );
}
