import { describe, expect, it } from 'vitest';

import { averagePerItem, marginPercent } from '../lib/stats';

describe('statistics display math', () => {
  it('derives realized margin from profit and handled EUR', () => {
    expect(marginPercent(25, 500)).toBe(5);
  });

  it('does not invent a margin or average without a denominator', () => {
    expect(marginPercent(0, 0)).toBeNull();
    expect(averagePerItem(0, 0)).toBeNull();
  });

  it('keeps negative realized profit visible', () => {
    expect(marginPercent(-10, 100)).toBe(-10);
    expect(averagePerItem(-10, 2)).toBe(-5);
  });
});
