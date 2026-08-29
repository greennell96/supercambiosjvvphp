/**
 * All database access lives here.
 *
 * This file is deliberately thin: it reads rows, hands plain numbers to the
 * pure modules (lib/pricing.ts, lib/fifo.ts), and writes back whatever they
 * return. No money rule is decided in this file, and none is decided in SQL.
 *
 * Every pool a write touches is locked with `for update` inside its transaction,
 * so two writers can never draw the same lot twice.
 */

import type { TransactionSql } from 'postgres';

import { getSql, id, num } from './db';
import { applyIncomingToBackorders, type Lot } from './fifo';
import {
  purchasePriceEurPerUsdt,
  salePriceVesPerUsdt,
  vesToEurPriceVesPerEur,
} from './pools';
import {
  computeDirectPayment,
  computeNewPersonalSending,
  computeNewSending,
  computePoolPayment,
  costUsdtDraw,
  type SendingPayoutMethod,
  type VesLot,
} from './pricing';
import { compraDeletionBlocker, restoreDrawnAmounts, ventaDeletionBlocker } from './reversal';
import { computeSendingSplit } from './splitting';
import type {
  Client,
  ClientPaymentMethod,
  Codigo,
  CryptoPurchase,
  CurrentRates,
  PaidVia,
  Sending,
  StatsSnapshot,
  VesSale,
} from './types';

/* ------------------------------------------------------------------ clients */

/**
 * Every real client, for the pickers and the /clientes screen.
 *
 * The internal placeholder (migration 014) is left out. It exists only so an
 * envio propio has a client_id to point at and so the Cliente column reads
 * "Envío propio"; it is not somebody Jose sends money for, and offering it in
 * the picker would let a real client sending be filed against it by accident.
 */
export async function listClients(): Promise<Client[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: number;
      name: string;
      phone: string | null;
      banks: string[] | null;
      dni_nie: string | null;
      registered_at: Date | null;
    }[]
  >`
    select id, name, phone, banks, dni_nie, registered_at
    from clients
    where is_internal = false
    order by lower(name)
  `;
  return rows.map((r) => ({ ...r, id: id(r.id), banks: r.banks ?? [] }));
}

export async function createClient(input: {
  name: string;
  phone: string | null;
  banks: string[];
  dni_nie: string | null;
}): Promise<number> {
  const sql = getSql();
  const [row] = await sql<{ id: number }[]>`
    insert into clients (name, phone, banks, dni_nie, registered_at)
    values (${input.name}, ${input.phone}, ${input.banks}, ${input.dni_nie}, current_date)
    returning id
  `;
  return id(row.id);
}

export async function updateClient(
  clientId: number,
  input: { name: string; phone: string | null; banks: string[]; dni_nie: string | null },
): Promise<void> {
  const sql = getSql();
  await sql`
    update clients
    set name = ${input.name},
        phone = ${input.phone},
        banks = ${input.banks},
        dni_nie = ${input.dni_nie}
    where id = ${clientId}
  `;
}

/* -------------------------------------------------------------------- rates */

export async function getRates(): Promise<CurrentRates> {
  const sql = getSql();
  const [row] = await sql<{ tasa_eur_ves: string; updated_at: Date }[]>`
    select tasa_eur_ves, updated_at from current_rates where id = 1
  `;
  if (!row) {
    throw new Error('Falta la fila de current_rates. Ejecuta las migraciones (npm run migrate).');
  }
  return { tasa_eur_ves: num(row.tasa_eur_ves), updated_at: row.updated_at };
}

export async function updateRates(tasa: number): Promise<void> {
  const sql = getSql();
  await sql`
    update current_rates
    set tasa_eur_ves = ${tasa}, updated_at = now()
    where id = 1
  `;
}

/* --------------------------------------------------------- crypto purchases */

export async function listPurchases(): Promise<CryptoPurchase[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: number;
      purchased_at: Date;
      eur_paid: string;
      usdt_received: string;
      price_eur_per_usdt: string;
      provider: string | null;
      remaining_usdt: string;
    }[]
  >`
    select id, purchased_at, eur_paid, usdt_received, price_eur_per_usdt, provider, remaining_usdt
    from crypto_purchases
    order by purchased_at desc, id desc
  `;
  return rows.map((r) => ({
    id: id(r.id),
    purchased_at: r.purchased_at,
    eur_paid: num(r.eur_paid),
    usdt_received: num(r.usdt_received),
    price_eur_per_usdt: num(r.price_eur_per_usdt),
    provider: r.provider,
    remaining_usdt: num(r.remaining_usdt),
  }));
}

/*
  Both pools are read two ways, and the difference is only the lock.

  A write path takes them `for update` inside its transaction, so two writers can
  never draw the same lot twice. The envio propio payment PREVIEW takes them
  without one: it writes nothing, and locking rows to answer "what would this
  cost" would block a real payment for the sake of a number on screen.

  The row -> lot mapping is shared between the two, deliberately. It is the part
  that carries real meaning (see the price note below), and two copies of it
  would be two things to keep in step.
*/

type RawUsdtLot = {
  id: number;
  purchased_at: Date;
  price_eur_per_usdt: string;
  remaining_usdt: string;
};

/** The USDT pool, shaped for lib/fifo.ts. price = EUR per USDT. */
function toUsdtLot(r: RawUsdtLot): Lot {
  return {
    id: id(r.id),
    orderMs: r.purchased_at.getTime(),
    price: num(r.price_eur_per_usdt),
    remaining: num(r.remaining_usdt),
  };
}

async function lockUsdtLots(tx: TransactionSql) {
  const rows = await tx<RawUsdtLot[]>`
    select id, purchased_at, price_eur_per_usdt, remaining_usdt
    from crypto_purchases
    order by purchased_at, id
    for update
  `;
  return rows.map(toUsdtLot);
}

/** The same pool, unlocked, for a preview that only reads. */
async function readUsdtLots(): Promise<Lot[]> {
  const sql = getSql();
  const rows = await sql<RawUsdtLot[]>`
    select id, purchased_at, price_eur_per_usdt, remaining_usdt
    from crypto_purchases
    order by purchased_at, id
  `;
  return rows.map(toUsdtLot);
}

type RawVesLot = {
  id: number;
  sold_at: Date;
  source_type: 'binance' | 'ves_to_eur';
  usdt_sold: string | null;
  price_ves_per_usdt: string | null;
  eur_amount: string | null;
  remaining_ves: string;
  ves_received: string;
  eur_cost: string;
};

/**
 * The shared VES pool, shaped for lib/fifo.ts.
 *
 * ves_received and eur_cost travel with each lot because a payout is costed off
 * the source rows it draws from, not off crypto_purchases. Binance rows also
 * carry their original USDT amount for audit attribution; direct VES -> EUR
 * rows carry zero and therefore never appear as USDT consumed by a sending.
 */
function toVesLot(r: RawVesLot): VesLot {
  return {
    id: id(r.id),
    orderMs: r.sold_at.getTime(),
    // drawFifo carries the lot's own source-native rate through its generic
    // Allocation: VES/USDT for Binance, VES/EUR for a direct exchange. The VES
    // payout path does not mix those units; cost and USDT attribution below use
    // the explicit source fields.
    price:
      r.source_type === 'binance'
        ? num(r.price_ves_per_usdt)
        : num(r.ves_received) / num(r.eur_amount),
    remaining: num(r.remaining_ves),
    sourceType: r.source_type,
    usdtSold: num(r.usdt_sold),
    priceVesPerUsdt: r.price_ves_per_usdt === null ? null : num(r.price_ves_per_usdt),
    vesReceived: num(r.ves_received),
    eurCost: num(r.eur_cost),
  };
}

async function lockVesLots(tx: TransactionSql) {
  const rows = await tx<RawVesLot[]>`
    select id, sold_at, source_type, usdt_sold, price_ves_per_usdt, eur_amount,
           remaining_ves, ves_received, eur_cost
    from ves_sales
    order by sold_at, id
    for update
  `;
  return rows.map(toVesLot);
}

/** The same pool, unlocked, for a preview that only reads. */
async function readVesLots(): Promise<VesLot[]> {
  const sql = getSql();
  const rows = await sql<RawVesLot[]>`
    select id, sold_at, source_type, usdt_sold, price_ves_per_usdt, eur_amount,
           remaining_ves, ves_received, eur_cost
    from ves_sales
    order by sold_at, id
  `;
  return rows.map(toVesLot);
}

/**
 * Insert a purchase from the two numbers Jose actually knows: what he paid in
 * EUR and what he got in USDT. The price is derived here, server-side, never
 * taken from the form.
 *
 * If older lots are in the red, this purchase pays those down first (oldest
 * first) and only the leftover becomes the new lot's own remaining_usdt.
 * See applyIncomingToBackorders in lib/fifo.ts.
 */
