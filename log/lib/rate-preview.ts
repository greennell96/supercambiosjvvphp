/**
 * "If I set today's tasa here, what does the pool make?"
 *
 * Everywhere else in this app a price is DERIVED from two amounts that actually
 * changed hands — see lib/pools.ts. This module is the one exception, and it is
 * an exception on purpose: both of its prices are hypothetical. Jose is looking
 * at Binance, has not sold anything yet, and wants to know what a tasa would earn
 * him before he commits to it.
 *
 * So nothing here is ever stored. It reads the pool as it stands, applies two
 * numbers Jose typed this minute, and returns figures for the screen. No lot is
 * drawn, no cost is booked, no row is written. Logging a real sending later goes
 * through lib/pricing.ts as it always has, against the real amounts.
 *
 * The question it answers, end to end:
 *
 *   vesObtainable = poolUsdt * binancePrice     sell the whole pool today
 *   eurSendable   = vesObtainable / tasa        the envios those bolivares fund
 *   costEur       = poolUsdt * poolCost         what that USDT actually cost
 *   profitEur     = eurSendable - costEur
 *   marginPct     = profitEur / eurSendable * 100
 *
 * The margin is taken against eurSendable — the REVENUE — and not against cost.
 * Jose thinks of it as "de lo que cobro, cuanto me queda", so 65,64 EUR earned on
 * 525,64 EUR of sendings is a 12,49% margin, not the 14,27% markup the same two
 * numbers give over cost. Those are different figures and only the first one is
 * the one he is used to.
 *
 * Everything is computed from the unrounded inputs in one pass. Rounding is left
 * entirely to the display layer, so no intermediate is rounded and then fed into
 * the next step.
 */

export interface RatePreviewInput {
  /**
   * USDT currently pooled — getDashboardTotals().cryptoBalanceUsdt, the sum of
   * every purchase's remaining balance. May be zero or negative; see below.
   */
  poolUsdt: number;
  /**
   * Weighted average EUR per USDT of the purchases still holding something,
   * from poolWeightedAveragePrice. Null when no purchase has anything left.
   */
  poolCostEurPerUsdt: number | null;
  /** VES per USDT Jose could get on Binance right now. Typed; null when blank. */
  binanceVesPerUsdt: number | null;
  /** VES per EUR being tried out as today's tasa. Typed; null when blank. */
  candidateTasaVesPerEur: number | null;
}

export interface RatePreview {
  /** Bolivares selling the whole pool at the typed Binance price would raise. */
  vesObtainable: number;
  /** EUR of client sendings those bolivares would fund at the candidate tasa. */
  eurSendable: number;
  /** Null when the pool has no active purchase: nothing to compare against. */
  costEur: number | null;
  /** Null for the same reason as costEur — there is no profit without a cost. */
  profitEur: number | null;
  /**
   * Null when there is no cost, and also when eurSendable is exactly zero: an
   * empty pool earns nothing on nothing, and 0/0 is not a margin of zero.
   */
  marginPct: number | null;
}

/**
 * Work out the preview, or return null when there is nothing to show yet.
 *
 * Null — rather than zeroes or NaN — is the answer whenever either typed price
 * is missing or not positive. Both are required inputs, and a half-typed "19"
 * on the way to "195" must not flash a number Jose might read. A non-positive
 * tasa is refused here for the same reason updateRatesAction refuses to store
 * one: dividing by it produces Infinity, which is not a preview of anything.
 *
 * A zero or NEGATIVE poolUsdt is NOT refused. Negative means USDT already spent
 * that he has not bought yet, which happens normally here, and the arithmetic
 * stays meaningful through it — the answer just comes out negative too. The
 * dashboard already shows that balance in red; this simply follows it rather
 * than hiding the case.
 */
export function computeRatePreview(input: RatePreviewInput): RatePreview | null {
  const { poolUsdt, poolCostEurPerUsdt, binanceVesPerUsdt, candidateTasaVesPerEur } = input;

  // `!(x > 0)` and not `x <= 0`, so NaN is refused by the same test.
  if (binanceVesPerUsdt === null || !(binanceVesPerUsdt > 0)) return null;
  if (candidateTasaVesPerEur === null || !(candidateTasaVesPerEur > 0)) return null;
  if (!Number.isFinite(poolUsdt)) return null;

  const vesObtainable = poolUsdt * binanceVesPerUsdt;
  const eurSendable = vesObtainable / candidateTasaVesPerEur;

  // An empty pool still has a revenue figure — it just has nothing to have paid
  // for it, so cost, profit and margin are all "no aplica" rather than zero.
  if (poolCostEurPerUsdt === null || !Number.isFinite(poolCostEurPerUsdt)) {
    return { vesObtainable, eurSendable, costEur: null, profitEur: null, marginPct: null };
  }

  const costEur = poolUsdt * poolCostEurPerUsdt;
  const profitEur = eurSendable - costEur;

  return {
    vesObtainable,
    eurSendable,
    costEur,
    profitEur,
    marginPct: eurSendable === 0 ? null : (profitEur / eurSendable) * 100,
  };
}
