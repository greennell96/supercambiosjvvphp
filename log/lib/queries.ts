/**
 * All database access lives here.
 *
 * This file is deliberately thin: it reads rows, hands plain numbers to the
 * pure modules (lib/pricing.ts, lib/fifo.ts), and writes back whatever they
 * return. No money rule is decided in this file, and none is decided in SQL.
 *
 * Both pools are locked with `for update` inside their transaction, so two
 * payments can never draw the same lot twice.
 */

import type { TransactionSql } from 'postgres';

import { getSql, id, num } from './db';
import { applyIncomingToBackorders, type Lot } from './fifo';
import { purchasePriceEurPerUsdt, salePriceVesPerUsdt } from './pools';
import { computeDirectPayment, computeNewSending, computePoolPayment } from './pricing';
import type {
  Client,
  Codigo,
  CryptoPurchase,
  CurrentRates,
  PaidVia,
  Sending,
  VesSale,
} from './types';

/* ------------------------------------------------------------------ clients */

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

/** The USDT pool, shaped for lib/fifo.ts. price = EUR per USDT. */
async function lockUsdtLots(tx: TransactionSql) {
  const rows = await tx<
    { id: number; purchased_at: Date; price_eur_per_usdt: string; remaining_usdt: string }[]
  >`
    select id, purchased_at, price_eur_per_usdt, remaining_usdt
    from crypto_purchases
    order by purchased_at, id
    for update
  `;
  return rows.map<Lot>((r) => ({
    id: id(r.id),
    orderMs: r.purchased_at.getTime(),
    price: num(r.price_eur_per_usdt),
    remaining: num(r.remaining_usdt),
  }));
}

/** The VES pool, shaped for lib/fifo.ts. price = VES per USDT. */
async function lockVesLots(tx: TransactionSql) {
  const rows = await tx<
    { id: number; sold_at: Date; price_ves_per_usdt: string; remaining_ves: string }[]
  >`
    select id, sold_at, price_ves_per_usdt, remaining_ves
    from ves_sales
    order by sold_at, id
    for update
  `;
  return rows.map<Lot>((r) => ({
    id: id(r.id),
    orderMs: r.sold_at.getTime(),
    price: num(r.price_ves_per_usdt),
    remaining: num(r.remaining_ves),
  }));
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
        (purchased_at, eur_paid, usdt_received, price_eur_per_usdt, provider, remaining_usdt)
      values
        (${input.purchased_at}, ${input.eur_paid}, ${input.usdt_received}, ${price},
         ${input.provider}, ${applied.remainingForNewLot})
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

/* ---------------------------------------------------------------- ves sales */

export async function listVesSales(): Promise<VesSale[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: number;
      sold_at: Date;
      usdt_sold: string;
      ves_received: string;
      price_ves_per_usdt: string;
      remaining_ves: string;
    }[]
  >`
    select id, sold_at, usdt_sold, ves_received, price_ves_per_usdt, remaining_ves
    from ves_sales
    order by sold_at desc, id desc
  `;
  return rows.map((r) => ({
    id: id(r.id),
    sold_at: r.sold_at,
    usdt_sold: num(r.usdt_sold),
    ves_received: num(r.ves_received),
    price_ves_per_usdt: num(r.price_ves_per_usdt),
    remaining_ves: num(r.remaining_ves),
  }));
}

/**
 * Log a Binance sale whose bolivares landed in Jose's own account.
 * Exactly the same backorder rule as createPurchase, on the other pool.
 */
