import type { ServerZeile, ServerZeileHoch } from './abbildung.ts';
import { NetzwerkFehler, ServerFehler, type SyncServer } from './motor.ts';

/**
 * Nachgebauter Server für Tests – verhält sich wie die Supabase-Tabellen samt Trigger:
 * updated_at setzt der Server (streng steigend), ältere client_updated_at werden verworfen (Last-Write-Wins),
 * nur Zeilen des angemeldeten Nutzers sind sichtbar.
 */
export class TestServer implements SyncServer {
  private uhr = Date.parse('2026-11-18T12:00:00.000Z');
  readonly tabellen = new Map<string, Map<string, ServerZeile & { user_id: string }>>();
  offline = false;
  /** IDs, die der Server ablehnt (simuliert eine verletzte Prüfregel) */
  ablehnen = new Set<string>();
  hochladeAufrufe = 0;

  constructor(private readonly nutzerId: string) {}

  private tabelle(name: string) {
    let t = this.tabellen.get(name);
    if (!t) this.tabellen.set(name, (t = new Map()));
    return t;
  }

  zeile(tabelle: string, id: string) {
    return this.tabelle(tabelle).get(`${this.nutzerId}/${id}`);
  }

  async hochladen(tabelle: string, zeilen: ServerZeileHoch[]): Promise<void> {
    this.hochladeAufrufe++;
    if (this.offline) throw new NetzwerkFehler('offline');
    if (zeilen.some((z) => this.ablehnen.has(z.id))) throw new ServerFehler('check constraint');
    for (const z of zeilen) {
      const schluessel = `${z.user_id}/${z.id}`;
      const alt = this.tabelle(tabelle).get(schluessel);
      if (alt && Date.parse(z.client_updated_at) < Date.parse(alt.client_updated_at)) continue; // ältere Änderung verwerfen
      this.uhr += 1000;
      this.tabelle(tabelle).set(schluessel, { ...z, updated_at: new Date(this.uhr).toISOString() });
    }
  }

  async holen(tabelle: string, ab: string | null, von: number, bis: number): Promise<ServerZeile[]> {
    if (this.offline) throw new NetzwerkFehler('offline');
    return [...this.tabelle(tabelle).values()]
      .filter((z) => z.user_id === this.nutzerId && (!ab || z.updated_at > ab))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
      .slice(von, bis + 1)
      .map(({ user_id: _u, ...z }) => structuredClone(z));
  }

  /** Simuliert eine Änderung von einem anderen Gerät. */
  aenderungVonAnderemGeraet(tabelle: string, id: string, data: Record<string, unknown>, clientZeit: string, geloescht: string | null = null) {
    this.uhr += 1000;
    this.tabelle(tabelle).set(`${this.nutzerId}/${id}`, {
      user_id: this.nutzerId,
      id,
      data,
      client_updated_at: clientZeit,
      deleted_at: geloescht,
      updated_at: new Date(this.uhr).toISOString(),
    });
  }
}