export async function createPurchase(input: {
  eur_paid: number;
  usdt_received: number;
  provider: string | null;
  purchased_at: Date;
}): Promise<{
  id: number;
  priceEurPerUsdt: number;
  usedToPayBackorders: number;
  remainingForNewLot: number;
}> {
  const sql = getSql();
  const price = purchasePriceEurPerUsdt(input.eur_paid, input.usdt_received);

  return sql.begin(async (tx) => {
    const lots = await lockUsdtLots(tx);
    const applied = applyIncomingToBackorders(lots, input.usdt_received);

    for (const update of applied.lotUpdates) {
      await tx`
        update crypto_purchases set remaining_usdt = ${update.remaining} where id = ${update.id}
      `;
    }

    const [row] = await tx<{ id: number }[]>`
      insert into crypto_purchases
        (purchased_at, eur_paid, usdt_received, price_eur_per_usdt, provider, remaining_usdt,
         used_to_pay_backorders)
      values
        (${input.purchased_at}, ${input.eur_paid}, ${input.usdt_received}, ${price},
         ${input.provider}, ${applied.remainingForNewLot}, ${applied.usedToPayBackorders})
      returning id
    `;

    return {
      id: id(row.id),
      priceEurPerUsdt: price,
      usedToPayBackorders: applied.usedToPayBackorders,
      remainingForNewLot: applied.remainingForNewLot,
    };
  });
}

/**
 * Delete a purchase typed in by mistake.
 *
 * A purchase is the root of the whole chain, so there is nothing upstream to
 * hand anything back to: either it is still exactly as it arrived, and it can
 * just go, or something downstream already lives off it and it cannot. The
 * "already drawn from" test is the allocation trail on both sides — a directly
 * paid sending and a Binance sale each draw this pool — and the refusal names
 * which one to delete first. See compraDeletionBlocker in lib/reversal.ts.
 */
export async function deleteCompra(purchaseId: number): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [purchase] = await tx<
      { remaining_usdt: string; usdt_received: string; used_to_pay_backorders: string }[]
    >`
      select remaining_usdt, usdt_received, used_to_pay_backorders
      from crypto_purchases
      where id = ${purchaseId}
      for update
    `;
    if (!purchase) throw new Error('Compra no encontrada.');

    const [sendingDraws] = await tx<{ count: string }[]>`
      select count(*) as count from sending_lot_allocations
      where crypto_purchase_id = ${purchaseId}
    `;
    const [saleDraws] = await tx<{ count: string }[]>`
      select count(*) as count from sale_lot_allocations
      where crypto_purchase_id = ${purchaseId}
    `;

    const blocker = compraDeletionBlocker({
      sendingAllocations: Number(sendingDraws.count),
      saleAllocations: Number(saleDraws.count),
      remainingUsdt: num(purchase.remaining_usdt),
      usdtReceived: num(purchase.usdt_received),
      usedToPayBackorders: num(purchase.used_to_pay_backorders),
    });
    if (blocker) throw new Error(blocker);

    await tx`delete from crypto_purchases where id = ${purchaseId}`;
  });
}

/* ---------------------------------------------------------------- ves sales */

export async function listVesSales(): Promise<VesSale[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: number;
      sold_at: Date;
      source_type: 'binance' | 'ves_to_eur';
      usdt_sold: string | null;
      ves_received: string;
      price_ves_per_usdt: string | null;
      eur_amount: string | null;
      note: string;
      eur_settled_at: Date | null;
      remaining_ves: string;
    }[]
  >`
    select id, sold_at, source_type, usdt_sold, ves_received, price_ves_per_usdt,
           eur_amount, note, eur_settled_at, remaining_ves
    from ves_sales
    order by sold_at desc, id desc
  `;
  return rows.map((r) => ({
    id: id(r.id),
    sold_at: r.sold_at,
    source_type: r.source_type,
    usdt_sold: r.usdt_sold === null ? null : num(r.usdt_sold),
    ves_received: num(r.ves_received),
    price_ves_per_usdt:
      r.price_ves_per_usdt === null ? null : num(r.price_ves_per_usdt),
    eur_amount: r.eur_amount === null ? null : num(r.eur_amount),
    note: r.note,
    eur_settled_at: r.eur_settled_at,
    remaining_ves: num(r.remaining_ves),
  }));
}

/**
 * Log a Binance sale whose bolivares landed in Jose's own account.
 *
 * Two independent things happen here, in one transaction:
 *
 *   - the bolivares arrive in the VES pool, under exactly the same backorder
 *     rule as createPurchase, on the other pool;
 *   - the USDT leave Binance, so crypto_purchases is drawn for usdt_sold and
 *     what that draw cost is stored on the sale as its cost basis. That is the
 *     only place the USDT pool is charged for pooled bolivares: paying a sending
 *     out of the pool later costs itself off this number.
 */
export async function createVesSale(input: {
  usdt_sold: number;
  ves_received: number;
  sold_at: Date;
}): Promise<{
  id: number;
  usedToPayBackorders: number;
  remainingForNewLot: number;
  eurCost: number;
  usdtShortfall: number;
}> {
  const sql = getSql();
  const price = salePriceVesPerUsdt(input.usdt_sold, input.ves_received);

  return sql.begin(async (tx) => {
    const vesLots = await lockVesLots(tx);
    const usdtLots = await lockUsdtLots(tx);

    const applied = applyIncomingToBackorders(vesLots, input.ves_received);
    const cost = costUsdtDraw(input.usdt_sold, usdtLots);

    for (const update of applied.lotUpdates) {
      await tx`update ves_sales set remaining_ves = ${update.remaining} where id = ${update.id}`;
    }
    for (const update of cost.usdtLotUpdates) {
      await tx`
        update crypto_purchases set remaining_usdt = ${update.remaining} where id = ${update.id}
      `;
    }

    const [row] = await tx<{ id: number }[]>`
      insert into ves_sales
        (sold_at, source_type, usdt_sold, ves_received, price_ves_per_usdt,
         remaining_ves, eur_cost, used_to_pay_backorders)
      values
        (${input.sold_at}, 'binance', ${input.usdt_sold}, ${input.ves_received}, ${price},
         ${applied.remainingForNewLot}, ${cost.costEur}, ${applied.usedToPayBackorders})
      returning id
    `;
    const saleId = id(row.id);

    // After the insert: these rows point at the sale that was just created.
    for (const allocation of cost.usdtAllocations) {
      await tx`
        insert into sale_lot_allocations
          (ves_sale_id, crypto_purchase_id, usdt_amount, price_eur_per_usdt)
        values (${saleId}, ${allocation.lotId}, ${allocation.amount}, ${allocation.price})
      `;
    }

    return {
      id: saleId,
      usedToPayBackorders: applied.usedToPayBackorders,
      remainingForNewLot: applied.remainingForNewLot,
      eurCost: cost.costEur,
      usdtShortfall: cost.usdtShortfall,
    };
  });
}

/**
 * Receive VES in exchange for an agreed EUR amount.
 *
 * The VES joins the same FIFO pool immediately, even when the EUR reminder is
 * still pending. The full agreed EUR amount is its immutable cost basis. No
 * USDT lot is locked, drawn or allocated anywhere in this transaction.
 */
export async function createVesToEur(input: {
  eur_amount: number;
  ves_received: number;
  note: string;
  eur_paid: boolean;
  sold_at: Date;
}): Promise<{
  id: number;
  priceVesPerEur: number;
  usedToPayBackorders: number;
  remainingForNewLot: number;
}> {
  const sql = getSql();
  const price = vesToEurPriceVesPerEur(input.eur_amount, input.ves_received);

  return sql.begin(async (tx) => {
    const vesLots = await lockVesLots(tx);
    const applied = applyIncomingToBackorders(vesLots, input.ves_received);

    for (const update of applied.lotUpdates) {
      await tx`update ves_sales set remaining_ves = ${update.remaining} where id = ${update.id}`;
    }

    const settledAt = input.eur_paid ? input.sold_at : null;
    const [row] = await tx<{ id: number }[]>`
      insert into ves_sales
        (sold_at, source_type, usdt_sold, ves_received, price_ves_per_usdt,
         remaining_ves, eur_cost, used_to_pay_backorders, eur_amount, note, eur_settled_at)
      values
        (${input.sold_at}, 'ves_to_eur', null, ${input.ves_received}, null,
         ${applied.remainingForNewLot}, ${input.eur_amount}, ${applied.usedToPayBackorders},
         ${input.eur_amount}, ${input.note}, ${settledAt})
      returning id
    `;

    return {
      id: id(row.id),
      priceVesPerEur: price,
      usedToPayBackorders: applied.usedToPayBackorders,
      remainingForNewLot: applied.remainingForNewLot,
    };
  });
}

/** Settle only the personal EUR reminder. Inventory and cost never change. */
export async function markVesToEurSettled(saleId: number): Promise<void> {
  const sql = getSql();
  const rows = await sql<{ id: number }[]>`
    update ves_sales
    set eur_settled_at = coalesce(eur_settled_at, now())
    where id = ${saleId} and source_type = 'ves_to_eur'
    returning id
  `;
  if (rows.length === 0) throw new Error('Entrada VES -> EUR no encontrada.');
}

/**
 * Delete a sale typed in by mistake.
 *
 * A sale sits in the middle of the chain, so deleting one has a side it must
 * refuse and a side it must undo:
 *
 *   refuse — if any sending was paid out of these bolivares, or if they are not
 *            all still here, or if the sale itself arrived into a hole and paid
 *            an older sale's debt. See ventaDeletionBlocker in lib/reversal.ts.
 *   undo   — for Binance rows, the USDT this sale gave up. A direct VES -> EUR
 *            row has no USDT allocation and therefore restores none.
 *
 * The sale's own allocation rows go with it: sale_lot_allocations cascades.
 */
