# CLAUDE.md – Stemm (Trainingstracker)

**Vor jeder Session zuerst [docs/fortschritt.md](docs/fortschritt.md) lesen** (Stand, nächste Schritte, Abweichungen vom Plan).

## Projektziel
Private Trainings-PWA „Stemm“ für einen kleinen Freundeskreis (3–4, max. ~20 Nutzer). Oberfläche komplett **Deutsch**, mobile-first,
mit einer Hand im Studio bedienbar, **offline-first** (Training komplett im Flugmodus erfassbar, späterer Sync).
Nur eingeladene Nutzer; jeder sieht nur seine eigenen Daten; der Admin verwaltet Zugänge, sieht aber keine Trainingsdaten.
Betrieb vollständig online und kostenlos: Frontend auf GitHub Pages, Backend Supabase Free (Frankfurt).

## Architektur (Kurzfassung)
- **Frontend:** Vite + React + TypeScript, Tailwind v4 (Tokens in `src/index.css`), React Router (HashRouter), PWA via vite-plugin-pwa.
- **Lokale Daten = Quelle der Wahrheit für die UI:** Dexie (IndexedDB) + `useLiveQuery`. Jede Eingabe im laufenden Training wird sofort lokal gespeichert.
- **Sync:** Outbox (Push geänderter Datensätze) + Pull per `updated_at > Cursor` (mit Überlappungsfenster). Konflikte: Last-Write-Wins pro Datensatz über `client_updated_at`. Löschen nur weich (`deleted_at`).
- **Datenmodell:** ein Training = ein Datensatz (Übungen/Sätze als JSONB). Tabellen: `profiles`, `custom_exercises`, `exercise_prefs`, `templates`, `workouts`, `body_weights` – **alle in derselben Form** `(user_id, id, data jsonb, client_updated_at, updated_at, deleted_at)`, Schlüssel `(user_id, id)`. Standard-Übungskatalog liegt im Code (feste IDs).
- **Supabase:** Auth (E-Mail + Passwort, öffentliche Registrierung aus), RLS `user_id = auth.uid()` auf jeder Tabelle, **keine** Admin-Ausnahme. Edge Functions `admin-users` (Einladungs-/Reset-Links per `generateLink`, ohne Mailversand; sperren/löschen) und `delete-account`.
- **Backups:** privates Repo `trainingstracker-backups`, nächtlicher `pg_dump` über den Session-Pooler (IPv4), `age`-verschlüsselt, Commit. Privater age-Schlüssel nur im Passwortmanager des Admins.
- **Progressive Overload:** reine Funktionen mit Tests (Regeln siehe `docs/fortschritt.md` bzw. später `src/domain/`).

