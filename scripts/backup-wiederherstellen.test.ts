import { gzipSync } from 'node:zlib';
import { Encrypter, generateIdentity, identityToRecipient } from 'age-encryption';
import { describe, expect, it } from 'vitest';
import { bereinigeSql, entschluessele, fehlendeTabellen, privaterSchluessel, spieleEin, zaehleZeilen } from './backup-wiederherstellen.ts';

const DUMP = `--
-- PostgreSQL database dump
--
\\restrict abc123
SET statement_timeout = 0;
-- Data for Name: users; Type: TABLE DATA; Schema: auth
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'a@b.de');
-- Data for Name: identities; Type: TABLE DATA; Schema: auth
-- Data for Name: body_weights; Type: TABLE DATA; Schema: public
-- Data for Name: custom_exercises; Type: TABLE DATA; Schema: public
-- Data for Name: exercise_prefs; Type: TABLE DATA; Schema: public
-- Data for Name: profiles; Type: TABLE DATA; Schema: public
-- Data for Name: templates; Type: TABLE DATA; Schema: public
-- Data for Name: workouts; Type: TABLE DATA; Schema: public
INSERT INTO public.workouts (user_id, id, data) VALUES ('11111111-1111-1111-1111-111111111111', 'w1', '{}');
INSERT INTO public.workouts (user_id, id, data) VALUES ('11111111-1111-1111-1111-111111111111', 'w2', '{}');
\\unrestrict abc123
`;

describe('Backup wiederherstellen', () => {
  it('entschlüsselt ein mit age verschlüsseltes, gezipptes Backup (Rundlauf)', async () => {
    const identitaet = await generateIdentity();
    const e = new Encrypter();
    e.addRecipient(await identityToRecipient(identitaet));
    const verschluesselt = await e.encrypt(gzipSync(Buffer.from(DUMP)));
    const schluesseldatei = `# created: 2026-11-19\n# public key: …\n${identitaet}\n`;
    expect(await entschluessele(verschluesselt, schluesseldatei)).toBe(DUMP);
  });

  it('meldet falschen Schlüssel verständlich', async () => {
    const e = new Encrypter();
    e.addRecipient(await identityToRecipient(await generateIdentity()));
    const verschluesselt = await e.encrypt(gzipSync(Buffer.from(DUMP)));
    await expect(entschluessele(verschluesselt, await generateIdentity())).rejects.toThrow('falscher Schlüssel');
    expect(() => privaterSchluessel('kein schlüssel')).toThrow('AGE-SECRET-KEY');
  });

  it('entfernt psql-Meta-Befehle, zählt Zeilen und prüft Vollständigkeit', () => {
    expect(bereinigeSql(DUMP)).not.toMatch(/\\restrict|\\unrestrict/);
    expect(zaehleZeilen(DUMP)).toMatchObject({ 'auth.users': 1, 'public.workouts': 2, 'public.templates': 0 });
    expect(fehlendeTabellen(DUMP)).toEqual([]);
    expect(fehlendeTabellen(DUMP.replace(/.*Name: workouts.*\n/, ''))).toEqual(['public.workouts']);
  });

  it('spielt alles in einer Transaktion ein und rollt bei Fehlern zurück', async () => {
    const protokoll: string[] = [];
    await spieleEin(DUMP, { query: async (sql) => void protokoll.push(sql.slice(0, 6)) });
    expect(protokoll).toEqual(['begin', '--\n-- ', 'commit']);

    const fehler: string[] = [];
    const db = {
      query: async (sql: string) => {
        fehler.push(sql.slice(0, 6));
        if (sql.startsWith('--')) throw new Error('kaputt');
      },
    };
    await expect(spieleEin(DUMP, db)).rejects.toThrow('kaputt');
    expect(fehler.at(-1)).toBe('rollba');
  });
});
