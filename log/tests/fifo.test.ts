import { describe, expect, it } from 'vitest';

import {
  DEPLETION_EPSILON,
  applyIncomingToBackorders,
  drawFifo,
  isBackordered,
  isDepleted,
  poolBalance,
  sumAmountDividedByPrice,
  sumAmountTimesPrice,
  type Lot,
} from '../lib/fifo';

/**
 * Small helper so the tests read like a ledger. `price` means whatever the pool
 * says it means: EUR per USDT in the crypto pool, VES per USDT in the VES pool.
 */
function lot(id: number, day: number, price: number, remaining: number): Lot {
  return { id, orderMs: Date.UTC(2026, 0, day), price, remaining };
}

describe('isDepleted / isBackordered', () => {
  it('treats floating point crumbs as empty, not as stock', () => {
    expect(isDepleted(0.00000005)).toBe(true);
    expect(isDepleted(0)).toBe(true);
    expect(isDepleted(DEPLETION_EPSILON)).toBe(true);
    expect(isDepleted(0.001)).toBe(false);
    expect(isDepleted(-5)).toBe(true);
  });

  it('only calls a real negative balance a backorder', () => {
    expect(isBackordered(-5)).toBe(true);
    expect(isBackordered(-0.00000005)).toBe(false);
    expect(isBackordered(0)).toBe(false);
    expect(isBackordered(10)).toBe(false);
  });
});

describe('drawFifo - single lot', () => {
  it('draws part of one lot', () => {
    const result = drawFifo([lot(1, 1, 0.9, 500)], 105);

    expect(result.allocations).toEqual([{ lotId: 1, amount: 105, price: 0.9 }]);
    expect(result.lotUpdates).toEqual([{ id: 1, remaining: 395 }]);
    expect(sumAmountTimesPrice(result.allocations)).toBeCloseTo(94.5, 10);
    expect(result.shortfall).toBe(0);
  });

  it('depletes a lot exactly, leaving it at zero', () => {
    const result = drawFifo([lot(1, 1, 0.8, 50)], 50);

    expect(result.allocations).toHaveLength(1);
    expect(result.lotUpdates).toEqual([{ id: 1, remaining: 0 }]);
    expect(isDepleted(result.lotUpdates[0].remaining)).toBe(true);
    expect(sumAmountTimesPrice(result.allocations)).toBeCloseTo(40, 10);
    expect(result.shortfall).toBe(0);
  });
});

describe('drawFifo - spanning several lots', () => {
  const lots = [lot(1, 1, 0.8, 50), lot(2, 2, 0.9, 100)];

  it('empties the oldest lot first, then moves to the next', () => {
    const result = drawFifo(lots, 105);

    expect(result.allocations).toEqual([
      { lotId: 1, amount: 50, price: 0.8 },
      { lotId: 2, amount: 55, price: 0.9 },
    ]);
    expect(result.lotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: 45 },
    ]);
    // 50 * 0.80 + 55 * 0.90
    expect(sumAmountTimesPrice(result.allocations)).toBeCloseTo(89.5, 10);
    expect(result.shortfall).toBe(0);
  });

  it('spans three lots when needed', () => {
    const three = [lot(1, 1, 0.8, 10), lot(2, 2, 0.9, 10), lot(3, 3, 1, 10)];
    const result = drawFifo(three, 25);

    expect(result.allocations.map((a) => [a.lotId, a.amount])).toEqual([
      [1, 10],
      [2, 10],
      [3, 5],
    ]);
    // 8 + 9 + 5
    expect(sumAmountTimesPrice(result.allocations)).toBeCloseTo(22, 10);
  });

  it('uses the FIFO timestamp for order, not the order rows arrive in', () => {
    const shuffled = [lot(2, 2, 0.9, 100), lot(1, 1, 0.8, 50)];
    const result = drawFifo(shuffled, 60);

    expect(result.allocations[0].lotId).toBe(1);
    expect(result.allocations[1].lotId).toBe(2);
  });

  it('skips lots that are already empty or already negative', () => {
    const mixed = [lot(1, 1, 0.8, 0), lot(2, 2, 1, -50), lot(3, 3, 0.95, 100)];
    const result = drawFifo(mixed, 40);

    expect(result.allocations).toEqual([{ lotId: 3, amount: 40, price: 0.95 }]);
    expect(result.lotUpdates).toEqual([{ id: 3, remaining: 60 }]);
    expect(result.shortfall).toBe(0);
  });
});

