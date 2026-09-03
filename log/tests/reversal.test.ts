import { describe, expect, it } from 'vitest';

import { applyIncomingToBackorders, drawFifo, poolBalance, type Lot } from '../lib/fifo';
import { computeDirectPayment } from '../lib/pricing';
import {
  compraDeletionBlocker,
  restoreDrawnAmounts,
  ventaDeletionBlocker,
  type PoolLot,
} from '../lib/reversal';

function lot(id: number, day: number, price: number, remaining: number): Lot {
  return { id, orderMs: Date.UTC(2026, 0, day), price, remaining };
}

function applyUpdates(lots: Lot[], updates: { id: number; remaining: number }[]): Lot[] {
  return lots.map((l) => {
    const update = updates.find((u) => u.id === l.id);
    return update ? { ...l, remaining: update.remaining } : l;
  });
}

/* ------------------------------------------------------ giving a draw back */

describe('restoreDrawnAmounts', () => {
  const pool: PoolLot[] = [
    { id: 1, remaining: 0 },
    { id: 2, remaining: 5500 },
  ];

  it('adds each allocation back onto the lot it came from', () => {
    const updates = restoreDrawnAmounts(pool, [
      { lotId: 1, amount: 20000 },
      { lotId: 2, amount: 5000 },
    ]);

    expect(updates).toEqual([
      { id: 1, remaining: 20000 },
      { id: 2, remaining: 10500 },
    ]);
  });

  it('touches only the lots the draw named', () => {
    expect(restoreDrawnAmounts(pool, [{ lotId: 2, amount: 5000 }])).toEqual([
      { id: 2, remaining: 10500 },
    ]);
  });

  it('gives one lot one update even when the draw hit it twice', () => {
    // drawFifo emits two allocations for the newest lot when it empties it and
    // then pushes it negative. Both have to land on the same update.
    const updates = restoreDrawnAmounts([{ id: 2, remaining: -9500 }], [
      { lotId: 2, amount: 10500 },
      { lotId: 2, amount: 9500 },
    ]);

    expect(updates).toEqual([{ id: 2, remaining: 10500 }]);
  });

  it('has nothing to do for a draw that never happened', () => {
    expect(restoreDrawnAmounts(pool, [])).toEqual([]);
  });

  it('refuses an allocation pointing at a lot that is not in the pool', () => {
    expect(() => restoreDrawnAmounts(pool, [{ lotId: 9, amount: 100 }])).toThrow(/no esta en el pool/i);
  });

  /**
   * The round trip that matters: draw, then give it back, and every lot is
   * exactly where it started.
   */
  it('undoes a FIFO draw that spanned two lots', () => {
    const start = [lot(1, 1, 200, 20000), lot(2, 2, 210, 10500)];
    const draw = drawFifo(start, 25000);
    const afterDraw = applyUpdates(start, draw.lotUpdates);

    const back = applyUpdates(afterDraw, restoreDrawnAmounts(afterDraw, draw.allocations));

    expect(back).toEqual(start);
    expect(poolBalance(back)).toBeCloseTo(30500, 10);
  });

  it('undoes a draw that had pushed the newest lot negative', () => {
    const start = [lot(1, 1, 200, 20000), lot(2, 2, 210, 10500)];
    const draw = drawFifo(start, 40000);
    const afterDraw = applyUpdates(start, draw.lotUpdates);
    expect(poolBalance(afterDraw)).toBeCloseTo(-9500, 10);

    const back = applyUpdates(afterDraw, restoreDrawnAmounts(afterDraw, draw.allocations));

    expect(back).toEqual(start);
    expect(poolBalance(back)).toBeCloseTo(30500, 10);
  });

  /**
   * An Envío USDT (migration 019) draws crypto_purchases through
   * computeDirectPayment, exactly like a direct client payout does — see
   * createUsdtSending. deleteSendingInTx gives that draw back through this
   * very restoreDrawnAmounts, against the sending_lot_allocations rows the
   * draw itself wrote, with no code of its own: this test is the proof that
   * reversing one really does fall out of the existing mechanism for free.
   */
  it("undoes an Envío USDT's draw the same way any other direct draw is undone", () => {
    const start = [lot(1, 1, 0.9, 200), lot(2, 2, 0.95, 1000)];
    const payment = computeDirectPayment({ amountEur: 250, usdtSold: 250, usdtLots: start });
    const afterDraw = applyUpdates(start, payment.usdtLotUpdates);
    expect(poolBalance(afterDraw)).toBeCloseTo(950, 10);

    const back = applyUpdates(afterDraw, restoreDrawnAmounts(afterDraw, payment.usdtAllocations));

    expect(back).toEqual(start);
    expect(poolBalance(back)).toBeCloseTo(1200, 10);
  });

  /**
   * The one case where the total is right but the ages are not. Documented in
   * restoreDrawnAmounts, and tested so it stays a known consequence rather than
   * a surprise.
   */
  it('restores the total, not the age, when a later lot had covered the debt', () => {
    const start = [lot(1, 1, 200, 20000)];
    const draw = drawFifo(start, 30000); // 10.000 short: lot 1 ends at -10.000
    const afterDraw = applyUpdates(start, draw.lotUpdates);

    // A new sale of 16.000 pays the 10.000 debt; 6.000 stay on the new lot.
    const applied = applyIncomingToBackorders(afterDraw, 16000);
    const afterSale = applyUpdates(afterDraw, applied.lotUpdates);
    afterSale.push(lot(2, 2, 205, applied.remainingForNewLot));
    expect(poolBalance(afterSale)).toBeCloseTo(6000, 10);

    // Undo the draw. The 30.000 go back onto lot 1, which is where they left.
    const back = applyUpdates(afterSale, restoreDrawnAmounts(afterSale, draw.allocations));

    expect(poolBalance(back)).toBeCloseTo(36000, 10);
    expect(back.find((l) => l.id === 1)?.remaining).toBeCloseTo(30000, 10);
    expect(back.find((l) => l.id === 2)?.remaining).toBeCloseTo(6000, 10);
    // 10.000 of what now sits on the old lot really arrived with the new one.
  });
});

