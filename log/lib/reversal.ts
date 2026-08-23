/**
 * Undoing a row.
 *
 * Nothing in this ledger is ever recomputed, so a mistake can only be taken back
 * by putting the pools exactly where they were. There are two halves to that,
 * and both are pure arithmetic, so both live here rather than in SQL:
 *
 *   1. GIVE IT BACK — an allocation trail already records, row by row, how much
 *      of a draw came out of which lot. Adding those amounts back onto those
 *      same lots is the whole reversal. See restoreDrawnAmounts.
 *
 *   2. REFUSE WHEN IT CANNOT BE GIVEN BACK — a lot that something else has
 *      already drawn from, or that arrived into a hole and paid an older lot's
 *      debt, cannot be pulled out from under what came after it. See
 *      ventaDeletionBlocker and compraDeletionBlocker.
 *
 * The asymmetry between the two is deliberate. A sending is a leaf: nothing
 * points at it, so it is always reversible and there is no blocker for it. A
 * pool lot is not: sendings and sales hang off it, so it is only reversible
 * while it is still untouched.
 *
 * Everything here is pure. lib/queries.ts reads the rows, calls these, and
 * writes back what comes out.
 */

import { DEPLETION_EPSILON, type LotUpdate } from './fifo';

/** A lot as an undo needs it: which lot, and what is on it right now. */
export interface PoolLot {
  id: number;
  remaining: number;
}

/** One line of an allocation audit trail: this much came out of this lot. */
export interface DrawnAmount {
  lotId: number;
  amount: number;
}

/**
 * Put a draw back.
 *
 * The audit trail is the source of truth here, not the FIFO order: the draw was
 * priced and split when it happened, so undoing it is not a walk of the pool but
 * a straight add-back, lot by lot, of the exact amounts that came out.
 *
 * A lot touched twice by the same draw (drawn down, then pushed negative)
 * produces one single update, the way drawFifo does.
 *
 * Note what this does NOT do: it does not re-age anything. If a later arrival
 * paid down a backorder this draw had caused, the amount handed back lands on
 * the old lot even though the bolivares or USDT behind it came from the newer
 * one. The pool total is exact either way; only the FIFO age attribution
 * drifts, and it only drifts for that one case.
 */
export function restoreDrawnAmounts(lots: PoolLot[], drawn: DrawnAmount[]): LotUpdate[] {
  const current = new Map(lots.map((lot) => [lot.id, lot.remaining]));
  const restored = new Map<number, number>();

  for (const line of drawn) {
    const remaining = restored.get(line.lotId) ?? current.get(line.lotId);
    if (remaining === undefined) {
      throw new Error('Una asignacion apunta a un lote que ya no esta en el pool.');
    }
    restored.set(line.lotId, remaining + line.amount);
  }

  return [...restored.entries()].map(([id, remaining]) => ({ id, remaining }));
}

/* ------------------------------------------------------------- the refusals */

const SALE_PAID_A_SENDING =
  'Esa venta ya pago un envio: sus bolivares no estan completos. Borra primero ese envio.';
const SALE_PARTLY_SPENT =
  'Esa venta ya no tiene todos sus bolivares. No se puede eliminar.';
const SALE_COVERED_A_BACKORDER =
  'Esa venta cubrio bolivares de una venta anterior que ya estaban gastados. No se puede eliminar.';

const PURCHASE_PAID_A_SENDING =
  'Esa compra ya pago un envio directo: sus USDT no estan completos. Borra primero ese envio.';
const PURCHASE_FUNDED_A_SALE =
  'Esa compra ya financio una venta en Binance. Borra primero esa venta.';
const PURCHASE_PARTLY_SPENT =
  'Esa compra ya no tiene todos sus USDT. No se puede eliminar.';
const PURCHASE_COVERED_A_BACKORDER =
  'Esa compra cubrio USDT de una compra anterior que ya estaban gastados. No se puede eliminar.';

/** A lot is untouched when its balance is still exactly what arrived. */
function isUntouched(remaining: number, received: number): boolean {
  return Math.abs(remaining - received) <= DEPLETION_EPSILON;
}

/** A lot paid down a backorder when more than a rounding crumb went to old debt. */
function paidABackorder(usedToPayBackorders: number): boolean {
  return usedToPayBackorders > DEPLETION_EPSILON;
}

/** A ves_sales row, as deciding whether it can go needs it. */
export interface VentaDeletion {
  /** sending_ves_allocations rows pointing at this sale. */
  sendingAllocations: number;
  remainingVes: number;
  vesReceived: number;
  usedToPayBackorders: number;
}

/**
 * Why this sale cannot be deleted, or null when it can.
 *
 * The allocation count is the real guard: it is the record of something having
 * drawn from this sale. The balance check is belt and suspenders — it catches a
 * row whose bolivares moved without leaving a trail, which should never happen,
 * and refuses rather than silently handing back bolivares that are not there.
 */
export function ventaDeletionBlocker(sale: VentaDeletion): string | null {
  if (sale.sendingAllocations > 0) return SALE_PAID_A_SENDING;
  if (!isUntouched(sale.remainingVes, sale.vesReceived)) return SALE_PARTLY_SPENT;
  if (paidABackorder(sale.usedToPayBackorders)) return SALE_COVERED_A_BACKORDER;
  return null;
}

/** A crypto_purchases row, as deciding whether it can go needs it. */
export interface CompraDeletion {
  /** sending_lot_allocations rows: sendings paid directly out of this lot. */
  sendingAllocations: number;
  /** sale_lot_allocations rows: Binance sales funded by this lot. */
  saleAllocations: number;
  remainingUsdt: number;
  usdtReceived: number;
  usedToPayBackorders: number;
}

/**
 * Why this purchase cannot be deleted, or null when it can.
 *
 * A purchase is the root of the chain, so two different things can have drawn
 * from it — a directly paid sending, or a Binance sale — and each names the
 * thing to delete first. As with a sale, the balance check only exists to catch
 * a draw that left no trail.
 */
export function compraDeletionBlocker(purchase: CompraDeletion): string | null {
  if (purchase.sendingAllocations > 0) return PURCHASE_PAID_A_SENDING;
  if (purchase.saleAllocations > 0) return PURCHASE_FUNDED_A_SALE;
  if (!isUntouched(purchase.remainingUsdt, purchase.usdtReceived)) return PURCHASE_PARTLY_SPENT;
  if (paidABackorder(purchase.usedToPayBackorders)) return PURCHASE_COVERED_A_BACKORDER;
  return null;
}
