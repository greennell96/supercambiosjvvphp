/**
 * Dividing a pending sending into two.
 *
 * The invariant every test here circles is the same one: dividing must not
 * create or destroy money. The EUR that leaves the original row is exactly the
 * EUR the new row receives, at the same tasa, so both rows together still owe
 * the bolivares the one row owed. Everything else — what may be divided at all,
 * what the new row inherits — is a rule about which lie the schema would
 * otherwise be allowed to tell.
 */

import { describe, expect, it } from 'vitest';

import { computeSendingSplit, type DivisibleSending } from '../lib/splitting';

const PAID_AT = new Date('2026-08-20T10:00:00Z');

/** A normal client sending as it sits in the database, pending and uncollected. */
function sending(overrides: Partial<DivisibleSending> = {}): DivisibleSending {
  return {
    client_id: 7,
    is_personal: false,
    status: 'pending',
    amount_eur: 110,
    rate_tasa: 200,
    client_paid_at: null,
    client_payment_method: null,
    client_payment_note: null,
    ...overrides,
  };
}

/**
 * The exact predicate of sendings_kind_shape_check (migration 014) for the
 * is_personal = false branch, applied to the row that actually gets inserted.
 */
function satisfiesKindShapeCheck(created: ReturnType<typeof computeSendingSplit>['created']) {
  return (
    created.isPersonal === false &&
    created.amountEur !== null &&
    created.rateTasa !== null &&
    created.personalNote === null
  );
}

/* ------------------------------------------------------------ a normal split */

describe('computeSendingSplit - dividing 110 EUR into 90 + 20', () => {
  const split = computeSendingSplit({
    sending: sending(),
    amountEur: 20,
    payoutMethod: 'Otro',
  });

  it('leaves the remainder on the original and recomputes its bolivares', () => {
    expect(split.original.amountEur).toBeCloseTo(90, 10);
    expect(split.original.amountVesToPay).toBeCloseTo(18000, 10);
  });

  it('gives the new row the portion peeled off, at the same tasa', () => {
    expect(split.created.amountEur).toBeCloseTo(20, 10);
    expect(split.created.rateTasa).toBe(200);
    expect(split.created.amountVesToPay).toBeCloseTo(4000, 10);
  });

  it('creates nothing and destroys nothing: both sides still add up to the whole', () => {
    expect(split.original.amountEur + split.created.amountEur).toBeCloseTo(110, 10);
    expect(split.original.amountVesToPay + split.created.amountVesToPay).toBeCloseTo(22000, 10);
  });

  it('files the new row under the same client and the method that was chosen', () => {
    expect(split.created.clientId).toBe(7);
    expect(split.created.payoutMethod).toBe('Otro');
  });

  it('comes out pending, so the existing payment code settles it like any other', () => {
    expect(split.created.status).toBe('pending');
  });

  it('writes a row the kind-shape constraint accepts', () => {
    expect(satisfiesKindShapeCheck(split.created)).toBe(true);
    expect(split.created.isPersonal).toBe(false);
    expect(split.created.personalNote).toBeNull();
  });
});

/* -------------------------------------------------------------- what it refuses */

describe('computeSendingSplit - what cannot be divided', () => {
  it('refuses the whole remaining amount: a division has to leave something behind', () => {
    expect(() =>
      computeSendingSplit({ sending: sending(), amountEur: 110, payoutMethod: 'Provincial' }),
    ).toThrow(/menor que el monto/i);
  });

  it('refuses more than what is on the row', () => {
    expect(() =>
      computeSendingSplit({ sending: sending(), amountEur: 110.01, payoutMethod: 'Provincial' }),
    ).toThrow(/menor que el monto/i);
    expect(() =>
      computeSendingSplit({ sending: sending(), amountEur: 500, payoutMethod: 'Provincial' }),
    ).toThrow(/menor que el monto/i);
  });

  it('refuses zero, a negative portion and a blank box', () => {
    expect(() =>
      computeSendingSplit({ sending: sending(), amountEur: 0, payoutMethod: 'Provincial' }),
    ).toThrow(/mayor que cero/i);
    expect(() =>
      computeSendingSplit({ sending: sending(), amountEur: -20, payoutMethod: 'Provincial' }),
    ).toThrow(/mayor que cero/i);
    expect(() =>
      computeSendingSplit({
        sending: sending(),
        amountEur: Number.NaN,
        payoutMethod: 'Provincial',
      }),
    ).toThrow(/mayor que cero/i);
  });

  it('refuses a sending already paid: the pools were drawn against the old amount', () => {
    expect(() =>
      computeSendingSplit({
        sending: sending({ status: 'paid' }),
        amountEur: 20,
        payoutMethod: 'Provincial',
      }),
    ).toThrow(/pagado/i);
  });

  it('refuses an envio propio, which has no monto en EUR to divide', () => {
    expect(() =>
      computeSendingSplit({
        sending: sending({ is_personal: true, amount_eur: null, rate_tasa: null }),
        amountEur: 20,
        payoutMethod: 'Provincial',
      }),
    ).toThrow(/propio/i);
  });

  it('checks the kind before the status, so a paid propio still reads as a propio', () => {
    expect(() =>
      computeSendingSplit({
        sending: sending({ is_personal: true, amount_eur: null, rate_tasa: null, status: 'paid' }),
        amountEur: 20,
        payoutMethod: 'Provincial',
      }),
    ).toThrow(/propio/i);
  });

  it('refuses a payout method that is not one of the three', () => {
    expect(() =>
      computeSendingSplit({
        sending: sending(),
        // Exactly what an old row can legitimately hold, and exactly what a new
        // row must never be created with: it would not trigger the 0,3% rule.
        amountEur: 20,
        payoutMethod: 'Pago Movil' as 'Otro',
      }),
    ).toThrow(/metodo de pago/i);
  });
});

