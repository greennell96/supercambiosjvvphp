import type { TransactionSql } from 'postgres';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSqlMock } = vi.hoisted(() => ({ getSqlMock: vi.fn() }));

vi.mock('../lib/db', async () => {
  const actual = await vi.importActual<typeof import('../lib/db')>('../lib/db');
  return { ...actual, getSql: getSqlMock };
});

import { markCodigosRetiradosPorTercero, reassignCodigoRetirado } from '../lib/queries';

describe('third-party retiro queries', () => {
  beforeEach(() => {
    getSqlMock.mockReset();
  });

  it('binds selected bigserial codigo ids as a PostgreSQL bigint array', async () => {
    const array = vi.fn((values: number[], type: number) => ({ values, type }));
    const txTag = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join(' ');
      if (query.includes('select id from retiro_agentes')) return [{ id: 2 }];
      if (query.includes('update codigos')) return [{ id: 11 }, { id: 12 }];
      throw new Error(`Unexpected query: ${query}`);
    });
    const tx = Object.assign(txTag, { array }) as unknown as TransactionSql;
    const sql = {
      begin: vi.fn(async (callback: (transaction: TransactionSql) => Promise<void>) => callback(tx)),
    };
    getSqlMock.mockReturnValue(sql);

    await markCodigosRetiradosPorTercero([11, 12, 11], {
      kind: 'runner',
      agenteId: 2,
    });

    expect(array).toHaveBeenCalledOnce();
    expect(array).toHaveBeenCalledWith([11, 12], 20);
  });

  it('binds both runner ids as bigint when correcting who withdrew a codigo', async () => {
    const array = vi.fn((values: number[], type: number) => ({ values, type }));
    const txTag = vi.fn(async (strings: TemplateStringsArray) => {
      const query = strings.join(' ');
      if (query.includes('from codigos') && query.includes('for update')) {
        return [
          {
            retirado_por_kind: 'runner',
            retirado_por_agente_id: 9,
            retired_day: '2026-09-01',
          },
        ];
      }
      if (query.includes('select id from retiro_agentes')) return [{ id: 2 }, { id: 9 }];
      if (query.includes('select exists')) return [{ exists: false }];
      if (query.includes('update codigos')) return [];
      throw new Error(`Unexpected query: ${query}`);
    });
    const tx = Object.assign(txTag, { array }) as unknown as TransactionSql;
    const sql = {
      begin: vi.fn(async (callback: (transaction: TransactionSql) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    getSqlMock.mockReturnValue(sql);

    await reassignCodigoRetirado(51, { kind: 'runner', agenteId: 2 });

    expect(array).toHaveBeenCalledOnce();
    expect(array).toHaveBeenCalledWith([2, 9], 20);
  });
});
