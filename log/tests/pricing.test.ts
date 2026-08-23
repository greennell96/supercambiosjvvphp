import { describe, expect, it } from 'vitest';

import type { Lot } from '../lib/fifo';
import {
  FEE_MULTIPLIER,
  computeAmountVesToPay,
  computeDirectPayment,
  computeNewSending,
  computePoolPayment,
  computeVesToDraw,
  isFeeApplied,
  payoutMethodOptions,
  SENDING_PAYOUT_METHODS,
} from '../lib/pricing';

function lot(id: number, day: number, price: number, remaining: number): Lot {
  return { id, orderMs: Date.UTC(2026, 0, day), price, remaining };
}

/**
 * The running example: the client hands over 100 EUR at a tasa of 210 Bs/EUR,
 * so the beneficiary must receive 21.000 Bs.
 *
 * The VES pool holds two Binance sales, both at 200 Bs/USDT, so 21.000 Bs is
 * 105 USDT. The crypto pool holds USDT bought at 0,90 EUR.
 */
const AMOUNT_EUR = 100;
const RATE_TASA = 210;
const AMOUNT_VES_TO_PAY = 21000;

const vesPool = () => [lot(1, 1, 200, 20000), lot(2, 2, 200, 10000)];
const usdtPool = () => [lot(1, 1, 0.9, 500)];

/* --------------------------------------------------- moment 1: the sending is logged */

describe('computeNewSending', () => {
  it('only works out the bolivares owed; cost is not knowable yet', () => {
    expect(computeNewSending({ amountEur: AMOUNT_EUR, rateTasa: RATE_TASA })).toEqual({
      amountVesToPay: 21000,
    });
  });

  it('uses the tasa it is given, per sending', () => {
    expect(computeNewSending({ amountEur: 50, rateTasa: 195 }).amountVesToPay).toBe(9750);
    expect(computeNewSending({ amountEur: 50, rateTasa: 205 }).amountVesToPay).toBe(10250);
  });

  it('rejects a non-positive amount', () => {
    expect(() => computeNewSending({ amountEur: 0, rateTasa: RATE_TASA })).toThrow(/monto en EUR/i);
  });

  it('rejects a non-positive tasa', () => {
    expect(() => computeNewSending({ amountEur: AMOUNT_EUR, rateTasa: 0 })).toThrow(/tasa EUR\/VES/i);
  });
});

describe('computeAmountVesToPay', () => {
  it('is just amount * tasa', () => {
    expect(computeAmountVesToPay(AMOUNT_EUR, RATE_TASA)).toBe(21000);
  });
});

/* ----------------------------------------------------------------- the 0,3% fee */

describe('SENDING_PAYOUT_METHODS', () => {
  it('is the fixed three-value list the envio form offers', () => {
    expect(SENDING_PAYOUT_METHODS).toEqual(['Provincial', 'Otro', 'Directa']);
  });

  it('charges the interbank fee on exactly one of them', () => {
    expect(SENDING_PAYOUT_METHODS.filter(isFeeApplied)).toEqual(['Otro']);
  });
});

describe('payoutMethodOptions - the dropdown when editing an existing sending', () => {
  it('offers just the three when the sending already uses one of them', () => {
    for (const method of SENDING_PAYOUT_METHODS) {
      expect(payoutMethodOptions(method)).toEqual(['Provincial', 'Otro', 'Directa']);
    }
  });

  it('keeps a value from before the fixed list, so saving cannot rewrite it', () => {
    expect(payoutMethodOptions('Pago Móvil')).toEqual([
      'Pago Móvil',
      'Provincial',
      'Otro',
      'Directa',
    ]);
    expect(payoutMethodOptions('Banesco')).toEqual(['Banesco', 'Provincial', 'Otro', 'Directa']);
  });

  it('keeps a near-miss too, rather than folding it into a different method', () => {
    // A stored "otro" must not be silently promoted, and must never end up as
    // "Provincial" just because it did not match exactly.
    expect(payoutMethodOptions('otro')).toEqual(['otro', 'Provincial', 'Otro', 'Directa']);
    expect(payoutMethodOptions('Otro Banco')[0]).toBe('Otro Banco');
  });

  it('falls back to the three when nothing is stored', () => {
    expect(payoutMethodOptions('')).toEqual(['Provincial', 'Otro', 'Directa']);
    expect(payoutMethodOptions('   ')).toEqual(['Provincial', 'Otro', 'Directa']);
    expect(payoutMethodOptions(null)).toEqual(['Provincial', 'Otro', 'Directa']);
    expect(payoutMethodOptions(undefined)).toEqual(['Provincial', 'Otro', 'Directa']);
  });

  it('trims, so a padded stored value still matches its own option', () => {
    expect(payoutMethodOptions('  Otro  ')).toEqual(['Provincial', 'Otro', 'Directa']);
  });
});