/* --------------------------------------------------------------- refusals */

describe('ventaDeletionBlocker', () => {
  const untouched = {
    sendingAllocations: 0,
    remainingVes: 20000,
    vesReceived: 20000,
    usedToPayBackorders: 0,
  };

  it('lets an untouched sale go', () => {
    expect(ventaDeletionBlocker(untouched)).toBeNull();
  });

  it('refuses a sale a sending was paid out of, and says which way out', () => {
    const blocker = ventaDeletionBlocker({ ...untouched, sendingAllocations: 1 });
    expect(blocker).toMatch(/ya pago un envio/i);
    expect(blocker).toMatch(/borra primero/i);
  });

  it('refuses a sale whose bolivares moved without leaving a trail', () => {
    expect(ventaDeletionBlocker({ ...untouched, remainingVes: 19999 })).toMatch(
      /no tiene todos sus bolivares/i,
    );
  });

  it('refuses a sale that arrived into a hole and paid an older debt', () => {
    expect(ventaDeletionBlocker({ ...untouched, usedToPayBackorders: 500 })).toMatch(
      /venta anterior/i,
    );
  });

  it('ignores a floating point crumb on either check', () => {
    expect(
      ventaDeletionBlocker({
        ...untouched,
        remainingVes: 20000.00000001,
        usedToPayBackorders: 0.00000001,
      }),
    ).toBeNull();
  });

  it('names the sending before anything else, because that is the way out', () => {
    expect(
      ventaDeletionBlocker({
        sendingAllocations: 1,
        remainingVes: 0,
        vesReceived: 20000,
        usedToPayBackorders: 500,
      }),
    ).toMatch(/ya pago un envio/i);
  });
});

describe('compraDeletionBlocker', () => {
  const untouched = {
    sendingAllocations: 0,
    saleAllocations: 0,
    remainingUsdt: 500,
    usdtReceived: 500,
    usedToPayBackorders: 0,
  };

  it('lets an untouched purchase go', () => {
    expect(compraDeletionBlocker(untouched)).toBeNull();
  });

  it('refuses a purchase a direct sending was paid out of', () => {
    expect(compraDeletionBlocker({ ...untouched, sendingAllocations: 1 })).toMatch(
      /envio directo/i,
    );
  });

  it('refuses a purchase a Binance sale was funded by', () => {
    expect(compraDeletionBlocker({ ...untouched, saleAllocations: 1 })).toMatch(
      /financio una venta/i,
    );
  });

  it('refuses a purchase whose USDT moved without leaving a trail', () => {
    expect(compraDeletionBlocker({ ...untouched, remainingUsdt: 499 })).toMatch(
      /no tiene todos sus usdt/i,
    );
  });

  it('refuses a purchase that arrived into a hole and paid an older debt', () => {
    expect(compraDeletionBlocker({ ...untouched, usedToPayBackorders: 25 })).toMatch(
      /compra anterior/i,
    );
  });

  it('ignores a floating point crumb on either check', () => {
    expect(
      compraDeletionBlocker({
        ...untouched,
        remainingUsdt: 499.99999999,
        usedToPayBackorders: 0.00000001,
      }),
    ).toBeNull();
  });
});
