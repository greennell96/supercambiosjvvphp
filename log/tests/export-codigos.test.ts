import { describe, expect, it } from 'vitest';

import { formatCodigosForExport } from '../lib/export-codigos';
import type { Codigo } from '../lib/types';

/** Only the fields the export reads matter; the rest is filler the type wants. */
function codigo(overrides: Partial<Codigo> & { id: number }): Codigo {
  return {
    client_id: 1,
    client_name: 'Cliente',
    client_dni_nie: null,
    client_phone: null,
    code: '',
    amount: 0,
    bank: '',
    status: 'pendiente',
    created_at: new Date('2026-01-01T09:00:00Z'),
    retired_at: null,
    retirado_por_kind: null,
    retirado_por_agente_id: null,
    retirado_por_agente_nombre: null,
    sending_id: null,
    sending_client_name: null,
    sending_amount_eur: null,
    sending_rate_tasa: null,
    sending_amount_ves_to_pay: null,
    sending_payout_method: null,
    sending_status: null,
    ...overrides,
  };
}

const FIELD = /^(Código|Teléfono|DNI|Monto)/;

function headings(text: string): string[] {
  return text.split('\n').filter((line) => line !== '' && !FIELD.test(line));
}

function codes(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.startsWith('Código: '))
    .map((line) => line.slice('Código: '.length));
}

describe('formatCodigosForExport - the block Jose reads at the cajero', () => {
  it('groups by bank and gives each one the fields its cajero asks for', () => {
    const text = formatCodigosForExport([
      codigo({
        id: 3,
        bank: 'CaixaBank',
        code: '5566778899',
        client_phone: '+34611223344',
        amount: 200,
      }),
      codigo({
        id: 1,
        bank: 'BBVA',
        code: '1234567890',
        client_phone: '+34612345678',
        amount: 150,
      }),
      codigo({
        id: 2,
        bank: 'BBVA',
        code: '9988776655',
        client_phone: '+34698765432',
        amount: 75.5,
        created_at: new Date('2026-01-01T11:00:00Z'),
      }),
      codigo({
        id: 4,
        bank: 'Banco Sabadell',
        code: '4433221100',
        client_phone: '+34655443322',
        amount: 90,
      }),
    ]);

    expect(text).toBe(
      [
        'BBVA',
        'Código: 1234567890',
        'Teléfono: +34612345678',
        'Monto: 150,00 €',
        '',
        'Código: 9988776655',
        'Teléfono: +34698765432',
        'Monto: 75,50 €',
        '',
        'CAIXA',
        'Código: 5566778899',
        'Teléfono: +34611223344',
        'DNI: (falta)',
        'Monto (informativo): 200,00 €',
        '',
        'SABADELL',
        'Código: 4433221100',
        'Teléfono: +34655443322',
        'Monto (informativo): 90,00 €',
      ].join('\n'),
    );
  });

  it('separates with exactly one blank line, never two', () => {
    const text = formatCodigosForExport([
      codigo({ id: 1, bank: 'BBVA', code: 'A' }),
      codigo({ id: 2, bank: 'BBVA', code: 'B', created_at: new Date('2026-01-02T09:00:00Z') }),
      codigo({ id: 3, bank: 'Caixa', code: 'C' }),
    ]);
    expect(text).not.toMatch(/\n\n\n/);
  });

  it('spells an unknown bank the way it was typed, and asks it for the plain three fields', () => {
    const text = formatCodigosForExport([
      codigo({ id: 1, bank: '  santander  ', code: 'A1', client_phone: '600111222', amount: 10 }),
    ]);
    expect(text).toBe(
      ['SANTANDER', 'Código: A1', 'Teléfono: 600111222', 'Monto: 10,00 €'].join('\n'),
    );
  });

  it('puts two spellings of one unknown bank in a single block', () => {
    const text = formatCodigosForExport([
      codigo({ id: 1, bank: 'Halcash', code: 'A' }),
      codigo({ id: 2, bank: 'HALCASH', code: 'B', created_at: new Date('2026-01-02T09:00:00Z') }),
    ]);
    expect(headings(text)).toEqual(['HALCASH']);
    expect(codes(text)).toEqual(['A', 'B']);
  });

  it('says (falta) for every field that is not there yet', () => {
    const text = formatCodigosForExport([
      codigo({
        id: 1,
        bank: 'Caixa',
        code: '',
        client_phone: null,
        client_dni_nie: null,
        amount: 40,
      }),
    ]);
    expect(text).toBe(
      [
        'CAIXA',
        'Código: (falta)',
        'Teléfono: (falta)',
        'DNI: (falta)',
        'Monto (informativo): 40,00 €',
      ].join('\n'),
    );
  });

  it('only shows the DNI where the cajero asks for it', () => {
    const text = formatCodigosForExport([
      codigo({ id: 1, bank: 'BBVA', code: 'A', client_dni_nie: '12345678Z' }),
      codigo({ id: 2, bank: 'Sabadell', code: 'B', client_dni_nie: '12345678Z' }),
    ]);
    expect(text).not.toMatch(/DNI/);
  });

  it('orders the blocks the way the pendientes table orders its rows', () => {
    const text = formatCodigosForExport([
      codigo({ id: 1, bank: 'n/a', code: 'X' }),
      codigo({ id: 2, bank: 'Santander', code: 'S' }),
      codigo({ id: 3, bank: 'BBVA', code: 'B' }),
      codigo({ id: 4, bank: 'la caixa', code: 'C' }),
    ]);
    // Alphabetical by heading, with the bank nobody wrote down pushed to the end.
    expect(headings(text)).toEqual(['BBVA', 'CAIXA', 'SANTANDER', 'N/A']);
  });

  it('works a block oldest first, with the id breaking a tie', () => {
    const text = formatCodigosForExport([
      codigo({ id: 9, bank: 'BBVA', code: 'C', created_at: new Date('2026-01-02T09:00:00Z') }),
      codigo({ id: 7, bank: 'BBVA', code: 'B', created_at: new Date('2026-01-01T09:00:00Z') }),
      codigo({ id: 2, bank: 'BBVA', code: 'A', created_at: new Date('2026-01-01T09:00:00Z') }),
    ]);
    expect(codes(text)).toEqual(['A', 'B', 'C']);
  });

  it('has nothing to trim at either end, and nothing at all for nothing selected', () => {
    expect(formatCodigosForExport([])).toBe('');
    const text = formatCodigosForExport([codigo({ id: 1, bank: 'BBVA', code: 'A' })]);
    expect(text).toBe(text.trim());
  });
});
