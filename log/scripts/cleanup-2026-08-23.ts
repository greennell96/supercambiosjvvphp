/**
 * One-off cleanup — 23/08/2026.
 *
 * This is NOT a repeatable command, and that is why it is not in package.json.
 * It names two row ids that exist exactly once, in this database, in the state
 * it is in today.
 *
 *   Usage (from log/):
 *     npx tsx scripts/cleanup-2026-08-23.ts
 *
 * Two corrections, in this order, in one transaction — either both land or
 * neither does:
 *
 *   1. ves_sales id 1 is the opening balance Jose typed in by hand, before
 *      migration 010 added eur_cost. It carries 0, which that migration's own
 *      comment defines as "cost unknown, not free", and leaves to be corrected
 *      by hand. This is that correction: the 35,35 USDT it gave up were bought
 *      at 0,85330996 EUR/USDT, so its cost basis is 35,35 * 0,85330996 EUR.
 *
 *      Nothing generic is being built here. Any sale logged from now on gets its
 *      eur_cost from walking crypto_purchases at the moment of the sale, in
 *      createVesSale. This one row predates that and only this one row needs it.
 *
 *   2. sendings id 1 is a leftover test row — "Syaned Cobis", 100 EUR, paid from
 *      the pool — that was never a real transfer. It goes through the real
 *      deleteSending reversal, so the bolivares it drew go back onto the sale
 *      they came from. Deleting it is both the cleanup and the live check that
 *      the reversal arithmetic is right: the before/after below is the evidence.
 *
 * Running it a second time fails on step 2, because sending 1 will not be there,
 * and the transaction takes step 1 down with it. Nothing is printed for a run
 * that did not commit.
 */

import postgres, { type TransactionSql } from 'postgres';

import { requireDatabaseUrl } from './env';
import { deleteSendingInTx } from '../lib/queries';

/** The legacy opening balance, and the two numbers its cost basis comes from. */
const VES_SALE_ID = 1;
const VES_SALE_USDT_SOLD = 35.35;
const VES_SALE_PRICE_EUR_PER_USDT = 0.85330996;
const VES_SALE_EUR_COST = VES_SALE_USDT_SOLD * VES_SALE_PRICE_EUR_PER_USDT;

/** The leftover test sending. */
const SENDING_ID = 1;

/** Enough tolerance for a numeric round trip, nothing more. */
const EPSILON = 0.00000001;

interface Snapshot {
  purchases: { id: string; remaining_usdt: string }[];
  sales: { id: string; usdt_sold: string; remaining_ves: string; eur_cost: string }[];
  sendingExists: boolean;
}

/**
 * Everything the two corrections can move, read straight off the driver as the
 * strings Postgres actually holds. No formatting and no Number(): this is meant
 * to be compared by eye against the database afterwards.
 */
async function snapshot(tx: TransactionSql): Promise<Snapshot> {
  const purchases = await tx<{ id: string; remaining_usdt: string }[]>`
    select id, remaining_usdt from crypto_purchases order by purchased_at, id
  `;
  const sales = await tx<
    { id: string; usdt_sold: string; remaining_ves: string; eur_cost: string }[]
  >`
    select id, usdt_sold, remaining_ves, eur_cost from ves_sales order by sold_at, id
  `;
  const [sending] = await tx<{ id: string }[]>`
    select id from sendings where id = ${SENDING_ID}
  `;

  return { purchases: [...purchases], sales: [...sales], sendingExists: Boolean(sending) };
}

function print(label: string, snap: Snapshot): void {
  console.log(`\n--- ${label} ---`);

  console.log('crypto_purchases  (remaining_usdt)');
  for (const p of snap.purchases) {
    console.log(`  id ${p.id}: ${p.remaining_usdt}`);
  }

  console.log('ves_sales  (remaining_ves | eur_cost)');
  for (const s of snap.sales) {
    console.log(`  id ${s.id}: ${s.remaining_ves} | ${s.eur_cost}`);
  }

  console.log(`sendings id ${SENDING_ID}: ${snap.sendingExists ? 'presente' : 'NO existe'}`);
}

async function main() {
  const sql = postgres(requireDatabaseUrl(), { max: 1 });

  try {
    const { before, vesDrawn, usdtDrawn, after } = await sql.begin(async (tx) => {
      const before = await snapshot(tx);

      // The eur_cost written below is derived from usdt_sold, so refuse to write
      // it if this row is not the one this script was written for.
      const sale = before.sales.find((s) => s.id === String(VES_SALE_ID));
      if (!sale) {
        throw new Error(`No existe ves_sales id ${VES_SALE_ID}. Revisa la base antes de seguir.`);
      }
      if (Math.abs(Number(sale.usdt_sold) - VES_SALE_USDT_SOLD) > EPSILON) {
        throw new Error(
          `ves_sales id ${VES_SALE_ID} vendio ${sale.usdt_sold} USDT y no ${VES_SALE_USDT_SOLD}. ` +
            'El costo a escribir sale de esa cifra, asi que no es la fila que este script corrige.',
        );
      }

      // What sending 1 drew: exactly what the delete has to hand back. Both
      // trails are read, because that is what deleteSendingInTx walks.
      const vesDrawn = await tx<{ ves_sale_id: string; ves_amount: string }[]>`
        select ves_sale_id, ves_amount
        from sending_ves_allocations
        where sending_id = ${SENDING_ID}
        order by id
      `;
      const usdtDrawn = await tx<{ crypto_purchase_id: string; usdt_amount: string }[]>`
        select crypto_purchase_id, usdt_amount
        from sending_lot_allocations
        where sending_id = ${SENDING_ID}
        order by id
      `;

      // 1. Backfill the legacy sale's cost basis.
      await tx`
        update ves_sales set eur_cost = ${VES_SALE_EUR_COST} where id = ${VES_SALE_ID}
      `;

      // 2. Delete the test sending, through the real reversal.
      await deleteSendingInTx(tx, SENDING_ID);

      const after = await snapshot(tx);
      return { before, vesDrawn: [...vesDrawn], usdtDrawn: [...usdtDrawn], after };
    });

    print('ANTES', before);

    console.log(`\nLo que el envio ${SENDING_ID} habia tomado, y por tanto tiene que volver:`);
    if (vesDrawn.length === 0 && usdtDrawn.length === 0) {
      console.log('  (nada: el envio no habia tocado ningun pool)');
    }
    for (const a of vesDrawn) {
      console.log(`  ${a.ves_amount} Bs -> ves_sales id ${a.ves_sale_id} (remaining_ves)`);
    }
    for (const a of usdtDrawn) {
      console.log(
        `  ${a.usdt_amount} USDT -> crypto_purchases id ${a.crypto_purchase_id} (remaining_usdt)`,
      );
    }

    console.log(
      `\nCosto escrito en ves_sales id ${VES_SALE_ID}: ` +
        `${VES_SALE_USDT_SOLD} * ${VES_SALE_PRICE_EUR_PER_USDT} = ${VES_SALE_EUR_COST} EUR`,
    );

    print('DESPUES', after);

    console.log('\nListo. Las dos correcciones quedaron aplicadas.');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
