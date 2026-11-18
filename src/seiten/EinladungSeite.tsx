import { KeyRound } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { TextFeld } from '../components/Auswahl.tsx';
import { Karte, Knopf } from '../components/ui.tsx';
import { linkEinloesen, MIN_PASSWORT_LAENGE, passwortSetzen } from '../daten/sitzung.ts';
import { AnmeldeRahmen, FehlerHinweis } from './LoginSeite.tsx';

type Schritt = 'pruefen' | 'passwort' | 'fehler';

/**
 * Einladungs- oder Reset-Link einlösen: #/einladung?token=…&typ=invite|recovery
 * Der Token ist einmalig und 24 h gültig. Er steht im Hash-Teil der URL und wird daher nie an einen Server
 * (auch nicht an GitHub Pages) übertragen; nach dem Einlösen wird er aus der Adresszeile entfernt.
 */
export function EinladungSeite() {
  const [parameter] = useSearchParams();
  const navigate = useNavigate();
  const token = parameter.get('token');
  const typ = parameter.get('typ') === 'recovery' ? 'recovery' : 'invite';
  const [schritt, setSchritt] = useState<Schritt>(token ? 'pruefen' : 'fehler');
  const [fehler, setFehler] = useState(token ? '' : 'Dieser Link ist unvollständig. Bitte den Admin um einen neuen Link.');
  const [passwort, setPasswort] = useState('');
  const [wiederholung, setWiederholung] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const eingeloest = useRef(false);

  useEffect(() => {
    // Nur einmal einlösen (React StrictMode ruft Effekte in der Entwicklung doppelt auf; der Token ist einmalig)
    if (!token || eingeloest.current) return;
    eingeloest.current = true;
    void linkEinloesen(token, typ).then((f) => {
      navigate(`/einladung?typ=${typ}`, { replace: true }); // Token aus der Adresszeile entfernen
      if (f) {
        setFehler(f);
        setSchritt('fehler');
      } else setSchritt('passwort');
    });
  }, [token, typ, navigate]);

  const absenden = async (e: FormEvent) => {
    e.preventDefault();
    if (passwort !== wiederholung) return setFehler('Die beiden Passwörter sind nicht gleich.');
    setLaeuft(true);
    const f = await passwortSetzen(passwort);
    setLaeuft(false);
    if (f) return setFehler(f);
    navigate('/training', { replace: true });
  };

  const titel = typ === 'invite' ? 'Willkommen' : 'Neues Passwort';
  if (schritt === 'pruefen') {
    return (
      <AnmeldeRahmen titel={titel} unterzeile="Link wird geprüft …">
        <div aria-hidden className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-linie border-t-akzent" />
      </AnmeldeRahmen>
    );
  }
  if (schritt === 'fehler') {
    return (
      <AnmeldeRahmen titel={titel} unterzeile="Das hat leider nicht geklappt.">
        <FehlerHinweis text={fehler} />
        <Link to="/" className="text-center text-sm text-text-leise underline underline-offset-4 hover:text-text">
          Zur Anmeldung
        </Link>
      </AnmeldeRahmen>
    );
  }
  return (
    <AnmeldeRahmen titel={titel} unterzeile={typ === 'invite' ? 'Lege dein Passwort fest – dann geht’s los.' : 'Lege ein neues Passwort fest.'}>
      <Karte>
        <form className="flex flex-col gap-4" onSubmit={(e) => void absenden(e)}>
          <TextFeld label="Neues Passwort" typ="password" autoComplete="new-password" wert={passwort} onChange={setPasswort} maxLaenge={200} autoFocus />
          <TextFeld label="Passwort wiederholen" typ="password" autoComplete="new-password" wert={wiederholung} onChange={setWiederholung} maxLaenge={200} />
          <p className="text-sm text-text-leise">Mindestens {MIN_PASSWORT_LAENGE} Zeichen. Am besten im Passwortmanager speichern.</p>
          <FehlerHinweis text={fehler} />
          <Knopf gross type="submit" icon={KeyRound} disabled={laeuft || passwort.length < MIN_PASSWORT_LAENGE || !wiederholung}>
            {laeuft ? 'Speichern …' : 'Passwort speichern'}
          </Knopf>
        </form>
      </Karte>
    </AnmeldeRahmen>
  );
}
