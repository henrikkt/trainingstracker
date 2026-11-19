# Fortschritt – Stemm

Stand: 2026-11-19 (E9 läuft)

## Etappen Phase 1 (MVP)

| Etappe | Inhalt | Status |
|---|---|---|
| E0 | Gerüst: Vite/React/TS, Tailwind, Vitest, Playwright, CI + Pages-Deploy, Dependabot, Devcontainer, Doku | ✅ erledigt |
| E1 | Design-System & App-Hülle (Navigation, Manifest, Icons, Service Worker, installierbar) | ✅ erledigt |
| E2 | Domänenlogik: Übungskatalog (~70), Progression, e1RM, PRs, Volumen (reine Funktionen + Tests) | ✅ erledigt |
| E3 | Lokale Daten (Dexie), Übungen/eigene Übungen, Vorlagen, Übungseinstellungen | ✅ erledigt |
| E4 | Training erfassen: Live-Training, +/-, Abhaken, Pausentimer, Wake Lock, „Letztes Mal“, Vorschläge, Zusammenfassung | ✅ erledigt |
| E5 | Fortschritt & Export: Diagramme, PRs, Kalender, Wochenvolumen, Körpergewicht, CSV/JSON | ✅ erledigt |
| E6 | Supabase: Projekt (Frankfurt), Migrationen, RLS + Tests, Login/Einladung/Reset, Admin, Konto löschen | ✅ erledigt (E6a Schema/RLS · E6b Login/Einladung · E6c Functions/Admin · E6d live) |
| E7 | Sync-Engine: Outbox, Push/Pull, Konflikte, Sync-Status, E2E offline → Sync | ✅ erledigt |
| E8 | Backups: privates Repo, age, nächtlicher Job mit Commit, Keep-alive, Restore-Test (gemeinsam), README | 🔄 Backup läuft ✅ · Restore-Test mit echtem Schlüssel **bewusst verschoben (offen)** |
| E9 | Härtung & Abnahme: CSP, a11y, Installation iPhone/Android, Abnahme-Checkliste | 🔄 automatische Prüfungen ✅ · Handy-Tests offen |

## Nächste Schritte
1. **Admin (du):** Manuelle Handy-Tests M1–M10 aus [docs/abnahme.md](abnahme.md) durchgehen und zurückmelden; Claude trägt die Ergebnisse ein und behebt Funde.
2. **Offen, bewusst verschoben (19.11.2026):** Wiederherstellungstest mit dem echten privaten age-Schlüssel (Abnahmepunkt A4b bleibt bis dahin **unerfüllt**). Anleitung in `backup/README.md`; Mindestvariante: nur „Nur prüfen“ (entschlüsseln + Zeilenzahlen, schreibt nichts). Claude bietet ihn am Ende der Abnahme erneut an.
3. Danach: Phase 1 abschließen; Phase-2-Ideen (Teilen mit Freunden, Plate-Rechner, Supersätze, Aufwärmsätze, Passkeys, CSV-Import).

