-- Übungseinstellungen dürfen ein kleines Foto der Maschine enthalten (JPEG-Data-URL, App begrenzt auf ~60 000 Zeichen).
-- Grenze für exercise_prefs daher von 16 KB auf 128 KB anheben. RLS und übrige Tabellen bleiben unverändert.
alter table public.exercise_prefs
  drop constraint exercise_prefs_data_check,
  add constraint exercise_prefs_data_check check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 131072);
