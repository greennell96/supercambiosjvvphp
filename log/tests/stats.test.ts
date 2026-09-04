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

  it('composes the hero card averages consistently with its margin', () => {
    // Ganancia media / Ticket medio, taken over the same completed-envio set,
    // must ratio out to the same margin the card shows separately.
    const profit = 120;
    const revenue = 800;
    const count = 4;
    const avgProfit = averagePerItem(profit, count);
    const avgRevenue = averagePerItem(revenue, count);
    expect(avgProfit).not.toBeNull();
    expect(avgRevenue).not.toBeNull();
    expect((avgProfit as number) / (avgRevenue as number)).toBeCloseTo(
      (marginPercent(profit, revenue) as number) / 100,
    );
  });

  it('yields null, not a division by zero, when no envio completed yet', () => {
    // This is the '—' the hero card renders for Ticket medio / Ganancia media
    // before any envio has both sides settled.
    expect(averagePerItem(500, 0)).toBeNull();
  });
});
