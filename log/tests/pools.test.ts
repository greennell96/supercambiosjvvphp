import { describe, expect, it } from 'vitest';

import { vesToEurPriceVesPerEur } from '../lib/pools';

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
