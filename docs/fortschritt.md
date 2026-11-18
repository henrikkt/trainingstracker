# Fortschritt – Stemm

Stand: 2026-11-18

## Etappen Phase 1 (MVP)

| Etappe | Inhalt | Status |
|---|---|---|
| E0 | Gerüst: Vite/React/TS, Tailwind, Vitest, Playwright, CI + Pages-Deploy, Dependabot, Devcontainer, Doku | ✅ erledigt |
| E1 | Design-System & App-Hülle (Navigation, Manifest, Icons, Service Worker, installierbar) | ✅ erledigt |
| E2 | Domänenlogik: Übungskatalog (~70), Progression, e1RM, PRs, Volumen (reine Funktionen + Tests) | ⏭️ als Nächstes |
| E3 | Lokale Daten (Dexie), Übungen/eigene Übungen, Vorlagen, Übungseinstellungen | offen |
| E4 | Training erfassen: Live-Training, +/-, Abhaken, Pausentimer, Wake Lock, „Letztes Mal“, Vorschläge, Zusammenfassung | offen |
| E5 | Fortschritt & Export: Diagramme, PRs, Kalender, Wochenvolumen, Körpergewicht, CSV/JSON | offen |
| E6 | Supabase: Projekt (Frankfurt), Migrationen, RLS + Tests, Login/Einladung/Reset, Admin, Konto löschen | offen |
| E7 | Sync-Engine: Outbox, Push/Pull, Konflikte, Sync-Status, E2E offline → Sync | offen |
| E8 | Backups: privates Repo, age, nächtlicher Job mit Commit, Keep-alive, Restore-Test (gemeinsam), README | offen |
| E9 | Härtung & Abnahme: CSP, a11y, Installation iPhone/Android, Abnahme-Checkliste | offen |

## Nächste Schritte
1. **Claude:** E2 – Übungskatalog (~70 Übungen mit Muskelgruppe, Gerät, Standard-Steigerung), Progressionsregeln, e1RM (Epley), Rekorde, Volumen – alles als reine Funktionen in `src/domain/` mit Tests.
2. **Admin (du), optional:** App auf dem Handy installieren und Look & Feel prüfen (https://henrikkt.github.io/trainingstracker/).

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

## Offene Punkte / Merker
- Vor E6: Supabase-Konto anlegen (Anleitung folgt in E6).
- Vor E8: age installieren (`winget install FiloSottile.age`), Schlüssel selbst erzeugen, privaten Schlüssel in den Passwortmanager.