export async function createVesSale(input: {
  usdt_sold: number;
  ves_received: number;
  sold_at: Date;
}): Promise<{ id: number; usedToPayBackorders: number; remainingForNewLot: number }> {
  const sql = getSql();
  const price = salePriceVesPerUsdt(input.usdt_sold, input.ves_received);

  return sql.begin(async (tx) => {
    const lots = await lockVesLots(tx);
    const applied = applyIncomingToBackorders(lots, input.ves_received);

    for (const update of applied.lotUpdates) {
      await tx`update ves_sales set remaining_ves = ${update.remaining} where id = ${update.id}`;
    }

    const [row] = await tx<{ id: number }[]>`
      insert into ves_sales
        (sold_at, usdt_sold, ves_received, price_ves_per_usdt, remaining_ves)
      values
        (${input.sold_at}, ${input.usdt_sold}, ${input.ves_received}, ${price},
         ${applied.remainingForNewLot})
      returning id
    `;

    return {
      id: id(row.id),
      usedToPayBackorders: applied.usedToPayBackorders,
      remainingForNewLot: applied.remainingForNewLot,
    };
  });
}

/* ----------------------------------------------------------------- sendings */

type RawSending = {
  id: number;
  client_id: number;
  client_name: string;
  created_at: Date;
  amount_eur: string;
  payout_method: string;
  status: 'pending' | 'paid';
  paid_at: Date | null;
  rate_tasa: string;
  amount_ves_to_pay: string;
  client_payment_note: string | null;
  paid_via: PaidVia | null;
  fee_applied: boolean | null;
  usdt_used: string | null;
  cost_eur: string | null;
  profit_eur: string | null;
};

