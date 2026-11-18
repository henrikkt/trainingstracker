import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { ServerZeile, ServerZeileHoch } from './abbildung.ts';
import { AnmeldeFehler, NetzwerkFehler, ServerFehler, type SyncServer } from './motor.ts';

/** Ordnet Supabase-Fehler den Sync-Fehlerarten zu (Netz → später erneut, 401 → neu anmelden, sonst Datenfehler). */
export function fehlerArt(fehler: Pick<PostgrestError, 'message' | 'code'>, status: number): Error {
  if (status === 0 || /failed to fetch|networkerror|network request failed|load failed|fetch/i.test(fehler.message)) return new NetzwerkFehler(fehler.message);
  if (status === 401 || fehler.code === 'PGRST301' || /jwt/i.test(fehler.message)) return new AnmeldeFehler(fehler.message);
  if (status >= 500 || status === 429) return new NetzwerkFehler(fehler.message); // vorübergehend → später erneut
  return new ServerFehler(fehler.message);
}

export function supabaseServer(client: SupabaseClient): SyncServer {
  return {
    async hochladen(tabelle: string, zeilen: ServerZeileHoch[]): Promise<void> {
      const { error, status } = await client.from(tabelle).upsert(zeilen, { onConflict: 'user_id,id' });
      if (error) throw fehlerArt(error, status);
    },
    async holen(tabelle: string, ab: string | null, von: number, bis: number): Promise<ServerZeile[]> {
      let anfrage = client.from(tabelle).select('id, data, client_updated_at, updated_at, deleted_at').order('updated_at', { ascending: true }).order('id').range(von, bis);
      if (ab) anfrage = anfrage.gt('updated_at', ab);
      const { data, error, status } = await anfrage;
      if (error) throw fehlerArt(error, status);
      return (data ?? []) as ServerZeile[];
    },
  };
}
