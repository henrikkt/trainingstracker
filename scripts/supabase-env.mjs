// Liest die Zugangsdaten des lokalen Supabase-Stacks (`npx supabase status -o json`) und gibt sie als
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY aus – in GitHub Actions direkt nach $GITHUB_ENV.
// Nur für den lokalen Test-Stack (Docker); die Werte sind die festen Standard-Testschlüssel des CLI.
import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const erstes = (...namen) => namen.map((n) => status[n]).find(Boolean);

const werte = {
  SUPABASE_URL: erstes('API_URL'),
  SUPABASE_PUBLISHABLE_KEY: erstes('PUBLISHABLE_KEY', 'ANON_KEY'),
  SUPABASE_SECRET_KEY: erstes('SECRET_KEY', 'SERVICE_ROLE_KEY'),
};

const fehlend = Object.entries(werte).filter(([, w]) => !w).map(([n]) => n);
if (fehlend.length) {
  console.error(`Fehlend: ${fehlend.join(', ')}. Vorhandene Felder: ${Object.keys(status).join(', ')}`);
  process.exit(1);
}

const zeilen = Object.entries(werte).map(([n, w]) => `${n}=${w}`).join('\n') + '\n';
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, zeilen);
else process.stdout.write(zeilen);
console.error('Supabase-Testumgebung gesetzt:', Object.keys(werte).join(', '));
