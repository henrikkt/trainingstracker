# Fortschritt – Stemm

Stand: 2026-11-18

## Etappen Phase 1 (MVP)

| Etappe | Inhalt | Status |
|---|---|---|
| E0 | Gerüst: Vite/React/TS, Tailwind, Vitest, Playwright, CI + Pages-Deploy, Dependabot, Devcontainer, Doku | ✅ erledigt |
| E1 | Design-System & App-Hülle (Navigation, Manifest, Icons, Service Worker, installierbar) | ⏭️ als Nächstes |
| E2 | Domänenlogik: Übungskatalog (~70), Progression, e1RM, PRs, Volumen (reine Funktionen + Tests) | offen |
| E3 | Lokale Daten (Dexie), Übungen/eigene Übungen, Vorlagen, Übungseinstellungen | offen |
| E4 | Training erfassen: Live-Training, +/-, Abhaken, Pausentimer, Wake Lock, „Letztes Mal“, Vorschläge, Zusammenfassung | offen |
| E5 | Fortschritt & Export: Diagramme, PRs, Kalender, Wochenvolumen, Körpergewicht, CSV/JSON | offen |
| E6 | Supabase: Projekt (Frankfurt), Migrationen, RLS + Tests, Login/Einladung/Reset, Admin, Konto löschen | offen |
| E7 | Sync-Engine: Outbox, Push/Pull, Konflikte, Sync-Status, E2E offline → Sync | offen |
| E8 | Backups: privates Repo, age, nächtlicher Job mit Commit, Keep-alive, Restore-Test (gemeinsam), README | offen |
| E9 | Härtung & Abnahme: CSP, a11y, Installation iPhone/Android, Abnahme-Checkliste | offen |

## Nächste Schritte
1. **Admin (du):** Repo `trainingstracker` (öffentlich, leer) auf GitHub anlegen, Remote verbinden und pushen, Pages-Quelle auf „GitHub Actions“ stellen (Anleitung im Chat / README).
2. **Claude:** E1 – App-Hülle mit Navigation (Training · Pläne · Fortschritt · Profil), Schrift (Barlow Condensed, selbst gehostet), PWA-Manifest + Icons + Service Worker.

## Entscheidungen und Abweichungen vom Plan
- **App-Name „Stemm“**, Akzent `#C6F432` auf `#0D0F12`; Kontraste werden automatisch getestet (`src/lib/kontrast.test.ts`).
- **Betrieb vollständig online:** Frontend auf GitHub Pages, Backend Supabase. Auf Nutzergeräten läuft nur Browser/PWA. Lokale Werkzeuge (Node, Tests) dienen nur der Entwicklung.
- **GitHub Codespaces** zusätzlich eingerichtet (`.devcontainer/`): Gratis 120 Core-Stunden/Monat = 60 h auf 2 Kernen (8 GB RAM) + 15 GB-Monat Speicher. Reicht für `supabase start` (~2 GB RAM) und Playwright. Lokal (ohne Docker) bleiben Unit-/PGlite-Tests, die CI sichert ab.
- **Vitest auf 5.1.0 gepinnt:** 5.1.1 bricht beim Start ab („Cannot read properties of undefined (reading 'config')“). Bei Dependabot-Updates prüfen, ob es behoben ist.
- **Ports 5174/4174** statt Standard, um nicht mit dem Urlaubsplaner zu kollidieren.
- **npm audit:** 6 „high“-Funde in `picomatch` (ReDoS, betrifft nur Build-Werkzeuge vite/vitest, kein Fix verfügbar, nicht im App-Bundle). CI bricht nur bei „critical“ ab (wie vereinbart).
- **CI-Workflow** läuft auch für Pull Requests (z. B. Dependabot) – dort ohne Deploy. Base-Pfad fest `/trainingstracker/` (kein `configure-pages` nötig).
- **CSP** als Meta-Tag; `connect-src` wird beim Build automatisch um die Supabase-URL (https + wss) ergänzt.

## Offene Punkte / Merker
- Vor E6: Supabase-Konto anlegen (Anleitung folgt in E6).
- Vor E8: age installieren (`winget install FiloSottile.age`), Schlüssel selbst erzeugen, privaten Schlüssel in den Passwortmanager.
