import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { verkleinereFoto } from '../lib/bild.ts';
import { Knopf } from './ui.tsx';
import { Vollbild } from './Vollbild.tsx';

/** Kleines Vorschaubild; Antippen zeigt das Foto groß. */
export function FotoKnopf({ src, name, groesse = 'h-14 w-14' }: { src: string; name: string; groesse?: string }) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOffen(true)} aria-label={`Foto ${name} ansehen`} className={`${groesse} shrink-0 overflow-hidden rounded-xl border border-linie bg-grund`}>
        <img src={src} alt="" className="h-full w-full object-cover" />
      </button>
      {offen && (
        <Vollbild titel={name} onSchliessen={() => setOffen(false)}>
          <div className="flex h-full items-center justify-center p-4">
            <img src={src} alt={`Foto ${name}`} className="max-h-full max-w-full rounded-2xl object-contain" />
          </div>
        </Vollbild>
      )}
    </>
  );
}

/** Foto aufnehmen (Rückkamera am Handy, Dateiauswahl am Desktop), ersetzen oder entfernen. */
export function FotoBearbeiten({
  name,
  foto,
  eigenesFoto = Boolean(foto),
  onFoto,
}: {
  name: string;
  /** angezeigtes Foto (eigenes oder aus dem Katalog) */
  foto: string | undefined;
  /** nur ein eigenes Foto lässt sich entfernen (das Katalog-Foto erscheint dann wieder) */
  eigenesFoto?: boolean;
  onFoto: (dataUrl: string | undefined) => void;
}) {
  const eingabe = useRef<HTMLInputElement>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {foto && <FotoKnopf src={foto} name={name} groesse="h-40 w-40" />}
      <input
        ref={eingabe}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Foto auswählen"
        className="hidden"
        onChange={async (e) => {
          const datei = e.target.files?.[0];
          e.target.value = ''; // dieselbe Datei später erneut wählbar
          if (!datei) return;
          setFehler(null);
          setLaedt(true);
          try {
            onFoto(await verkleinereFoto(datei));
          } catch (f) {
            setFehler((f as Error).message);
          } finally {
            setLaedt(false);
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Knopf variante="sekundaer" icon={Camera} disabled={laedt} onClick={() => eingabe.current?.click()}>
          {laedt ? 'Foto wird verkleinert …' : foto ? 'Foto ersetzen' : 'Foto aufnehmen'}
        </Knopf>
        {eigenesFoto && (
          <Knopf variante="leise" icon={Trash2} onClick={() => onFoto(undefined)}>
            Foto entfernen
          </Knopf>
        )}
      </div>
      {fehler && (
        <p role="alert" className="text-sm text-fehler">
          {fehler}
        </p>
      )}
    </div>
  );
}