## Entscheidungen und Abweichungen vom Plan
- **App-Name „Stemm“**, Akzent `#C6F432` auf `#0D0F12`; Kontraste werden automatisch getestet (`src/lib/kontrast.test.ts`).
- **Betrieb vollständig online:** Frontend auf GitHub Pages, Backend Supabase. Auf Nutzergeräten läuft nur Browser/PWA. Lokale Werkzeuge (Node, Tests) dienen nur der Entwicklung.
- **GitHub Codespaces** zusätzlich eingerichtet (`.devcontainer/`): Gratis 120 Core-Stunden/Monat = 60 h auf 2 Kernen (8 GB RAM) + 15 GB-Monat Speicher. Reicht für `supabase start` (~2 GB RAM) und Playwright. Lokal (ohne Docker) bleiben Unit-/PGlite-Tests, die CI sichert ab.
- **Vitest-Startskript `scripts/vitest.mjs`:** Unter Windows startet das VS-Code-Terminal mit kleinem Laufwerksbuchstaben (`c:\`). Vitest lädt dann Module doppelt und alle Tests brechen mit „reading 'config'“ ab. Das Skript normalisiert den Pfad. (In E0 fälschlich für einen Fehler in Vitest 5.1.1 gehalten – Pin wieder entfernt.)
- **Ports 5174/4174** statt Standard, um nicht mit dem Urlaubsplaner zu kollidieren.
- **npm audit: 0 Funde.** Die frühere Dependabot-Meldung zu `minimatch` (mittel, transitiv über `vite-plugin-pwa` → `workbox-build` → `glob` 11) ist per `overrides` behoben: `workbox-build` bekommt `glob` ^14.0.6 (bringt `minimatch` 11.0.9 mit; `workbox-build` nutzt nur `globSync`, das es dort weiterhin gibt). Der von npm vorgeschlagene Downgrade von `vite-plugin-pwa` auf 1.1.0 wurde bewusst nicht gemacht. Bei einem Update von `vite-plugin-pwa`/`workbox-build` prüfen, ob die Override noch nötig ist. CI bricht weiterhin bei „critical“ ab.
- **CI-Workflow** läuft auch für Pull Requests (z. B. Dependabot) – dort ohne Deploy. Base-Pfad fest `/trainingstracker/` (kein `configure-pages` nötig).
- **CSP** als Meta-Tag; `connect-src` wird beim Build automatisch um die Supabase-URL (https + wss) ergänzt.

- **App-Hülle (E1):** HashRouter, Tabs unten (Handy) bzw. Seitenleiste (ab md), Schrift Barlow Condensed (selbst gehostet, nur latin 700/800), Icons via lucide-react, PWA mit `registerType: 'prompt'` (Update nur auf Tipp – nie automatisch mitten im Training), `clientsClaim` für die Erstinstallation. Icons aus `public/favicon.svg` per `npx pwa-assets-generator`.
- **Offline-Hinweis** zeigt vorerst nur online/offline; in E7 wird daraus die Sync-Anzeige.

- **Fachlogik (E2)** in `src/domain/`, alles reine Funktionen mit Tests:
  - Katalog: 70 Übungen, 12 Muskelgruppen (inkl. Adduktoren), Geräte inkl. SZ-Stange und Kettlebell. IDs sind dauerhaft (Slugs).
  - Standard-Wdh.-Bereich je Übung: 8–12; schwere Grundübungen 5–8; Isolation 10–15; Bauch 10–20.
  - Steigerung: +5 kg schwere Unterkörper-Grundübungen, +2,5 kg Langhantel/SZ/Maschine/Kabel, +2 kg Kurzhantel (Gewicht = pro Hantel), +4 kg Kettlebell, +1 Wdh. Körpergewicht.
  - Progression bewertet nur die Sätze mit dem höchsten Gewicht (Aufwärmsätze stören nicht). Gesteigert wird erst, wenn mindestens die geplante Satzzahl am oberen Ende war. Deload (−10 %, abgerundet auf Schrittweite ≤ 2,5 kg) nur, wenn zweimal in Folge beim selben Gewicht **kein** Satz das untere Ende erreicht.
  - Körpergewicht-Übungen: +1 Wdh. auch über das obere Ende hinaus, mit Hinweis auf Zusatzgewicht.
  - Rekorde: schwerstes Gewicht, bestes e1RM, bester Satz (kg × Wdh.); „meiste Wdh.“ nur ohne Gewicht. Bei Gleichstand zählt der frühere Satz. Neue Rekorde werden nicht gemeldet, wenn eine Übung zum ersten Mal gemacht wird.
  - Wochen-Volumen: Sätze (Hauptmuskel 1, Nebenmuskeln je 0,5) und kg × Wdh. (nur Hauptmuskel), ISO-Wochen in lokaler Zeit.
  - Zeitbasierte Übungen (Plank, Farmer's Walk) bewusst weggelassen – das Datenmodell kennt nur Gewicht × Wdh.

- **Lokale Daten (E3)** in `src/daten/`: Dexie-DB `stemm` (Version 1). Sync-Metadaten heißen lokal `aktualisiertUm`/`geloeschtUm`/`ausstehend` (0/1) und werden in E7 auf `client_updated_at`/`deleted_at` abgebildet. Alle Schreibzugriffe über `repo.ts` (setzt Metadaten), Lesen über Hooks in `hooks.ts` (`useLiveQuery`).
- **Vorlagen-Editor speichert sofort** bei jeder Änderung (kein Speichern-Knopf); lokaler Entwurf verhindert, dass schnelles Tippen von verzögerten DB-Updates überschrieben wird.
- **Beispielvorlagen** (Push, Pull, Beine, Ganzkörper A/B) werden als Kopie mit neuer ID übernommen.
- **Übungseinstellungen:** Steigerung (kg oder Wdh.), Wdh.-Bereich (für freie Trainings; Vorlagen haben eigene Ziele), Pause. Profil-Standards: 120 s Pause, RIR, 2,5-kg-Schritte.
- **`navigator.storage.persist()`** beim App-Start; Status im Profil sichtbar.

- **Training erfassen (E4):**
  - Es gibt höchstens ein laufendes Training (`trainings`-Datensatz ohne `ende`), Route `/training/laufend`. Jede Eingabe wird sofort gespeichert; nach Neuladen geht es an derselben Stelle weiter.
  - Start aus Vorlage oder frei; Sätze werden mit dem Vorschlag vorbelegt (erstes Mal: 0 kg). Ziel einer frei hinzugefügten Übung: 3 Sätze im persönlichen/Standard-Wdh.-Bereich.
  - Bedienung: Der aktuelle Satz ist groß aufgeklappt (Gewicht/Wdh. mit –/+, RIR- bzw. RPE-Chips, Notiz, „Satz abhaken“), die übrigen Sätze sind kompakte Zeilen mit Haken zum Abhaken mit einem Tipp. Nach dem Abhaken springt die App zum nächsten offenen Satz und scrollt ihn in den sichtbaren Bereich.
  - **Abweichung:** Ein geändertes Gewicht wird automatisch in die folgenden offenen Sätze mit bisher gleichem Gewicht übernommen (sonst müsste man beim ersten Mal jeden Satz einzeln von 0 kg hochstellen).
  - Pausentimer startet nach dem Abhaken (Pause der Übung bzw. Profil-Standard), speichert den Endzeitpunkt in localStorage (überlebt Neuladen), ±15 s, Vibration (nur Android) + 3 Pieptöne (Ton wird beim Abhaken per Nutzer-Geste entsperrt). Liegt das Ende beim Zurückkehren schon über 6 s zurück, wird nicht mehr nachträglich gepiept.
  - Wake Lock hält den Bildschirm während des Trainings an.
  - Beenden: nicht abgehakte Sätze und leere Übungen werden verworfen (mit Rückfrage); ohne erledigten Satz wird das Training verworfen. Zusammenfassung mit Dauer, Volumen, Sätzen, neuen Rekorden (gold) und Übungen.

- **Teil-Änderungen transaktional (Fix nach CI-Fehler in E4):** Profil und Übungseinstellungen werden über `aktualisiereProfil`/`aktualisiereUebungsEinstellung` geändert (Lesen + Schreiben in einer Dexie-Transaktion). Vorher konnte eine schnelle zweite Änderung die erste überschreiben (veralteter Bildschirmzustand).
- **Schreibzähler `data-schreibt`** am `<html>`-Element (Anzahl laufender IndexedDB-Schreibvorgänge). E2E-Tests warten vor jedem `reload()` mit `gespeichert(page)` auf "0" – Chromium bricht sonst noch offene Transaktionen beim Neuladen ab.
- E2E lokal zusätzlich mit dem mitgelieferten Chromium prüfen (wie CI): `CI=true PW_CHANNEL= npx playwright test` (Bash) – Edge allein hat den Timing-Fehler nicht gezeigt.

- **Fortschritt (E5):** Reiter Übersicht | Übungen | Körper.
  - Übersicht: Kennzahlen dieser Woche, Monatskalender (Trainingstage in Akzentfarbe, Tipp zeigt die Trainings des Tages), Volumen pro Muskel je ISO-Woche als Balken (Sätze; kg nur beim Hauptmuskel).
  - Übung: Liniendiagramm umschaltbar 1RM (Epley) / Top-Satz / Volumen, Rekorde mit Datum, alle Einheiten als Liste (dient zugleich als Tabellenansicht des Diagramms).
  - Körpergewicht: ein Wert pro Tag (erneutes Eintragen überschreibt), Diagramm + Liste mit Veränderung.
  - Diagramme mit **Recharts, per React.lazy nachgeladen** (eigenes Paket ~116 kB gzip, im Offline-Cache). Gestaltung nach dataviz-Regeln (eine Reihe, keine Legende, 2-px-Linie, Tooltip). Farben als Hex in `LinienDiagramm.tsx` (gespiegelt aus den Tokens).
- **Export (Profil):** CSV = ein Satz pro Zeile, Semikolon + Dezimalkomma + UTF-8-BOM (für deutsches Excel); JSON = alle aktiven Daten ohne Sync-Metadaten, `formatVersion: 1`. Download per Blob, funktioniert offline.
- **Link** von den Übungseinstellungen (Pläne) zum Verlauf der Übung.
- **E2E-Testdaten** werden mit `legeTrainingsAn` (`e2e/hilfen.ts`) direkt in IndexedDB geschrieben. Screenshots mit Beispieldaten: `SCREENSHOTS=1 SCREENSHOTS_DATEN=1 SCREENSHOTS_SEITEN=fortschritt npx playwright test screenshots`.

- **Login (E6b):**
  - Ohne `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` beim Build läuft die App im **lokalen Modus** (kein Login, alles nur auf dem Gerät) – so funktionieren Entwicklung und die bisherigen E2E-Tests ohne Backend.
  - Mit Backend: ohne Sitzung nur Login-Seite bzw. `#/einladung?token=…&typ=invite|recovery` (Einladung/Reset einlösen, Passwort ≥ 10 Zeichen festlegen). Token steht im Hash (wird nie an einen Server gesendet), wird nach dem Einlösen aus der Adresszeile entfernt; StrictMode-Doppelaufruf abgefangen.
  - Sitzung liegt lokal (`stemm.auth`), die App startet damit **auch offline**.
  - **Besitzer der lokalen Daten** (Dexie v2, Tabelle `meta`): erstes Konto übernimmt vorhandene lokale Daten; anderes Konto → lokale Daten werden gelöscht, **außer** es gibt noch nicht synchronisierte Änderungen – dann wird die Anmeldung abgebrochen (kein Datenverlust, keine Daten beim falschen Konto). Status „angemeldet“ wird bis zum Ende dieser Prüfung zurückgehalten.
  - Abmelden nur lokal (`scope: 'local'`), mit Warnung bei ausstehenden Änderungen; lokale Daten bleiben.
  - Env-Variable heißt jetzt `VITE_SUPABASE_PUBLISHABLE_KEY` (statt `…_ANON_KEY`).
  - E2E `e2e/auth.spec.ts` (Login, Einladung, Einmal-Link, Reset, Kontowechsel blockiert) läuft im CI-Job gegen den lokalen Supabase-Stack; lokal übersprungen.

- **Edge Functions (E6c)** in `supabase/functions/` (Deno):
  - `admin-users`: Aktionen `liste`, `einladen` (generateLink invite → Token), `reset` (recovery-Token), `sperren`/`entsperren` (ban 100 Jahre / none), `loeschen`. Nur für `app_metadata.role = 'admin'`; liefert nur Verwaltungsdaten (E-Mail, Zeitpunkte, Status), nie Trainingsdaten. Admin kann sich selbst nicht sperren/löschen.
  - `delete-account`: löscht nur das Konto des Aufrufers (ID aus geprüftem JWT, Body wird ignoriert); Daten per Kaskade weg.
  - `verify_jwt = false`, JWT-Prüfung im Code (`aufrufer()` via `auth.getUser`) – empfohlen bei den neuen Schlüsseln. CORS nur für GitHub Pages + lokale Ports. Secret Key aus `SUPABASE_SECRET_KEYS` (Fallback `SUPABASE_SERVICE_ROLE_KEY`).
  - Reine Logik in `_shared/regeln.ts` (Vitest), Typen auch im Frontend genutzt.
- **Frontend (E6c):** Profil → „Zugänge verwalten“ (nur Admin): einladen → Link zum Kopieren/Teilen (24 h, einmalig), Reset-Link, sperren/entsperren, löschen (Bestätigung durch Eintippen der E-Mail). „Konto löschen“ für alle (Bestätigung „LÖSCHEN“), danach lokale Daten weg und abgemeldet.
- **CI-Aufteilung (Fix E6d):** Job „Prüfen und bauen“ baut erst **ohne** Backend für die E2E-Tests im lokalen Modus und danach den Pages-Build **mit** `VITE_SUPABASE_*` (plus Prüfung, dass URL in JS und CSP steckt). Sonst hingen die lokalen E2E-Tests an der Login-Seite.
- **CI:** `supabase start` jetzt inkl. Edge Runtime; `functions.integration.test.ts` (401/403, Admin-Aktionen, Selbstschutz, delete-account) und E2E `admin.spec.ts`. Neuer Job **„Supabase ausrollen“** (`db push` + `functions deploy --use-api`) nach grünen Tests – läuft erst, wenn `vars.SUPABASE_PROJECT_REF` gesetzt ist.

- **Supabase-Projekt (E6d):** Projekt-Ref `odyujozkghkstnileikb` (Frankfurt). Repository-Variablen `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`; Secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` (vom Admin selbst gesetzt). Öffentliche Registrierung vor dem ersten Deploy im Dashboard abgeschaltet. Erster Admin am 18.11.2026 im Dashboard angelegt (Auto Confirm) und per SQL `raw_app_meta_data.role = admin` gesetzt; Einladung eines weiteren Kontos erfolgreich getestet.
  - Rauchtest Produktion ohne Konto: REST → 401 „permission denied“, Registrierung → 422 „signup_disabled“, `admin-users` → 401, CORS nur für GitHub Pages.
  - **CLI v3:** `db push` braucht `--remote` (sonst lokaler Stack), `functions deploy` nutzt das verknüpfte Projekt; beide mit `--yes` in der CI. Auth-Einstellungen aus `config.toml` per manuellem Workflow „Supabase-Konfiguration übertragen“ (erst Vergleich, dann mit „anwenden“).

- **Sync (E7)** in `src/sync/`:
  - `abbildung.ts`: Dexie-Tabelle ↔ Server-Tabelle, `zuServer`/`vonServer`, Konfliktregel `entscheide` (lokal ausstehend: jüngerer `client_updated_at` gewinnt, Gleichstand → lokal), Pull-Überlappung 2 min.
  - `motor.ts`: **Push** aller `ausstehend = 1` in Paketen à 100 (Upsert `user_id,id`); markiert nur als erledigt, wenn der Datensatz währenddessen nicht erneut geändert wurde; abgelehnte Zeilen (Prüfregel) werden einzeln behandelt und blockieren den Rest nicht. **Pull** je Tabelle ab Cursor (`meta: sync.cursor.<tabelle>`) seitenweise à 500, Zusammenführen in einer Dexie-Transaktion. Reihenfolge: erst Push, dann Pull. Sync schreibt direkt in Dexie (löst keinen neuen Sync aus).
  - `dienst.ts`: Auslöser Anmeldung/Start, `online`, App wieder sichtbar, 1,5 s nach lokalen Änderungen (`beiLokalerAenderung` aus `repo.ts`), alle 60 s; nie zwei Läufe gleichzeitig; Wiederholung nach 5/15/60 s bei Netzfehlern; abgelaufene Sitzung → Hinweis.
  - Anzeige: Symbol oben rechts in jedem Seitenkopf und im laufenden Training (✓ synchronisiert / n ausstehend mit Zähler / läuft / offline / Fehler), Detailkarte im Profil mit „Jetzt synchronisieren“, Offline-Banner.
  - Tests: Unit mit nachgebautem Server (`testServer.ts`, gleiche LWW-Regel wie der DB-Trigger) inkl. Änderung während des Push, Offline, abgelehnter Zeile, Paging, Konflikt zweier Geräte; E2E gegen lokalen Supabase-Stack: **Training komplett offline erfassen → online → automatisch synchronisiert (Server-Stand per Admin-API geprüft) → zweites Gerät sieht es**, Löschen über Geräte hinweg, Kontowechsel nach Sync.

- **Backups (E8):**
  - Privates Repo `henrikkt/trainingstracker-backups` mit Workflow „Nächtliches Backup“ (02:17 UTC): Keep-alive-Ping an Supabase, `backup/dump.sh` (pg_dump 17 über den **Session-Pooler** → nur Daten: `auth.users`, `auth.identities`, `public.*` als `--column-inserts`, gzip, **age** für `vars.AGE_RECIPIENT`), 30 Tage täglich + 12 Monate monatlich, **Orphan-Commit + Force-Push** (Historie enthält nur aufbewahrte Stände → gelöschte Daten verschwinden nach Ablauf wirklich; täglicher Commit hält Repo aktiv). Erster Lauf 18.11.2026 erfolgreich.
  - Kanonische Fassung von Workflow, `dump.sh` und README in `backup/` dieses Repos – Änderungen ins Backup-Repo übernehmen (YAML vorher prüfen: `npx --yes yaml@2 valid < datei`).
  - Backup-Repo: Secret `SUPABASE_DB_URL` (Session-Pooler-URI), Variablen `AGE_RECIPIENT` (age1rkhh…), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. Privater Schlüssel **nur** im Passwortmanager (am 18.11.2026 neu erzeugt; ein älterer Schlüssel ist verworfen).
  - Wiederherstellung: `scripts/backup-wiederherstellen.ts` (Node, ohne psql/age-Programm): entschlüsseln, prüfen, in **einer** Transaktion einspielen; verweigert die Produktions-DB ohne `--auch-produktion`.
  - **Automatischer Rundlauf in der CI** (`scripts/backup-rundlauf.ts`): Daten anlegen → Dump mit Wegwerf-Schlüssel → `db reset` (Totalverlust) → Wiederherstellung → Login mit altem Passwort + identische Trainingsdaten.
  - Datenbank-Passwort am 18.11.2026 geändert; GitHub-Secret `SUPABASE_DB_PASSWORD` im App-Repo aktualisiert.

- **Härtung (E9):**
  - **Wachposten** (`e2e/fixtures.ts`) in allen E2E-Tests: CSP-Verstöße (`securitypolicyviolation`), JavaScript-Fehler und unerwartete Konsolenfehler lassen den Test scheitern (Netzwerkfehler erlaubt).
  - **Barrierefreiheit** (`e2e/barrierefreiheit.spec.ts`, Helfer `e2e/a11y.ts`): axe-core WCAG 2.2 AA auf allen Hauptseiten mit Daten (Handy + Desktop), dazu Login/Passwort festlegen (`auth.spec`) und Zugänge (`admin.spec`) im Supabase-Job; Touch-Ziele auf dem Handy automatisch gemessen (≥ 44 px, Fließtext-Links ausgenommen).
  - Behobene Funde: Kalendertage hatten einen Namen ohne die sichtbare Zahl (WCAG 2.5.3) → „1. November, Sonntag, …“; Link „Vorlage anlegen“ 20 px hoch; Stepper nebeneinander nur 38 px breit (jetzt untereinander auf schmalen Bildschirmen); Chips 40 px → 44 px; Kalenderzellen 41 px → 44 px.
  - **Service Worker wurde mit Backend erst nach dem Login registriert** (Registrierung steckte im App-Rahmen) → kein Offline-Start und auf Android keine Installation vor der ersten Anmeldung. Jetzt in `App.tsx` für jeden Zustand; Test in `auth.spec`.
  - **Live-Rauchtest** `e2e/live.spec.ts` (nur mit `LIVE=1 PW_BASE_URL=https://henrikkt.github.io/trainingstracker/`): CSP, Manifest, Icons, Service Worker, Offline-Start der Login-Seite.
  - Abnahme-Checkliste: [docs/abnahme.md](abnahme.md).

## GitHub-Sicherheitseinstellungen
Stand 2026-11-18, geprüft per `gh api` (GitHub CLI ist installiert und als `henrikkt` angemeldet).

| Einstellung | Stand |
|---|---|
| Ruleset „main schützen“ (ID 27585507): aktiv auf dem Standard-Branch, blockiert nur Löschen (`deletion`) und Force-Push (`non_fast_forward`); keine PR- oder Status-Check-Pflicht, keine Ausnahmen | ✅ |
| Dependabot alerts (`vulnerability-alerts`) | ✅ an |
| Dependabot security updates (`automated-security-fixes`) | ✅ an, nicht pausiert |
| Gruppierte Security-Updates | aus: `dependabot.yml` gruppiert nur Versions-Updates (kein `applies-to: security-updates`); der gleichnamige Schalter in den Repo-Einstellungen ist per API nicht lesbar → einmal manuell prüfen |
| Code scanning: CodeQL **Default setup**, Sprache `javascript-typescript`, Query-Suite `default` | ✅ (kein eigener Workflow nötig); erste Analyse 2026-11-18: 0 Funde |
| Secret scanning + Push protection | ✅ an (Standard bei öffentlichen Repos) |
| Dependabot-Meldung `minimatch` | ✅ behoben (`overrides`), keine offenen Dependabot-Meldungen |
| Dependabot version updates (`.github/dependabot.yml`: npm, Actions, Devcontainer) | ✅ seit E0 |

Prüfen: `gh api repos/henrikkt/trainingstracker/rulesets`, `…/code-scanning/default-setup`, `…/automated-security-fixes`, `…/dependabot/alerts?state=open`.

- **Supabase-Schema (E6a)** in `supabase/migrations/`: **alle sechs Tabellen haben dieselbe Form** `(user_id, id, data jsonb, client_updated_at, updated_at, deleted_at)`, Schlüssel `(user_id, id)` – Abweichung vom Plan (dort Spalten pro Tabelle), damit der Sync (E7) generisch bleibt. `id` = UUID bzw. Übungs-ID (`exercise_prefs`) bzw. `'ich'` (`profiles`).
  - RLS: lesen/anlegen/ändern nur eigene Zeilen (`user_id = auth.uid()`), kein Zugriff für `anon`, **kein hartes Löschen** für Clients, keine Admin-Ausnahme.
  - Trigger `stemm_vor_schreiben`: setzt `updated_at` (Server-Uhr, Pull-Cursor), verwirft ältere Änderungen (Last-Write-Wins über `client_updated_at`), verbietet Ändern von `user_id`/`id`.
  - Größenlimits für `data` (4 KB Körpergewicht … 256 KB Training), Konto-Löschung kaskadiert auf alle Tabellen.
  - `supabase/config.toml` (lokaler Stack, Vorbild fürs echte Projekt): Registrierung aus, Passwort ≥ 10 Zeichen, Einladungs-/Reset-Links 24 h gültig.
- **Tests:** `supabase/tests/rls.test.ts` gegen **PGlite** (lokal, ohne Docker; inkl. Gegenprobe, dass ohne RLS Daten sichtbar wären) und `api.integration.test.ts` gegen **echtes Supabase** über die REST-API (CI-Job „Datenbank und Zugriffsregeln“ mit `supabase start`; lokal übersprungen, in der CI erzwungen per `STEMM_INTEGRATION=1`). Deploy hängt von beiden CI-Jobs ab.
- **Supabase-Schlüssel:** neue Projekte nutzen Publishable Key (`sb_publishable_…`, öffentlich, in der App) und Secret Key (`sb_secret_…`, nur serverseitig). Die alten `anon`/`service_role`-Schlüssel werden Ende 2026 abgekündigt → wir nutzen die neuen.

## Offene Punkte / Merker
- **Supabase-Zugriffstoken (GitHub-Secret `SUPABASE_ACCESS_TOKEN`) läuft am 16.02.2027 ab** (90 Tage ab 18.11.2026). Erkennbar am roten CI-Job „Supabase ausrollen“; die App läuft weiter. Erneuern: neuen Token auf supabase.com/dashboard/account/tokens erzeugen, dann `gh secret set SUPABASE_ACCESS_TOKEN --repo henrikkt/trainingstracker`.
- Beim Mergen von Dependabot-PRs auf Konflikte achten: Nach dem Merge von #1/#2 war der `features`-Block in `.devcontainer/devcontainer.json` leer (repariert in c90d63a).
- Hauptpaket ist auf ~142 kB gzip gewachsen (Dexie, Router, Icons). Bei Bedarf in E9 prüfen (z. B. Seiten per lazy laden).
- iPhone: Ton am Pausenende nur, solange die App im Vordergrund ist; Vibration gibt es dort nicht (Browser-Grenze).
- Gelöschte eigene Übungen sind nur weich gelöscht: Verlauf/Statistik (E4/E5) muss sie für alte Trainings weiterhin finden (Lookup inkl. gelöschter Einträge).
- Vor E6: Supabase-Konto anlegen (Anleitung folgt in E6).
- Vor E8: age installieren (`winget install FiloSottile.age`), Schlüssel selbst erzeugen, privaten Schlüssel in den Passwortmanager.
