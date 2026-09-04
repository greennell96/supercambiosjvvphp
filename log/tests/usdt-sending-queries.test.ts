/**
 * Envío USDT under migration 020: created pending, drawing nothing, with the
 * FIFO draw over crypto_purchases moved to "marcar pagado" — see
 * lib/queries.ts's createUsdtSending / paySendingUsdt doc comments.
 *
 * Same sql-tag mocking harness as tests/grouped-sending-queries.test.ts:
 * getSql().begin() hands the callback a tagged-template function that records
 * every statement and answers it by matching a fragment of the query text.
 */

import type { TransactionSql } from 'postgres';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSqlMock } = vi.hoisted(() => ({ getSqlMock: vi.fn() }));

vi.mock('../lib/db', async () => {
  const actual = await vi.importActual<typeof import('../lib/db')>('../lib/db');
  return { ...actual, getSql: getSqlMock };
});

import { createUsdtSending, paySendingDirect, paySendingFromPool, paySendingUsdt } from '../lib/queries';

function transaction(
  tag: (strings: TemplateStringsArray, ...values: unknown[]) => unknown,
) {
  const tx = tag as unknown as TransactionSql;
  getSqlMock.mockReturnValue({
    begin: vi.fn(async (callback: (transactionSql: TransactionSql) => Promise<unknown>) =>
      callback(tx),
    ),
  });
}

describe('createUsdtSending', () => {
  beforeEach(() => getSqlMock.mockReset());

  it('inserts one pending row with the given usdt_to_deliver, and draws nothing', async () => {
    const statements: { query: string; values: unknown[] }[] = [];
    transaction(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(' ');
      statements.push({ query, values });
      if (query.includes('select id, name from clients')) return [{ id: 7, name: 'Ana' }];
      if (query.includes('insert into sendings')) return [{ id: 501 }];
      throw new Error(`Unexpected query: ${query}`);
    });

    const result = await createUsdtSending({
      client_id: 7,
      amount_eur: 95,
      usdt_to_deliver: 100,
      created_at: new Date('2026-01-05T12:00:00.000Z'),
    });

    expect(result).toEqual({ id: 501, clientName: 'Ana', amountEur: 95, usdtToDeliver: 100 });

    const sendingInsert = statements.find((s) => s.query.includes('insert into sendings'));
    expect(sendingInsert?.query).toContain("'pending'");
    expect(sendingInsert?.query).toContain('is_usdt');
    expect(sendingInsert?.query).toContain('usdt_to_deliver');
    expect(sendingInsert?.values).toContain(100);
    expect(sendingInsert?.values).toContain(95);

    // No lot was locked, no allocation written, no crypto_purchases row moved.
    expect(statements.some((s) => s.query.includes('from crypto_purchases'))).toBe(false);
    expect(statements.some((s) => s.query.includes('sending_lot_allocations'))).toBe(false);
    expect(statements.some((s) => s.query.includes('update crypto_purchases'))).toBe(false);
  });

  it('refuses a non-positive usdt_to_deliver before touching the database', async () => {
    transaction(async () => {
      throw new Error('No query should run: the input is invalid before the transaction opens.');
    });

    await expect(
      createUsdtSending({
        client_id: 7,
        amount_eur: 95,
        usdt_to_deliver: 0,
        created_at: new Date('2026-01-05T12:00:00.000Z'),
      }),
    ).rejects.toThrow(/USDT a entregar/);
  });
});

describe('paySendingUsdt', () => {
  beforeEach(() => getSqlMock.mockReset());

  it('draws the STORED usdt_to_deliver, writes the allocation, decrements the lot and pays via usdt', async () => {
    const statements: { query: string; values: unknown[] }[] = [];
    transaction(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(' ');
      statements.push({ query, values });
      if (query.includes('from sendings s') && query.includes('for update of s')) {
        return [
          {
            id: 501,
            client_name: 'Ana',
            amount_eur: '95',
            amount_ves_to_pay: null,
            payout_method: 'Binance',
            is_usdt: true,
            usdt_to_deliver: '100',
          },
        ];
      }
      if (query.includes('from crypto_purchases') && query.includes('for update')) {
        return [
          { id: 1, purchased_at: new Date('2026-01-01T00:00:00.000Z'), price_eur_per_usdt: '0.9', remaining_usdt: '1000' },
        ];
      }
      if (query.includes('insert into sending_lot_allocations')) return [];
      if (query.includes('update crypto_purchases')) return [];
      if (query.includes('update sendings')) return [];
      throw new Error(`Unexpected query: ${query}`);
    });

    // Called with only the id: nothing else could be passed in, which is the
    // point — the amount comes from the row, not the caller.
    const result = await paySendingUsdt(501);

    const allocationInsert = statements.find((s) =>
      s.query.includes('insert into sending_lot_allocations'),
    );
    expect(allocationInsert?.values).toEqual([501, 1, 100, 0.9]);

    const lotUpdate = statements.find((s) => s.query.includes('update crypto_purchases'));
    expect(lotUpdate?.values).toEqual([900, 1]);

    const sendingUpdate = statements.find(
      (s) => s.query.includes('update sendings') && s.query.includes("paid_via = 'usdt'"),
    );
    expect(sendingUpdate).toBeTruthy();
    expect(sendingUpdate?.values).toEqual([false, 100, 90, 5, 501]);

    expect(result).toMatchObject({
      id: 501,
      clientName: 'Ana',
      paidVia: 'usdt',
      amountVesToPay: 0,
      vesDrawn: 0,
      vesShortfall: 0,
      usdtUsed: 100,
      costEur: 90,
      profitEur: 5,
    });
  });

  it('refuses a row that is not an Envío USDT', async () => {
    transaction(async (strings: TemplateStringsArray) => {
      const query = strings.join(' ');
      if (query.includes('from sendings s') && query.includes('for update of s')) {
        return [
          {
            id: 12,
            client_name: 'Ana',
            amount_eur: '95',
            amount_ves_to_pay: '20000',
            payout_method: 'Provincial',
            is_usdt: false,
            usdt_to_deliver: null,
          },
        ];
      }
      throw new Error(`Unexpected query: ${query}`);
    });

    await expect(paySendingUsdt(12)).rejects.toThrow(/no es un Envío USDT/);
  });
});

describe('paySendingFromPool and paySendingDirect refuse an Envío USDT row', () => {
  beforeEach(() => getSqlMock.mockReset());

  function mockUsdtPendingRow() {
    transaction(async (strings: TemplateStringsArray) => {
      const query = strings.join(' ');
      if (query.includes('from sendings s') && query.includes('for update of s')) {
        return [
          {
            id: 501,
            client_name: 'Ana',
            amount_eur: '95',
            amount_ves_to_pay: null,
            payout_method: 'Binance',
            is_usdt: true,
            usdt_to_deliver: '100',
          },
        ];
      }
      throw new Error(`Unexpected query: ${query}`);
    });
  }

  it('paySendingFromPool refuses it', async () => {
    mockUsdtPendingRow();
    await expect(paySendingFromPool(501)).rejects.toThrow(/pool de bol[ií]vares/);
  });

  it('paySendingDirect refuses it', async () => {
    mockUsdtPendingRow();
    await expect(paySendingDirect(501, 100)).rejects.toThrow(/bot[oó]n de USDT/);
  });
});
