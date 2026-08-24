/**
 * FIFO pool engine.
 *
 * There are two pools in this app and they behave identically, so they share
 * this one engine:
 *
 *   1. crypto_purchases — USDT bought. price = EUR per USDT ("precio izquierda")
 *   2. ves_sales        — VES received from Binance or a VES -> EUR exchange.
 *                         price is the lot's source-native rate; VES cost and
 *                         attribution are decided from source metadata by the
 *                         caller rather than from this generic field.
 *
 * That is why nothing here is named after USDT, VES or EUR. A `Lot` is just
 * "some amount left, bought/received at some price, at some moment", and a draw
 * is "take this much out, oldest lot first".
 *
 * Because pools can measure price in different directions and units, this
 * module does NOT decide what a draw costs. It hands back the allocations and
 * lets the caller pick:
 *   - sumAmountTimesPrice     when price is "cost per unit drawn"  (USDT pool)
 *   - sumAmountDividedByPrice when price is "units drawn per unit" (legacy or
 *                             single-source VES calculations)
 *
 * Everything here is pure: plain numbers in, plain numbers out. No database.
 */

/**
 * Floating point leaves crumbs. A lot with less than this much left is treated
 * as empty, and a lot more than this much below zero is a real backorder.
 */
export const DEPLETION_EPSILON = 0.0000001;

/** One lot in a pool, as far as the FIFO math is concerned. */
export interface Lot {
  id: number;
  /** Milliseconds since epoch. Used only for ordering, oldest first. */
  orderMs: number;
  /**
   * The lot's price. Its unit depends on the pool:
   * EUR per USDT for crypto_purchases; source-native for ves_sales.
   */
  price: number;
  /** How much of this lot is unspent. May be negative — see drawFifo. */
  remaining: number;
}

/** "This draw took this much out of this lot, at this lot's price." */
export interface Allocation {
  lotId: number;
  amount: number;
  price: number;
}

/** A lot whose remaining balance has to be written back to the database. */
export interface LotUpdate {
  id: number;
  remaining: number;
}

export interface DrawResult {
  /** Audit trail: what came out of which lot. */
  allocations: Allocation[];
  /** New remaining balance for every lot this draw touched. */
  lotUpdates: LotUpdate[];
  /**
   * How much of the request no positive balance could cover. It was still
   * allocated — charged to the newest lot, pushing it negative (a backorder).
   */
  shortfall: number;
}

export interface DrawOptions {
  /** Error text when the pool has no lots at all and so has no price to use. */
  emptyPoolMessage?: string;
}

/** A lot is "active" (usable, shown as available) when it still has something left. */
export function isDepleted(remaining: number): boolean {
  return remaining <= DEPLETION_EPSILON;
}

/** A lot is a backorder when it owes against a future purchase or sale. */
export function isBackordered(remaining: number): boolean {
  return remaining < -DEPLETION_EPSILON;
}

/** Oldest first; ties broken by id so the order is always stable. */
function byFifoOrder(a: Lot, b: Lot): number {
  if (a.orderMs !== b.orderMs) return a.orderMs - b.orderMs;
  return a.id - b.id;
}

/**
 * Draw `needed` out of the pool, oldest lot first.
 *
 * Rules:
 *  - Only lots with a positive balance can be drawn from. Lots already depleted
 *    or already negative are skipped.
 *  - A lot is emptied completely before moving to the next one.
 *  - If the whole pool cannot cover the draw, this does NOT error. The
 *    uncovered remainder is charged to the newest lot, which goes negative.
 *    That negative means "already spent, and a future purchase/sale still has
 *    to cover it", which is normal here: supply legitimately lags demand.
 *  - The uncovered remainder is priced at the newest lot's price, because that
 *    is the only price known at that moment.
 *
 * Throws only when the pool is completely empty, because then there is no price
 * at all to work with.
 */
