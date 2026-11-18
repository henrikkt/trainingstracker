#!/usr/bin/env bash
# Stemm – verschlüsselten Daten-Dump erstellen.
# Sichert die Konten (auth.users, auth.identities) und alle Stemm-Tabellen (public.*) als SQL-INSERTs,
# komprimiert (gzip) und verschlüsselt sie mit age für den angegebenen öffentlichen Schlüssel.
# Das Schema kommt bei der Wiederherstellung aus den Migrationen (supabase/migrations).
#
# Aufruf:  DB_URL=postgresql://… AGE_RECIPIENT=age1… bash dump.sh <ziel.sql.gz.age>
# Optional: PG_DUMP=/usr/lib/postgresql/17/bin/pg_dump (pg_dump-Version muss zur Server-Version passen)
#
# Wird vom nächtlichen Backup (Repo trainingstracker-backups) und vom Rundlauf-Test in der CI genutzt.
# Kanonische Fassung: trainingstracker/backup/dump.sh – Änderungen ins Backup-Repo übernehmen.
set -euo pipefail

ziel="${1:?Zieldatei fehlt}"
: "${DB_URL:?DB_URL fehlt}"
: "${AGE_RECIPIENT:?AGE_RECIPIENT fehlt}"
PG_DUMP="${PG_DUMP:-pg_dump}"

klartext="$(mktemp)"
trap 'shred -u "$klartext" 2>/dev/null || rm -f "$klartext"' EXIT

"$PG_DUMP" "$DB_URL" \
  --data-only --column-inserts --no-owner --no-privileges \
  --table='public.*' --table=auth.users --table=auth.identities \
  > "$klartext"

# Plausibilität: Alle Tabellen müssen im Dump stehen (auch wenn sie leer sind)
for t in auth.users auth.identities public.profiles public.custom_exercises public.exercise_prefs public.templates public.workouts public.body_weights; do
  schema="${t%%.*}"; name="${t#*.}"
  grep -q "Name: ${name}; Type: TABLE DATA; Schema: ${schema}" "$klartext" || { echo "Fehler: Tabelle ${t} fehlt im Dump" >&2; exit 1; }
done

gzip -9 -c "$klartext" | age -r "$AGE_RECIPIENT" -o "$ziel"
echo "Backup erstellt: $(basename "$ziel"), $(wc -c < "$ziel") Bytes verschlüsselt, $(grep -c '^INSERT INTO' "$klartext") Zeilen"