function toSending(r: RawSending): Sending {
  return {
    id: id(r.id),
    client_id: id(r.client_id),
    client_name: r.client_name,
    created_at: r.created_at,
    amount_eur: num(r.amount_eur),
    payout_method: r.payout_method,
    status: r.status,
    paid_at: r.paid_at,
    rate_tasa: num(r.rate_tasa),
    amount_ves_to_pay: num(r.amount_ves_to_pay),
    client_payment_note: r.client_payment_note,
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
    select s.id, s.client_id, c.name as client_name, s.created_at, s.amount_eur,
           s.payout_method, s.status, s.paid_at, s.rate_tasa, s.amount_ves_to_pay,
           s.client_payment_note, s.paid_via, s.fee_applied, s.usdt_used, s.cost_eur, s.profit_eur
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
    select s.id, s.client_id, c.name as client_name, s.created_at, s.amount_eur,
           s.payout_method, s.status, s.paid_at, s.rate_tasa, s.amount_ves_to_pay,
           s.client_payment_note, s.paid_via, s.fee_applied, s.usdt_used, s.cost_eur, s.profit_eur
    from sendings s
    join clients c on c.id = s.client_id
    where s.status = 'pending'
    order by s.created_at asc, s.id asc
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

export interface EditSendingInput {
  /**
   * The money fields. Only accepted while the sending is still pending: once it
   * is paid, the pool draws and the cost/profit are locked in, so changing these
   * would desync the ledger. Pass null to edit only the note.
   */
  money: { amount_eur: number; rate_tasa: number; payout_method: string } | null;
  /** Always editable, whatever the status. Never feeds a calculation. */
  client_payment_note: string | null;
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
 * computeNewSending, so amount_ves_to_pay can never drift from
 * amount_eur * rate_tasa. The status is read from the locked row, not trusted
 * from the form, so a sending that got paid in the meantime cannot have its
 * money quietly rewritten.
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
      { id: number; client_name: string; status: 'pending' | 'paid'; amount_ves_to_pay: string }[]
    >`
      select s.id, c.name as client_name, s.status, s.amount_ves_to_pay
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

    if (!input.money) {
      await tx`
        update sendings set client_payment_note = ${input.client_payment_note} where id = ${sendingId}
      `;
      return {
        id: sendingId,
        clientName: row.client_name,
        status: row.status,
        moneyChanged: false,
        amountVesToPay: num(row.amount_ves_to_pay),
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

export interface PaySendingResult {
  id: number;
  clientName: string;
  paidVia: PaidVia;
  amountEur: number;
  amountVesToPay: number;
  feeApplied: boolean;
  vesDrawn: number;
  vesShortfall: number;
  usdtUsed: number;
  usdtShortfall: number;
  costEur: number;
  profitEur: number;
}

type PendingRow = {
  id: number;
  client_name: string;
  amount_eur: string;
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
 * (a) Pay a pending sending out of the VES pool.
 *
 * Draws bolivares from ves_sales, converts what was drawn into the USDT it
 * really represented, then draws that USDT from crypto_purchases for the cost.
 * Both allocation trails are written.
 */
export async function paySendingFromPool(sendingId: number): Promise<PaySendingResult> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const sending = await lockPendingSending(tx, sendingId);

    const vesLots = await lockVesLots(tx);
    const usdtLots = await lockUsdtLots(tx);

    const payment = computePoolPayment({
      amountEur: num(sending.amount_eur),
      amountVesToPay: num(sending.amount_ves_to_pay),
      payoutMethod: sending.payout_method,
      vesLots,
      usdtLots,
    });

    for (const allocation of payment.vesAllocations) {
      await tx`
        insert into sending_ves_allocations
          (sending_id, ves_sale_id, ves_amount, price_ves_per_usdt)
        values (${sendingId}, ${allocation.lotId}, ${allocation.amount}, ${allocation.price})
      `;
    }
    for (const update of payment.vesLotUpdates) {
      await tx`update ves_sales set remaining_ves = ${update.remaining} where id = ${update.id}`;
    }

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
      amountEur: num(sending.amount_eur),
      amountVesToPay: num(sending.amount_ves_to_pay),
      feeApplied: payment.feeApplied,
      vesDrawn: payment.vesDrawn,
      vesShortfall: payment.vesShortfall,
      usdtUsed: payment.usdtUsed,
      usdtShortfall: payment.usdtShortfall,
      costEur: payment.costEur,
      profitEur: payment.profitEur,
    };
  });
}

/**
 * (b) Pay a pending sending by selling USDT straight into the beneficiary's
 * account. The bolivares never enter the pool, so nothing is drawn from
 * ves_sales and no row is added to it.
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
      amountEur: num(sending.amount_eur),
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
      amountEur: num(sending.amount_eur),
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

/* ------------------------------------------------------------------ codigos */

type RawCodigo = {
  id: number;
  client_id: number;
  client_name: string;
  client_dni_nie: string | null;
  amount: string;
  bank: string;
  status: 'pendiente' | 'retirado';
  created_at: Date;
  retired_at: Date | null;
};

function toCodigo(r: RawCodigo): Codigo {
  return { ...r, id: id(r.id), client_id: id(r.client_id), amount: num(r.amount) };
}

export async function listCodigos(limit = 500): Promise<Codigo[]> {
  const sql = getSql();
  const rows = await sql<RawCodigo[]>`
    select g.id, g.client_id, c.name as client_name, c.dni_nie as client_dni_nie,
           g.amount, g.bank, g.status, g.created_at, g.retired_at
    from codigos g
    join clients c on c.id = g.client_id
    order by g.created_at desc, g.id desc
    limit ${limit}
  `;
  return rows.map(toCodigo);
}

export async function listPendingCodigos(): Promise<Codigo[]> {
  const sql = getSql();
  const rows = await sql<RawCodigo[]>`
    select g.id, g.client_id, c.name as client_name, c.dni_nie as client_dni_nie,
           g.amount, g.bank, g.status, g.created_at, g.retired_at
    from codigos g
    join clients c on c.id = g.client_id
    where g.status = 'pendiente'
    order by g.created_at asc, g.id asc
  `;
  return rows.map(toCodigo);
}

export async function createCodigo(input: {
  client_id: number;
  amount: number;
  bank: string;
}): Promise<number> {
  const sql = getSql();
  const [row] = await sql<{ id: number }[]>`
    insert into codigos (client_id, amount, bank)
    values (${input.client_id}, ${input.amount}, ${input.bank})
    returning id
  `;
  return id(row.id);
}

export async function markCodigoRetirado(codigoId: number): Promise<void> {
  const sql = getSql();
  await sql`
    update codigos
    set status = 'retirado', retired_at = now()
    where id = ${codigoId} and status = 'pendiente'
  `;
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
