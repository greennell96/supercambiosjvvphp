/**
 * Lot prices for the two FIFO pools.
 *
 * Jose never types a price. At the moment of a trade he knows the two raw
 * amounts that changed hands, and the price is whatever those two imply:
 *
 *   crypto purchase  paid  X EUR  -> got Y USDT   => X / Y  EUR per USDT
 *   binance sale     sold X USDT  -> got Y VES    => Y / X  VES per USDT
 *   VES -> EUR        owes X EUR   -> got Y VES    => Y / X  VES per EUR
 *
 * Both raw numbers and the derived price are stored on the lot, so a lot can
 * always be audited back to the trade it came from.
 *
 * Pure module: the derivation lives here rather than in lib/queries.ts so that
 * no money rule is decided at the database layer, and so it can be tested
 * directly.
 */

import { isDepleted, type Lot } from './fifo';

/** EUR per USDT for a crypto purchase. */
export function purchasePriceEurPerUsdt(eurPaid: number, usdtReceived: number): number {
  if (!(eurPaid > 0)) {
    throw new Error('Los EUR pagados deben ser mayores que cero.');
  }
  if (!(usdtReceived > 0)) {
    throw new Error('Los USDT recibidos deben ser mayores que cero.');
  }
  return eurPaid / usdtReceived;
}

/** VES per USDT for a Binance sale. */
export function salePriceVesPerUsdt(usdtSold: number, vesReceived: number): number {
  if (!(usdtSold > 0)) {
    throw new Error('Los USDT vendidos deben ser mayores que cero.');
  }
  if (!(vesReceived > 0)) {
    throw new Error('Los bolivares recibidos deben ser mayores que cero.');
  }
  return vesReceived / usdtSold;
}

/** VES per EUR for a direct VES -> EUR exchange. */
export function vesToEurPriceVesPerEur(eurAmount: number, vesReceived: number): number {
  if (!(eurAmount > 0)) {
    throw new Error('Los EUR acordados deben ser mayores que cero.');
  }
  if (!(vesReceived > 0)) {
    throw new Error('Los bolivares recibidos deben ser mayores que cero.');
  }
  return vesReceived / eurAmount;
}

/**
 * What one unit still sitting in a pool cost, on average, weighted by how much
 * of each lot is left.
 *
 * This is NOT the lifetime average that `sum(paid) / sum(received)` over every
 * row ever written gives — the figure getStats() reports as
 * weighted_purchase_price. That one answers "what has he paid per USDT across
 * his whole history", which is the right question for /stats and the wrong one
 * for "what did the USDT he is holding RIGHT NOW cost him". A lot sold off
 * months ago is still in the lifetime average and has no business in this one.
 *
 * Two kinds of lot are skipped, both through the same isDepleted rule drawFifo
 * draws by, so "active" means one thing in this app:
 *
 *   - a spent lot holds nothing, so it has no weight to contribute;
 *   - a BACKORDERED lot (negative balance: already spent, not yet bought) would
 *     contribute a negative weight and drag the average to a price nothing was
 *     ever bought at. What it owes has no cost yet — the purchase that will
 *     cover it has not happened.
 *
 * Null for an empty pool. There is no average of nothing, and the caller has to
 * say "no hay compras" rather than print a zero cost as though USDT were free.
 *
 * Generic over both pools because a `Lot` is generic: it averages whatever unit
 * that pool's price is quoted in.
 */
export function poolWeightedAveragePrice(lots: Lot[]): number | null {
  let remaining = 0;
  let value = 0;

  for (const lot of lots) {
    if (isDepleted(lot.remaining)) continue;
    remaining += lot.remaining;
    value += lot.remaining * lot.price;
  }

  return remaining > 0 ? value / remaining : null;
}
