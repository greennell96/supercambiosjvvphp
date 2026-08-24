/**
 * Migration runner.
 *
 * Applies every .sql file in log/migrations/ in filename order, once each, and
 * remembers what it already applied in a table called _migrations.
 *
 *   npm run migrate
 *
 * The SQL files themselves are the source of truth for the schema. This script
 * only runs them; it never generates SQL.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import postgres from 'postgres';

import { requireDatabaseUrl } from './env';

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function main() {
  // `create table if not exists` emits a NOTICE on every re-run; it is not an
  // error and printing it just makes a clean run look broken.
  const sql = postgres(requireDatabaseUrl(), { max: 1, onnotice: () => {} });

  try {
    await sql`
      create table if not exists _migrations (
        filename   text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const applied = new Set(
      (await sql<{ filename: string }[]>`select filename from _migrations`).map((r) => r.filename),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`- ${file} (ya aplicada)`);
        continue;
      }
      const statements = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      await sql.begin(async (tx) => {
        await tx.unsafe(statements);
        await tx`insert into _migrations (filename) values (${file})`;
      });
      console.log(`+ ${file} aplicada`);
      ran += 1;
    }

    console.log(ran === 0 ? 'Nada que aplicar.' : `${ran} migracion(es) aplicadas.`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
