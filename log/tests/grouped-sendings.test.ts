import { describe, expect, it } from 'vitest';

import { computeCreatedSendingParts } from '../lib/grouped-sendings';

describe('computeCreatedSendingParts', () => {
  it('keeps a normal sending as one row', () => {
    expect(
      computeCreatedSendingParts({
        totalAmountEur: 110,
        rateTasa: 200,
        primaryPayoutMethod: 'Provincial',
        additionalParts: [],
      }),
    ).toEqual([{ amountEur: 110, payoutMethod: 'Provincial', amountVesToPay: 22_000 }]);
  });

  it('derives the first remainder and preserves the total across several parts', () => {
    const parts = computeCreatedSendingParts({
      totalAmountEur: 110,
      rateTasa: 200,
      primaryPayoutMethod: 'Provincial',
      additionalParts: [
        { amountEur: 20, payoutMethod: 'Otro' },
        { amountEur: 30, payoutMethod: 'Directa' },
      ],
    });

    expect(parts).toEqual([
      { amountEur: 60, payoutMethod: 'Provincial', amountVesToPay: 12_000 },
      { amountEur: 20, payoutMethod: 'Otro', amountVesToPay: 4_000 },
      { amountEur: 30, payoutMethod: 'Directa', amountVesToPay: 6_000 },
    ]);
    expect(parts.reduce((sum, part) => sum + part.amountEur, 0)).toBeCloseTo(110, 10);
    expect(parts.reduce((sum, part) => sum + part.amountVesToPay, 0)).toBeCloseTo(22_000, 10);
  });

  it('refuses zero, invalid methods and a zero-EUR remainder', () => {
    const base = {
      totalAmountEur: 110,
      rateTasa: 200,
      primaryPayoutMethod: 'Provincial' as const,
    };
    expect(() =>
      computeCreatedSendingParts({
        ...base,
        additionalParts: [{ amountEur: 0, payoutMethod: 'Otro' }],
      }),
    ).toThrow(/mayor que cero/i);
    expect(() =>
      computeCreatedSendingParts({
        ...base,
        additionalParts: [{ amountEur: 20, payoutMethod: 'Pago Movil' as 'Otro' }],
      }),
    ).toThrow(/método de pago válido/i);
    expect(() =>
      computeCreatedSendingParts({
        ...base,
        additionalParts: [{ amountEur: 110, payoutMethod: 'Otro' }],
      }),
    ).toThrow(/sumar menos/i);
  });

  it('uses the database 8-decimal scale instead of floating-point residue', () => {
    expect(
      computeCreatedSendingParts({
        totalAmountEur: 0.3,
        rateTasa: 200,
        primaryPayoutMethod: 'Provincial',
        additionalParts: [{ amountEur: 0.1, payoutMethod: 'Otro' }],
      }).map((part) => part.amountEur),
    ).toEqual([0.2, 0.1]);

    expect(() =>
      computeCreatedSendingParts({
        totalAmountEur: 24.3,
        rateTasa: 200,
        primaryPayoutMethod: 'Provincial',
        additionalParts: [
          { amountEur: 11.2, payoutMethod: 'Otro' },
          { amountEur: 13.1, payoutMethod: 'Directa' },
        ],
      }),
    ).toThrow(/sumar menos/i);

    expect(
      computeCreatedSendingParts({
        totalAmountEur: 24.31,
        rateTasa: 200,
        primaryPayoutMethod: 'Provincial',
        additionalParts: [
          { amountEur: 11.2, payoutMethod: 'Otro' },
          { amountEur: 13.1, payoutMethod: 'Directa' },
        ],
      })[0].amountEur,
    ).toBe(0.01);
  });
});
