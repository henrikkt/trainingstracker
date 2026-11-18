// Startet Vitest mit normalisiertem Arbeitsverzeichnis.
// Hintergrund: Unter Windows startet z. B. das VS-Code-Terminal mit kleinem Laufwerksbuchstaben (c:\…).
// Vitest lädt dann Module doppelt (c:\ und C:\) und jeder Test bricht mit
// „Cannot read properties of undefined (reading 'config')“ ab.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = fileURLToPath(new URL('..', import.meta.url)).replace(/^[a-z]:/, (lw) => lw.toUpperCase());
const vitest = path.join(wurzel, 'node_modules', 'vitest', 'vitest.mjs');

const ergebnis = spawnSync(process.execPath, [vitest, ...process.argv.slice(2)], { cwd: wurzel, stdio: 'inherit' });
process.exit(ergebnis.status ?? 1);
