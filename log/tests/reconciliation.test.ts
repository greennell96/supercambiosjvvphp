/**
 * The cuadre de códigos.
 *
 * What every test here checks is that the table cannot quietly hide a gap: the
 * four rows always come out, always in the same order, and the difference keeps
 * the sign that says WHICH side is short. A cuadre that rounded a mismatch away
 * or reordered its days would be worse than no cuadre at all.
 */

import { describe, expect, it } from 'vitest';

import {
  buildConsolidacionRows,
  TOTAL_LABEL,
  type CodigoConsolidacion,
} from '../lib/reconciliation';

/** A cuadre where nothing matches, so every row is distinguishable. */
function consolidacion(overrides: Partial<CodigoConsolidacion> = {}): CodigoConsolidacion {
  return {
    today: { day: '2026-08-29', envios_eur: 500, codigos_eur: 450 },
    yesterday: { day: '2026-08-28', envios_eur: 300, codigos_eur: 320 },
    before_yesterday: { day: '2026-08-27', envios_eur: 200, codigos_eur: 200 },
    total: { envios_eur: 1000, codigos_eur: 970 },
    ...overrides,
  };
}

describe('cuadre de códigos', () => {
  it('reports the gap with the sign that says which side is short', () => {
    const [today, yesterday] = buildConsolidacionRows(consolidacion());

    // Envíos above códigos: a client payment was never logged as a código.
    expect(today.diffEur).toBe(50);
    // Códigos above envíos: a código exists for an envío nobody wrote down.
    expect(yesterday.diffEur).toBe(-20);
  });

  it('keeps the four rows in order and labels the total apart from the days', () => {
    const rows = buildConsolidacionRows(consolidacion());

    expect(rows.map((row) => row.label)).toEqual([
      '2026-08-29',
      '2026-08-28',
      '2026-08-27',
      TOTAL_LABEL,
    ]);
    expect(rows).toHaveLength(4);
  });

  it('carries each side through untouched', () => {
    const rows = buildConsolidacionRows(consolidacion());

    expect(rows[3]).toEqual({
      label: TOTAL_LABEL,
      enviosEur: 1000,
      codigosEur: 970,
      diffEur: 30,
    });
  });

  it('cuadra at zero when a day matches, and when a day has nothing at all', () => {
    const rows = buildConsolidacionRows(
      consolidacion({
        today: { day: '2026-08-29', envios_eur: 0, codigos_eur: 0 },
        yesterday: { day: '2026-08-28', envios_eur: 120.5, codigos_eur: 120.5 },
      }),
    );

    expect(rows[0].diffEur).toBe(0);
    expect(rows[1].diffEur).toBe(0);
    // A day that matches is still a row: an empty day has to be visible as one
    // that was checked, not as one that was dropped.
    expect(rows[0].label).toBe('2026-08-29');
  });
});
