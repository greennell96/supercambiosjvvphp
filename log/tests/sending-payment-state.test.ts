import { describe, expect, it } from 'vitest';

import { sendingPaymentState } from '../lib/sending-payment-state';

const NOW = new Date('2026-09-01T12:00:00Z');

function sending(
  overrides: Partial<Parameters<typeof sendingPaymentState>[0]> = {},
): Parameters<typeof sendingPaymentState>[0] {
  return {
    created_at: new Date('2026-09-01T08:00:00Z'),
    is_personal: false,
    status: 'pending',
    client_paid_at: null,
    ...overrides,
  };
}

describe('sendingPaymentState', () => {
  it('is green/complete only when both client-sending sides are paid', () => {
    expect(
      sendingPaymentState(
        sending({ status: 'paid', client_paid_at: new Date('2026-09-01T09:00:00Z') }),
        NOW,
      ),
    ).toBe('complete');
  });

  it('is yellow/partial when either side, but not both, is paid', () => {
    expect(sendingPaymentState(sending({ status: 'paid' }), NOW)).toBe('partial');
    expect(
      sendingPaymentState(sending({ client_paid_at: new Date('2026-09-01T09:00:00Z') }), NOW),
    ).toBe('partial');
  });

  it('is red/overdue when neither side is paid and its Madrid day has passed', () => {
    expect(
      sendingPaymentState(sending({ created_at: new Date('2026-08-31T20:00:00Z') }), NOW),
    ).toBe('overdue');
  });

  it('stays neutral/new when neither side is paid on the same Madrid day', () => {
    expect(sendingPaymentState(sending(), NOW)).toBe('new');
    expect(
      sendingPaymentState(
        sending({ created_at: new Date('2026-08-31T22:30:00Z') }),
        new Date('2026-09-01T00:30:00Z'),
      ),
    ).toBe('new');
  });

  it('treats the missing client side of an envío propio as not applicable', () => {
    expect(sendingPaymentState(sending({ is_personal: true, status: 'paid' }), NOW)).toBe(
      'complete',
    );
    expect(
      sendingPaymentState(
        sending({ is_personal: true, created_at: new Date('2026-08-31T20:00:00Z') }),
        NOW,
      ),
    ).toBe('overdue');
  });
});
