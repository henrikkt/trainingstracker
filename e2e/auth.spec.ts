import { createClient } from '@supabase/supabase-js';
import { type Page } from '@playwright/test';
import { pruefeSeite } from './a11y.ts';
import { expect, test } from './fixtures.ts';
import { gespeichert } from './hilfen.ts';

/**
 * Login, Einladung und Passwort-Reset gegen einen echten Supabase-Stack.
 * Läuft nur im CI-Job „Datenbank und Zugriffsregeln“ (bzw. in Codespaces), wo die App mit
 * VITE_SUPABASE_URL gebaut ist und SUPABASE_SECRET_KEY für das Anlegen der Test-Konten bereitsteht.
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
test.skip(!process.env.VITE_SUPABASE_URL || !url || !secret, 'nur mit lokalem Supabase-Stack');

const PASSWORT = 'Sicheres-Passwort-1';
const admin = () => createClient(url!, secret!, { auth: { persistSession: false, autoRefreshToken: false } });
const neueEmail = (name: string) => `e2e-${name}-${crypto.randomUUID()}@example.org`;

async function linkFuer(typ: 'invite' | 'recovery', email: string): Promise<string> {
  const { data, error } = await admin().auth.admin.generateLink({ type: typ, email });
  if (error) throw error;
  return `./#/einladung?token=${data.properties.hashed_token}&typ=${typ}`;
}

async function anmelden(page: Page, email: string, passwort: string) {
  await page.getByLabel('E-Mail', { exact: true }).fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill(passwort);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

async function kontoMitPasswort(name: string): Promise<string> {
  const email = neueEmail(name);
  const { error } = await admin().auth.admin.createUser({ email, password: PASSWORT, email_confirm: true });
  if (error) throw error;
  return email;
}

test('ohne Anmeldung nur die Login-Seite; falsches Passwort wird gemeldet', async ({ page }, info) => {
  await page.goto('./#/fortschritt');
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
  await pruefeSeite(page, 'Login', info.project.name === 'handy');
  // Service Worker wird schon vor der Anmeldung registriert (Offline-Start, Installierbarkeit)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0);
  await anmelden(page, await kontoMitPasswort('falsch'), 'falsches-passwort-123');
  await expect(page.getByRole('alert')).toContainText('E-Mail oder Passwort stimmt nicht.');
});

test('Einladung annehmen → Passwort festlegen → angemeldet (auch nach Neuladen) → abmelden → wieder anmelden', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  const email = neueEmail('eingeladen');
  await page.goto(await linkFuer('invite', email));

  await expect(page.getByRole('heading', { level: 1, name: 'Willkommen' })).toBeVisible();
  await expect(page).not.toHaveURL(/token=/); // Token wurde aus der Adresszeile entfernt
  await expect(page.getByLabel('Neues Passwort')).toBeVisible();
  await pruefeSeite(page, 'Passwort festlegen', test.info().project.name === 'handy');
  await page.getByLabel('Neues Passwort').fill(PASSWORT);
  await page.getByLabel('Passwort wiederholen').fill(PASSWORT);
  await page.getByRole('button', { name: 'Passwort speichern' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();

  await gespeichert(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Profil' }).click();
  await expect(page.getByText(`Angemeldet als ${email}`)).toBeVisible();
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();

  await anmelden(page, email, PASSWORT);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
});

test('ein Einladungslink funktioniert nur einmal', async ({ page, context }) => {
  const link = await linkFuer('invite', neueEmail('einmal'));
  await page.goto(link);
  await expect(page.getByLabel('Neues Passwort')).toBeVisible();

  const zweite = await context.browser()!.newContext();
  const fremd = await zweite.newPage();
  const basis = page.url().split('#')[0]!;
  await fremd.goto(basis + link.slice(link.indexOf('#')));
  await expect(fremd.getByRole('alert')).toContainText('ungültig oder abgelaufen');
  await zweite.close();
});

test('Passwort-Reset per Link vom Admin', async ({ page }) => {
  const email = await kontoMitPasswort('reset');
  await page.goto(await linkFuer('recovery', email));
  await expect(page.getByRole('heading', { level: 1, name: 'Neues Passwort' })).toBeVisible();
  const neu = 'Ganz-neues-Passwort-2';
  await page.getByLabel('Neues Passwort').fill(neu);
  await page.getByLabel('Passwort wiederholen').fill(neu);
  await page.getByRole('button', { name: 'Passwort speichern' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();

  // Mit dem alten Passwort geht es nicht mehr, mit dem neuen schon
  const { error: alt } = await createClient(url!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password: PASSWORT });
  expect(alt).not.toBeNull();
});

test('Kontowechsel mit nicht synchronisierten Daten wird blockiert (kein Datenverlust)', async ({ page, context }) => {
  page.on('dialog', (d) => void d.accept());
  const anna = await kontoMitPasswort('anna');
  const ben = await kontoMitPasswort('ben');

  await page.goto('./');
  await anmelden(page, anna, PASSWORT);
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  // Offline arbeiten → die Änderung bleibt lokal ausstehend
  await context.setOffline(true);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Pläne' }).click();
  await page.getByRole('button', { name: 'Beispiel Push übernehmen' }).click();
  await gespeichert(page);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Profil' }).click();
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await context.setOffline(false);

  await anmelden(page, ben, PASSWORT);
  await expect(page.getByRole('alert')).toContainText('noch nicht synchronisierte Daten eines anderen Kontos');
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();

  // Anna kommt wieder an ihre Daten
  await anmelden(page, anna, PASSWORT);
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Pläne' }).click();
  await expect(page.getByRole('link', { name: /Push/ })).toBeVisible();
  // … und jetzt wird sie synchronisiert
  await expect(page.getByRole('status', { name: /^Sync-Status/ })).toHaveAttribute('aria-label', 'Sync-Status: Synchronisiert', { timeout: 15_000 });
});