describe('isFeeApplied', () => {
  it('applies to Otro only: it is the only one that leaves the bank', () => {
    expect(isFeeApplied('Otro')).toBe(true);
    // Provincial stays inside Jose's own bank, Directa never enters his pool.
    expect(isFeeApplied('Provincial')).toBe(false);
    expect(isFeeApplied('Directa')).toBe(false);
  });

  it('ignores case, accents and stray whitespace', () => {
    expect(isFeeApplied('otro')).toBe(true);
    expect(isFeeApplied('OTRO')).toBe(true);
    expect(isFeeApplied('  Otro  ')).toBe(true);
    expect(isFeeApplied('provincial')).toBe(false);
    expect(isFeeApplied('DIRECTA')).toBe(false);
  });

  it('never applies to a bank name, including old rows that stored one', () => {
    // Sendings logged before the fixed list existed hold a real bank name or
    // "Pago Movil". None of them may start charging a fee retroactively.
    expect(isFeeApplied('Banesco')).toBe(false);
    expect(isFeeApplied('CaixaBank')).toBe(false);
    expect(isFeeApplied('Banco de Venezuela')).toBe(false);
    expect(isFeeApplied('Pago Móvil')).toBe(false);
    expect(isFeeApplied('Otro Banco')).toBe(false); // not exactly "Otro"
  });
});

describe('computeVesToDraw', () => {
  it('takes 0,3% more out of the pool when the fee applies', () => {
    expect(computeVesToDraw(AMOUNT_VES_TO_PAY, false)).toBe(21000);
    expect(computeVesToDraw(AMOUNT_VES_TO_PAY, true)).toBeCloseTo(21000 * FEE_MULTIPLIER, 10);
  });
});

/* ------------------------------------------- moment 2a: paid out of the VES pool */

// "Banesco" is not offered any more — the form only writes Provincial/Otro/
// Directa — but rows logged before the fixed list still hold a bank name, and
// paying one of those has to keep working exactly as it always did.
describe('computePoolPayment - a stored bank name (no fee)', () => {
  const result = computePoolPayment({
    amountEur: AMOUNT_EUR,
    amountVesToPay: AMOUNT_VES_TO_PAY,
    payoutMethod: 'Banesco',
    vesLots: vesPool(),
    usdtLots: usdtPool(),
  });

  it('charges no fee, so it draws exactly what the beneficiary receives', () => {
    expect(result.feeApplied).toBe(false);
    expect(result.vesDrawn).toBe(21000);
  });

  it('empties the oldest sale first and records both draws', () => {
    expect(result.vesAllocations).toEqual([
      { lotId: 1, amount: 20000, price: 200 },
      { lotId: 2, amount: 1000, price: 200 },
    ]);
    expect(result.vesLotUpdates).toEqual([
      { id: 1, remaining: 0 },
      { id: 2, remaining: 9000 },
    ]);
    expect(result.vesShortfall).toBe(0);
  });

  it('turns the bolivares drawn back into the USDT they represented', () => {
    // 20.000/200 + 1.000/200
    expect(result.usdtUsed).toBeCloseTo(105, 10);
  });

  it('costs that USDT against the crypto pool and leaves 5,50 EUR of profit', () => {
    expect(result.usdtAllocations).toEqual([{ lotId: 1, amount: 105, price: 0.9 }]);
    expect(result.usdtLotUpdates).toEqual([{ id: 1, remaining: 395 }]);
    expect(result.costEur).toBeCloseTo(94.5, 10);
    expect(result.profitEur).toBeCloseTo(5.5, 10);
    expect(result.usdtShortfall).toBe(0);
  });
});

