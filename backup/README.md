# Stemm – verschlüsselte Backups

Privates Repo. Hier legt der Workflow **„Nächtliches Backup“** jede Nacht einen verschlüsselten Dump der
Stemm-Datenbank (Supabase) ab. Kanonische Fassung von Workflow, `dump.sh` und dieser Anleitung:
`trainingstracker/backup/` – Änderungen bitte dort und hier übernehmen.

## Inhalt
- `taeglich/stemm-JJJJ-MM-TT.sql.gz.age` – die letzten **30** Tage
- `monatlich/stemm-JJJJ-MM.sql.gz.age` – erster Stand jedes Monats, die letzten **12** Monate
- Jeder Dump enthält die Konten (`auth.users`, `auth.identities`) und alle Stemm-Tabellen (`public.*`)
  als SQL-INSERTs, gzip-komprimiert und mit [age](https://age-encryption.org) verschlüsselt.
- Die Git-Historie wird jede Nacht neu begonnen (Force-Push) – ältere Stände verschwinden nach Ablauf der
  Aufbewahrung wirklich (wichtig z. B. für gelöschte Konten).

## Schlüssel und Zugänge
| Was | Wo |
|---|---|
| Öffentlicher age-Schlüssel (`age1…`) | Repository-Variable `AGE_RECIPIENT` |
| **Privater** age-Schlüssel | **nur** im Passwortmanager des Admins – nie in GitHub |
| Datenbank-Zugang (Session-Pooler-URI inkl. Passwort) | Secret `SUPABASE_DB_URL` |
| Supabase-URL und Publishable Key (für den Keep-alive-Ping) | Variablen `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` |

Der Session-Pooler (Port 5432 auf `…pooler.supabase.com`) wird genutzt, weil GitHub-Runner kein IPv6
haben und die direkte Datenbankadresse nur per IPv6 erreichbar ist.

## Wiederherstellen
Voraussetzung: Node.js und das Stemm-Repo (`trainingstracker`) mit `npm ci`.

1. **Backup herunterladen**, z. B. `taeglich/stemm-2026-11-19.sql.gz.age`.
2. **Privaten Schlüssel** aus dem Passwortmanager in eine Datei legen, z. B. `C:\temp\stemm-backup.key`
   (komplette Datei inkl. der Zeile `AGE-SECRET-KEY-…`).
3. **Nur prüfen** (entschlüsselt, zeigt Zeilen je Tabelle, schreibt nichts):
   ```
   node scripts/backup-wiederherstellen.ts --datei <backup> --schluessel C:\temp\stemm-backup.key
   ```
4. **Ziel-Datenbank vorbereiten**: neues Supabase-Projekt (Region Frankfurt) anlegen und das Schema einspielen:
   ```
   npx supabase db push --remote="postgresql://postgres.<ref>:<passwort>@<pooler-host>:5432/postgres" --yes
   ```
5. **Einspielen** (eine Transaktion – bei Fehlern wird nichts geändert):
   ```
   node scripts/backup-wiederherstellen.ts --datei <backup> --schluessel C:\temp\stemm-backup.key --ziel "<gleiche URL wie oben>"
   ```
   In die Produktions-Datenbank nur nach Totalverlust und mit zusätzlichem `--auch-produktion`.
6. **Schlüsseldatei löschen.**
7. Danach Edge Functions ausrollen und Auth-Einstellungen übertragen (siehe `trainingstracker/docs/fortschritt.md`),
   App-Variablen auf das neue Projekt umstellen. Passwörter bleiben gültig (die Hashes sind im Backup).
