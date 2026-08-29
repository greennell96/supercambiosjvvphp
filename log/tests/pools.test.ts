import { describe, expect, it } from 'vitest';

import { DEPLETION_EPSILON, type Lot } from '../lib/fifo';
import { poolWeightedAveragePrice, vesToEurPriceVesPerEur } from '../lib/pools';

describe('vesToEurPriceVesPerEur', () => {
  it('derives the pool price from the two entered amounts', () => {
    expect(vesToEurPriceVesPerEur(100, 21000)).toBe(210);
  });

  it('rejects a non-positive EUR amount', () => {
    expect(() => vesToEurPriceVesPerEur(0, 21000)).toThrow(/EUR acordados/i);
  });

  it('rejects a non-positive VES amount', () => {
    expect(() => vesToEurPriceVesPerEur(100, 0)).toThrow(/bolivares recibidos/i);
  });
});

describe('poolWeightedAveragePrice', () => {
  const lot = (id: number, price: number, remaining: number): Lot => ({
    id,
    orderMs: id,
    price,
    remaining,
  });

  it('weights each lot by what is LEFT of it', () => {
    // 100 left at 0,90 and 300 left at 1,00 => (90 + 300) / 400
    expect(poolWeightedAveragePrice([lot(1, 0.9, 100), lot(2, 1, 300)])).toBeCloseTo(0.975, 12);
  });

  it('is the lot price itself when a single lot holds the whole pool', () => {
    expect(poolWeightedAveragePrice([lot(1, 0.92, 500)])).toBe(0.92);
  });

  it('excludes a fully depleted lot, however cheap it was', () => {
    // The 0,50 lot is spent. Averaging it in would report a pool cheaper than
    // anything actually left in it — the lifetime-average mistake.
    expect(poolWeightedAveragePrice([lot(1, 0.5, 0), lot(2, 0.92, 500)])).toBe(0.92);
  });

  it('excludes a lot left with only floating point crumbs', () => {
    const crumbs = [lot(1, 0.5, DEPLETION_EPSILON), lot(2, 0.92, 500)];
    expect(poolWeightedAveragePrice(crumbs)).toBe(0.92);
  });

  it('excludes a backordered lot rather than letting it weigh negatively', () => {
    expect(poolWeightedAveragePrice([lot(1, 0.92, 500), lot(2, 1.5, -100)])).toBe(0.92);
  });

  it('averages only the active lots when the pool is mixed', () => {
    const mixed = [
      lot(1, 0.5, 0), // spent
      lot(2, 0.8, 200),
      lot(3, 1, 200),
      lot(4, 2, -50), // backordered
    ];
    expect(poolWeightedAveragePrice(mixed)).toBeCloseTo(0.9, 12);
  });

  it('returns null for a pool with no lots at all', () => {
    expect(poolWeightedAveragePrice([])).toBeNull();
  });

  it('returns null when every lot is spent', () => {
    expect(poolWeightedAveragePrice([lot(1, 0.9, 0), lot(2, 1, 0)])).toBeNull();
  });

  it('returns null when the only lots left are backorders', () => {
    expect(poolWeightedAveragePrice([lot(1, 0.9, -30)])).toBeNull();
  });
});
