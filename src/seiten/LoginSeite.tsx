import { LogIn, WifiOff } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { TextFeld } from '../components/Auswahl.tsx';
import { Karte, Knopf } from '../components/ui.tsx';
import { anmelden } from '../daten/sitzung.ts';
import { useOnline } from '../hooks/useOnline.ts';

/** Vollbild-Rahmen für Seiten vor dem Login (ohne Navigation). */
export function AnmeldeRahmen({ titel, unterzeile, children }: { titel: string; unterzeile: string; children: ReactNode }) {
  return (
    <main className="pt-sicher px-sicher mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 pb-10">
      <div className="text-center">
        <p className="font-display text-6xl font-black tracking-tight" aria-hidden>
          Stemm<span className="text-akzent">.</span>
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold uppercase">{titel}</h1>
        <p className="mt-1 text-text-leise">{unterzeile}</p>
      </div>
      {children}
    </main>
  );
}

export function FehlerHinweis({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-2xl border border-fehler/60 bg-fehler/10 px-4 py-3 text-sm text-text">
      {text}
    </p>
  );
}

/** Anmeldung mit E-Mail und Passwort. Konten gibt es nur per Einladung. */
export function LoginSeite() {
  const online = useOnline();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const absenden = async (e: FormEvent) => {
    e.preventDefault();
    setLaeuft(true);
    setFehler((await anmelden(email, passwort)) ?? '');
    setLaeuft(false);
  };

  return (
    <AnmeldeRahmen titel="Anmelden" unterzeile="Dein Trainingstracker fürs Studio.">
      <Karte>
        <form className="flex flex-col gap-4" onSubmit={(e) => void absenden(e)}>
          <TextFeld label="E-Mail" typ="email" autoComplete="username" wert={email} onChange={setEmail} maxLaenge={254} autoFocus />
          <TextFeld label="Passwort" typ="password" autoComplete="current-password" wert={passwort} onChange={setPasswort} maxLaenge={200} />
          <FehlerHinweis text={fehler} />
          {!online && (
            <p className="flex items-center gap-2 text-sm text-text-leise">
              <WifiOff aria-hidden size={16} /> Für die Anmeldung brauchst du einmal Internet – danach geht alles auch offline.
            </p>
          )}
          <Knopf gross type="submit" icon={LogIn} disabled={laeuft || !email || !passwort}>
            {laeuft ? 'Anmelden …' : 'Anmelden'}
          </Knopf>
        </form>
      </Karte>
      <p className="text-center text-sm text-text-leise">
        Stemm ist privat – ein Konto gibt es nur per Einladung.
        <br />
        Passwort vergessen? Frag den Admin nach einem Reset-Link.
      </p>
    </AnmeldeRahmen>
  );
}
