import { formatiereGewicht } from './lib/format.ts';

/** Platzhalter bis Etappe E1 (App-Hülle mit Navigation). */
export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-6xl font-black tracking-tight">
        Stemm<span className="text-akzent">.</span>
      </h1>
      <p className="text-text-leise">Dein Trainingstracker fürs Studio – bald geht's los.</p>
      <p className="rounded-2xl bg-flaeche px-5 py-3 text-lg tabular-nums">
        Letztes Mal: 3 × 8 × {formatiereGewicht(80)}
      </p>
      <button
        type="button"
        className="min-h-14 w-full rounded-2xl bg-akzent px-6 text-lg font-bold text-akzent-text active:scale-[0.98]"
      >
        Training starten
      </button>
    </main>
  );
}