export async function deleteVenta(saleId: number): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [sale] = await tx<
      { remaining_ves: string; ves_received: string; used_to_pay_backorders: string }[]
    >`
      select remaining_ves, ves_received, used_to_pay_backorders
      from ves_sales
      where id = ${saleId}
      for update
    `;
    if (!sale) throw new Error('Venta no encontrada.');

    const [sendingDraws] = await tx<{ count: string }[]>`
      select count(*) as count from sending_ves_allocations where ves_sale_id = ${saleId}
    `;

    const blocker = ventaDeletionBlocker({
      sendingAllocations: Number(sendingDraws.count),
      remainingVes: num(sale.remaining_ves),
      vesReceived: num(sale.ves_received),
      usedToPayBackorders: num(sale.used_to_pay_backorders),
    });
    if (blocker) throw new Error(blocker);

    const drawn = await tx<{ crypto_purchase_id: number; usdt_amount: string }[]>`
      select crypto_purchase_id, usdt_amount from sale_lot_allocations where ves_sale_id = ${saleId}
    `;
    if (drawn.length > 0) {
      // Locked only for Binance rows, after the sale itself, matching creation.
      const usdtLots = await lockUsdtLots(tx);
      const updates = restoreDrawnAmounts(
        usdtLots,
        drawn.map((r) => ({ lotId: id(r.crypto_purchase_id), amount: num(r.usdt_amount) })),
      );
      for (const update of updates) {
        await tx`
          update crypto_purchases set remaining_usdt = ${update.remaining} where id = ${update.id}
        `;
      }
    }

    await tx`delete from ves_sales where id = ${saleId}`;
  });
}

/* ----------------------------------------------------------------- sendings */

type RawSending = {
  id: number;
  client_id: number;
  client_name: string;
  created_at: Date;
  is_personal: boolean;
  personal_note: string | null;
  amount_eur: string | null;
  payout_method: string;
  status: 'pending' | 'paid';
  paid_at: Date | null;
  rate_tasa: string | null;
  amount_ves_to_pay: string;
  client_payment_note: string | null;
  client_paid_at: Date | null;
  client_payment_method: ClientPaymentMethod | null;
  paid_via: PaidVia | null;
  fee_applied: boolean | null;
  usdt_used: string | null;
  cost_eur: string | null;
  profit_eur: string | null;
};

/*
  num() turns null into 0, so every nullable numeric has to be null-checked
  BEFORE it is converted — otherwise an envio propio's absent EUR amount would
  come back as 0 and render as "0,00 €" where the lists mean to show a dash.
  Same pattern as usdt_used / cost_eur / profit_eur below.
*/
function toSending(r: RawSending): Sending {
  return {
    id: id(r.id),
    client_id: id(r.client_id),
    client_name: r.client_name,
    created_at: r.created_at,
    is_personal: r.is_personal,
    personal_note: r.personal_note,
    amount_eur: r.amount_eur === null ? null : num(r.amount_eur),
    payout_method: r.payout_method,
    status: r.status,
    paid_at: r.paid_at,
    rate_tasa: r.rate_tasa === null ? null : num(r.rate_tasa),
    amount_ves_to_pay: num(r.amount_ves_to_pay),
    client_payment_note: r.client_payment_note,
    client_paid_at: r.client_paid_at,
    client_payment_method: r.client_payment_method,
    paid_via: r.paid_via,
    fee_applied: r.fee_applied,
    usdt_used: r.usdt_used === null ? null : num(r.usdt_used),
    cost_eur: r.cost_eur === null ? null : num(r.cost_eur),
    profit_eur: r.profit_eur === null ? null : num(r.profit_eur),
  };
}

export async function listSendings(limit = 500): Promise<Sending[]> {
  const sql = getSql();
  const rows = await sql<RawSending[]>`
    select s.id, s.client_id, c.name as client_name, s.created_at,
           s.is_personal, s.personal_note, s.amount_eur,
           s.payout_method, s.status, s.paid_at, s.rate_tasa, s.amount_ves_to_pay,
           s.client_payment_note, s.client_paid_at, s.client_payment_method,
           s.paid_via, s.fee_applied, s.usdt_used, s.cost_eur, s.profit_eur
    from sendings s
    join clients c on c.id = s.client_id
    order by s.created_at desc, s.id desc
    limit ${limit}
  `;
  return rows.map(toSending);
}

export async function listPendingSendings(): Promise<Sending[]> {
  const sql = getSql();
  const rows = await sql<RawSending[]>`
    select s.id, s.client_id, c.name as client_name, s.created_at,
           s.is_personal, s.personal_note, s.amount_eur,
           s.payout_method, s.status, s.paid_at, s.rate_tasa, s.amount_ves_to_pay,
           s.client_payment_note, s.client_paid_at, s.client_payment_method,
           s.paid_via, s.fee_applied, s.usdt_used, s.cost_eur, s.profit_eur
    from sendings s
    join clients c on c.id = s.client_id
    where s.status = 'pending'
    order by s.created_at asc, s.id asc
  `;
  return rows.map(toSending);
}

/**
 * Sendings the client has not paid for yet, whatever their payout status.
 *
 * Feeds the "vincular a un envio abierto" picker on /codigos. Deliberately not
 * narrowed to pending ones: whether Jose has already paid the beneficiary says
 * nothing about whether the client has paid him, and a sending settled days ago
 * is exactly the kind he is still chasing a codigo for.
 *
 * Envios propios are excluded, and permanently: their client_paid_at is null
 * forever because there is no client, so they would otherwise fill this picker
 * up with rows no codigo can ever pay for.
 */
export async function listOpenSendings(): Promise<Sending[]> {
  const sql = getSql();
  const rows = await sql<RawSending[]>`
    select s.id, s.client_id, c.name as client_name, s.created_at,
           s.is_personal, s.personal_note, s.amount_eur,
           s.payout_method, s.status, s.paid_at, s.rate_tasa, s.amount_ves_to_pay,
           s.client_payment_note, s.client_paid_at, s.client_payment_method,
           s.paid_via, s.fee_applied, s.usdt_used, s.cost_eur, s.profit_eur
    from sendings s
    join clients c on c.id = s.client_id
    where s.client_paid_at is null and s.is_personal = false
    order by s.created_at desc, s.id desc
  `;
  return rows.map(toSending);
}

export interface CreateSendingResult {
  id: number;
  clientName: string;
  amountEur: number;
  payoutMethod: string;
  rateTasa: number;
  amountVesToPay: number;
}

/**
 * Log a sending. Creation only records the client-facing side: nothing is drawn
 * from either pool here, because the funding is not decided yet.
 *
 * The tasa comes from the form, not from current_rates. current_rates is then
 * updated to that same value so it prefills the next sending.
 */
export async function createSending(input: {
  client_id: number;
  amount_eur: number;
  rate_tasa: number;
  payout_method: string;
}): Promise<CreateSendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [client] = await tx<{ id: number; name: string }[]>`
      select id, name from clients where id = ${input.client_id}
    `;
    if (!client) throw new Error('Cliente no encontrado.');

    const { amountVesToPay } = computeNewSending({
      amountEur: input.amount_eur,
      rateTasa: input.rate_tasa,
    });

    const [sending] = await tx<{ id: number }[]>`
      insert into sendings
        (client_id, amount_eur, payout_method, rate_tasa, amount_ves_to_pay)
      values
        (${input.client_id}, ${input.amount_eur}, ${input.payout_method},
         ${input.rate_tasa}, ${amountVesToPay})
      returning id
    `;

    // Remember the tasa as the suggestion for next time.
    await tx`
      update current_rates set tasa_eur_ves = ${input.rate_tasa}, updated_at = now() where id = 1
    `;

    return {
      id: id(sending.id),
      clientName: client.name,
      amountEur: input.amount_eur,
      payoutMethod: input.payout_method,
      rateTasa: input.rate_tasa,
      amountVesToPay,
    };
  });
}

/**
 * The placeholder client every envio propio is filed under.
 *
 * sendings.client_id stays NOT NULL so that every read can keep inner-joining
 * clients for the name (see migration 014). Exactly one row carries the flag,
 * guarded by a partial unique index, and migration 014 seeds it — so a missing
 * row means the migrations were not run, not that Jose did something wrong.
 * Defensive assertion, never a normal-path error.
 */
async function getPersonalClientId(tx: TransactionSql): Promise<number> {
  const [client] = await tx<{ id: number }[]>`
    select id from clients where is_internal = true limit 1
  `;
  if (!client) {
    throw new Error(
      'Falta el cliente interno de envios propios. Ejecuta las migraciones (npm run migrate).',
    );
  }
  return id(client.id);
}

export interface CreatePersonalSendingResult {
  id: number;
  payoutMethod: string;
  personalNote: string;
  amountVesToPay: number;
}

/**
 * Log an ENVIO PROPIO: money Jose is sending to his own family.
 *
 * Same shape as createSending and the same nothing-is-drawn-yet rule — the
 * funding is decided when it is paid. Two deliberate differences:
 *
 *   - the bolivares are typed, not derived, so there is no amount_eur and no
 *     rate_tasa to store (see computeNewPersonalSending).
 *   - current_rates is NOT touched. That row is the prefill for the next
 *     client sending's tasa input, and no tasa was agreed here, so writing to
 *     it would mean a family transfer silently moving the suggested rate.
 */
