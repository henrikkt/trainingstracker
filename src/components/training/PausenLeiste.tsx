import { Timer, X } from 'lucide-react';
import { useEffect } from 'react';
import { signalisierePausenende, useJetzt } from '../../lib/geraet.ts';
import { formatiereUhr } from '../../lib/format.ts';
import { beendePause, markierePauseGemeldet, restSekunden, usePause, verschiebePause } from '../../lib/pause.ts';

/** Wie lange „Pause vorbei“ nach Ablauf noch sichtbar bleibt. */
const NACHLAUF_MS = 6000;

/**
 * Pausentimer über der Tab-Leiste: Restzeit groß, ±15 s, Überspringen.
 * Meldet das Ende einmalig per Vibration und Ton (soweit der Browser es erlaubt).
 */
export function PausenLeiste() {
  const pause = usePause();
  const jetzt = useJetzt(250);

  const rest = pause ? restSekunden(pause, jetzt) : 0;
  const vorbei = Boolean(pause) && rest === 0;

  useEffect(() => {
    if (pause && vorbei && !pause.gemeldet) {
      // Nur melden, wenn das Ende gerade erst erreicht wurde (nicht nach langer Zeit im Hintergrund/Neuladen)
      if (jetzt - pause.ende < NACHLAUF_MS) signalisierePausenende();
      markierePauseGemeldet();
    }
    if (pause && vorbei && jetzt - pause.ende > NACHLAUF_MS) beendePause();
  }, [pause, vorbei, jetzt]);

  if (!pause) return null;
  const anteil = Math.min(1, Math.max(0, 1 - (pause.ende - jetzt) / (pause.dauer * 1000)));

  return (
    <div
      role="timer"
      aria-label="Pausentimer"
      className={`fixed inset-x-2 bottom-[calc(4.75rem+var(--sicher-unten))] z-30 mx-auto max-w-lg overflow-hidden rounded-3xl border shadow-2xl md:bottom-4 ${
        vorbei ? 'border-akzent bg-akzent text-akzent-text' : 'border-linie bg-flaeche-hoch'
      }`}
    >
      {!vorbei && <div aria-hidden className="absolute inset-y-0 left-0 bg-akzent/15 transition-[width] duration-200" style={{ width: `${anteil * 100}%` }} />}
      <div className="relative flex items-center gap-2 p-2 pl-4">
        <Timer aria-hidden size={22} className={vorbei ? '' : 'text-akzent'} />
        <p className="min-w-0 flex-1" aria-live="polite">
          {vorbei ? (
            <span className="font-display text-2xl font-extrabold uppercase">Pause vorbei – los!</span>
          ) : (
            <>
              <span className="sr-only">Pause: noch </span>
              <span className="font-display text-3xl font-extrabold tabular-nums">{formatiereUhr(rest)}</span>
            </>
          )}
        </p>
        {!vorbei && (
          <>
            <button type="button" onClick={() => verschiebePause(-15)} className="h-12 min-w-12 rounded-2xl px-2 font-bold hover:bg-flaeche">
              −15
            </button>
            <button type="button" onClick={() => verschiebePause(15)} className="h-12 min-w-12 rounded-2xl px-2 font-bold hover:bg-flaeche">
              +15
            </button>
          </>
        )}
        <button type="button" aria-label="Pause beenden" onClick={beendePause} className="flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-black/10">
          <X aria-hidden size={22} />
        </button>
      </div>
    </div>
  );
}
