import type { TransactionSql } from 'postgres';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSqlMock } = vi.hoisted(() => ({ getSqlMock: vi.fn() }));

vi.mock('../lib/db', async () => {
  const actual = await vi.importActual<typeof import('../lib/db')>('../lib/db');
  return { ...actual, getSql: getSqlMock };
});

import { createSending, deleteCodigo, deleteSending, markClientPaid } from '../lib/queries';

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

describe('grouped sending queries', () => {
  beforeEach(() => getSqlMock.mockReset());

  it('creates every payout part and an immediate codigo with one shared group id', async () => {
    const statements: { query: string; values: unknown[] }[] = [];
    let insertedSending = 0;
    transaction(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(' ');
      statements.push({ query, values });
      if (query.includes('select id, name from clients')) return [{ id: 7, name: 'Ana' }];
      if (query.includes('insert into sendings')) {
        insertedSending += 1;
        return [{ id: 100 + insertedSending }];
      }
      if (query.includes('insert into codigos')) return [];
      if (query.includes('update sendings')) return [];
      if (query.includes('update current_rates')) return [];
      throw new Error(`Unexpected query: ${query}`);
    });

    const result = await createSending({
      client_id: 7,
      amount_eur: 110,
      rate_tasa: 200,
      payout_method: 'Provincial',
      additional_parts: [{ amountEur: 20, payoutMethod: 'Otro' }],
      codigo: { code: 'ABC123', amount: 110, bank: 'BBVA' },
    });

    const sendingInserts = statements.filter((statement) =>
      statement.query.includes('insert into sendings'),
    );
    const codigoInsert = statements.find((statement) =>
      statement.query.includes('insert into codigos'),
    );
    const groupPayment = statements.find(
      (statement) =>
        statement.query.includes('update sendings') &&
        statement.query.includes("client_payment_method = 'CODIGO'"),
    );

    expect(sendingInserts).toHaveLength(2);
    const groupId = sendingInserts[0].values[0];
    expect(sendingInserts[1].values[0]).toBe(groupId);
    expect(codigoInsert?.values[5]).toBe(groupId);
    expect(groupPayment?.values[0]).toBe(groupId);
    expect(result).toMatchObject({ id: 101, partCount: 2, amountVesToPay: 22_000 });
  });

  it('marks every sibling paid when an existing codigo is linked', async () => {
    const statements: { query: string; values: unknown[] }[] = [];
    transaction(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(' ');
      statements.push({ query, values });
      if (query.includes('from sendings s') && query.includes('for update of s')) {
        return [
          {
            id: 11,
            payment_group_id: 'group-1',
            client_id: 7,
            client_name: 'Ana',
            is_personal: false,
            client_paid_at: null,
          },
          {
            id: 12,
            payment_group_id: 'group-1',
            client_id: 7,
            client_name: 'Ana',
            is_personal: false,
            client_paid_at: null,
          },
        ];
      }
      if (query.includes('from codigos') && query.includes('for update')) {
        return [{ id: 51, sending_id: null, sending_group_id: null }];
      }
      if (query.includes('update codigos')) return [];
      if (query.includes('update sendings')) return [];
      throw new Error(`Unexpected query: ${query}`);
    });

    await markClientPaid(12, { method: 'CODIGO', codigo_id: 51, note: null });

    const codigoUpdate = statements.find((statement) => statement.query.includes('update codigos'));
    const sendingUpdate = statements.find((statement) =>
      statement.query.includes('set client_paid_at = now()'),
    );
    expect(codigoUpdate?.values).toContain('group-1');
    expect(sendingUpdate?.query).toContain('where payment_group_id');
    expect(sendingUpdate?.values).toContain('group-1');
  });

  it('reopens every sibling before deleting the codigo proof', async () => {
    const statements: string[] = [];
    transaction(async (strings: TemplateStringsArray) => {
      const query = strings.join(' ');
      statements.push(query);
      if (query.includes('coalesce(g.sending_group_id')) {
        return [{ sending_group_id: 'group-1' }];
      }
      if (query.includes('select id') && query.includes('from sendings')) return [];
      if (query.includes('select id, sending_id, sending_group_id')) {
        return [
          {
            id: 51,
            sending_id: 11,
            sending_group_id: 'group-1',
            retirado_por_kind: null,
          },
        ];
      }
      if (query.includes('update sendings')) return [];
      if (query.includes('delete from codigos')) return [];
      throw new Error(`Unexpected query: ${query}`);
    });

    await deleteCodigo(51);

    expect(statements.find((query) => query.includes('update sendings'))).toContain(
      'where payment_group_id',
    );
    expect(statements.at(-1)).toContain('delete from codigos');
  });

  it('repoints a group codigo before deleting its representative sending', async () => {
    const statements: { query: string; values: unknown[] }[] = [];
    transaction(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join(' ');
      statements.push({ query, values });
      if (query.includes('select id, payment_group_id') && query.includes('from sendings')) {
        return [
          { id: 11, payment_group_id: 'group-1' },
          { id: 12, payment_group_id: 'group-1' },
        ];
      }
      if (query.includes('update codigos')) return [];
      if (query.includes('from sending_ves_allocations')) return [];
      if (query.includes('from sending_lot_allocations')) return [];
      if (query.includes('delete from sendings')) return [];
      throw new Error(`Unexpected query: ${query}`);
    });

    await deleteSending(11);

    const repoint = statements.find((statement) => statement.query.includes('update codigos'));
    expect(repoint?.query).toContain('set sending_id');
    expect(repoint?.values[0]).toBe(12);
    expect(repoint?.values).toContain('group-1');
  });
});