export async function createPersonalSending(input: {
  amount_ves: number;
  payout_method: string;
  personal_note: string;
}): Promise<CreatePersonalSendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const clientId = await getPersonalClientId(tx);

    const { amountVesToPay } = computeNewPersonalSending({ amountVes: input.amount_ves });

    const [sending] = await tx<{ id: number }[]>`
      insert into sendings
        (client_id, is_personal, personal_note, payout_method, amount_ves_to_pay)
      values
        (${clientId}, true, ${input.personal_note}, ${input.payout_method}, ${amountVesToPay})
      returning id
    `;

    return {
      id: id(sending.id),
      payoutMethod: input.payout_method,
      personalNote: input.personal_note,
      amountVesToPay,
    };
  });
}

/**
 * The money fields, in the shape the sending actually has.
 *
 * Two variants rather than two functions: the lock, the pending-only rule and
 * the result are identical for both, and only the lines that recompute and write
 * differ. The kind is checked against the locked row, so a client sending can
 * never be edited through the personal form or the other way round.
 *
 * Only what actually fed the draw is in here. personal_note describes who
 * received the money and decides nothing, so it sits outside, beside
 * client_payment_note, and stays editable after payment.
 */
export type EditSendingMoney =
  | { kind: 'client'; amount_eur: number; rate_tasa: number; payout_method: string }
  | { kind: 'personal'; amount_ves: number; payout_method: string };

export interface EditSendingInput {
  /**
   * The money fields. Only accepted while the sending is still pending: once it
   * is paid, the pool draws and the cost/profit are locked in, so changing these
   * would desync the ledger. Pass null to edit only the note.
   */
  money: EditSendingMoney | null;
  /**
   * Always editable on a client sending, whatever the status. Never feeds a
   * calculation. Not written on an envio propio: no client ever paid for one, so
   * there is nothing for this column to say about it.
   */
  client_payment_note: string | null;
  /**
   * The other side's equivalent: who Jose sent his own money to. Same category
   * as client_payment_note — descriptive, never part of any sum — so it is
   * editable in every status too. Fixing a typo in the only record of who
   * received the money must not stop being possible the moment it is paid.
   *
   * Required whenever the row is an envio propio, because the schema says so:
   * personal_note is not null when is_personal.
   */
  personal_note: string | null;
}

export interface EditSendingResult {
  id: number;
  clientName: string;
  status: 'pending' | 'paid';
  moneyChanged: boolean;
  amountVesToPay: number;
}

/**
 * Correct a sending by hand.
 *
 * The money fields are recomputed exactly the way creation does, through
 * computeNewSending (or computeNewPersonalSending), so amount_ves_to_pay can
 * never drift from what the inputs say. The status is read from the locked row,
 * not trusted from the form, so a sending that got paid in the meantime cannot
 * have its money quietly rewritten — and so is is_personal, so neither kind can
 * be edited through the other's form.
 *
 * Reassigning the client is deliberately not supported.
 */
export async function editSending(
  sendingId: number,
  input: EditSendingInput,
): Promise<EditSendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [row] = await tx<
      {
        id: number;
        client_name: string;
        status: 'pending' | 'paid';
        is_personal: boolean;
        amount_ves_to_pay: string;
      }[]
    >`
      select s.id, c.name as client_name, s.status, s.is_personal, s.amount_ves_to_pay
      from sendings s
      join clients c on c.id = s.client_id
      where s.id = ${sendingId}
      for update of s
    `;
    if (!row) throw new Error('Envio no encontrado.');

    if (input.money && row.status !== 'pending') {
      throw new Error(
        'Ese envio ya esta pagado: el monto, la tasa y el metodo no se pueden cambiar. Solo la nota.',
      );
    }
    if (input.money && (input.money.kind === 'personal') !== row.is_personal) {
      throw new Error(
        'Ese envio no es del tipo que el formulario esta editando. Actualiza la pagina.',
      );
    }
    // The schema requires it on these rows, and it is the only record of who the
    // money went to. Caught here rather than left to the check constraint, so a
    // blank box says what to do instead of surfacing a Postgres error.
    if (row.is_personal && !input.personal_note) {
      throw new Error('Escribe a quien le enviaste el dinero.');
    }

    // Nothing but the note. Which note depends on the kind: an envio propio has
    // no client payment to describe, and a client sending has no beneficiary
    // note. Both are descriptive, so both are writable whatever the status.
    if (!input.money) {
      if (row.is_personal) {
        await tx`
          update sendings set personal_note = ${input.personal_note} where id = ${sendingId}
        `;
      } else {
        await tx`
          update sendings set client_payment_note = ${input.client_payment_note} where id = ${sendingId}
        `;
      }
      return {
        id: sendingId,
        clientName: row.client_name,
        status: row.status,
        moneyChanged: false,
        amountVesToPay: num(row.amount_ves_to_pay),
      };
    }

    if (input.money.kind === 'personal') {
      const { amountVesToPay } = computeNewPersonalSending({ amountVes: input.money.amount_ves });

      // The note rides along on the same submit, exactly as client_payment_note
      // does on the client branch below.
      await tx`
        update sendings
        set payout_method = ${input.money.payout_method},
            personal_note = ${input.personal_note},
            amount_ves_to_pay = ${amountVesToPay}
        where id = ${sendingId}
      `;

      return {
        id: sendingId,
        clientName: row.client_name,
        status: row.status,
        moneyChanged: true,
        amountVesToPay,
      };
    }

    const { amountVesToPay } = computeNewSending({
      amountEur: input.money.amount_eur,
      rateTasa: input.money.rate_tasa,
    });

    await tx`
      update sendings
      set amount_eur = ${input.money.amount_eur},
          rate_tasa = ${input.money.rate_tasa},
          payout_method = ${input.money.payout_method},
          amount_ves_to_pay = ${amountVesToPay},
          client_payment_note = ${input.client_payment_note}
      where id = ${sendingId}
    `;

    return {
      id: sendingId,
      clientName: row.client_name,
      status: row.status,
      moneyChanged: true,
      amountVesToPay,
    };
  });
}

export interface SplitSendingResult {
  /** The row that was divided, as it now stands. */
  id: number;
  clientName: string;
  remainderEur: number;
  remainderVesToPay: number;
  /** The row that was created out of it. */
  newId: number;
  splitEur: number;
  splitVesToPay: number;
  payoutMethod: SendingPayoutMethod;
}

/**
 * Divide a pending client sending into itself plus a new, independent one.
 *
 * One transaction and one lock: the row is read `for update`, so its amount_eur
 * cannot move between the check and the write and two divisions of the same
 * sending can never both peel off the same euros. That lock is also what makes
 * dividing the same row repeatedly correct — the second call reads whatever the
 * first one left, not the amount the page happened to be showing.
 *
 * Every rule about WHAT may be divided and into what lives in lib/splitting.ts;
 * this function locks, calls it, and writes back the two shapes it returns. No
 * pool is drawn and no cost is recognised: both rows come out pending, and the
 * existing payment code settles each of them exactly as it settles any other.
 */
export async function splitSending(
  sendingId: number,
  amountEur: number,
  payoutMethod: SendingPayoutMethod,
): Promise<SplitSendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [row] = await tx<
      {
        id: number;
        client_id: number;
        client_name: string;
        status: 'pending' | 'paid';
        is_personal: boolean;
        amount_eur: string | null;
        rate_tasa: string | null;
        client_paid_at: Date | null;
        client_payment_method: ClientPaymentMethod | null;
        client_payment_note: string | null;
      }[]
    >`
      select s.id, s.client_id, c.name as client_name, s.status, s.is_personal,
             s.amount_eur, s.rate_tasa,
             s.client_paid_at, s.client_payment_method, s.client_payment_note
      from sendings s
      join clients c on c.id = s.client_id
      where s.id = ${sendingId}
      for update of s
    `;
    if (!row) throw new Error('Envio no encontrado.');

    // num() turns null into 0, so both nullable numerics are null-checked before
    // they are converted — an envio propio has to reach computeSendingSplit as
    // null, not as a zero that would read like a real amount.
    const { original, created } = computeSendingSplit({
      sending: {
        client_id: id(row.client_id),
        is_personal: row.is_personal,
        status: row.status,
        amount_eur: row.amount_eur === null ? null : num(row.amount_eur),
        rate_tasa: row.rate_tasa === null ? null : num(row.rate_tasa),
        client_paid_at: row.client_paid_at,
        client_payment_method: row.client_payment_method,
        client_payment_note: row.client_payment_note,
      },
      amountEur,
      payoutMethod,
    });

    // Only the two money columns move. The tasa, the método, the codigo linked to
    // this row and both client-payment columns are all left exactly as they were.
    await tx`
      update sendings
      set amount_eur = ${original.amountEur},
          amount_ves_to_pay = ${original.amountVesToPay}
      where id = ${sendingId}
    `;

    // Written out in full rather than leaning on the column defaults, because
    // this is the row that has to satisfy sendings_kind_shape_check: both money
    // fields present, is_personal false, personal_note null.
    const [inserted] = await tx<{ id: number }[]>`
      insert into sendings
        (client_id, amount_eur, rate_tasa, amount_ves_to_pay, payout_method, status,
         is_personal, personal_note,
         client_paid_at, client_payment_method, client_payment_note)
      values
        (${created.clientId}, ${created.amountEur}, ${created.rateTasa},
         ${created.amountVesToPay}, ${created.payoutMethod}, ${created.status},
         ${created.isPersonal}, ${created.personalNote},
         ${created.clientPaidAt}, ${created.clientPaymentMethod}, ${created.clientPaymentNote})
      returning id
    `;

    return {
      id: sendingId,
      clientName: row.client_name,
      remainderEur: original.amountEur,
      remainderVesToPay: original.amountVesToPay,
      newId: id(inserted.id),
      splitEur: created.amountEur,
      splitVesToPay: created.amountVesToPay,
      payoutMethod: created.payoutMethod,
    };
  });
}