describe('computePoolPayment - Otro (fee)', () => {
  const result = computePoolPayment({
    amountEur: AMOUNT_EUR,
    amountVesToPay: AMOUNT_VES_TO_PAY,
    payoutMethod: 'Otro',
    vesLots: vesPool(),
    usdtLots: usdtPool(),
  });

  it('draws 0,3% more bolivares than the beneficiary receives', () => {
    expect(result.feeApplied).toBe(true);
    expect(result.vesDrawn).toBeCloseTo(21063, 10); // 21.000 * 1.003
  });

  it('costs the extra bolivares too, so the profit is lower', () => {
    expect(result.usdtUsed).toBeCloseTo(105.315, 10);
    expect(result.costEur).toBeCloseTo(94.7835, 10); // 105.315 * 0.90
    expect(result.profitEur).toBeCloseTo(5.2165, 10);
    expect(result.profitEur).toBeLessThan(5.5);
  });

  it('takes the extra out of the pool, never off the beneficiary', () => {
    const totalDrawn = result.vesAllocations.reduce((t, a) => t + a.amount, 0);
    expect(totalDrawn).toBeCloseTo(21063, 10);
    expect(totalDrawn).toBeGreaterThan(AMOUNT_VES_TO_PAY);
  });
});

describe('computePoolPayment - Provincial and Directa (no fee)', () => {
  // Either can still be settled from the pool: what was picked when the sending
  // was logged is a plan, not a lock on which "marcar pagado" button is used.
  const pay = (payoutMethod: string) =>
    computePoolPayment({
      amountEur: AMOUNT_EUR,
      amountVesToPay: AMOUNT_VES_TO_PAY,
      payoutMethod,
      vesLots: vesPool(),
      usdtLots: usdtPool(),
    });

  it('draws exactly what the beneficiary receives, with no 0,3% on top', () => {
    for (const method of ['Provincial', 'Directa']) {
      const result = pay(method);
      expect(result.feeApplied).toBe(false);
      expect(result.vesDrawn).toBe(21000);
    }
  });

  it('costs the same as any other fee-free payout', () => {
    for (const method of ['Provincial', 'Directa']) {
      const result = pay(method);
      expect(result.usdtUsed).toBeCloseTo(105, 10);
      expect(result.costEur).toBeCloseTo(94.5, 10);
      expect(result.profitEur).toBeCloseTo(5.5, 10);
    }
  });
});

describe('computePoolPayment - blending prices and running short', () => {
  it('blends two different sale prices into one USDT figure', () => {
    const result = computePoolPayment({
      amountEur: AMOUNT_EUR,
      amountVesToPay: AMOUNT_VES_TO_PAY,
      payoutMethod: 'Banesco',
      vesLots: [lot(1, 1, 200, 20000), lot(2, 2, 210, 10000)],
      usdtLots: usdtPool(),
    });

    // 20.000/200 + 1.000/210
    expect(result.usdtUsed).toBeCloseTo(100 + 1000 / 210, 10);
    expect(result.costEur).toBeCloseTo((100 + 1000 / 210) * 0.9, 10);
  });

  it('blends two crypto purchase prices into one cost', () => {
    const result = computePoolPayment({
      amountEur: AMOUNT_EUR,
      amountVesToPay: AMOUNT_VES_TO_PAY,
      payoutMethod: 'Banesco',
      vesLots: vesPool(),
      usdtLots: [lot(1, 1, 0.8, 50), lot(2, 2, 0.9, 100)],
    });

    expect(result.usdtUsed).toBeCloseTo(105, 10);
    // 50 * 0.80 + 55 * 0.90
    expect(result.costEur).toBeCloseTo(89.5, 10);
    expect(result.profitEur).toBeCloseTo(10.5, 10);
  });

  it('still pays when the VES account is short, and reports it', () => {
    const result = computePoolPayment({
      amountEur: AMOUNT_EUR,
      amountVesToPay: AMOUNT_VES_TO_PAY,
      payoutMethod: 'Banesco',
      vesLots: [lot(1, 1, 200, 20000)],
      usdtLots: usdtPool(),
    });

    expect(result.vesShortfall).toBeCloseTo(1000, 10);
    expect(result.vesLotUpdates).toEqual([{ id: 1, remaining: -1000 }]);
    expect(result.usdtUsed).toBeCloseTo(105, 10); // uncovered Bs priced at the same lot
  });

  it('still pays when the crypto pool is short, and reports it', () => {
    const result = computePoolPayment({
      amountEur: AMOUNT_EUR,
      amountVesToPay: AMOUNT_VES_TO_PAY,
      payoutMethod: 'Banesco',
      vesLots: vesPool(),
      usdtLots: [lot(1, 1, 0.9, 40)],
    });

    expect(result.usdtUsed).toBeCloseTo(105, 10);
    expect(result.usdtShortfall).toBeCloseTo(65, 10);
    expect(result.usdtLotUpdates).toEqual([{ id: 1, remaining: -65 }]);
    expect(result.costEur).toBeCloseTo(94.5, 10);
  });
});

