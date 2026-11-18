import { describe, expect, it } from 'vitest';
import { AnmeldeFehler, NetzwerkFehler, ServerFehler } from './motor.ts';
import { fehlerArt } from './supabaseServer.ts';

describe('Fehlerarten', () => {
  it('Netzwerk und vorübergehende Serverfehler → später erneut', () => {
    expect(fehlerArt({ message: 'TypeError: Failed to fetch', code: '' }, 0)).toBeInstanceOf(NetzwerkFehler);
    expect(fehlerArt({ message: 'Load failed', code: '' }, 0)).toBeInstanceOf(NetzwerkFehler);
    expect(fehlerArt({ message: 'Service Unavailable', code: '' }, 503)).toBeInstanceOf(NetzwerkFehler);
    expect(fehlerArt({ message: 'Too many requests', code: '' }, 429)).toBeInstanceOf(NetzwerkFehler);
  });
  it('abgelaufene Sitzung → neu anmelden', () => {
    expect(fehlerArt({ message: 'JWT expired', code: 'PGRST301' }, 401)).toBeInstanceOf(AnmeldeFehler);
  });
  it('Prüfregel verletzt → Datenfehler (Zeile wird einzeln behandelt)', () => {
    expect(fehlerArt({ message: 'new row violates check constraint', code: '23514' }, 400)).toBeInstanceOf(ServerFehler);
  });
});
