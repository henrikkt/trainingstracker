import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

/**
 * Synchronisierung gegen den lokalen Supabase-Stack (CI-Job „Datenbank und Zugriffsregeln“):
 * Training komplett offline erfassen → wieder online → automatisch synchronisiert → auf einem
 * zweiten Gerät sichtbar. Prüft den Server-Stand direkt über die Admin-API.
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
test.skip(!process.env.VITE_SUPABASE_URL || !url || !secret, 'nur mit lokalem Supabase-Stack');

const PASSWORT = 'Sicheres-Passwort-1';
const admin = () => createClient(url!, secret!, { auth: { persistSession: false, autoRefreshToken: false } });
const syncStatus = (page: Page) => page.getByRole('status', { name: /^Sync-Status/ }).first();
const nav = (page: Page, ziel: string) => page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: ziel }).click();

async function konto(name: string): Promise<{ email: string; id: string }> {
  const email = `e2e-${name}-${crypto.randomUUID()}@example.org`;
  const { data, error } = await admin().auth.admin.createUser({ email, password: PASSWORT, email_confirm: true });
  if (error) throw error;
  return { email, id: data.user.id };
}

async function anmelden(page: Page, email: string) {
  await page.goto('./');
  await page.getByLabel('E-Mail', { exact: true }).fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill(PASSWORT);
  await page.getByRole('button', { name: 'Anmelden' }).click();
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
}

const serverTrainings = async (nutzerId: string) => (await admin().from('workouts').select('id, data, deleted_at').eq('user_id', nutzerId)).data ?? [];

test('Training offline erfassen → online → synchronisiert → auf zweitem Gerät sichtbar', async ({ page, context, browser }) => {
  page.on('dialog', (d) => void d.accept());
  const ich = await konto('sync');
  await anmelden(page, ich.email);
  await expect(syncStatus(page)).toHaveAttribute('aria-label', 'Sync-Status: Synchronisiert', { timeout: 15_000 });

  // Flugmodus: komplettes Training erfassen
  await context.setOffline(true);
  await expect(syncStatus(page)).toHaveAttribute('aria-label', /Offline/);
  await page.getByRole('button', { name: 'Freies Training starten' }).click();
  await page.getByRole('button', { name: 'Übung hinzufügen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Übungen hinzufügen' });
  await dialog.getByPlaceholder('Übung suchen …').fill('kniebeuge lang');
  await dialog.getByRole('button', { name: /^Kniebeuge \(Langhantel\)/ }).click();
  await dialog.getByRole('button', { name: '1 Übung hinzufügen' }).click();
  const satz1 = page.getByRole('region', { name: 'Satz 1 bearbeiten' });
  await satz1.getByRole('textbox', { name: 'Gewicht', exact: true }).fill('100');
  await satz1.getByRole('textbox', { name: 'Gewicht', exact: true }).press('Enter');
  await satz1.getByRole('button', { name: 'Satz abhaken' }).click();
  await page.getByRole('region', { name: 'Satz 2 bearbeiten' }).getByRole('button', { name: 'Satz abhaken' }).click();
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Stark gemacht!' })).toBeVisible();

  await expect(syncStatus(page)).toHaveAttribute('aria-label', /Offline – \d+ Änderung/);
  expect(await serverTrainings(ich.id)).toEqual([]); // noch nichts auf dem Server

  // Wieder online → automatisch synchronisiert
  await context.setOffline(false);
  await expect(syncStatus(page)).toHaveAttribute('aria-label', 'Sync-Status: Synchronisiert', { timeout: 20_000 });
  const aufServer = await serverTrainings(ich.id);
  expect(aufServer).toHaveLength(1);
  expect(aufServer[0]!.deleted_at).toBeNull();
  expect(aufServer[0]!.data).toMatchObject({ titel: 'Freies Training', uebungen: [{ uebungId: 'kniebeuge', saetze: [{ gewicht: 100, erledigt: true }, { gewicht: 100, erledigt: true }] }] });

  // Zweites Gerät: dieselbe Person sieht das Training
  const geraet2 = await browser.newContext();
  const seite2 = await geraet2.newPage();
  await anmelden(seite2, ich.email);
  await expect(seite2.getByRole('list', { name: 'Letzte Trainings' })).toContainText('Freies Training', { timeout: 15_000 });
  await geraet2.close();
});

test('Löschen auf einem Gerät kommt auf dem anderen an', async ({ page, browser }) => {
  page.on('dialog', (d) => void d.accept());
  const ich = await konto('loeschen');
  await anmelden(page, ich.email);
  await nav(page, 'Pläne');
  await page.getByRole('button', { name: 'Beispiel Pull übernehmen' }).click();
  await expect(syncStatus(page)).toHaveAttribute('aria-label', 'Sync-Status: Synchronisiert', { timeout: 15_000 });

  const geraet2 = await browser.newContext();
  const seite2 = await geraet2.newPage();
  seite2.on('dialog', (d) => void d.accept());
  await anmelden(seite2, ich.email);
  await nav(seite2, 'Pläne');
  await seite2.getByRole('link', { name: /Pull/ }).click();
  await seite2.getByRole('button', { name: 'Vorlage löschen' }).click();
  await expect(syncStatus(seite2)).toHaveAttribute('aria-label', 'Sync-Status: Synchronisiert', { timeout: 15_000 });
  await geraet2.close();

  // Gerät 1 holt die Löschung (z. B. beim nächsten Sync – hier per „Jetzt synchronisieren“)
  await nav(page, 'Profil');
  await page.getByRole('button', { name: 'Jetzt synchronisieren' }).click();
  await nav(page, 'Pläne');
  await expect(page.getByText('Noch keine Vorlagen')).toBeVisible({ timeout: 15_000 });
});

test('Kontowechsel nach vollständigem Sync: fremde Daten verschwinden vom Gerät', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  const anna = await konto('anna');
  const ben = await konto('ben');
  await anmelden(page, anna.email);
  await nav(page, 'Pläne');
  await page.getByRole('button', { name: 'Beispiel Beine übernehmen' }).click();
  await expect(syncStatus(page)).toHaveAttribute('aria-label', 'Sync-Status: Synchronisiert', { timeout: 15_000 });
  await nav(page, 'Profil');
  await page.getByRole('button', { name: 'Abmelden' }).click();

  await anmelden(page, ben.email);
  await nav(page, 'Pläne');
  await expect(page.getByText('Noch keine Vorlagen')).toBeVisible();
});
