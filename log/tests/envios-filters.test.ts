import { describe, expect, it } from 'vitest';

import { filterEnvios, orderPendingEnvios, sortEnvios } from '../app/envios/envios-filters';
import type { Sending } from '../lib/types';

const base = {
  payment_group_id: 'group',
  client_id: 1,
  client_name: 'Cliente',
  is_personal: false,
  is_usdt: false,
  usdt_to_deliver: null,
  personal_note: null,
  amount_eur: 10,
  payout_method: 'ZELLE',
  rate_tasa: 100,
  client_payment_note: null,
  client_paid_at: null,
  client_payment_method: null,
  paid_at: null,
  paid_via: null,
  fee_applied: null,
  usdt_used: null,
  cost_eur: null,
  profit_eur: null,
} satisfies Omit<Sending, 'id' | 'created_at' | 'status' | 'amount_ves_to_pay'>;

function sending(
  id: number,
  created_at: string,
  options: Partial<Pick<Sending, 'status' | 'client_paid_at' | 'is_personal' | 'amount_ves_to_pay'>> = {},
): Sending {
  return {
    ...base,
    id,
    created_at: new Date(created_at),
    status: 'pending',
    amount_ves_to_pay: 100,
    ...options,
  };
}

describe('envios pending filters', () => {
  const now = '2026-09-01T12:00:00.000Z';

  it('keeps a row missing both sides in both side filters', () => {
    const both = sending(1, '2026-09-01T10:00:00.000Z');
    expect(filterEnvios([both], 'client', now)).toEqual([both]);
    expect(filterEnvios([both], 'jose', now)).toEqual([both]);
  });

  it('does not invent a client debt for an envio propio', () => {
    const propio = sending(2, '2026-09-01T10:00:00.000Z', { is_personal: true });
    expect(filterEnvios([propio], 'client', now)).toEqual([]);
    expect(filterEnvios([propio], 'jose', now)).toEqual([propio]);
  });

  it('recognises overdue rows and excludes complete rows from pending views', () => {
    const old = sending(3, '2026-08-31T10:00:00.000Z');
    const complete = sending(4, '2026-08-31T10:00:00.000Z', {
      status: 'paid',
      client_paid_at: new Date('2026-08-31T11:00:00.000Z'),
    });
    expect(filterEnvios([old, complete], 'overdue', now)).toEqual([old]);
    expect(filterEnvios([complete], 'all', now)).toEqual([]);
  });
});

describe('envios sorting', () => {
  const rows = [
    sending(1, '2026-09-01T10:00:00.000Z', { amount_ves_to_pay: 100 }),
    sending(2, '2026-09-01T09:00:00.000Z', { amount_ves_to_pay: 300 }),
    sending(3, '2026-09-01T09:00:00.000Z', { amount_ves_to_pay: 200 }),
  ];

  it('sorts oldest first by default and uses id as a stable tie-breaker', () => {
    expect(sortEnvios(rows, 'oldest').map((row) => row.id)).toEqual([2, 3, 1]);
  });

  it('sorts newest and highest Bs without mutating the input', () => {
    expect(sortEnvios(rows, 'newest').map((row) => row.id)).toEqual([1, 3, 2]);
    expect(sortEnvios(rows, 'amount').map((row) => row.id)).toEqual([2, 3, 1]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
  });
});

describe('pending work order', () => {
  it('puts what José still owes above what he is still owed', () => {
    // Newest first, so the sort alone would put the collected-but-unpaid row
    // (id 3) on top; the grouping has to override that and it alone.
    const oldestUnpaid = sending(1, '2026-08-28T10:00:00.000Z');
    const paidUncollected = sending(2, '2026-08-29T10:00:00.000Z', {
      status: 'paid',
    });
    const newestUnpaid = sending(3, '2026-08-30T10:00:00.000Z');

    const rows = [paidUncollected, oldestUnpaid, newestUnpaid];
    expect(orderPendingEnvios(rows, 'newest').map((row) => row.id)).toEqual([3, 1, 2]);
    expect(orderPendingEnvios(rows, 'oldest').map((row) => row.id)).toEqual([1, 3, 2]);
  });

  it('keeps an envío propio in the first group: it is money José has not sent', () => {
    const propio = sending(1, '2026-08-28T10:00:00.000Z', { is_personal: true });
    const paidUncollected = sending(2, '2026-08-20T10:00:00.000Z', { status: 'paid' });

    expect(orderPendingEnvios([paidUncollected, propio], 'oldest').map((row) => row.id)).toEqual([
      1, 2,
    ]);
  });
});
