import { Ban, Check, Copy, KeyRound, Send, Share2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { TextFeld } from '../components/Auswahl.tsx';
import { Karte, Knopf, SeitenKopf } from '../components/ui.tsx';
import { ladeEin, ladeNutzer, linkAdresse, loescheNutzer, resetLink, sperre, type LinkAntwort, type NutzerEintrag } from '../daten/admin.ts';
import { useSitzung } from '../daten/sitzung.ts';
import { useOnline } from '../hooks/useOnline.ts';
import { formatiereDatum } from '../lib/format.ts';
import { FehlerHinweis } from './LoginSeite.tsx';

/** Zeigt einen Einladungs- oder Reset-Link zum Kopieren/Teilen. */
function LinkKarte({ antwort, onFertig }: { antwort: LinkAntwort; onFertig: () => void }) {
  const link = linkAdresse(antwort);
  const [kopiert, setKopiert] = useState(false);
  const text = antwort.typ === 'invite' ? `Hier ist deine Einladung zu Stemm, unserem Trainingstracker: ${link}` : `Hier ist dein Link zum Zurücksetzen des Stemm-Passworts: ${link}`;

  return (
    <section aria-label="Erstellter Link" className="flex flex-col gap-3 rounded-2xl border-2 border-akzent bg-grund p-4">
      <p className="font-semibold">
        {antwort.typ === 'invite' ? 'Einladungslink' : 'Reset-Link'} für {antwort.email}
      </p>
      <input readOnly value={link} aria-label="Link" onFocus={(e) => e.currentTarget.select()} className="min-h-12 rounded-xl border border-linie bg-flaeche px-3 text-sm" />
      <p className="text-sm text-text-leise">Gültig 24 Stunden und nur einmal nutzbar. Schick ihn persönlich, z. B. per Messenger – wer den Link hat, kann das Konto übernehmen.</p>
      <div className="grid grid-cols-2 gap-2">
        <Knopf
          variante="sekundaer"
          icon={kopiert ? Check : Copy}
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setKopiert(true);
          }}
        >
          {kopiert ? 'Kopiert' : 'Kopieren'}
        </Knopf>
        {'share' in navigator ? (
          <Knopf variante="sekundaer" icon={Share2} onClick={() => void navigator.share({ title: 'Stemm', text }).catch(() => undefined)}>
            Teilen
          </Knopf>
        ) : (
          <Knopf variante="sekundaer" onClick={onFertig}>
            Fertig
          </Knopf>
        )}
      </div>
    </section>
  );
}

