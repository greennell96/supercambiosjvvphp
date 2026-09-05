/**
 * One-off correction — 05/09/2026.
 *
 * This is NOT a repeatable command, and that is why it is not in package.json.
 * It names two row ids that exist exactly once, in this database, in the state
 * it is in today.
 *
 *   Usage (from log/):
 *     npx tsx scripts/cleanup-2026-09-05.ts
 *
 * Jose logged ves_sales id 30 wrong — 209,04 USDT por 200.000 Bs, hoy — and the
 * app refuses to delete it, correctly: it landed on a pool that was already in
 * the hole, so 145.562,94 of its bolivares went straight to covering envios
 * that had been paid out of ves_sales id 29 before the money was there. Only
 * 54.437,06 Bs ever sat on the new lot. applyIncomingToBackorders writes no
 * allocation trail for that healing, so deleteVenta has nothing to walk back
 * and refuses rather than guess. This script is the guess, made by hand, with
 * every number it depends on checked before anything is written.
 *
 * The arithmetic is unambiguous here, and the guards below are what make that
 * claim checkable rather than asserted:
 *
 *   - sale 29 took in 100.000 Bs and had 245.562,94 Bs of envios drawn against
 *     it, so its debt was exactly 100.000 - 245.562,94 = -145.562,94 Bs;
 *   - sale 30 paid exactly 145.562,94 Bs into backorders, clearing that one
 *     debt to zero and no other — the two numbers match to the cent;
 *   - sale 30 is the newest row and nothing has drawn from it, so no third
 *     thing has moved since.
 *
 * Undoing it is therefore: put sale 29's debt back at -145.562,94, hand sale
 * 30's USDT back to the lots it came from, and delete the row. The USDT half
 * goes through the real restoreDrawnAmounts, the same function deleteVenta
 * uses, walking the same sale_lot_allocations trail.
 *
 * After this runs the pool is back in the hole by 145.562,94 Bs, which is where
 * it genuinely was before the mistyped venta — that is the correct state, not a
 * side effect. Jose then logs the venta again with the right numbers, and the
 * next arrival heals the debt the ordinary way.
 *
 * Running it a second time fails on the first guard, because sale 30 will not
 * be there, and nothing is written.
 */

import postgres, { type TransactionSql } from 'postgres';

import { requireDatabaseUrl } from './env';
import { restoreDrawnAmounts } from '../lib/reversal';

/** The mistyped venta, and every number this correction depends on. */
const SALE_ID = 30;
const SALE_USDT_SOLD = 209.04;
const SALE_VES_RECEIVED = 200000;
const SALE_USED_TO_PAY_BACKORDERS = 145562.94;

/** The sale whose debt it cleared, and the debt it has to go back to. */
const HEALED_SALE_ID = 29;
const HEALED_DEBT = -145562.94;

/** Enough tolerance for a numeric round trip, nothing more. */
const EPSILON = 0.00000001;

interface Snapshot {
  purchases: { id: string; remaining_usdt: string }[];
  sales: { id: string; remaining_ves: string; used_to_pay_backorders: string }[];
}

/**
 * Everything this correction can move, read straight off the driver as the
 * strings Postgres actually holds. No formatting and no Number(): this is meant
 * to be compared by eye against the database afterwards.
 */
async function snapshot(tx: TransactionSql): Promise<Snapshot> {
  const purchases = await tx<{ id: string; remaining_usdt: string }[]>`
    select id, remaining_usdt from crypto_purchases order by purchased_at, id
  `;
  const sales = await tx<
    { id: string; remaining_ves: string; used_to_pay_backorders: string }[]
  >`
    select id, remaining_ves, used_to_pay_backorders from ves_sales order by sold_at, id
  `;
  return { purchases: [...purchases], sales: [...sales] };
}

function print(label: string, snap: Snapshot): void {
  console.log(`\n--- ${label} ---`);

  console.log('crypto_purchases  (remaining_usdt)');
  for (const p of snap.purchases) {
    console.log(`  id ${p.id}: ${p.remaining_usdt}`);
  }

  console.log('ves_sales  (remaining_ves | used_to_pay_backorders)');
  for (const s of snap.sales) {
    console.log(`  id ${s.id}: ${s.remaining_ves} | ${s.used_to_pay_backorders}`);
  }
}