export interface PaySendingResult {
  id: number;
  clientName: string;
  paidVia: PaidVia;
  /** Null on an envio propio: no client agreed an amount. */
  amountEur: number | null;
  amountVesToPay: number;
  feeApplied: boolean;
  vesDrawn: number;
  vesShortfall: number;
  usdtUsed: number;
  /** Only a direct payment can run the USDT pool short; the pool path reports 0. */
  usdtShortfall: number;
  costEur: number;
  /** Null on an envio propio: there is no agreed price, so no margin. */
  profitEur: number | null;
}

type PendingRow = {
  id: number;
  client_name: string;
  amount_eur: string | null;
  amount_ves_to_pay: string;
  payout_method: string;
};

/** Lock the sending and refuse if it is already paid. */
async function lockPendingSending(
  tx: TransactionSql,
  sendingId: number,
): Promise<PendingRow> {
  const [row] = await tx<PendingRow[]>`
    select s.id, c.name as client_name, s.amount_eur, s.amount_ves_to_pay, s.payout_method
    from sendings s
    join clients c on c.id = s.client_id
    where s.id = ${sendingId} and s.status = 'pending'
    for update of s
  `;
  if (!row) throw new Error('Ese envio ya no esta pendiente.');
  return row;
}

/**
 * What the sending says it is worth in EUR, or null when it says nothing.
 *
 * num() would turn the null into 0 and hand computePoolPayment a zero revenue,
 * which would come back as a real-looking loss of exactly the cost. Both pay
 * paths read the amount through here.
 */
function pendingAmountEur(row: PendingRow): number | null {
  return row.amount_eur === null ? null : num(row.amount_eur);
}

/**
 * (a) Pay a pending sending out of the VES pool.
 *
 * One pool only. The bolivares come out of ves_sales, and the cost comes off
 * those same sales: each already drew crypto_purchases for its USDT when it was
 * logged (see createVesSale), so drawing the USDT pool here too would spend the
 * same USDT twice.
 */
export async function paySendingFromPool(sendingId: number): Promise<PaySendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const sending = await lockPendingSending(tx, sendingId);

    const vesLots = await lockVesLots(tx);

    const payment = computePoolPayment({
      amountEur: pendingAmountEur(sending),
      amountVesToPay: num(sending.amount_ves_to_pay),
      payoutMethod: sending.payout_method,
      vesLots,
    });

    const vesLotsById = new Map(vesLots.map((lot) => [lot.id, lot]));

    for (const allocation of payment.vesAllocations) {
      const sourceLot = vesLotsById.get(allocation.lotId);
      if (!sourceLot) throw new Error('No se encontro el origen de una asignacion VES.');
      await tx`
        insert into sending_ves_allocations
          (sending_id, ves_sale_id, ves_amount, price_ves_per_usdt)
        values
          (${sendingId}, ${allocation.lotId}, ${allocation.amount},
           ${sourceLot.priceVesPerUsdt})
      `;
    }
    for (const update of payment.vesLotUpdates) {
      await tx`update ves_sales set remaining_ves = ${update.remaining} where id = ${update.id}`;
    }

    await tx`
      update sendings
      set status = 'paid',
          paid_at = now(),
          paid_via = 'pool',
          fee_applied = ${payment.feeApplied},
          usdt_used = ${payment.usdtUsed},
          cost_eur = ${payment.costEur},
          profit_eur = ${payment.profitEur}
      where id = ${sendingId}
    `;

    return {
      id: sendingId,
      clientName: sending.client_name,
      paidVia: 'pool',
      amountEur: pendingAmountEur(sending),
      amountVesToPay: num(sending.amount_ves_to_pay),
      feeApplied: payment.feeApplied,
      vesDrawn: payment.vesDrawn,
      vesShortfall: payment.vesShortfall,
      usdtUsed: payment.usdtUsed,
      usdtShortfall: 0, // never short here: this path does not draw the USDT pool
      costEur: payment.costEur,
      profitEur: payment.profitEur,
    };
  });
}

/**
 * (b) Pay a pending sending by selling USDT straight into the beneficiary's
 * account. The bolivares never enter the pool, so nothing is drawn from
 * ves_sales and no row is added to it.
 *
 * These USDT leave Binance here, so this is the one payment path that still
 * draws crypto_purchases — and therefore the only one that writes
 * sending_lot_allocations.
 */
export async function paySendingDirect(
  sendingId: number,
  usdtSold: number,
): Promise<PaySendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const sending = await lockPendingSending(tx, sendingId);
    const usdtLots = await lockUsdtLots(tx);

    const payment = computeDirectPayment({
      amountEur: pendingAmountEur(sending),
      usdtSold,
      usdtLots,
    });

    for (const allocation of payment.usdtAllocations) {
      await tx`
        insert into sending_lot_allocations
          (sending_id, crypto_purchase_id, usdt_amount, price_eur_per_usdt)
        values (${sendingId}, ${allocation.lotId}, ${allocation.amount}, ${allocation.price})
      `;
    }
    for (const update of payment.usdtLotUpdates) {
      await tx`
        update crypto_purchases set remaining_usdt = ${update.remaining} where id = ${update.id}
      `;
    }

    await tx`
      update sendings
      set status = 'paid',
          paid_at = now(),
          paid_via = 'direct',
          fee_applied = ${payment.feeApplied},
          usdt_used = ${payment.usdtUsed},
          cost_eur = ${payment.costEur},
          profit_eur = ${payment.profitEur}
      where id = ${sendingId}
    `;

    return {
      id: sendingId,
      clientName: sending.client_name,
      paidVia: 'direct',
      amountEur: pendingAmountEur(sending),
      amountVesToPay: num(sending.amount_ves_to_pay),
      feeApplied: payment.feeApplied,
      vesDrawn: 0,
      vesShortfall: 0,
      usdtUsed: payment.usdtUsed,
      usdtShortfall: payment.usdtShortfall,
      costEur: payment.costEur,
      profitEur: payment.profitEur,
    };
  });
}

/* ------------------------------------------------- what paying would cost */

/**
 * What a payment WOULD do, without doing any of it.
 *
 * An envio propio has no agreed EUR amount, so unlike a client sending nothing
 * on screen says what it is about to cost until it is already paid — and by then
 * the pools have moved. This answers that question first.
 *
 * It is only a read. computePoolPayment and computeDirectPayment are pure: they
 * take the lots and hand back numbers, and it is paySendingFromPool /
 * paySendingDirect that write the allocations and the sending row. So running
 * the very same function over the very same pools, and writing nothing, gives
 * exactly the figures the real payment would produce against the pools as they
 * stand right now.
 *
 * Deliberately personal-only, guarded below rather than left to the caller: a
 * client sending already shows its EUR amount and tasa on the row, and adding a
 * confirm step to its one-click payment would slow down the batch work this app
 * exists to make fast.
 */
export interface PayPreview {
  feeApplied: boolean;
  usdtUsed: number;
  costEur: number;
  /** Bolivares the VES pool cannot cover. Always 0 on the direct path. */
  vesShortfall: number;
  /** USDT the crypto pool cannot cover. Always 0 on the pool path. */
  usdtShortfall: number;
}

type PreviewRow = PendingRow & { is_personal: boolean };

/**
 * The sending a preview is about, read without a lock and refused unless it is
 * a pending envio propio. Defense in depth: the list only offers the preview on
 * those rows, the same way markClientPaid is only offered on the others.
 */
async function readPendingPersonalSending(sendingId: number): Promise<PreviewRow> {
  const sql = getSql();
  const [row] = await sql<PreviewRow[]>`
    select s.id, c.name as client_name, s.amount_eur, s.amount_ves_to_pay,
           s.payout_method, s.is_personal
    from sendings s
    join clients c on c.id = s.client_id
    where s.id = ${sendingId} and s.status = 'pending'
  `;
  if (!row) throw new Error('Ese envio ya no esta pendiente.');
  if (!row.is_personal) {
    throw new Error('La vista previa de coste solo existe para los envios propios.');
  }
  return row;
}

/** (a) What paying it out of the VES pool would cost, right now. */
export async function previewPoolPayment(sendingId: number): Promise<PayPreview> {
  const sending = await readPendingPersonalSending(sendingId);
  const vesLots = await readVesLots();

  const payment = computePoolPayment({
    // Always null here, and that is the point: no agreed amount means no profit
    // line to show, only what it costs.
    amountEur: pendingAmountEur(sending),
    amountVesToPay: num(sending.amount_ves_to_pay),
    payoutMethod: sending.payout_method,
    vesLots,
  });

  return {
    feeApplied: payment.feeApplied,
    usdtUsed: payment.usdtUsed,
    costEur: payment.costEur,
    vesShortfall: payment.vesShortfall,
    usdtShortfall: 0,
  };
}

