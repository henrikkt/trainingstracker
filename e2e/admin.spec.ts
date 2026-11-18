import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

/**
 * Zugänge verwalten (Admin) und eigenes Konto löschen – gegen den lokalen Supabase-Stack mit Edge Functions.
 * Läuft nur im CI-Job „Datenbank und Zugriffsregeln“ (bzw. Codespaces).
 */
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
test.skip(!process.env.VITE_SUPABASE_URL || !url || !secret, 'nur mit lokalem Supabase-Stack');

const PASSWORT = 'Sicheres-Passwort-1';
const admin = () => createClient(url!, secret!, { auth: { persistSession: false, autoRefreshToken: false } });

async function konto(name: string, istAdmin = false): Promise<string> {
  const email = `e2e-${name}-${crypto.randomUUID()}@example.org`;
  const { error } = await admin().auth.admin.createUser({ email, password: PASSWORT, email_confirm: true, app_metadata: istAdmin ? { role: 'admin' } : {} });
  if (error) throw error;
  return email;
}

async function anmelden(page: Page, email: string, passwort = PASSWORT) {
  await page.goto('./');
  await page.getByLabel('E-Mail', { exact: true }).fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill(passwort);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

const zumProfil = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Profil' }).click();

test('Admin lädt einen Freund ein, der Freund nimmt an; Admin sperrt, entsperrt und löscht', async ({ page, browser }) => {
  let promptAntwort = '';
  page.on('dialog', (d) => void (d.type() === 'prompt' ? d.accept(promptAntwort) : d.accept()));

  await anmelden(page, await konto('chef', true));
  await zumProfil(page);
  await page.getByRole('link', { name: 'Zugänge verwalten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Zugänge' })).toBeVisible();

  // Einladen
  const freund = `e2e-freund-${crypto.randomUUID()}@example.org`;
  await page.getByLabel('E-Mail der Person').fill(freund);
  await page.getByRole('button', { name: 'Einladungslink erstellen' }).click();
  const link = await page.getByRole('textbox', { name: 'Link' }).inputValue();
  expect(link).toMatch(/#\/einladung\?token=.+&typ=invite$/);
  const konten = page.getByRole('list', { name: 'Konten' });
  await expect(konten.getByRole('listitem').filter({ hasText: freund })).toContainText('Einladung offen');

  // Freund löst den Link in einem eigenen Browser ein
  const freundKontext = await browser.newContext();
  const freundSeite = await freundKontext.newPage();
  await freundSeite.goto(link);
  await freundSeite.getByLabel('Neues Passwort').fill(PASSWORT);
  await freundSeite.getByLabel('Passwort wiederholen').fill(PASSWORT);
  await freundSeite.getByRole('button', { name: 'Passwort speichern' }).click();
  await expect(freundSeite.getByRole('heading', { level: 1, name: 'Training' })).toBeVisible();
  await freundKontext.close();

  await page.reload();
  const zeile = konten.getByRole('listitem').filter({ hasText: freund });
  await expect(zeile).not.toContainText('Einladung offen');

  // Sperren → Anmeldung scheitert; Entsperren → klappt wieder
  await page.getByRole('button', { name: `Sperren: ${freund}` }).click();
  await expect(zeile).toContainText('Gesperrt');
  const pruef = await browser.newContext();
  const pruefSeite = await pruef.newPage();
  await anmelden(pruefSeite, freund);
  await expect(pruefSeite.getByRole('alert')).toContainText('Dieser Zugang ist gesperrt.');
  await page.getByRole('button', { name: `Entsperren: ${freund}` }).click();
  await expect(zeile).not.toContainText('Gesperrt');
  await pruefSeite.getByRole('button', { name: 'Anmelden' }).click();
  await expect(pruefSeite.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await pruef.close();

  // Reset-Link erzeugen
  await page.getByRole('button', { name: `Reset-Link für ${freund}` }).click();
  await expect(page.getByRole('textbox', { name: 'Link' })).toHaveValue(/typ=recovery$/);

  // Löschen erst nach Eingabe der E-Mail
  promptAntwort = 'falsch@example.org';
  await page.getByRole('button', { name: `Löschen: ${freund}` }).click();
  await expect(zeile).toBeVisible();
  promptAntwort = freund;
  await page.getByRole('button', { name: `Löschen: ${freund}` }).click();
  await expect(konten.getByRole('listitem').filter({ hasText: freund })).toHaveCount(0);
});

test('normale Nutzer sehen keine Verwaltung', async ({ page }) => {
  await anmelden(page, await konto('normal'));
  await zumProfil(page);
  await expect(page.getByText('Angemeldet als')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zugänge verwalten' })).toHaveCount(0);
  await page.goto('./#/profil/zugaenge');
  await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
});

test('eigenes Konto löschen: danach ist keine Anmeldung mehr möglich', async ({ page }) => {
  page.on('dialog', (d) => void (d.type() === 'prompt' ? d.accept('LÖSCHEN') : d.accept()));
  const email = await konto('selbst');
  await anmelden(page, email);
  await zumProfil(page);
  await page.getByRole('button', { name: 'Konto und alle Daten löschen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
  await anmelden(page, email);
  await expect(page.getByRole('alert')).toContainText('E-Mail oder Passwort stimmt nicht.');
});