/** Refuses unless the database is in exactly the state described at the top. */
async function checkTheStateThisScriptWasWrittenFor(tx: TransactionSql): Promise<void> {
  const [sale] = await tx<
    {
      id: string;
      source_type: string;
      usdt_sold: string | null;
      ves_received: string;
      remaining_ves: string;
      used_to_pay_backorders: string;
    }[]
  >`
    select id, source_type, usdt_sold, ves_received, remaining_ves, used_to_pay_backorders
    from ves_sales
    where id = ${SALE_ID}
    for update
  `;
  if (!sale) {
    throw new Error(
      `No existe ves_sales id ${SALE_ID}. Puede que la correccion ya se haya aplicado.`,
    );
  }
  if (sale.source_type !== 'binance') {
    throw new Error(`ves_sales id ${SALE_ID} es '${sale.source_type}' y no una venta de Binance.`);
  }

  const matches = (actual: string | null, expected: number) =>
    actual !== null && Math.abs(Number(actual) - expected) <= EPSILON;

  if (!matches(sale.usdt_sold, SALE_USDT_SOLD)) {
    throw new Error(
      `ves_sales id ${SALE_ID} vendio ${sale.usdt_sold} USDT y no ${SALE_USDT_SOLD}. ` +
        'No es la fila que este script corrige.',
    );
  }
  if (!matches(sale.ves_received, SALE_VES_RECEIVED)) {
    throw new Error(
      `ves_sales id ${SALE_ID} recibio ${sale.ves_received} Bs y no ${SALE_VES_RECEIVED}. ` +
        'No es la fila que este script corrige.',
    );
  }
  if (!matches(sale.used_to_pay_backorders, SALE_USED_TO_PAY_BACKORDERS)) {
    throw new Error(
      `ves_sales id ${SALE_ID} pago ${sale.used_to_pay_backorders} Bs de deuda vieja y no ` +
        `${SALE_USED_TO_PAY_BACKORDERS}. La deuda a reabrir sale de esa cifra.`,
    );
  }
  // What is left on the lot has to be exactly what never went to the old debt.
  if (!matches(sale.remaining_ves, SALE_VES_RECEIVED - SALE_USED_TO_PAY_BACKORDERS)) {
    throw new Error(
      `A ves_sales id ${SALE_ID} le quedan ${sale.remaining_ves} Bs, y deberian quedarle ` +
        `${SALE_VES_RECEIVED - SALE_USED_TO_PAY_BACKORDERS}. Algo mas movio esos bolivares.`,
    );
  }

  // Nothing may have drawn from the row being deleted.
  const [drawnFromSale] = await tx<{ count: string }[]>`
    select count(*) as count from sending_ves_allocations where ves_sale_id = ${SALE_ID}
  `;
  if (Number(drawnFromSale.count) > 0) {
    throw new Error(
      `${drawnFromSale.count} envio(s) ya se pagaron con bolivares de ves_sales id ${SALE_ID}. ` +
        'Borra primero esos envios; este script no los toca.',
    );
  }

  // And it has to still be the newest row, or something happened after it.
  const [{ max_id: newest }] = await tx<{ max_id: string }[]>`
    select max(id) as max_id from ves_sales
  `;
  if (Number(newest) !== SALE_ID) {
    throw new Error(
      `ves_sales id ${newest} es mas reciente que la ${SALE_ID}. Ya hay movimientos posteriores; ` +
        'esta correccion asume que la venta mal registrada es la ultima.',
    );
  }

  // The debt being reopened has to be the one this sale cleared: sale 29 is at
  // zero today, and its own numbers still add up to exactly that debt.
  const [healed] = await tx<
    { remaining_ves: string; ves_received: string; used_to_pay_backorders: string; drawn: string }[]
  >`
    select s.remaining_ves, s.ves_received, s.used_to_pay_backorders,
           coalesce((select sum(a.ves_amount) from sending_ves_allocations a
                     where a.ves_sale_id = s.id), 0) as drawn
    from ves_sales s
    where s.id = ${HEALED_SALE_ID}
    for update
  `;
  if (!healed) throw new Error(`No existe ves_sales id ${HEALED_SALE_ID}.`);
  if (!matches(healed.remaining_ves, 0)) {
    throw new Error(
      `A ves_sales id ${HEALED_SALE_ID} le quedan ${healed.remaining_ves} Bs y deberia estar en ` +
        'cero, que es donde la dejo la venta mal registrada.',
    );
  }
  const reconstructedDebt =
    Number(healed.ves_received) - Number(healed.used_to_pay_backorders) - Number(healed.drawn);
  if (Math.abs(reconstructedDebt - HEALED_DEBT) > EPSILON) {
    throw new Error(
      `La deuda reconstruida de ves_sales id ${HEALED_SALE_ID} es ${reconstructedDebt} Bs y no ` +
        `${HEALED_DEBT}. Los 145.562,94 Bs no fueron solo a esa venta; no sigas a ciegas.`,
    );
  }
}

