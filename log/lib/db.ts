/**
 * Postgres connection. One lazily-created client for the whole process.
 *
 * Postgres `numeric` comes back from the driver as a string (it is arbitrary
 * precision, so it does not fit a JS number safely in general). Every read in
 * lib/queries.ts converts explicitly with `num()`; nothing else should touch
 * raw driver output.
 */

import postgres from 'postgres';

let client: postgres.Sql | null = null;

export function getSql(): postgres.Sql {
  if (client) return client;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Falta la variable de entorno DATABASE_URL. Copia .env.example a .env.local y rellenala.',
    );
  }

  client = postgres(url, {
    // Keep the pool tiny: this is a single-user internal tool, and serverless
    // platforms open one process per concurrent request anyway.
    max: 3,
    idle_timeout: 20,
  });
  return client;
}

/** Postgres numeric/decimal -> JS number. */
export function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Postgres bigint -> JS number.
 * The driver hands back bigints as strings because they can exceed what a JS
 * number holds. These are row ids in a small internal ledger, so a number is
 * safe and much easier to work with.
 */
export function id(value: string | number): number {
  return typeof value === 'number' ? value : Number(value);
}
