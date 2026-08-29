import { describe, expect, it } from 'vitest';

import { computeRatePreview } from '../lib/rate-preview';

/** A pool of 500 USDT that cost 0,92 EUR each — the worked example's pool. */
const POOL = { poolUsdt: 500, poolCostEurPerUsdt: 0.92 };

describe('computeRatePreview', () => {
  /**
   * José confirmed this one by hand, so it is asserted against the precise
   * unrounded values rather than the rounded figures the screen shows. Rounding
   * to 525,64 and subtracting from there would drift, which is exactly what the
   * implementation must not do.
   */
  it("reproduces José's worked example exactly", () => {
    const preview = computeRatePreview({
      ...POOL,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 195,
    });

    expect(preview).not.toBeNull();
    expect(preview!.vesObtainable).toBeCloseTo(102500, 10);
    expect(preview!.eurSendable).toBeCloseTo(525.6410256410256, 10);
    expect(preview!.costEur).toBeCloseTo(460, 10);
    expect(preview!.profitEur).toBeCloseTo(65.64102564102564, 10);
    expect(preview!.marginPct).toBeCloseTo(12.487804878048779, 10);
  });

  it('takes the margin against revenue, not against cost', () => {
    // The same two numbers over COST would give 14,27%. If this ever reads
    // 14,27 the formula has been flipped to a markup.
    const preview = computeRatePreview({
      ...POOL,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 195,
    });

    expect(preview!.marginPct).not.toBeCloseTo(14.2696, 3);
    expect(preview!.marginPct).toBeCloseTo((preview!.profitEur! / preview!.eurSendable) * 100, 12);
  });

  it('earns more as the candidate tasa drops, and less as it rises', () => {
    const at = (tasa: number) =>
      computeRatePreview({ ...POOL, binanceVesPerUsdt: 205, candidateTasaVesPerEur: tasa })!;

    // A lower tasa means each euro of sending costs more bolívares, so the same
    // pool funds MORE euros of envíos and keeps more.
    expect(at(185).profitEur!).toBeGreaterThan(at(195).profitEur!);
    expect(at(205).profitEur!).toBeLessThan(at(195).profitEur!);
  });

  it('breaks even when the tasa matches the pool cost exactly', () => {
    // 205 Bs/USDT costing 0,92 EUR/USDT breaks even at 205 / 0,92 Bs per EUR.
    const preview = computeRatePreview({
      ...POOL,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 205 / 0.92,
    });

    expect(preview!.profitEur).toBeCloseTo(0, 10);
    expect(preview!.marginPct).toBeCloseTo(0, 10);
  });

  it('reports a loss when the tasa is above what the pool can carry', () => {
    const preview = computeRatePreview({
      ...POOL,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 260,
    });

    expect(preview!.profitEur).toBeLessThan(0);
    expect(preview!.marginPct).toBeLessThan(0);
  });

  /* ------------------------------------------------- the two typed prices */

  it('shows nothing until a tasa is typed', () => {
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: 205, candidateTasaVesPerEur: null }),
    ).toBeNull();
  });

  it('shows nothing for a zero or negative tasa, rather than Infinity', () => {
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: 205, candidateTasaVesPerEur: 0 }),
    ).toBeNull();
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: 205, candidateTasaVesPerEur: -195 }),
    ).toBeNull();
  });

  it('shows nothing until a Binance price is typed', () => {
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: null, candidateTasaVesPerEur: 195 }),
    ).toBeNull();
  });

  it('shows nothing for a zero or negative Binance price', () => {
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: 0, candidateTasaVesPerEur: 195 }),
    ).toBeNull();
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: -205, candidateTasaVesPerEur: 195 }),
    ).toBeNull();
  });

  it('shows nothing when either typed price is NaN', () => {
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: NaN, candidateTasaVesPerEur: 195 }),
    ).toBeNull();
    expect(
      computeRatePreview({ ...POOL, binanceVesPerUsdt: 205, candidateTasaVesPerEur: NaN }),
    ).toBeNull();
  });

  /* ------------------------------------------------------ the pool itself */

  it('gives revenue but no cost, profit or margin when the pool has no lots', () => {
    const preview = computeRatePreview({
      poolUsdt: 500,
      poolCostEurPerUsdt: null,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 195,
    });

    expect(preview).not.toBeNull();
    expect(preview!.vesObtainable).toBeCloseTo(102500, 10);
    expect(preview!.eurSendable).toBeCloseTo(525.6410256410256, 10);
    // Never a bogus zero: nothing was paid because nothing is there.
    expect(preview!.costEur).toBeNull();
    expect(preview!.profitEur).toBeNull();
    expect(preview!.marginPct).toBeNull();
  });

  it('reports zeroes and no margin for an empty pool balance', () => {
    const preview = computeRatePreview({
      poolUsdt: 0,
      poolCostEurPerUsdt: 0.92,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 195,
    });

    expect(preview!.vesObtainable).toBe(0);
    expect(preview!.eurSendable).toBe(0);
    expect(preview!.costEur).toBe(0);
    expect(preview!.profitEur).toBe(0);
    // 0/0 is not a margin of zero, so it is not reported as one.
    expect(preview!.marginPct).toBeNull();
  });

  it('still computes on a negative pool balance instead of hiding it', () => {
    // Oversold: 100 USDT spent that have not been bought yet. The figures are
    // legitimately negative and are shown that way.
    const preview = computeRatePreview({
      poolUsdt: -100,
      poolCostEurPerUsdt: 0.92,
      binanceVesPerUsdt: 205,
      candidateTasaVesPerEur: 195,
    });

    expect(preview).not.toBeNull();
    expect(preview!.vesObtainable).toBeCloseTo(-20500, 10);
    expect(preview!.eurSendable).toBeCloseTo(-105.12820512820512, 10);
    expect(preview!.costEur).toBeCloseTo(-92, 10);
    expect(preview!.profitEur).toBeCloseTo(-13.128205128205127, 10);
  });

  it('does not chain rounded intermediates', () => {
    // A tasa that does not divide cleanly: every field has to come off the
    // unrounded chain, not off a 2-decimal display value.
    const preview = computeRatePreview({
      poolUsdt: 333,
      poolCostEurPerUsdt: 0.917,
      binanceVesPerUsdt: 207.37,
      candidateTasaVesPerEur: 193.61,
    });

    const ves = 333 * 207.37;
    const eur = ves / 193.61;
    const cost = 333 * 0.917;

    expect(preview!.vesObtainable).toBeCloseTo(ves, 10);
    expect(preview!.eurSendable).toBeCloseTo(eur, 10);
    expect(preview!.costEur).toBeCloseTo(cost, 10);
    expect(preview!.profitEur).toBeCloseTo(eur - cost, 10);
    expect(preview!.marginPct).toBeCloseTo(((eur - cost) / eur) * 100, 10);
  });
});
