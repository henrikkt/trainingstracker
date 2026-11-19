# Abnahme Phase 1 – Stemm✅ ok – iPhone 15 Pro, Safari (19.11.2026) |⏭️ vom Admin übersprungen (19.11.2026) – bei Bedarf später mit einem Android-Gerät aus dem Freundeskreis nachholen |✅ ok – iPhone 15 Pro (19.11.2026) |✅ ok – iPhone 15 Pro (19.11.2026) |✅ ok – iPhone 15 Pro (19.11.2026) |✅ ok – iPhone 15 Pro (19.11.2026) |✅ ok – iPhone 15 Pro (19.11.2026) |✅ ok – iPhone 15 Pro (19.11.2026) |✅ ok – iPhone 15 Pro (19.11.2026) |🔧 Problem (iPhone 15 Pro): Schrift oben verschwommen/unleserlich. **Behoben** (feste Fläche hinter Statusleiste/Dynamic Island, kein Weichzeichner mehr, Ränder als CSS-Variablen, WebKit-Layouttest auf 5 iPhone-Größen) – **erneute Prüfung durch den Admin offen** |

Stand: 2026-11-19 (nach Handy-Tests). Legende: ✅ erfüllt · 🤖 automatisch geprüft (CI bei jedem Push) · 🙋 manuell durch den Admin · ⏳ offen

## Abnahmekriterien aus dem Auftrag

| # | Kriterium | Nachweis | Status |
|---|---|---|---|
| A1 | Ich kann mich anmelden, einen Freund einladen, und der Freund sieht nur seine eigenen Daten. | 🤖 `auth.spec`, `admin.spec`, RLS-Tests (PGlite + echtes Supabase, inkl. direktem API-Zugriff); 🙋 Admin angelegt, Einladung live getestet (18.11.2026) | ✅ |
| A2 | Ein komplettes Training lässt sich im Flugmodus erfassen und wird danach korrekt synchronisiert. | 🤖 `sync.spec` (offline erfassen → online → Server-Stand geprüft → zweites Gerät); 🙋 Handy-Test M3 | ✅ |
| A3 | Vorschläge fürs nächste Training erscheinen und sind nachvollziehbar. | 🤖 `training.spec` + Unit-Tests der Regeln; 🙋 Handy-Test M5 | ✅ |
| A4a | Backup läuft automatisch. | Nächtlicher Workflow im Repo `trainingstracker-backups`, erster planmäßiger Lauf 19.11.2026 03:05 UTC erfolgreich | ✅ |
| A4b | Die Wiederherstellung ist getestet. | 🤖 Rundlauf in der CI (Backup → Totalverlust → Wiederherstellung → Login mit altem Passwort, Wegwerf-Schlüssel). **Gemeinsamer Test mit dem echten privaten Schlüssel: bewusst verschoben (19.11.2026).** | ⏳ **offen** |
| A5 | Die App ist auf iPhone und Android installierbar und live erreichbar. | 🤖 Manifest/Icons/Service Worker/Offline-Start (`start.spec`, `live.spec`), iPhone-Layout mit WebKit auf 5 Größen (`iphone.spec`); 🙋 iPhone installiert (M1), Android übersprungen (M2) | ✅ iPhone · ⏭️ Android nicht geprüft |

## Sicherheit, Datenschutz, Qualität