## Konventionen
- UI-Texte, Kommentare, Commit-Messages und Bezeichner der Fachlogik auf **Deutsch** (z. B. `formatiereGewicht`); Framework-/Technikbegriffe dürfen englisch bleiben.
- Zahlen deutsch formatieren (Dezimalkomma), Gewicht nur in kg.
- Fachlogik als **reine Funktionen** in `src/lib/` bzw. `src/domain/`, jeweils mit `*.test.ts` daneben.
- Design: Dunkelmodus Standard, Akzent Volt-Limette `#C6F432`, Text auf Akzent-Buttons dunkel (`text-akzent-text`). Neue Farbpaare in `src/lib/kontrast.test.ts` aufnehmen (WCAG AA ≥ 4,5 : 1). Touch-Ziele ≥ 48 px (Haupt-Aktionen 56 px, `min-h-14`).
- **Strikte CSP** (Meta-Tag, siehe `vite.config.ts`): keine Inline-Skripte/-Styles im HTML, keine externen Quellen/CDNs, Schriften selbst hosten.
- **Keine Secrets und keine persönlichen Daten** im Code oder Git-Verlauf. Öffentlich sind nur `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (Repository-Variablen). Alles andere in GitHub Secrets bzw. bei Supabase.
- Git: Identität nur lokal im Repo (GitHub-Noreply-Adresse). Nach jeder Etappe ein Commit; vorher müssen `npm run check` (Typecheck + Unit-Tests) grün sein, E2E möglichst auch.
- Screenshots sparsam: pro Prüfung nur Handy (375 px) und Desktop.
- Dexie-Schema nie in bestehenden Versionen ändern, sondern `this.version(n+1)` ergänzen.
- Teil-Änderungen an bestehenden Datensätzen (Profil, Einstellungen) nur über `aktualisiere…`-Funktionen (Transaktion), nie `{...hookWert, ...aenderung}` speichern.
- E2E: vor `page.reload()` immer `await gespeichert(page)` (wartet auf `html[data-schreibt="0"]`). Vor dem Commit auch mit Chromium testen: `CI=true PW_CHANNEL= npx playwright test`.
- E2E-Selektoren: Stepper-Felder per `getByRole('textbox', { name, exact: true })` (die –/+-Knöpfe enthalten den Feldnamen); Listen mit `aria-label` eindeutig machen.
- `docs/fortschritt.md` und diese Datei nach jeder Etappe aktualisieren.

## Befehle
| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver (http://localhost:5174/) |
| `npm run check` | Typecheck + Unit-Tests (Pflicht vor jedem Commit) |
| `npm run typecheck` / `npm test` | einzeln |
| `npm run build:pages` | Produktions-Build für GitHub Pages (base `/trainingstracker/`) |
| `npm run test:e2e` | Playwright gegen den Pages-Build (vorher `npm run build:pages`); lokal mit Edge, in CI/Codespaces mit `PW_CHANNEL=` + Chromium |
| `SCREENSHOTS=1 npx playwright test screenshots` | Screenshots Handy + Desktop nach `e2e/screenshots/` (Seiten per `SCREENSHOTS_SEITEN=training,plaene`; `live` = laufendes Training mit Pause; `SCREENSHOTS_DATEN=1` legt Beispieltrainings an) |
| `npx pwa-assets-generator` | App-Icons aus `public/favicon.svg` neu erzeugen |
| `npm run preview:pages` | Pages-Build lokal ansehen (http://localhost:4174/trainingstracker/) |

Ports 5174/4174 (nicht 5173/4173), damit es nicht mit dem Urlaubsplaner kollidiert.
Vitest immer über `npm test` starten (nicht `npx vitest`): `scripts/vitest.mjs` umgeht den Windows-Laufwerksbuchstaben-Fehler.

## Code-Struktur
- `src/components/` – App-Rahmen, Navigation, UI-Bausteine:
  - `ui.tsx`: `Knopf`, `Karte`, `SeitenKopf` (mit `zurueck`/`aktion`), `Reiter`, `IconKnopf`, `LeererZustand`
  - `Stepper.tsx` (–/+ mit editierbarem Wert), `Auswahl.tsx` (`Segment`, `Chip`, `AuswahlFeld`, `TextFeld`)
  - `Diagramm.tsx` (`Verlauf`: lazy geladenes `LinienDiagramm.tsx` mit Recharts), `Vollbild.tsx` (Dialog), `UebungsListe.tsx` (Suche + Filter), `UebungsAuswahl.tsx` (Mehrfachauswahl), `EigeneUebungFormular.tsx`
- `src/daten/` – lokale Datenbank: `db.ts` (Dexie-Schema, Sync-Metadaten), `repo.ts` (**alle Schreibzugriffe**), `hooks.ts` (reaktive Lesezugriffe), `speicher.ts` (persist)
- `src/seiten/` – eine Datei pro Route: `/training`, `/plaene`, `/plaene/vorlagen/:id`, `/plaene/uebungen`, `/plaene/uebungen/neu`, `/plaene/uebungen/:id`, `/training/laufend`, `/training/:id` (Zusammenfassung, `?neu=1` nach dem Beenden), `/fortschritt`, `/fortschritt/uebungen`, `/fortschritt/uebungen/:id`, `/fortschritt/koerpergewicht`, `/profil`
- `src/components/training/` – `UebungImTraining.tsx` (Übung mit Sätzen, aufgeklappter Satz-Editor), `PausenLeiste.tsx`
- `src/hooks/` – React-Hooks; `src/lib/` – Hilfsfunktionen: `format.ts` (Zahlen, Datum, Dauer, Uhr), `kontrast.ts`, `pause.ts` (Pausentimer mit Endzeitpunkt in localStorage), `geraet.ts` (Ton, Vibration, Wake Lock, `useJetzt`)
- `src/domain/` – Fachlogik, nur reine Funktionen mit Tests:
  - `typen.ts` (Übung, Satz, Training, Muskelgruppen, Geräte)
  - `katalog.ts` (70 Übungen, Suche) – **IDs nie ändern**
  - `steigerung.ts` (Standard-Steigerung je Übungstyp)
  - `progression.ts` (Vorschlag fürs nächste Mal; Regeln im Dateikopf)
  - `kennzahlen.ts` (e1RM Epley, Volumen, Verlauf, ISO-Woche, Wochen-Volumen pro Muskelgruppe)
  - `rekorde.ts` (PRs, neue Rekorde eines Trainings), `letztesMal.ts` („3 × 8 × 80 kg“)
  - `einstellungen.ts` (Profil-Standards, effektive Übungseinstellungen), `beispielVorlagen.ts`
  - `fortschritt.ts` (Kalender, Tagesschlüssel, Übungsübersicht, Körpergewicht-Verlauf), `export.ts` (CSV)
  - `training.ts` (Erfassen: `planeUebung`, Sätze vorbelegen/ändern/abhaken, `naechsterOffenerSatz`, `abschliessen`, `zusammenfassen`)
  - `testhilfen.ts` – `s(kg, wdh)` und `training(datum, {uebungId: saetze})` für Tests

## Supabase
- `supabase/migrations/` – SQL-Migrationen (nie bestehende ändern, immer neue Datei mit Zeitstempel). `supabase/config.toml` – lokaler Stack (Auth-Einstellungen wie in Produktion).
- `supabase/tests/` – `rls.test.ts` (PGlite, lokal), `api.integration.test.ts` (echtes Supabase; läuft nur mit `SUPABASE_URL`/`…_PUBLISHABLE_KEY`/`…_SECRET_KEY`, in CI via `scripts/supabase-env.mjs`).
- In Codespaces: `npx supabase start` → `node scripts/supabase-env.mjs > .env.supabase` → Werte exportieren → `npm test -- supabase/tests`.

## Umgebungen
- **Lokal (Windows):** kein Docker → Unit-Tests, RLS-Tests gegen PGlite (ab E6), E2E gegen Pages-Build.
- **GitHub Codespaces** (`.devcontainer/`): Docker vorhanden → zusätzlich `npx supabase start` und E2E gegen lokalen Supabase-Stack.
- **CI** (`.github/workflows/deploy.yml`): Audit (kritisch = Abbruch), Typecheck, Unit-Tests, Build, E2E; Deploy auf Pages nur von `main`.
