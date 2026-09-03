/**
 * The Envío USDT calculator: "if I send this many USDT for this many EUR,
 * what do I make?" — the same live-preview role app/rates-form.tsx plays for
 * the tasa box, but against the two REAL numbers Jose already knows rather
 * than a hypothetical Binance price. See lib/usdt-preview.ts.
 */

import { describe, expect, it } from 'vitest';

import type { Lot } from '../lib/fifo';
import { computeUsdtPreview } from '../lib/usdt-preview';

function lot(id: number, day: number, price: number, remaining: number): Lot {
  return { id, orderMs: Date.UTC(2026, 0, day), price, remaining };
}

/** A single lot, cheap enough that a bigger draw runs it short. */
const tightPool = (): Lot[] => [lot(1, 1, 0.9, 50)];

/** Two lots at different prices, so a draw spanning both is worth asserting. */
const twoLotPool = (): Lot[] => [lot(1, 1, 0.9, 200), lot(2, 2, 0.95, 1000)];

describe('computeUsdtPreview', () => {
  /* --------------------------------------------------- the two typed numbers */

  it('shows nothing until the EUR box is typed', () => {
    expect(
      computeUsdtPreview({ amountEur: null, usdtDelivered: 100, usdtLots: twoLotPool() }),
    ).toBeNull();
  });

  it('shows nothing for a zero or negative EUR amount, rather than a bogus number', () => {
    expect(
      computeUsdtPreview({ amountEur: 0, usdtDelivered: 100, usdtLots: twoLotPool() }),
    ).toBeNull();
    expect(
      computeUsdtPreview({ amountEur: -50, usdtDelivered: 100, usdtLots: twoLotPool() }),
    ).toBeNull();
  });

  it('shows nothing until the USDT box is typed', () => {
    expect(
      computeUsdtPreview({ amountEur: 250, usdtDelivered: null, usdtLots: twoLotPool() }),
    ).toBeNull();
  });

  it('shows nothing for a zero or negative USDT amount', () => {
    expect(
      computeUsdtPreview({ amountEur: 250, usdtDelivered: 0, usdtLots: twoLotPool() }),
    ).toBeNull();
    expect(
      computeUsdtPreview({ amountEur: 250, usdtDelivered: -10, usdtLots: twoLotPool() }),
    ).toBeNull();
  });

  it('shows nothing when either typed number is NaN', () => {
    expect(
      computeUsdtPreview({ amountEur: NaN, usdtDelivered: 100, usdtLots: twoLotPool() }),
    ).toBeNull();
    expect(
      computeUsdtPreview({ amountEur: 250, usdtDelivered: NaN, usdtLots: twoLotPool() }),
    ).toBeNull();
  });

  /* ------------------------------------------------------------- known pool */

  it('costs a draw that spans two lots exactly like the real payment would', () => {
    // 250 USDT: 200 come off the 0,90 lot (fully drained), the remaining 50
    // off the 0,95 lot. 200*0,90 + 50*0,95 = 227,50.
    const preview = computeUsdtPreview({
      amountEur: 250,
      usdtDelivered: 250,
      usdtLots: twoLotPool(),
    });

    expect(preview).not.toBeNull();
    expect(preview!.costEur).toBeCloseTo(227.5, 10);
    expect(preview!.profitEur).toBeCloseTo(22.5, 10);
    expect(preview!.marginPct).toBeCloseTo(9, 10);
    expect(preview!.shortfallUsdt).toBe(0);
  });

  it('takes the margin against revenue, not against cost', () => {
    // The same two numbers over COST give ~9,89%, not 9%. If this ever reads
    // that instead, the formula has been flipped to a markup.
    const preview = computeUsdtPreview({
      amountEur: 250,
      usdtDelivered: 250,
      usdtLots: twoLotPool(),
    });

    expect(preview!.marginPct).not.toBeCloseTo((preview!.profitEur / preview!.costEur) * 100, 3);
    expect(preview!.marginPct).toBeCloseTo((preview!.profitEur / 250) * 100, 12);
  });

  it('reports a loss when the USDT cost more than the client paid', () => {
    const preview = computeUsdtPreview({
      amountEur: 100,
      usdtDelivered: 250,
      usdtLots: twoLotPool(),
    });

    expect(preview!.profitEur).toBeLessThan(0);
    expect(preview!.marginPct).toBeLessThan(0);
  });

  /* ---------------------------------------------------------- the shortfall */

  it('books what the pool cannot cover as a shortfall, priced at the newest lot', () => {
    // 80 USDT against a single 50-USDT lot at 0,90: 50 draw the lot dry, the
    // remaining 30 book as a backorder on that same (newest) lot, still at
    // 0,90 — the only price known. Cost is over the WHOLE 80, not just the 50
    // actually sitting in the pool.
    const preview = computeUsdtPreview({
      amountEur: 100,
      usdtDelivered: 80,
      usdtLots: tightPool(),
    });

    expect(preview).not.toBeNull();
    expect(preview!.costEur).toBeCloseTo(72, 10);
    expect(preview!.profitEur).toBeCloseTo(28, 10);
    expect(preview!.marginPct).toBeCloseTo(28, 10);
    expect(preview!.shortfallUsdt).toBeCloseTo(30, 10);
  });

  /* -------------------------------------------------- the pool itself, safely */

  it('shows nothing rather than crashing when the pool has no lots at all', () => {
    // costUsdtDraw (through drawFifo) throws for a completely empty pool. A
    // first-run state, not a half-typed input, but a per-keystroke calculator
    // still cannot let that reach the render.
    expect(() =>
      computeUsdtPreview({ amountEur: 250, usdtDelivered: 100, usdtLots: [] }),
    ).not.toThrow();
    expect(
      computeUsdtPreview({ amountEur: 250, usdtDelivered: 100, usdtLots: [] }),
    ).toBeNull();
  });

  it('never mutates the lots it is handed, so retyping the boxes is safe', () => {
    const pool = twoLotPool();
    const before = pool.map((l) => ({ ...l }));

    computeUsdtPreview({ amountEur: 250, usdtDelivered: 250, usdtLots: pool });
    computeUsdtPreview({ amountEur: 90, usdtDelivered: 40, usdtLots: pool });

    expect(pool).toEqual(before);

    // And calling it twice with the same input gives the same answer — the
    // real proof that nothing about the pool drifted between calls.
    const first = computeUsdtPreview({ amountEur: 250, usdtDelivered: 250, usdtLots: pool });
    const second = computeUsdtPreview({ amountEur: 250, usdtDelivered: 250, usdtLots: pool });
    expect(first).toEqual(second);
  });
});
