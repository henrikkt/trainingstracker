# Fortschritt – Stemm

Stand: 2026-11-18 (nach E5)

## Etappen Phase 1 (MVP)

| Etappe | Inhalt | Status |
|---|---|---|
| E0 | Gerüst: Vite/React/TS, Tailwind, Vitest, Playwright, CI + Pages-Deploy, Dependabot, Devcontainer, Doku | ✅ erledigt |
| E1 | Design-System & App-Hülle (Navigation, Manifest, Icons, Service Worker, installierbar) | ✅ erledigt |
| E2 | Domänenlogik: Übungskatalog (~70), Progression, e1RM, PRs, Volumen (reine Funktionen + Tests) | ✅ erledigt |
| E3 | Lokale Daten (Dexie), Übungen/eigene Übungen, Vorlagen, Übungseinstellungen | ✅ erledigt |
| E4 | Training erfassen: Live-Training, +/-, Abhaken, Pausentimer, Wake Lock, „Letztes Mal“, Vorschläge, Zusammenfassung | ✅ erledigt |
| E5 | Fortschritt & Export: Diagramme, PRs, Kalender, Wochenvolumen, Körpergewicht, CSV/JSON | ✅ erledigt |
| E6 | Supabase: Projekt (Frankfurt), Migrationen, RLS + Tests, Login/Einladung/Reset, Admin, Konto löschen | 🔄 E6a ✅ Schema/RLS · E6b ✅ Login/Einladung · E6c–d offen |
| E7 | Sync-Engine: Outbox, Push/Pull, Konflikte, Sync-Status, E2E offline → Sync | offen |
| E8 | Backups: privates Repo, age, nächtlicher Job mit Commit, Keep-alive, Restore-Test (gemeinsam), README | offen |
| E9 | Härtung & Abnahme: CSP, a11y, Installation iPhone/Android, Abnahme-Checkliste | offen |

## Nächste Schritte
1. **Admin (du):** Supabase-Projekt „stemm“ in Frankfurt anlegen (Anleitung im Chat), Project URL + Publishable Key schicken. DB-Passwort nur in den Passwortmanager.
2. **Claude:** E6c – Edge Functions `admin-users` (Einladungs-/Reset-Link per `generateLink`, Liste, sperren/entsperren, löschen; nur für `app_metadata.role = 'admin'`) und `delete-account`; Admin-Seite im Profil; „Konto löschen“; Deploy-Workflow für Migrationen + Functions.
3. **Gemeinsam:** E6d – Live-Schaltung: Secrets per `gh secret set`, Repo-Variablen, Auth-Einstellungen übertragen, ersten Admin anlegen, Freund einladen.

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
- Beim Mergen von Dependabot-PRs auf Konflikte achten: Nach dem Merge von #1/#2 war der `features`-Block in `.devcontainer/devcontainer.json` leer (repariert in c90d63a).
- Hauptpaket ist auf ~142 kB gzip gewachsen (Dexie, Router, Icons). Bei Bedarf in E9 prüfen (z. B. Seiten per lazy laden).
- iPhone: Ton am Pausenende nur, solange die App im Vordergrund ist; Vibration gibt es dort nicht (Browser-Grenze).
- Gelöschte eigene Übungen sind nur weich gelöscht: Verlauf/Statistik (E4/E5) muss sie für alte Trainings weiterhin finden (Lookup inkl. gelöschter Einträge).
- Vor E6: Supabase-Konto anlegen (Anleitung folgt in E6).
- Vor E8: age installieren (`winget install FiloSottile.age`), Schlüssel selbst erzeugen, privaten Schlüssel in den Passwortmanager.