| Kriterium | Nachweis | Status |
|---|---|---|
| Nur eingeladene Nutzer, öffentliche Registrierung aus | Supabase-Einstellung + Test `signup_disabled` (lokal und Produktion) | ✅ |
| Jeder sieht nur eigene Daten, auch bei direktem API-Aufruf | RLS-Tests (47) + API-Integrationstests; Admin ohne Ausnahme | ✅ |
| Keine Secrets im Frontend/Repo | Nur URL + Publishable Key öffentlich; Secret Scanning + Push Protection an | ✅ |
| EU-Region | Supabase Frankfurt | ✅ |
| Konto inkl. aller Daten selbst löschen | `delete-account` + E2E | ✅ |
| Daten-Export CSV/JSON | E2E `fortschritt.spec` | ✅ |
| Strikte CSP, keine Verstöße | Meta-CSP; Wachposten in **allen** E2E-Tests (CSP-Verstöße/JS-Fehler lassen Tests scheitern); Live-Rauchtest | ✅ |
| Kontraste WCAG AA | Token-Test `kontrast.test.ts`; axe-core WCAG 2.2 AA auf allen Hauptseiten (Handy + Desktop) | ✅ |
| Große Touch-Ziele | Automatische Messung auf dem Handy: alle Bedienelemente ≥ 44 px | ✅ |
| Passt auf jedes iPhone | WebKit (Safari-Engine) auf iPhone SE, 13 mini, 15 Pro, 15 Pro Max, 16 Pro mit echten Randmaßen: kein Überlauf, Inhalt unter Statusleiste/Dynamic Island verdeckt, Navigation über dem Home-Balken, Pausentimer frei | ✅ |
| Dependabot, npm audit ohne kritische Funde, CodeQL | Repo-Einstellungen; `npm audit`: 0 Funde | ✅ |
| Kein Datenverlust bei Neuladen/Schließen | Jede Eingabe sofort in IndexedDB; E2E mit Neuladen mitten im Training | ✅ |

## Manuelle Tests auf dem Handy (🙋)

Bitte jeweils kurz zurückmelden: **ok** / **Problem: …** (Gerät + Browser dazuschreiben).

| # | Test | Rückmeldung |
|---|---|---|
| M1 | **iPhone:** In Safari öffnen → Teilen → „Zum Home-Bildschirm“ → App startet ohne Browserleiste, Symbol und Name „Stemm“ passen | |
| M2 | **Android:** In Chrome öffnen → Menü → „App installieren“ (oder Banner) → App startet als eigene App | |
| M3 | **Flugmodus:** Flugmodus an → App öffnen → Training aus Vorlage starten, 2–3 Sätze abhaken, beenden → Flugmodus aus → Sync-Symbol wird zu ✓; Training erscheint auf einem zweiten Gerät/Browser | |
| M4 | **Pausentimer:** Satz abhaken → Timer läuft; ±15 s; am Ende Ton (beide) und Vibration (nur Android). Bildschirm bleibt während des Trainings an | |
| M5 | **Vorschlag:** Beim nächsten Training derselben Vorlage stehen „Letztes Mal“ und „Heute: …“ mit Begründung; Sätze sind vorbelegt | |
| M6 | **Einhändig:** Gewicht/Wdh. mit –/+ und per Tippen ins Feld (Zahlentastatur?), Satz mit einem Tipp abhaken – alles gut mit dem Daumen erreichbar | |
| M7 | **Lesbarkeit im Studio:** Kontrast/Schriftgröße bei hellem Licht ok | |
| M8 | **Neuladen/Schließen:** Mitten im Training App wegwischen und neu öffnen → Training läuft weiter, nichts fehlt | |
| M9 | **Update:** Nach einer neuen Version erscheint „Neue Version verfügbar“; „Aktualisieren“ lädt neu, nichts geht verloren | |
| M10 | **Notch/Ränder:** Nichts wird von Notch, Statusleiste oder Home-Balken verdeckt | |

## Offene Punkte

- ⏳ **A4b – Wiederherstellung mit dem echten privaten Schlüssel** (bewusst verschoben am 19.11.2026). Anleitung: `backup/README.md` → „Wiederherstellen“. Mindestvariante: nur Schritt „Nur prüfen“ (entschlüsselt ein echtes Backup und zeigt die Zeilenzahlen, schreibt nichts).
- ⏳ M10 nach der Korrektur auf dem iPhone 15 Pro erneut prüfen.
- ⏭️ M2 (Android) übersprungen.
