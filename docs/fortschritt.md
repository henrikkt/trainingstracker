# Fortschritt – Stemm

Stand: 2026-11-18 (nach E4)

## Etappen Phase 1 (MVP)

| Etappe | Inhalt | Status |
|---|---|---|
| E0 | Gerüst: Vite/React/TS, Tailwind, Vitest, Playwright, CI + Pages-Deploy, Dependabot, Devcontainer, Doku | ✅ erledigt |
| E1 | Design-System & App-Hülle (Navigation, Manifest, Icons, Service Worker, installierbar) | ✅ erledigt |
| E2 | Domänenlogik: Übungskatalog (~70), Progression, e1RM, PRs, Volumen (reine Funktionen + Tests) | ✅ erledigt |
| E3 | Lokale Daten (Dexie), Übungen/eigene Übungen, Vorlagen, Übungseinstellungen | ✅ erledigt |
| E4 | Training erfassen: Live-Training, +/-, Abhaken, Pausentimer, Wake Lock, „Letztes Mal“, Vorschläge, Zusammenfassung | ✅ erledigt |
| E5 | Fortschritt & Export: Diagramme, PRs, Kalender, Wochenvolumen, Körpergewicht, CSV/JSON | ⏭️ als Nächstes |
| E6 | Supabase: Projekt (Frankfurt), Migrationen, RLS + Tests, Login/Einladung/Reset, Admin, Konto löschen | offen |
| E7 | Sync-Engine: Outbox, Push/Pull, Konflikte, Sync-Status, E2E offline → Sync | offen |
| E8 | Backups: privates Repo, age, nächtlicher Job mit Commit, Keep-alive, Restore-Test (gemeinsam), README | offen |
| E9 | Härtung & Abnahme: CSP, a11y, Installation iPhone/Android, Abnahme-Checkliste | offen |

## Nächste Schritte
1. **Claude:** E5 – Fortschritt & Export:
   - Verlauf pro Übung als Diagramm (e1RM, Top-Satz, Volumen) – `verlaufFuerUebung`, Recharts lazy geladen
   - Persönliche Rekorde mit Datum (`rekordeFuerUebung`)
   - Trainingskalender (Monatsansicht mit markierten Tagen) und Wochen-Volumen pro Muskelgruppe (`wochenVolumenProMuskelgruppe`)
   - Körpergewicht-Verlauf (Tabelle `koerpergewicht` existiert schon)
   - Export CSV (ein Satz pro Zeile) und JSON (alles) im Profil
   - Übungsnamen über `useUebungsNachschlag` (inkl. gelöschter eigener Übungen)

## Entscheidungen und Abweichungen vom Plan
- **App-Name „Stemm“**, Akzent `#C6F432` auf `#0D0F12`; Kontraste werden automatisch getestet (`src/lib/kontrast.test.ts`).
- **Betrieb vollständig online:** Frontend auf GitHub Pages, Backend Supabase. Auf Nutzergeräten läuft nur Browser/PWA. Lokale Werkzeuge (Node, Tests) dienen nur der Entwicklung.
- **GitHub Codespaces** zusätzlich eingerichtet (`.devcontainer/`): Gratis 120 Core-Stunden/Monat = 60 h auf 2 Kernen (8 GB RAM) + 15 GB-Monat Speicher. Reicht für `supabase start` (~2 GB RAM) und Playwright. Lokal (ohne Docker) bleiben Unit-/PGlite-Tests, die CI sichert ab.
- **Vitest-Startskript `scripts/vitest.mjs`:** Unter Windows startet das VS-Code-Terminal mit kleinem Laufwerksbuchstaben (`c:\`). Vitest lädt dann Module doppelt und alle Tests brechen mit „reading 'config'“ ab. Das Skript normalisiert den Pfad. (In E0 fälschlich für einen Fehler in Vitest 5.1.1 gehalten – Pin wieder entfernt.)
- **Ports 5174/4174** statt Standard, um nicht mit dem Urlaubsplaner zu kollidieren.
- **npm audit:** 6 „high“-Funde in `picomatch` (ReDoS, betrifft nur Build-Werkzeuge vite/vitest, kein Fix verfügbar, nicht im App-Bundle). CI bricht nur bei „critical“ ab (wie vereinbart).
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

## Offene Punkte / Merker
- iPhone: Ton am Pausenende nur, solange die App im Vordergrund ist; Vibration gibt es dort nicht (Browser-Grenze).
- Gelöschte eigene Übungen sind nur weich gelöscht: Verlauf/Statistik (E4/E5) muss sie für alte Trainings weiterhin finden (Lookup inkl. gelöschter Einträge).
- Vor E6: Supabase-Konto anlegen (Anleitung folgt in E6).
- Vor E8: age installieren (`winget install FiloSottile.age`), Schlüssel selbst erzeugen, privaten Schlüssel in den Passwortmanager.
