import type { TransactionSql } from 'postgres';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSqlMock } = vi.hoisted(() => ({ getSqlMock: vi.fn() }));

vi.mock('../lib/db', async () => {
  const actual = await vi.importActual<typeof import('../lib/db')>('../lib/db');
  return { ...actual, getSql: getSqlMock };
});

import { createCodigo, listCodigos, listPendingCodigos, listUnlinkedCodigos } from '../lib/queries';

function mockInsert() {
  const calls: { query: string; values: unknown[] }[] = [];
  const txTag = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ query: strings.join('?'), values });
    return [{ id: 5 }];
  });
  const tx = txTag as unknown as TransactionSql;
  getSqlMock.mockReturnValue({
    begin: vi.fn(async (cb: (t: TransactionSql) => Promise<number>) => cb(tx)),
  });
  return calls;
}

describe('codigo phone override', () => {
  beforeEach(() => {
    getSqlMock.mockReset();
  });

  it.each([['+34 600 111 222'], [null]])('createCodigo writes phone_override %s', async (phone) => {
    const calls = mockInsert();
    await createCodigo({
      client_id: 1,
      code: 'ABC',
      amount: 50,
      bank: 'Caixa',
      sending_id: null,
      phone_override: phone,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].query).toContain('phone_override');
    expect(calls[0].values).toContain(phone);
  });

  it('list queries select the coalesced phone and the overridden flag', async () => {
    const queries: string[] = [];
    const sql = vi.fn(async (strings: TemplateStringsArray) => {
      queries.push(strings.join(' '));
      return [];
    });
    getSqlMock.mockReturnValue(sql);
    await listCodigos();
    await listPendingCodigos();
    await listUnlinkedCodigos();
    expect(queries).toHaveLength(3);
    for (const q of queries) {
      expect(q).toContain('coalesce(g.phone_override, c.phone) as client_phone');
      expect(q).toContain('(g.phone_override is not null) as phone_overridden');
    }
  });
});
