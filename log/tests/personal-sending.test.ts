/**
 * Envios propios: money Jose sends to his own family, out of the same pools.
 *
 * The point of these tests is what stays the same and what does not. The draw,
 * the FIFO order, the cost and the 0,3% interbank rule are shared with a client
 * sending and must behave identically. The only difference is that there is no
 * agreed EUR amount, so there is no profit to report — null, never zero, because
 * zero would look like a transfer that earned nothing rather than one that was
 * never priced.
 */

import { describe, expect, it } from 'vitest';

import type { Lot } from '../lib/fifo';
import {
  computeDirectPayment,
  computeNewPersonalSending,
  computePoolPayment,
  type VesLot,
} from '../lib/pricing';

/** The same pools tests/pricing.test.ts uses, so the figures line up with it. */
function vesLot(
  id: number,
  day: number,
  price: number,
  remaining: number,
  eurCost: number,
): VesLot {
  return {
    id,
    orderMs: Date.UTC(2026, 0, day),
    price,
    remaining,
    sourceType: 'binance',
    usdtSold: remaining / price,
    priceVesPerUsdt: price,
    eurCost,
    vesReceived: remaining,
  };
}

const vesPool = () => [vesLot(1, 1, 200, 20000, 90), vesLot(2, 2, 200, 10000, 45)];
const usdtPool = (): Lot[] => [
  { id: 1, orderMs: Date.UTC(2026, 0, 1), price: 0.9, remaining: 500 },
];

/** The bolivares Jose typed. Same figure the client example ends up owing. */
const AMOUNT_VES = 21000;

/* -------------------------------------------------------------- moment 1 */

describe('computeNewPersonalSending', () => {
  it('stores the bolivares exactly as typed', () => {
    expect(computeNewPersonalSending({ amountVes: AMOUNT_VES })).toEqual({
      amountVesToPay: AMOUNT_VES,
    });
  });

  it('derives nothing: there is no EUR amount and no tasa to multiply', () => {
    expect(computeNewPersonalSending({ amountVes: 1 }).amountVesToPay).toBe(1);
    expect(computeNewPersonalSending({ amountVes: 0.5 }).amountVesToPay).toBe(0.5);
    expect(computeNewPersonalSending({ amountVes: 1234567.89 }).amountVesToPay).toBe(1234567.89);
  });

  it('refuses zero and negative amounts', () => {
    expect(() => computeNewPersonalSending({ amountVes: 0 })).toThrow(/bolivares/i);
    expect(() => computeNewPersonalSending({ amountVes: -1 })).toThrow(/bolivares/i);
  });

  it('refuses a non-number, the way a blank box would arrive', () => {
    expect(() => computeNewPersonalSending({ amountVes: Number.NaN })).toThrow(/bolivares/i);
  });
});

/* ---------------------------------------------------- moment 2a: from the pool */

describe('computePoolPayment - envio propio', () => {
  const personal = computePoolPayment({
    amountEur: null,
    amountVesToPay: AMOUNT_VES,
    payoutMethod: 'Provincial',
    vesLots: vesPool(),
  });
  const client = computePoolPayment({
    amountEur: 100,
    amountVesToPay: AMOUNT_VES,
    payoutMethod: 'Provincial',
    vesLots: vesPool(),
  });

  it('draws the pool exactly as a client sending of the same size does', () => {
    expect(personal.vesDrawn).toBe(client.vesDrawn);
    expect(personal.vesAllocations).toEqual(client.vesAllocations);
    expect(personal.vesLotUpdates).toEqual(client.vesLotUpdates);
    expect(personal.vesShortfall).toBe(client.vesShortfall);
  });

  it('costs it the same and attributes the same USDT', () => {
    expect(personal.costEur).toBeCloseTo(94.5, 10);
    expect(personal.costEur).toBeCloseTo(client.costEur, 10);
    expect(personal.usdtUsed).toBeCloseTo(105, 10);
    expect(personal.usdtUsed).toBeCloseTo(client.usdtUsed, 10);
  });

  it('reports no profit at all, not a profit of zero', () => {
    expect(personal.profitEur).toBeNull();
    expect(client.profitEur).toBeCloseTo(5.5, 10);
  });
});

describe('computePoolPayment - envio propio con Otro (fee)', () => {
  const result = computePoolPayment({
    amountEur: null,
    amountVesToPay: AMOUNT_VES,
    payoutMethod: 'Otro',
    vesLots: vesPool(),
  });

  it('still charges the 0,3%: the interbank hop does not care who it was for', () => {
    expect(result.feeApplied).toBe(true);
    expect(result.vesDrawn).toBeCloseTo(21063, 10);
    expect(result.costEur).toBeCloseTo(94.7835, 10);
    expect(result.usdtUsed).toBeCloseTo(105.315, 10);
  });

  it('leaves the profit null even though the cost went up', () => {
    expect(result.profitEur).toBeNull();
  });
});

/* -------------------------------------------------------- moment 2b: direct */

describe('computeDirectPayment - envio propio', () => {
  const personal = computeDirectPayment({
    amountEur: null,
    usdtSold: 105,
    usdtLots: usdtPool(),
  });
  const client = computeDirectPayment({
    amountEur: 100,
    usdtSold: 105,
    usdtLots: usdtPool(),
  });

  it('draws and costs the crypto pool exactly as a client sending does', () => {
    expect(personal.costEur).toBeCloseTo(94.5, 10);
    expect(personal.costEur).toBeCloseTo(client.costEur, 10);
    expect(personal.usdtUsed).toBe(105);
    expect(personal.usdtAllocations).toEqual(client.usdtAllocations);
    expect(personal.usdtLotUpdates).toEqual(client.usdtLotUpdates);
    expect(personal.usdtShortfall).toBe(client.usdtShortfall);
  });

  it('never charges a fee, propio or not: nothing moved between banks', () => {
    expect(personal.feeApplied).toBe(false);
    expect(client.feeApplied).toBe(false);
  });

  it('reports no profit at all, not a profit of zero', () => {
    expect(personal.profitEur).toBeNull();
    expect(client.profitEur).toBeCloseTo(5.5, 10);
  });
});
