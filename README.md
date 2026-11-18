# Stemm – Trainingstracker

Private Trainings-App (PWA) für einen kleinen Freundeskreis: Training im Studio schnell erfassen – auch ohne Netz –,
smarte Vorschläge fürs nächste Mal, Fortschritt und Rekorde. Oberfläche auf Deutsch, Dunkelmodus, installierbar auf iPhone und Android.

- **Frontend:** Vite, React, TypeScript, Tailwind – gehostet auf GitHub Pages
- **Backend:** Supabase (Postgres mit Row Level Security, EU-Region Frankfurt)
- **Offline-first:** lokale Speicherung in IndexedDB, automatische Synchronisation

> Status: im Aufbau (Phase 1). Details in [docs/fortschritt.md](docs/fortschritt.md).

## Entwicklung

```bash
npm ci
npm run dev          # http://localhost:5174/
npm run check        # Typecheck + Unit-Tests
npm run build:pages  # Produktions-Build
npm run test:e2e     # Playwright gegen den Build
```

Alternativ in **GitHub Codespaces**: „Code → Codespaces → Create codespace on main“. Node, Docker und Playwright sind dort vorinstalliert.

## Sicherheit

- Keine Secrets im Repository. Im Frontend stehen nur die öffentliche Supabase-URL und der öffentliche `anon`-Schlüssel;
  der Zugriff auf Daten wird ausschließlich über Row Level Security in der Datenbank geregelt.
- Registrierung nur mit Einladungs-Link. Jede Person sieht nur ihre eigenen Daten.
- Strikte Content-Security-Policy, Dependabot, `npm audit` in der CI.

## Backup und Wiederherstellung

Folgt in Etappe E8.