/** (b) What selling `usdtSold` straight into the account would cost, right now. */
export async function previewDirectPayment(
  sendingId: number,
  usdtSold: number,
): Promise<PayPreview> {
  const sending = await readPendingPersonalSending(sendingId);
  const usdtLots = await readUsdtLots();

  const payment = computeDirectPayment({
    amountEur: pendingAmountEur(sending),
    usdtSold,
    usdtLots,
  });

  return {
    feeApplied: payment.feeApplied,
    usdtUsed: payment.usdtUsed,
    costEur: payment.costEur,
    vesShortfall: 0,
    usdtShortfall: payment.usdtShortfall,
  };
}

export interface MarkClientPaidInput {
  method: ClientPaymentMethod;
  /** Only offered for 'CODIGO', and optional even there. */
  codigo_id: number | null;
  /** Only offered for 'OTRO', and never required. Goes into client_payment_note. */
  note: string | null;
}

export interface MarkClientPaidResult {
  id: number;
  clientName: string;
  method: ClientPaymentMethod;
  linkedCodigoId: number | null;
}

/**
 * (c) Record that the CLIENT paid Jose for this sending.
 *
 * Nothing to do with (a) and (b) above, which settle the other side of the same
 * row — Jose paying the beneficiary. This one draws no pool, costs nothing and
 * changes no total; it only says the money arrived here in Spain.
 *
 * Both extras are optional, and each belongs to exactly one method:
 *
 *   CODIGO — a codigo can be pointed at this sending, or not. It is re-read
 *            under a lock and refused if something linked it since the page was
 *            rendered, because a codigo belongs to one sending and silently
 *            taking it off another would leave that one claiming a proof it no
 *            longer has.
 *   OTRO   — the free text, written into client_payment_note. Only written when
 *            something was typed: a blank box means "nothing to add", never
 *            "erase the note Jose already left there".
 */
export async function markClientPaid(
  sendingId: number,
  input: MarkClientPaidInput,
): Promise<MarkClientPaidResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [sending] = await tx<{ id: number; client_name: string; is_personal: boolean }[]>`
      select s.id, c.name as client_name, s.is_personal
      from sendings s
      join clients c on c.id = s.client_id
      where s.id = ${sendingId} and s.client_paid_at is null
      for update of s
    `;
    if (!sending) throw new Error('Ese envio ya figura como pagado por el cliente.');
    // An envio propio has no client and therefore no debt to collect. The list
    // never offers this action for one; this is the guard that makes that true
    // rather than merely observed, like the pending check in lockPendingSending.
    if (sending.is_personal) {
      throw new Error('Ese envio es propio: no tiene cliente que pague.');
    }

    if (input.codigo_id !== null) {
      const [codigo] = await tx<{ id: number; sending_id: number | null }[]>`
        select id, sending_id from codigos where id = ${input.codigo_id} for update
      `;
      if (!codigo) throw new Error('Ese codigo ya no existe.');
      if (codigo.sending_id !== null) {
        throw new Error('Ese codigo ya esta vinculado a otro envio. Actualiza la pagina.');
      }
      await tx`update codigos set sending_id = ${sendingId} where id = ${input.codigo_id}`;
    }

    await tx`
      update sendings
      set client_paid_at = now(), client_payment_method = ${input.method}
      where id = ${sendingId}
    `;

    if (input.note !== null) {
      await tx`
        update sendings set client_payment_note = ${input.note} where id = ${sendingId}
      `;
    }

    return {
      id: sendingId,
      clientName: sending.client_name,
      method: input.method,
      linkedCodigoId: input.codigo_id,
    };
  });
}

/**
 * Delete a sending, and give back whatever it took.
 *
 * A sending is a leaf: nothing in the schema points at it except its own two
 * allocation trails, which cascade. So this never refuses. What it has to get
 * right is the give-back.
 *
 * Which pool that is, is read off the trails and NOT off paid_via. Today the two
 * line up exactly — 'pool' writes sending_ves_allocations, 'direct' writes
 * sending_lot_allocations, pending writes neither — but a sending paid out of
 * the pool before migration 010 also drew crypto_purchases, and its rows are
 * still sitting in sending_lot_allocations. Handing back exactly what each trail
 * records is right for both, and needs no special case for either. A trail with
 * no rows costs one select and does not lock its pool.
 *
 * One consequence is worth naming: if this sending had pushed a lot negative and
 * a later purchase or sale has since paid that backorder down, the amount handed
 * back lands on the old lot even though what covered it came from the newer one.
 * The pool total comes out exactly right either way; only the FIFO age of that
 * one leftover drifts. Refusing instead would mean a real payout could never be
 * corrected once the pool caught up, which is the worse of the two.
 *
 * Split from deleteSending so the one-off cleanup script can run it inside its
 * own transaction, alongside other corrections. The app always calls
 * deleteSending.
 */
export async function deleteSendingInTx(tx: TransactionSql, sendingId: number): Promise<void> {
  const [sending] = await tx<{ id: number }[]>`
    select id from sendings where id = ${sendingId} for update
  `;
  if (!sending) throw new Error('Envio no encontrado.');

  const vesDrawn = await tx<{ ves_sale_id: number; ves_amount: string }[]>`
    select ves_sale_id, ves_amount from sending_ves_allocations where sending_id = ${sendingId}
  `;
  if (vesDrawn.length > 0) {
    const vesLots = await lockVesLots(tx);
    const updates = restoreDrawnAmounts(
      vesLots,
      vesDrawn.map((r) => ({ lotId: id(r.ves_sale_id), amount: num(r.ves_amount) })),
    );
    for (const update of updates) {
      await tx`update ves_sales set remaining_ves = ${update.remaining} where id = ${update.id}`;
    }
  }

  const usdtDrawn = await tx<{ crypto_purchase_id: number; usdt_amount: string }[]>`
    select crypto_purchase_id, usdt_amount
    from sending_lot_allocations
    where sending_id = ${sendingId}
  `;
  if (usdtDrawn.length > 0) {
    // Locked after the VES pool, the same order createVesSale takes them in.
    const usdtLots = await lockUsdtLots(tx);
    const updates = restoreDrawnAmounts(
      usdtLots,
      usdtDrawn.map((r) => ({ lotId: id(r.crypto_purchase_id), amount: num(r.usdt_amount) })),
    );
    for (const update of updates) {
      await tx`
        update crypto_purchases set remaining_usdt = ${update.remaining} where id = ${update.id}
      `;
    }
  }

  // sending_ves_allocations and sending_lot_allocations both cascade from here.
  await tx`delete from sendings where id = ${sendingId}`;
}

export async function deleteSending(sendingId: number): Promise<void> {
  const sql = getSql();
  await sql.begin((tx) => deleteSendingInTx(tx, sendingId));
}

/* ------------------------------------------------------------------ codigos */

type RawCodigo = {
  id: number;
  client_id: number;
  client_name: string;
  client_dni_nie: string | null;
  client_phone: string | null;
  code: string;
  amount: string;
  bank: string;
  status: 'pendiente' | 'retirado';
  created_at: Date;
  retired_at: Date | null;
  sending_id: number | null;
  sending_client_name: string | null;
  sending_amount_eur: string | null;
  sending_rate_tasa: string | null;
  sending_amount_ves_to_pay: string | null;
  sending_payout_method: string | null;
  sending_status: 'pending' | 'paid' | null;
};

/*
  The joined sending columns the three queries below all select are display only:
  /codigos shows the linked sending inline instead of naming its client twice,
  and nothing is calculated from them.
*/
function toCodigo(r: RawCodigo): Codigo {
  return {
    ...r,
    id: id(r.id),
    client_id: id(r.client_id),
    amount: num(r.amount),
    sending_id: r.sending_id === null ? null : id(r.sending_id),
    sending_amount_eur: r.sending_amount_eur === null ? null : num(r.sending_amount_eur),
    sending_rate_tasa: r.sending_rate_tasa === null ? null : num(r.sending_rate_tasa),
    sending_amount_ves_to_pay:
      r.sending_amount_ves_to_pay === null ? null : num(r.sending_amount_ves_to_pay),
  };
}

export async function listCodigos(limit = 500): Promise<Codigo[]> {
  const sql = getSql();
  const rows = await sql<RawCodigo[]>`
    select g.id, g.client_id, c.name as client_name, c.dni_nie as client_dni_nie,
           c.phone as client_phone,
           g.code, g.amount, g.bank, g.status, g.created_at, g.retired_at,
           g.sending_id, sc.name as sending_client_name, s.amount_eur as sending_amount_eur,
           s.rate_tasa as sending_rate_tasa, s.amount_ves_to_pay as sending_amount_ves_to_pay,
           s.payout_method as sending_payout_method, s.status as sending_status
    from codigos g
    join clients c on c.id = g.client_id
    left join sendings s on s.id = g.sending_id
    left join clients sc on sc.id = s.client_id
    order by g.created_at desc, g.id desc
    limit ${limit}
  `;
  return rows.map(toCodigo);
}

export async function listPendingCodigos(): Promise<Codigo[]> {
  const sql = getSql();
  const rows = await sql<RawCodigo[]>`
    select g.id, g.client_id, c.name as client_name, c.dni_nie as client_dni_nie,
           c.phone as client_phone,
           g.code, g.amount, g.bank, g.status, g.created_at, g.retired_at,
           g.sending_id, sc.name as sending_client_name, s.amount_eur as sending_amount_eur,
           s.rate_tasa as sending_rate_tasa, s.amount_ves_to_pay as sending_amount_ves_to_pay,
           s.payout_method as sending_payout_method, s.status as sending_status
    from codigos g
    join clients c on c.id = g.client_id
    left join sendings s on s.id = g.sending_id
    left join clients sc on sc.id = s.client_id
    where g.status = 'pendiente'
    order by g.created_at asc, g.id asc
  `;
  return rows.map(toCodigo);
}