describe('drawFifo - backorder (pool cannot cover the draw)', () => {
  it('pushes the newest lot negative instead of erroring', () => {
    const lots = [lot(1, 1, 0.8, 30), lot(2, 2, 1, 20)];
    const result = drawFifo(lots, 100);

    expect(result.shortfall).toBeCloseTo(50, 10);
    expect(result.allocations).toEqual([
      { lotId: 1, amount: 30, price: 0.8 },
      { lotId: 2, amount: 20, price: 1 },
      { lotId: 2, amount: 50, price: 1 },
    ]);
    // The newest lot ends at 20 - 20 - 50 = -50, written back once.
    expect(result.lotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: -50 },
    ]);
    // 30 * 0.80 + 20 * 1 + 50 * 1  (the uncovered part is priced at the newest lot)
    expect(sumAmountTimesPrice(result.allocations)).toBeCloseTo(94, 10);
  });

  it('charges the newest lot even when every lot is already empty', () => {
    const lots = [lot(1, 1, 0.8, 0), lot(2, 2, 0.95, 0)];
    const result = drawFifo(lots, 40);

    expect(result.allocations).toEqual([{ lotId: 2, amount: 40, price: 0.95 }]);
    expect(result.lotUpdates).toEqual([{ id: 2, remaining: -40 }]);
    expect(sumAmountTimesPrice(result.allocations)).toBeCloseTo(38, 10);
    expect(result.shortfall).toBeCloseTo(40, 10);
  });

  it('deepens an existing negative balance on the newest lot', () => {
    const lots = [lot(1, 1, 0.8, 0), lot(2, 2, 1, -50)];
    const result = drawFifo(lots, 10);

    expect(result.lotUpdates).toEqual([{ id: 2, remaining: -60 }]);
    expect(result.shortfall).toBeCloseTo(10, 10);
  });

  it('refuses only when there is no lot at all to price against', () => {
    expect(() => drawFifo([], 10)).toThrow(/no tiene ningun lote/i);
  });

  it('uses the caller-supplied message for an empty pool', () => {
    expect(() => drawFifo([], 10, { emptyPoolMessage: 'No hay ventas.' })).toThrow('No hay ventas.');
  });

  it('does nothing for a zero draw', () => {
    const result = drawFifo([lot(1, 1, 0.9, 100)], 0);
    expect(result.allocations).toEqual([]);
    expect(result.lotUpdates).toEqual([]);
    expect(sumAmountTimesPrice(result.allocations)).toBe(0);
  });
});

describe('applyIncomingToBackorders', () => {
  it('pays a single negative lot down and keeps the leftover', () => {
    const lots = [lot(1, 1, 0.8, 0), lot(2, 2, 1, -50)];
    const applied = applyIncomingToBackorders(lots, 80);

    expect(applied.lotUpdates).toEqual([{ id: 2, remaining: 0 }]);
    expect(applied.usedToPayBackorders).toBeCloseTo(50, 10);
    expect(applied.remainingForNewLot).toBeCloseTo(30, 10);
  });

  it('pays the oldest debt first and can leave a later one still negative', () => {
    const lots = [lot(1, 1, 0.8, -10), lot(2, 2, 1, -25)];
    const applied = applyIncomingToBackorders(lots, 20);

    expect(applied.lotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: -15 },
    ]);
    expect(applied.usedToPayBackorders).toBeCloseTo(20, 10);
    expect(applied.remainingForNewLot).toBeCloseTo(0, 10);
  });

  it('clears every debt when the incoming amount covers them all', () => {
    const lots = [lot(1, 1, 0.8, -10), lot(2, 2, 1, -25)];
    const applied = applyIncomingToBackorders(lots, 100);

    expect(applied.lotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: 0 },
    ]);
    expect(applied.remainingForNewLot).toBeCloseTo(65, 10);
  });

  it('leaves a healthy pool untouched', () => {
    const lots = [lot(1, 1, 0.8, 10), lot(2, 2, 1, 0)];
    const applied = applyIncomingToBackorders(lots, 100);

    expect(applied.lotUpdates).toEqual([]);
    expect(applied.usedToPayBackorders).toBe(0);
    expect(applied.remainingForNewLot).toBe(100);
  });

  it('self-corrects the pool: draw into the red, then buy, and the balance adds up', () => {
    // Start with 50 USDT, send 100 -> 50 owed.
    const start = [lot(1, 1, 0.8, 30), lot(2, 2, 1, 20)];
    const draw = drawFifo(start, 100);
    const afterDraw = applyUpdates(start, draw.lotUpdates);
    expect(poolBalance(afterDraw)).toBeCloseTo(-50, 10);

    // Then buy 200 USDT. 50 pays the debt, 150 becomes the new lot.
    const applied = applyIncomingToBackorders(afterDraw, 200);
    const afterPurchase = applyUpdates(afterDraw, applied.lotUpdates);
    afterPurchase.push(lot(3, 3, 0.92, applied.remainingForNewLot));

    expect(applied.remainingForNewLot).toBeCloseTo(150, 10);
    expect(poolBalance(afterPurchase)).toBeCloseTo(150, 10);
    // -50 + 200 = 150. The pool is healthy again.
  });
});