describe('computePoolPayment - guards', () => {
  it('refuses when no Binance sale has been logged', () => {
    expect(() =>
      computePoolPayment({
        amountEur: AMOUNT_EUR,
        amountVesToPay: AMOUNT_VES_TO_PAY,
        payoutMethod: 'Banesco',
        vesLots: [],
        usdtLots: usdtPool(),
      }),
    ).toThrow(/No hay ventas de USDT/i);
  });

  it('refuses when no crypto purchase has been logged', () => {
    expect(() =>
      computePoolPayment({
        amountEur: AMOUNT_EUR,
        amountVesToPay: AMOUNT_VES_TO_PAY,
        payoutMethod: 'Banesco',
        vesLots: vesPool(),
        usdtLots: [],
      }),
    ).toThrow(/No hay compras de cripto/i);
  });

  it('refuses a sending with nothing to pay', () => {
    expect(() =>
      computePoolPayment({
        amountEur: AMOUNT_EUR,
        amountVesToPay: 0,
        payoutMethod: 'Banesco',
        vesLots: vesPool(),
        usdtLots: usdtPool(),
      }),
    ).toThrow(/bolivares que pagar/i);
  });
});

/* ------------------------------------------- moment 2b: sold straight to the client */

describe('computeDirectPayment', () => {
  const result = computeDirectPayment({
    amountEur: AMOUNT_EUR,
    usdtSold: 103,
    usdtLots: usdtPool(),
  });

  it('never touches the VES pool', () => {
    expect(result.vesDrawn).toBe(0);
    expect(result.vesAllocations).toEqual([]);
    expect(result.vesLotUpdates).toEqual([]);
    expect(result.vesShortfall).toBe(0);
  });

  it('charges no interbank fee, because nothing moved between banks', () => {
    expect(result.feeApplied).toBe(false);
  });

  it('takes the USDT figure Jose gives it, verbatim', () => {
    expect(result.usdtUsed).toBe(103);
  });

  it('costs that USDT against the crypto pool exactly like a pool payment', () => {
    expect(result.usdtAllocations).toEqual([{ lotId: 1, amount: 103, price: 0.9 }]);
    expect(result.usdtLotUpdates).toEqual([{ id: 1, remaining: 397 }]);
    expect(result.costEur).toBeCloseTo(92.7, 10);
    expect(result.profitEur).toBeCloseTo(7.3, 10);
  });

  it('can still push the crypto pool into a backorder', () => {
    const short = computeDirectPayment({
      amountEur: AMOUNT_EUR,
      usdtSold: 103,
      usdtLots: [lot(1, 1, 0.9, 40)],
    });
    expect(short.usdtShortfall).toBeCloseTo(63, 10);
    expect(short.usdtLotUpdates).toEqual([{ id: 1, remaining: -63 }]);
  });

  it('rejects a non-positive USDT figure', () => {
    expect(() =>
      computeDirectPayment({ amountEur: AMOUNT_EUR, usdtSold: 0, usdtLots: usdtPool() }),
    ).toThrow(/USDT vendidos/i);
  });

  it('refuses when no crypto purchase has been logged', () => {
    expect(() =>
      computeDirectPayment({ amountEur: AMOUNT_EUR, usdtSold: 103, usdtLots: [] }),
    ).toThrow(/No hay compras de cripto/i);
  });
});

/* ---------------------------------------------- the two paths, side by side */

describe('pool vs direct on the same sending', () => {
  it('both produce a cost and a profit from the same crypto pool', () => {
    const pool = computePoolPayment({
      amountEur: AMOUNT_EUR,
      amountVesToPay: AMOUNT_VES_TO_PAY,
      payoutMethod: 'Banesco',
      vesLots: vesPool(),
      usdtLots: usdtPool(),
    });
    const direct = computeDirectPayment({
      amountEur: AMOUNT_EUR,
      usdtSold: 105,
      usdtLots: usdtPool(),
    });

    // Selling exactly the same USDT either way costs exactly the same.
    expect(direct.usdtUsed).toBeCloseTo(pool.usdtUsed, 10);
    expect(direct.costEur).toBeCloseTo(pool.costEur, 10);
    expect(direct.profitEur).toBeCloseTo(pool.profitEur, 10);
    // The difference is only where the bolivares came from.
    expect(pool.vesAllocations.length).toBeGreaterThan(0);
    expect(direct.vesAllocations).toHaveLength(0);
  });
});