/**
 * Codigos not yet pointed at any sending: what the "Cliente pago" picker on
 * /envios offers, for every client at once.
 *
 * Unlike the picker on /codigos this one is deliberately not scoped to a client
 * — a codigo may well have been issued under a relative's name — so the ordering
 * is what makes it usable. See codigosForSending in lib/linking.ts.
 *
 * Status is not a filter either: a codigo the client already withdrew is still
 * the proof he paid, and often the reason Jose is settling the sending now.
 */
export async function listUnlinkedCodigos(): Promise<Codigo[]> {
  const sql = getSql();
  const rows = await sql<RawCodigo[]>`
    select g.id, g.client_id, c.name as client_name, c.dni_nie as client_dni_nie,
           c.phone as client_phone,
           g.code, g.amount, g.bank, g.status, g.created_at, g.retired_at,
           g.sending_id, sc.name as sending_client_name, s.amount_eur as sending_amount_eur,
           s.rate_tasa as sending_rate_tasa, s.amount_ves_to_pay as sending_amount_ves_to_pay,
           s.payout_method as sending_payout_method, s.status as sending_status
    from codigos g
    join clients c on c.id = g.client_id
    left join sendings s on s.id = g.sending_id
    left join clients sc on sc.id = s.client_id
    where g.sending_id is null
    order by g.created_at desc, g.id desc
  `;
  return rows.map(toCodigo);
}

/**
 * Register a codigo, and — when Jose linked it to an open sending — settle that
 * sending's client side in the same breath.
 *
 * That link is the whole reason this needs a transaction. A linked codigo IS the
 * client's proof of payment, so writing the link without writing
 * client_paid_at, or the other way round, would leave the two halves of one fact
 * disagreeing.
 *
 * The sending is re-read under a lock instead of being trusted from the form:
 * it may have been settled from /envios since this page was rendered. The client
 * is checked too, because this end of the link only ever offers that client's
 * own sendings — the other end, markClientPaid, is the one that may cross
 * clients, and it is asked in a situation where that is the right answer.
 */
export async function createCodigo(input: {
  client_id: number;
  code: string;
  amount: number;
  bank: string;
  /** The open sending this codigo pays for, or null to leave it unlinked. */
  sending_id: number | null;
}): Promise<number> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    if (input.sending_id !== null) {
      const [sending] = await tx<{ id: number; client_id: number; client_paid_at: Date | null }[]>`
        select id, client_id, client_paid_at from sendings where id = ${input.sending_id} for update
      `;
      if (!sending) throw new Error('Ese envio ya no existe.');
      if (id(sending.client_id) !== input.client_id) {
        throw new Error('Ese envio es de otro cliente. Elige uno del mismo cliente del codigo.');
      }
      if (sending.client_paid_at !== null) {
        throw new Error('Ese envio ya figura como pagado por el cliente.');
      }
    }

    const [row] = await tx<{ id: number }[]>`
      insert into codigos (client_id, code, amount, bank, sending_id)
      values (${input.client_id}, ${input.code}, ${input.amount}, ${input.bank},
              ${input.sending_id})
      returning id
    `;

    if (input.sending_id !== null) {
      await tx`
        update sendings
        set client_paid_at = now(), client_payment_method = 'CODIGO'
        where id = ${input.sending_id}
      `;
    }

    return id(row.id);
  });
}

export async function markCodigoRetirado(codigoId: number): Promise<void> {
  const sql = getSql();
  await sql`
    update codigos
    set status = 'retirado', retired_at = now()
    where id = ${codigoId} and status = 'pendiente'
  `;
}

/**
 * Delete a codigo, and un-prove whatever it was proving.
 *
 * A codigo still touches neither pool, so there is nothing to hand back and
 * nothing to refuse: no money moves here and this never says no. What a codigo
 * can be is a client's proof of payment — a linked one is the entire reason its
 * sending says the client paid. Deleting the proof has to take the claim with
 * it, so the sending goes back to unpaid-by-client and reappears in both
 * pickers. Hence the transaction this did not need before.
 *
 * client_payment_note is deliberately left alone, whatever the method was. It is
 * Jose's own free-text reminder, it feeds nothing, and it is not this codigo's
 * to erase.
 */
export async function deleteCodigo(codigoId: number): Promise<void> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    const [codigo] = await tx<{ id: number; sending_id: number | null }[]>`
      select id, sending_id from codigos where id = ${codigoId} for update
    `;
    if (!codigo) throw new Error('Codigo no encontrado.');

    if (codigo.sending_id !== null) {
      await tx`
        update sendings
        set client_paid_at = null, client_payment_method = null
        where id = ${codigo.sending_id}
      `;
    }

    await tx`delete from codigos where id = ${codigoId}`;
  });
}

/* ---------------------------------------------------------------- dashboard */

export interface DashboardTotals {
  /** Sum of remaining_usdt across every purchase. Negative means USDT is owed. */
  cryptoBalanceUsdt: number;
  /** Sum of remaining_ves across every sale: the bolivares actually on hand. */
  vesPoolBalance: number;
  /** Sum of amount_ves_to_pay for sendings still pending: what is still owed. */
  bolivaresPendientes: number;
  pendingSendingsCount: number;
  pendingCodigosCount: number;
}

export async function getDashboardTotals(): Promise<DashboardTotals> {
  const sql = getSql();
  const [crypto] = await sql<{ balance: string }[]>`
    select coalesce(sum(remaining_usdt), 0) as balance from crypto_purchases
  `;
  const [ves] = await sql<{ balance: string }[]>`
    select coalesce(sum(remaining_ves), 0) as balance from ves_sales
  `;
  const [pending] = await sql<{ total: string; count: string }[]>`
    select coalesce(sum(amount_ves_to_pay), 0) as total, count(*) as count
    from sendings where status = 'pending'
  `;
  const [codigos] = await sql<{ count: string }[]>`
    select count(*) as count from codigos where status = 'pendiente'
  `;
  return {
    cryptoBalanceUsdt: num(crypto.balance),
    vesPoolBalance: num(ves.balance),
    bolivaresPendientes: num(pending.total),
    pendingSendingsCount: Number(pending.count),
    pendingCodigosCount: Number(codigos.count),
  };
}

/* -------------------------------------------------------------------- stats */

type RawStatsPeriod = {
  period: string;
  paid_count: string;
  revenue_eur: string;
  cost_eur: string;
  profit_eur: string;
  ves_paid: string;
  usdt_used: string;
  pool_count: string;
  direct_count: string;
};

function toStatsPeriod(row: RawStatsPeriod) {
  return {
    period: row.period,
    paid_count: Number(row.paid_count),
    revenue_eur: num(row.revenue_eur),
    cost_eur: num(row.cost_eur),
    profit_eur: num(row.profit_eur),
    ves_paid: num(row.ves_paid),
    usdt_used: num(row.usdt_used),
    pool_count: Number(row.pool_count),
    direct_count: Number(row.direct_count),
  };
}

/**
 * A read-only financial and operational snapshot.
 *
 * Profit is realized only from paid sendings and grouped by paid_at in Jose's
 * Europe/Madrid business day. Client receivables, pending beneficiary payouts,
 * codigos and direct-EUR inventory liabilities remain separate: none of them is
 * silently added to or subtracted from realized earnings.
 */