/* --------------------------------------------------------------------------
 * The same engine, driven as the VES pool.
 *
 * Here a lot is a Binance sale: `remaining` is bolivares still sitting in the
 * account and `price` is VES per USDT. Draws are in bolivares, and what matters
 * is not amount * price but amount / price — the USDT those bolivares
 * represented.
 * ------------------------------------------------------------------------ */

function applyUpdates(lots: Lot[], updates: { id: number; remaining: number }[]): Lot[] {
  return lots.map((l) => {
    const update = updates.find((u) => u.id === l.id);
    return update ? { ...l, remaining: update.remaining } : l;
  });
}

describe('drawFifo as the VES pool', () => {
  // Sold 100 USDT at 200 Bs -> 20.000 Bs; then 50 USDT at 210 Bs -> 10.500 Bs.
  const sales = [lot(1, 1, 200, 20000), lot(2, 2, 210, 10500)];

  it('draws bolivares from the oldest sale first', () => {
    const result = drawFifo(sales, 15000);

    expect(result.allocations).toEqual([{ lotId: 1, amount: 15000, price: 200 }]);
    expect(result.lotUpdates).toEqual([{ id: 1, remaining: 5000 }]);
    // 15.000 Bs bought at 200 Bs/USDT was 75 USDT.
    expect(sumAmountDividedByPrice(result.allocations)).toBeCloseTo(75, 10);
  });

  it('empties a sale exactly', () => {
    const result = drawFifo(sales, 20000);

    expect(result.lotUpdates).toEqual([{ id: 1, remaining: 0 }]);
    expect(sumAmountDividedByPrice(result.allocations)).toBeCloseTo(100, 10);
    expect(result.shortfall).toBe(0);
  });

  it('spans two sales and blends their two prices into one USDT figure', () => {
    const result = drawFifo(sales, 25000);

    expect(result.allocations).toEqual([
      { lotId: 1, amount: 20000, price: 200 },
      { lotId: 2, amount: 5000, price: 210 },
    ]);
    // 20.000/200 + 5.000/210 = 100 + 23.809523...
    expect(sumAmountDividedByPrice(result.allocations)).toBeCloseTo(100 + 5000 / 210, 10);
    expect(result.lotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: 5500 },
    ]);
  });

  it('goes negative on the newest sale when the account cannot cover a payout', () => {
    const result = drawFifo(sales, 40000);

    expect(result.shortfall).toBeCloseTo(9500, 10);
    expect(result.lotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: -9500 },
    ]);
    // The uncovered bolivares are valued at the newest sale's price.
    expect(sumAmountDividedByPrice(result.allocations)).toBeCloseTo(
      20000 / 200 + 10500 / 210 + 9500 / 210,
      10,
    );
  });

  it('refuses to pay from the pool when no sale has been logged', () => {
    expect(() =>
      drawFifo([], 5000, { emptyPoolMessage: 'No hay ventas de USDT registradas.' }),
    ).toThrow(/No hay ventas de USDT/);
  });

  it('lets a later sale pay down an older negative balance', () => {
    const afterOverdraw = applyUpdates(sales, drawFifo(sales, 40000).lotUpdates);
    expect(poolBalance(afterOverdraw)).toBeCloseTo(-9500, 10);

    // A new sale of 80 USDT at 205 Bs brings in 16.400 Bs.
    const applied = applyIncomingToBackorders(afterOverdraw, 16400);
    expect(applied.usedToPayBackorders).toBeCloseTo(9500, 10);
    expect(applied.remainingForNewLot).toBeCloseTo(6900, 10);

    const afterSale = applyUpdates(afterOverdraw, applied.lotUpdates);
    afterSale.push(lot(3, 3, 205, applied.remainingForNewLot));
    expect(poolBalance(afterSale)).toBeCloseTo(6900, 10);
  });

  it('will not divide by a zero-priced lot', () => {
    expect(() => sumAmountDividedByPrice([{ lotId: 1, amount: 100, price: 0 }])).toThrow(
      /precio cero/i,
    );
  });
});

describe('poolBalance', () => {
  it('adds every lot, negatives included', () => {
    expect(poolBalance([lot(1, 1, 0.8, 30), lot(2, 2, 1, -50)])).toBeCloseTo(-20, 10);
    expect(poolBalance([])).toBe(0);
  });
});