/* ------------------------------------------------- what the new row inherits */

describe('computeSendingSplit - the client paid once, for both rows', () => {
  it('copies client_paid_at and the method when the original is already cobrado', () => {
    const split = computeSendingSplit({
      sending: sending({ client_paid_at: PAID_AT, client_payment_method: 'BIZUM' }),
      amountEur: 20,
      payoutMethod: 'Provincial',
    });

    expect(split.created.clientPaidAt).toBe(PAID_AT);
    expect(split.created.clientPaymentMethod).toBe('BIZUM');
  });

  it('leaves both null when the client has not paid yet: no cobro is invented', () => {
    const split = computeSendingSplit({
      sending: sending(),
      amountEur: 20,
      payoutMethod: 'Provincial',
    });

    expect(split.created.clientPaidAt).toBeNull();
    expect(split.created.clientPaymentMethod).toBeNull();
  });

  it('copies the free-text note as it stands: it is not amount-specific', () => {
    const split = computeSendingSplit({
      sending: sending({ client_payment_note: 'codigo de cajero' }),
      amountEur: 20,
      payoutMethod: 'Provincial',
    });

    expect(split.created.clientPaymentNote).toBe('codigo de cajero');
  });
});

/* --------------------------------------------------------- dividing again */

describe('computeSendingSplit - two divisions of the same sending', () => {
  // Each division reads whatever is left on the row, which is what lib/queries.ts
  // hands it after locking: the first left 90 on the original, so the second one
  // peels its portion off THAT, not off the 110 the page first showed.
  const first = computeSendingSplit({
    sending: sending(),
    amountEur: 20,
    payoutMethod: 'Otro',
  });
  const second = computeSendingSplit({
    sending: sending({ amount_eur: first.original.amountEur }),
    amountEur: 30,
    payoutMethod: 'Directa',
  });

  it('peels the second portion off what the first one left', () => {
    expect(second.original.amountEur).toBeCloseTo(60, 10);
    expect(second.created.amountEur).toBeCloseTo(30, 10);
  });

  it('still adds up to the original 110 across all three rows', () => {
    const total = second.original.amountEur + second.created.amountEur + first.created.amountEur;
    expect(total).toBeCloseTo(110, 10);
  });

  it('keeps every row consistent with its own tasa', () => {
    expect(second.original.amountVesToPay).toBeCloseTo(12000, 10);
    expect(second.created.amountVesToPay).toBeCloseTo(6000, 10);
    expect(first.created.amountVesToPay).toBeCloseTo(4000, 10);
  });

  it('writes rows the kind-shape constraint accepts every time', () => {
    expect(satisfiesKindShapeCheck(first.created)).toBe(true);
    expect(satisfiesKindShapeCheck(second.created)).toBe(true);
  });

  it('refuses to peel off the 60 that is left, and allows anything under it', () => {
    const left = sending({ amount_eur: second.original.amountEur });
    expect(() =>
      computeSendingSplit({ sending: left, amountEur: 60, payoutMethod: 'Provincial' }),
    ).toThrow(/menor que el monto/i);
    expect(
      computeSendingSplit({ sending: left, amountEur: 59.99, payoutMethod: 'Provincial' }).original
        .amountEur,
    ).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------ decimal-sized portions */

describe('computeSendingSplit - a portion with cents', () => {
  const split = computeSendingSplit({
    sending: sending({ amount_eur: 110, rate_tasa: 187.35 }),
    amountEur: 19.99,
    payoutMethod: 'Provincial',
  });

  it('always leaves a positive remainder on the original', () => {
    expect(split.original.amountEur).toBeGreaterThan(0);
    expect(split.original.amountEur).toBeCloseTo(90.01, 10);
  });

  it("derives each row's bolivares from its own EUR, not from a shared subtraction", () => {
    expect(split.original.amountVesToPay).toBeCloseTo(90.01 * 187.35, 8);
    expect(split.created.amountVesToPay).toBeCloseTo(19.99 * 187.35, 8);
  });
});