export async function getStats(): Promise<StatsSnapshot> {
  const sql = getSql();

  return sql.begin('isolation level repeatable read read only', async (tx) => {
    const [
      [current],
      [earnings],
      monthlyRows,
      dailyRows,
      fundingRows,
      [inventory],
      clientRows,
      codeBankRows,
      [warning],
    ] = await Promise.all([
      tx<
        {
          crypto_balance_usdt: string;
          ves_pool_balance: string;
          pending_payout_ves: string;
          pending_payout_count: string;
          uncollected_eur: string;
          uncollected_count: string;
          pending_codes_eur: string;
          pending_codes_count: string;
          unsettled_ves_eur: string;
          unsettled_ves_eur_count: string;
        }[]
      >`
      select
        coalesce((select sum(remaining_usdt) from crypto_purchases), 0)
          as crypto_balance_usdt,
        coalesce((select sum(remaining_ves) from ves_sales), 0)
          as ves_pool_balance,
        -- Envios propios are deliberately NOT excluded here: unpaid bolivares
        -- are owed to a real beneficiary and will come out of the real pool,
        -- whoever they are for.
        coalesce((select sum(amount_ves_to_pay) from sendings where status = 'pending'), 0)
          as pending_payout_ves,
        (select count(*) from sendings where status = 'pending')
          as pending_payout_count,
        -- These two are the opposite case, and the only place in getStats that
        -- needs the flag by name. An envio propio has no client, so its
        -- client_paid_at is null forever; without this it would sit in "sin
        -- cobrar" for good. Every other figure below is already excluded by its
        -- profit_eur is not null filter, and that is null forever on a propio.
        coalesce((
          select sum(amount_eur) from sendings
          where client_paid_at is null and is_personal = false
        ), 0) as uncollected_eur,
        (select count(*) from sendings where client_paid_at is null and is_personal = false)
          as uncollected_count,
        coalesce((select sum(amount) from codigos where status = 'pendiente'), 0)
          as pending_codes_eur,
        (select count(*) from codigos where status = 'pendiente')
          as pending_codes_count,
        coalesce((
          select sum(eur_amount) from ves_sales
          where source_type = 'ves_to_eur' and eur_settled_at is null
        ), 0) as unsettled_ves_eur,
        (select count(*) from ves_sales
          where source_type = 'ves_to_eur' and eur_settled_at is null)
          as unsettled_ves_eur_count
    `,
      tx<
        {
          revenue_eur: string;
          cost_eur: string;
          profit_eur: string;
          paid_count: string;
          today_profit_eur: string;
          month_profit_eur: string;
          negative_profit_count: string;
        }[]
      >`
      select
        coalesce(sum(amount_eur), 0) as revenue_eur,
        coalesce(sum(cost_eur), 0) as cost_eur,
        coalesce(sum(profit_eur), 0) as profit_eur,
        count(*) as paid_count,
        coalesce(sum(profit_eur) filter (
          where (paid_at at time zone 'Europe/Madrid')::date =
                (now() at time zone 'Europe/Madrid')::date
        ), 0) as today_profit_eur,
        coalesce(sum(profit_eur) filter (
          where date_trunc('month', paid_at at time zone 'Europe/Madrid') =
                date_trunc('month', now() at time zone 'Europe/Madrid')
        ), 0) as month_profit_eur,
        count(*) filter (where profit_eur < 0) as negative_profit_count
      from sendings
      where status = 'paid' and paid_at is not null and profit_eur is not null
    `,
      tx<RawStatsPeriod[]>`
      select
        to_char(paid_at at time zone 'Europe/Madrid', 'YYYY-MM') as period,
        count(*) as paid_count,
        coalesce(sum(amount_eur), 0) as revenue_eur,
        coalesce(sum(cost_eur), 0) as cost_eur,
        coalesce(sum(profit_eur), 0) as profit_eur,
        coalesce(sum(amount_ves_to_pay), 0) as ves_paid,
        coalesce(sum(usdt_used), 0) as usdt_used,
        count(*) filter (where paid_via = 'pool') as pool_count,
        count(*) filter (where paid_via = 'direct') as direct_count
      from sendings
      where status = 'paid' and paid_at is not null and profit_eur is not null
      group by 1
      order by 1 desc
      limit 12
    `,
      tx<RawStatsPeriod[]>`
      select
        to_char(paid_at at time zone 'Europe/Madrid', 'YYYY-MM-DD') as period,
        count(*) as paid_count,
        coalesce(sum(amount_eur), 0) as revenue_eur,
        coalesce(sum(cost_eur), 0) as cost_eur,
        coalesce(sum(profit_eur), 0) as profit_eur,
        coalesce(sum(amount_ves_to_pay), 0) as ves_paid,
        coalesce(sum(usdt_used), 0) as usdt_used,
        count(*) filter (where paid_via = 'pool') as pool_count,
        count(*) filter (where paid_via = 'direct') as direct_count
      from sendings
      where status = 'paid' and paid_at is not null and profit_eur is not null
      group by 1
      order by 1 desc
      limit 14
    `,
      tx<
        {
          paid_via: PaidVia;
          paid_count: string;
          revenue_eur: string;
          cost_eur: string;
          profit_eur: string;
        }[]
      >`
      select paid_via, count(*) as paid_count,
             coalesce(sum(amount_eur), 0) as revenue_eur,
             coalesce(sum(cost_eur), 0) as cost_eur,
             coalesce(sum(profit_eur), 0) as profit_eur
      from sendings
      where status = 'paid' and paid_via is not null and profit_eur is not null
      group by paid_via
      order by paid_via
    `,
      tx<
        {
          purchase_eur: string;
          purchased_usdt: string;
          weighted_purchase_price: string | null;
          binance_ves: string;
          binance_usdt: string;
          binance_eur_cost: string;
          direct_ves: string;
          direct_eur_cost: string;
          active_usdt_lots: string;
          active_ves_lots: string;
          backordered_usdt_lots: string;
          backordered_ves_lots: string;
        }[]
      >`
      select
        coalesce((select sum(eur_paid) from crypto_purchases), 0) as purchase_eur,
        coalesce((select sum(usdt_received) from crypto_purchases), 0) as purchased_usdt,
        (select case when sum(usdt_received) > 0
          then sum(eur_paid) / sum(usdt_received) else null end from crypto_purchases)
          as weighted_purchase_price,
        coalesce((select sum(ves_received) from ves_sales where source_type = 'binance'), 0)
          as binance_ves,
        coalesce((select sum(usdt_sold) from ves_sales where source_type = 'binance'), 0)
          as binance_usdt,
        coalesce((select sum(eur_cost) from ves_sales where source_type = 'binance'), 0)
          as binance_eur_cost,
        coalesce((select sum(ves_received) from ves_sales where source_type = 'ves_to_eur'), 0)
          as direct_ves,
        coalesce((select sum(eur_amount) from ves_sales where source_type = 'ves_to_eur'), 0)
          as direct_eur_cost,
        (select count(*) from crypto_purchases where remaining_usdt > 0) as active_usdt_lots,
        (select count(*) from ves_sales where remaining_ves > 0) as active_ves_lots,
        (select count(*) from crypto_purchases where remaining_usdt < 0)
          as backordered_usdt_lots,
        (select count(*) from ves_sales where remaining_ves < 0)
          as backordered_ves_lots
    `,
      tx<
        {
          client_id: number;
          client_name: string;
          paid_count: string;
          revenue_eur: string;
          profit_eur: string;
        }[]
      >`
      select c.id as client_id, c.name as client_name, count(*) as paid_count,
             coalesce(sum(s.amount_eur), 0) as revenue_eur,
             coalesce(sum(s.profit_eur), 0) as profit_eur
      from sendings s
      join clients c on c.id = s.client_id
      where s.status = 'paid' and s.profit_eur is not null
      group by c.id, c.name
      order by profit_eur desc, revenue_eur desc, lower(c.name)
      limit 8
    `,
      tx<{ bank: string; pending_count: string; amount_eur: string }[]>`
      select bank, count(*) as pending_count, coalesce(sum(amount), 0) as amount_eur
      from codigos
      where status = 'pendiente'
      group by bank
      order by amount_eur desc, lower(bank)
    `,
      tx<{ count: string }[]>`
      select count(distinct a.sending_id) as count
      from sending_ves_allocations a
      join ves_sales v on v.id = a.ves_sale_id
      join sendings s on s.id = a.sending_id
      where s.status = 'paid' and v.eur_cost = 0
    `,
    ]);

    return {
      current: {
        crypto_balance_usdt: num(current.crypto_balance_usdt),
        ves_pool_balance: num(current.ves_pool_balance),
        pending_payout_ves: num(current.pending_payout_ves),
        pending_payout_count: Number(current.pending_payout_count),
        uncollected_eur: num(current.uncollected_eur),
        uncollected_count: Number(current.uncollected_count),
        pending_codes_eur: num(current.pending_codes_eur),
        pending_codes_count: Number(current.pending_codes_count),
        unsettled_ves_eur: num(current.unsettled_ves_eur),
        unsettled_ves_eur_count: Number(current.unsettled_ves_eur_count),
      },
      earnings: {
        revenue_eur: num(earnings.revenue_eur),
        cost_eur: num(earnings.cost_eur),
        profit_eur: num(earnings.profit_eur),
        paid_count: Number(earnings.paid_count),
        today_profit_eur: num(earnings.today_profit_eur),
        month_profit_eur: num(earnings.month_profit_eur),
        negative_profit_count: Number(earnings.negative_profit_count),
      },
      inventory: {
        purchase_eur: num(inventory.purchase_eur),
        purchased_usdt: num(inventory.purchased_usdt),
        weighted_purchase_price:
          inventory.weighted_purchase_price === null
            ? null
            : num(inventory.weighted_purchase_price),
        binance_ves: num(inventory.binance_ves),
        binance_usdt: num(inventory.binance_usdt),
        binance_eur_cost: num(inventory.binance_eur_cost),
        direct_ves: num(inventory.direct_ves),
        direct_eur_cost: num(inventory.direct_eur_cost),
        active_usdt_lots: Number(inventory.active_usdt_lots),
        active_ves_lots: Number(inventory.active_ves_lots),
        backordered_usdt_lots: Number(inventory.backordered_usdt_lots),
        backordered_ves_lots: Number(inventory.backordered_ves_lots),
      },
      monthly: monthlyRows.map(toStatsPeriod),
      daily: dailyRows.map(toStatsPeriod),
      funding: fundingRows.map((row) => ({
        paid_via: row.paid_via,
        paid_count: Number(row.paid_count),
        revenue_eur: num(row.revenue_eur),
        cost_eur: num(row.cost_eur),
        profit_eur: num(row.profit_eur),
      })),
      top_clients: clientRows.map((row) => ({
        client_id: id(row.client_id),
        client_name: row.client_name,
        paid_count: Number(row.paid_count),
        revenue_eur: num(row.revenue_eur),
        profit_eur: num(row.profit_eur),
      })),
      pending_codes_by_bank: codeBankRows.map((row) => ({
        bank: row.bank,
        pending_count: Number(row.pending_count),
        amount_eur: num(row.amount_eur),
      })),
      zero_cost_paid_sendings: Number(warning.count),
    };
  });
}
