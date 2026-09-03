/**
 * La caja.
 *
 * Every test here is about a way the balance could quietly become wrong: a line
 * counted that predates the count it is being added to, two lines landing on the
 * same instant in the wrong order, a saldo column that does not agree with the
 * montos above it. The balance is the one figure in this app Jose can check by
 * hand against the notes in his pocket, so it has to be right for a reason and
 * not by coincidence.
 */

import { describe, expect, it } from 'vitest';

import {
  buildCajaLedger,
  buildRetiroRows,
  type CajaMovement,
  type CajaSource,
  type RetiroDia,
} from '../lib/caja';

const move = (iso: string, source: CajaSource, amount: number, refId = 1): CajaMovement => ({
  occurred_at: new Date(iso),
  source,
  ref_id: refId,
  note: null,
  amount_eur: amount,
});

/** Midnight Madrid on 1 September 2026 — how migration 015 dates the apertura. */
const APERTURA = '2026-08-31T22:00:00Z';

describe('el libro de caja', () => {
  it('walks the balance forward and hands the journal back newest first', () => {
    const { rows, balanceEur } = buildCajaLedger([
      move(APERTURA, 'apertura', 1740),
      move('2026-09-01T10:00:00Z', 'envio_efectivo', 300),
      move('2026-09-02T09:00:00Z', 'compra_usdt', -500),
    ]);

    expect(balanceEur).toBe(1540);
    expect(rows.map((r) => r.balanceEur)).toEqual([1540, 2040, 1740]);
    expect(rows.map((r) => r.source)).toEqual(['compra_usdt', 'envio_efectivo', 'apertura']);
  });

  it('drops everything dated before the apertura', () => {
    // The EFECTIVO sendings already in the database are months old: that money
    // has long since been spent, and the 1.740 is what is left of it. Counting
    // them again would invent euros that are not in the pocket.
    const { rows, balanceEur } = buildCajaLedger([
      move('2026-06-14T10:00:00Z', 'envio_efectivo', 900, 7),
      move(APERTURA, 'apertura', 1740),
      move('2026-09-01T10:00:00Z', 'envio_efectivo', 300, 8),
    ]);

    expect(balanceEur).toBe(2040);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.refId !== 7)).toBe(true);
  });

  it('keeps a retiro confirmed for the apertura day itself', () => {
    // Both are dated to midnight of the same Madrid day, so a cut-off that
    // dropped ties would make that día's cash disappear for good.
    const { rows, balanceEur } = buildCajaLedger([
      move(APERTURA, 'retiro_codigos', 260),
      move(APERTURA, 'apertura', 1740),
    ]);

    expect(balanceEur).toBe(2000);
    // And the apertura still opens the book: a balance cannot start below its
    // own starting line.
    expect(rows.map((r) => r.source)).toEqual(['retiro_codigos', 'apertura']);
    expect(rows[1].balanceEur).toBe(1740);
  });

  it('orders lines sharing an instant deterministically, by source then by id', () => {
    const { rows } = buildCajaLedger([
      move(APERTURA, 'apertura', 1000),
      move('2026-09-01T00:00:00Z', 'ajuste', -5, 2),
      move('2026-09-01T00:00:00Z', 'ajuste', -5, 1),
      move('2026-09-01T00:00:00Z', 'retiro_codigos', 100),
    ]);

    expect(rows.map((r) => `${r.source}:${r.refId}`).reverse()).toEqual([
      'apertura:1',
      'retiro_codigos:1',
      'ajuste:1',
      'ajuste:2',
    ]);
  });

  it('starts at zero and drops nothing when there is no apertura at all', () => {
    // Only reachable if migration 015's seed never ran. A small balance it can
    // justify beats a plausible one it cannot.
    const { rows, balanceEur } = buildCajaLedger([move('2026-09-01T10:00:00Z', 'ajuste', 40)]);

    expect(balanceEur).toBe(40);
    expect(rows).toHaveLength(1);
  });

  it('is empty and flat with nothing to walk', () => {
    expect(buildCajaLedger([])).toEqual({ rows: [], balanceEur: 0 });
  });

  it('orders a caja-settled VES -> EUR entry after compra_usdt on the same instant', () => {
    // Both are outflows read live off a different table; entrada_ves_eur has
    // to sort after compra_usdt on a tie the same way compra_usdt sorts after
    // everything before it — see SOURCE_ORDER in lib/caja.ts.
    const { rows } = buildCajaLedger([
      move(APERTURA, 'apertura', 1740),
      move('2026-09-01T09:00:00Z', 'compra_usdt', -500),
      move('2026-09-01T09:00:00Z', 'entrada_ves_eur', -200),
    ]);

    expect(rows.map((r) => r.source)).toEqual(['entrada_ves_eur', 'compra_usdt', 'apertura']);
  });

  it('reduces the running balance for a caja-settled VES -> EUR entry', () => {
    const { rows, balanceEur } = buildCajaLedger([
      move(APERTURA, 'apertura', 1740),
      move('2026-09-01T09:00:00Z', 'entrada_ves_eur', -200),
    ]);

    expect(balanceEur).toBe(1540);
    expect(rows[0].balanceEur).toBe(1540);
  });
});

/* ------------------------------------------------- confirmación de retiros */

const dia = (overrides: Partial<RetiroDia> = {}): RetiroDia => ({
  day: '2026-09-01',
  system_eur: 500,
  confirmed_system_eur: null,
  counted_eur: null,
  confirmed_at: null,
  ...overrides,
});

describe('la confirmación de retiros', () => {
  it('reports no diff at all until a día is confirmed', () => {
    // Not zero: nothing was counted, which is a different claim from having
    // counted the same amount.
    const [row] = buildRetiroRows([dia()]);

    expect(row.countedEur).toBeNull();
    expect(row.diffEur).toBeNull();
    expect(row.moved).toBe(false);
  });

  it('signs the diff by which side is short', () => {
    const rows = buildRetiroRows([
      dia({ counted_eur: 520, confirmed_system_eur: 500 }),
      dia({ day: '2026-08-31', counted_eur: 480, confirmed_system_eur: 500 }),
    ]);

    expect(rows[0].diffEur).toBe(20);
    expect(rows[1].diffEur).toBe(-20);
  });

  it('measures the diff against the live total, not the one stored at the time', () => {
    // A retirado código's amount was corrected afterwards through updateCodigo.
    // The two figures on screen are the live total and what Jose counted, so the
    // diff has to be the gap between those or it stops matching them.
    const [row] = buildRetiroRows([
      dia({ system_eur: 540, confirmed_system_eur: 500, counted_eur: 500 }),
    ]);

    expect(row.diffEur).toBe(-40);
    expect(row.moved).toBe(true);
  });

  it('keeps every día in the window, in the order it arrived', () => {
    const rows = buildRetiroRows([
      dia({ day: '2026-09-01' }),
      dia({ day: '2026-08-31', system_eur: 0 }),
      dia({ day: '2026-08-30' }),
      dia({ day: '2026-08-29' }),
    ]);

    expect(rows.map((r) => r.day)).toEqual([
      '2026-09-01',
      '2026-08-31',
      '2026-08-30',
      '2026-08-29',
    ]);
    // A día with no retiros is still a row: it has to look like a día that was
    // checked, not like one that was dropped.
    expect(rows[1].systemEur).toBe(0);
  });
});