export function drawFifo(lots: Lot[], needed: number, options: DrawOptions = {}): DrawResult {
  if (!(needed > 0)) {
    return { allocations: [], lotUpdates: [], shortfall: 0 };
  }
  if (lots.length === 0) {
    throw new Error(options.emptyPoolMessage ?? 'El pool no tiene ningun lote registrado.');
  }

  const ordered = [...lots].sort(byFifoOrder);
  const allocations: Allocation[] = [];
  // Keyed by lot id, so a lot touched twice (drawn down, then pushed negative)
  // produces one single update.
  const newRemaining = new Map<number, number>();

  let stillNeeded = needed;

  for (const lot of ordered) {
    if (stillNeeded <= DEPLETION_EPSILON) break;
    if (isDepleted(lot.remaining)) continue; // empty or already negative

    const drawn = Math.min(lot.remaining, stillNeeded);
    allocations.push({ lotId: lot.id, amount: drawn, price: lot.price });
    newRemaining.set(lot.id, lot.remaining - drawn);
    stillNeeded -= drawn;
  }

  let shortfall = 0;

  if (stillNeeded > DEPLETION_EPSILON) {
    // The pool ran dry. Charge the rest to the newest lot and let it go negative.
    shortfall = stillNeeded;
    const newest = ordered[ordered.length - 1];
    const current = newRemaining.get(newest.id) ?? newest.remaining;

    allocations.push({ lotId: newest.id, amount: stillNeeded, price: newest.price });
    newRemaining.set(newest.id, current - stillNeeded);
    stillNeeded = 0;
  }

  const lotUpdates: LotUpdate[] = [...newRemaining.entries()].map(([id, remaining]) => ({
    id,
    remaining,
  }));

  return { allocations, lotUpdates, shortfall };
}

export interface IncomingApplication {
  /** Backordered lots this incoming amount paid down, with their new balances. */
  lotUpdates: LotUpdate[];
  /** What survives and becomes the new lot's own remaining balance. */
  remainingForNewLot: number;
  /** How much of the incoming amount went to clearing old debt. */
  usedToPayBackorders: number;
}

/**
 * Apply a brand new lot (a crypto purchase, or a VES sale) to the pool.
 *
 * If older lots sit at a negative balance — already spent, not yet covered —
 * the new arrival pays those off first, oldest debt first. Only what survives
 * becomes the new lot's own remaining balance. This is what makes the pool
 * self-correct as supply catches up.
 *
 * The debt is paid in pool units, never in money: the old lot's price was
 * already locked into whatever consumed it, so nothing here rewrites a past
 * cost.
 */
export function applyIncomingToBackorders(lots: Lot[], incoming: number): IncomingApplication {
  const backordered = [...lots].filter((l) => isBackordered(l.remaining)).sort(byFifoOrder);

  const lotUpdates: LotUpdate[] = [];
  let available = incoming;

  for (const lot of backordered) {
    if (available <= DEPLETION_EPSILON) break;
    const debt = -lot.remaining; // positive number
    const payment = Math.min(debt, available);
    lotUpdates.push({ id: lot.id, remaining: lot.remaining + payment });
    available -= payment;
  }

  return {
    lotUpdates,
    remainingForNewLot: available,
    usedToPayBackorders: incoming - available,
  };
}

/** Total left in the pool. Negative means the pool owes. */
export function poolBalance(lots: Lot[]): number {
  return lots.reduce((total, l) => total + l.remaining, 0);
}

/**
 * sum(amount * price).
 * Use when the lot price is "cost per unit drawn" — the USDT pool, where price
 * is EUR per USDT, so drawing 105 USDT at 0,90 costs 94,50 EUR.
 */
export function sumAmountTimesPrice(allocations: Allocation[]): number {
  return allocations.reduce((total, a) => total + a.amount * a.price, 0);
}

/**
 * sum(amount / price).
 * Use when the lot price is "units drawn per unit wanted" — the VES pool, where
 * price is VES per USDT, so drawing 21.000 VES at 200 used 105 USDT.
 */
export function sumAmountDividedByPrice(allocations: Allocation[]): number {
  return allocations.reduce((total, a) => {
    if (!(a.price > 0)) {
      throw new Error('Un lote tiene precio cero o negativo; no se puede convertir.');
    }
    return total + a.amount / a.price;
  }, 0);
}
