/**
 * Loads .env.local (then .env) for the standalone scripts.
 * Next.js does this by itself for the app; plain `tsx` scripts do not.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { config } from 'dotenv';

for (const file of ['.env.local', '.env']) {
  const path = join(process.cwd(), file);
  if (existsSync(path)) config({ path, quiet: true });
}

/** Reads DATABASE_URL, or exits with a readable message instead of a stack trace. */
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'ERROR: DATABASE_URL no esta definida.\n' +
        'Copia log/.env.example a log/.env.local y pon la cadena de conexion de Postgres.',
    );
    process.exit(1);
  }
  return url;
}