/** Zugänge verwalten (nur Admin): einladen, Reset-Link, sperren, löschen. Zeigt keine Trainingsdaten. */
export function ZugaengeSeite() {
  const sitzung = useSitzung();
  const online = useOnline();
  const [nutzer, setNutzer] = useState<NutzerEintrag[] | null>(null);
  const [email, setEmail] = useState('');
  const [link, setLink] = useState<LinkAntwort | null>(null);
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const istAdmin = sitzung.status === 'angemeldet' && sitzung.nutzer.admin;
  const eigeneId = sitzung.status === 'angemeldet' ? sitzung.nutzer.id : '';

  const mitFehler = useCallback(async (arbeit: () => Promise<void>) => {
    setFehler('');
    setLaeuft(true);
    try {
      await arbeit();
    } catch (e) {
      setFehler((e as Error).message);
    } finally {
      setLaeuft(false);
    }
  }, []);

  const neuLaden = useCallback(() => mitFehler(async () => setNutzer(await ladeNutzer())), [mitFehler]);
  useEffect(() => {
    if (istAdmin && online) void neuLaden();
  }, [istAdmin, online, neuLaden]);

  if (!istAdmin) return <Navigate to="/profil" replace />;

  const einladen = (e: FormEvent) => {
    e.preventDefault();
    void mitFehler(async () => {
      setLink(await ladeEin(email));
      setEmail('');
      setNutzer(await ladeNutzer());
    });
  };

  return (
    <>
      <SeitenKopf titel="Zugänge" zurueck="/profil" unterzeile="Freunde einladen und Zugänge verwalten. Trainingsdaten siehst du hier nicht." />
      <div className="flex flex-col gap-4 pb-6">
        {!online && <FehlerHinweis text="Die Verwaltung braucht eine Internetverbindung." />}
        <FehlerHinweis text={fehler} />

        <Karte className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <UserPlus aria-hidden size={22} className="text-akzent" /> Freund einladen
          </h2>
          <form className="flex flex-col gap-3" onSubmit={einladen}>
            <TextFeld label="E-Mail der Person" typ="email" autoComplete="off" wert={email} onChange={setEmail} maxLaenge={254} />
            <Knopf type="submit" icon={Send} disabled={laeuft || !online || !email.includes('@')}>
              Einladungslink erstellen
            </Knopf>
          </form>
          {link && <LinkKarte antwort={link} onFertig={() => setLink(null)} />}
        </Karte>

        <Karte className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">Konten</h2>
          {nutzer === null ? (
            <p className="text-sm text-text-leise">{online ? 'Lädt …' : 'Offline – Liste nicht verfügbar.'}</p>
          ) : (
            <ul aria-label="Konten" className="flex flex-col divide-y divide-linie">
              {nutzer.map((n) => {
                const ich = n.id === eigeneId;
                return (
                  <li key={n.id} className="flex flex-col gap-2 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-semibold">{n.email}</span>
                      {n.admin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-flaeche-hoch px-2 py-0.5 text-xs">
                          <ShieldCheck aria-hidden size={14} className="text-akzent" /> Admin
                        </span>
                      )}
                      {n.gesperrt && <span className="rounded-full bg-fehler/20 px-2 py-0.5 text-xs">Gesperrt</span>}
                      {n.einladungOffen && <span className="rounded-full bg-flaeche-hoch px-2 py-0.5 text-xs">Einladung offen</span>}
                      {ich && <span className="text-xs text-text-leise">(du)</span>}
                    </div>
                    <p className="text-xs text-text-leise">
                      Seit {formatiereDatum(n.erstelltAm)} · {n.letzteAnmeldung ? `zuletzt angemeldet ${formatiereDatum(n.letzteAnmeldung)}` : 'noch nie angemeldet'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Knopf variante="sekundaer" icon={KeyRound} disabled={laeuft || !online} onClick={() => void mitFehler(async () => setLink(await resetLink(n.id)))} aria-label={`Reset-Link für ${n.email}`}>
                        Reset-Link
                      </Knopf>
                      {!ich && (
                        <>
                          <Knopf
                            variante="sekundaer"
                            icon={Ban}
                            disabled={laeuft || !online}
                            aria-label={`${n.gesperrt ? 'Entsperren' : 'Sperren'}: ${n.email}`}
                            onClick={() =>
                              void mitFehler(async () => {
                                if (!n.gesperrt && !window.confirm(`${n.email} sperren? Die Person kann sich dann nicht mehr anmelden.`)) return;
                                await sperre(n.id, !n.gesperrt);
                                setNutzer(await ladeNutzer());
                              })
                            }
                          >
                            {n.gesperrt ? 'Entsperren' : 'Sperren'}
                          </Knopf>
                          <Knopf
                            variante="leise"
                            icon={Trash2}
                            className="text-fehler!"
                            disabled={laeuft || !online}
                            aria-label={`Löschen: ${n.email}`}
                            onClick={() =>
                              void mitFehler(async () => {
                                const bestaetigung = window.prompt(`Konto ${n.email} mit ALLEN Trainingsdaten endgültig löschen?\n\nZum Bestätigen die E-Mail-Adresse eingeben:`);
                                if (bestaetigung?.trim().toLowerCase() !== n.email.toLowerCase()) return;
                                await loescheNutzer(n.id);
                                setNutzer(await ladeNutzer());
                              })
                            }
                          >
                            Löschen
                          </Knopf>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Karte>
      </div>
    </>
  );
}
