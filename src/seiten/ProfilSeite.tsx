import { Download, Settings, Smartphone } from 'lucide-react';
import { Karte, SeitenKopf } from '../components/ui.tsx';

/** Platzhalter bis E3/E5/E6 (Einstellungen, Export, Konto). */
export function ProfilSeite() {
  return (
    <>
      <SeitenKopf titel="Profil" unterzeile="Einstellungen, Export und Konto." />
      <div className="flex flex-col gap-4">
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
          <Settings aria-hidden className="mt-0.5 shrink-0 text-text-leise" />
          <div>
            <h2 className="font-display text-xl font-bold">Einstellungen</h2>
            <p className="mt-1 text-sm text-text-leise">Pausendauer, RIR/RPE und Gewichtsschritte – kommen in Kürze.</p>
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