async function main() {
  const sql = postgres(requireDatabaseUrl(), { max: 1 });

  try {
    const { before, usdtDrawn, after } = await sql.begin(async (tx) => {
      const before = await snapshot(tx);
      await checkTheStateThisScriptWasWrittenFor(tx);

      // 1. Hand the USDT back, through the real reversal and the real trail.
      const usdtDrawn = await tx<{ crypto_purchase_id: string; usdt_amount: string }[]>`
        select crypto_purchase_id, usdt_amount
        from sale_lot_allocations
        where ves_sale_id = ${SALE_ID}
        order by id
      `;
      if (usdtDrawn.length > 0) {
        const usdtLots = await tx<{ id: string; remaining_usdt: string }[]>`
          select id, remaining_usdt from crypto_purchases order by purchased_at, id for update
        `;
        const updates = restoreDrawnAmounts(
          usdtLots.map((l) => ({ id: Number(l.id), remaining: Number(l.remaining_usdt) })),
          usdtDrawn.map((a) => ({
            lotId: Number(a.crypto_purchase_id),
            amount: Number(a.usdt_amount),
          })),
        );
        for (const update of updates) {
          await tx`
            update crypto_purchases set remaining_usdt = ${update.remaining} where id = ${update.id}
          `;
        }
      }

      // 2. Reopen the debt this sale had cleared. Same add-back function, with
      //    the sign flipped: taking 145.562,94 Bs off a lot sitting at zero is
      //    adding -145.562,94 to it.
      const [healedNow] = await tx<{ id: string; remaining_ves: string }[]>`
        select id, remaining_ves from ves_sales where id = ${HEALED_SALE_ID}
      `;
      const [reopened] = restoreDrawnAmounts(
        [{ id: Number(healedNow.id), remaining: Number(healedNow.remaining_ves) }],
        [{ lotId: HEALED_SALE_ID, amount: HEALED_DEBT }],
      );
      await tx`
        update ves_sales set remaining_ves = ${reopened.remaining} where id = ${reopened.id}
      `;

      // 3. Drop the row. sale_lot_allocations cascades, as in deleteVenta.
      await tx`delete from ves_sales where id = ${SALE_ID}`;

      const after = await snapshot(tx);
      return { before, usdtDrawn: [...usdtDrawn], after };
    });

    print('ANTES', before);

    console.log(`\nLo que la venta ${SALE_ID} habia tomado, y por tanto vuelve:`);
    for (const a of usdtDrawn) {
      console.log(
        `  ${a.usdt_amount} USDT -> crypto_purchases id ${a.crypto_purchase_id} (remaining_usdt)`,
      );
    }
    console.log(
      `\nDeuda reabierta en ves_sales id ${HEALED_SALE_ID}: ${HEALED_DEBT} Bs ` +
        '(el pool vuelve a deber lo que debia antes de la venta mal registrada).',
    );

    print('DESPUES', after);

    console.log(
      `\nListo. La venta ${SALE_ID} ya no esta. Registrala otra vez con las cifras correctas.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
