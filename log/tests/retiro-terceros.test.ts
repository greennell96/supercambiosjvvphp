/**
 * What each runner is holding.
 *
 * Every test here is a way the number could quietly become wrong about real
 * cash in somebody else's pocket: a settled runner vanishing so nobody
 * remembers he carried anything, an overpayment clamped to zero so an advance
 * looks like a clean slate, a seeded name showing up as a debt nobody owes.
 * Jose chases these figures by asking a person for money, so a wrong one costs
 * an argument.
 */

import { describe, expect, it } from 'vitest';

import {
  buildAgenteSaldos,
  sameSaldo,
  type AgenteEntregado,
  type AgenteRetirado,
} from '../lib/retiro-terceros';

const retirado = (
  agente_id: number,
  agente_name: string,
  retirado_eur: number,
): AgenteRetirado => ({ agente_id, agente_name, retirado_eur });

const entregado = (
  agente_id: number,
  entregado_eur: number,
  agente_name = `Agente ${agente_id}`,
): AgenteEntregado => ({
  agente_id,
  agente_name,
  entregado_eur,
});

describe('buildAgenteSaldos', () => {
  it('owes the whole amount when nothing has been delivered', () => {
    const [saldo] = buildAgenteSaldos([retirado(1, 'Andriu', 800)], []);

    expect(saldo).toEqual({
      agenteId: 1,
      name: 'Andriu',
      retiradoEur: 800,
      entregadoEur: 0,
      saldoEur: 800,
    });
  });

  it('subtracts a partial entrega and leaves the difference standing', () => {
    // The normal case: a runner hands over what he has on him and comes back
    // with the rest tomorrow.
    const [saldo] = buildAgenteSaldos([retirado(1, 'Andriu', 800)], [entregado(1, 500)]);

    expect(saldo.entregadoEur).toBe(500);
    expect(saldo.saldoEur).toBe(300);
  });

  it('keeps a settled agente on the list, at zero', () => {
    // He is not gone, he is square. Dropping him would make the panel read as
    // "people who owe money" when it is "people who carry money".
    const [saldo] = buildAgenteSaldos([retirado(2, 'Carmen', 420)], [entregado(2, 420)]);

    expect(saldo.saldoEur).toBe(0);
    expect(saldo.name).toBe('Carmen');
  });

  it('reports an entrega bigger than the retiros as a negative saldo', () => {
    // An advance, or a mistake. Either way it is the row worth looking at, so
    // it is not floored at zero.
    const [saldo] = buildAgenteSaldos([retirado(3, 'Chelo', 200)], [entregado(3, 350)]);

    expect(saldo.saldoEur).toBe(-150);
  });

  it('leaves out an agente who never retired anything', () => {
    // Migration 016 seeds five names and "Otro" adds more; listing all of them
    // would bury the one person actually holding money.
    const saldos = buildAgenteSaldos([retirado(1, 'Andriu', 800)], []);

    expect(saldos).toHaveLength(1);
    expect(saldos[0].agenteId).toBe(1);
  });

  it('still counts entregas from an agente with no retiros left', () => {
    // Only reachable if his codigos were deleted after he delivered. The money
    // he handed over is real, so it is merged in rather than dropped; the joined
    // agente name must survive even when no codigo row remains to carry it.
    const saldos = buildAgenteSaldos(
      [retirado(1, 'Andriu', 800)],
      [entregado(9, 120, 'Yulitza')],
    );

    expect(saldos).toHaveLength(2);
    const orphan = saldos.find((s) => s.agenteId === 9);
    expect(orphan).toEqual({
      agenteId: 9,
      name: 'Yulitza',
      retiradoEur: 0,
      entregadoEur: 120,
      saldoEur: -120,
    });
  });

  it('sorts alphabetically in Spanish, whatever order the sums arrived in', () => {
    const saldos = buildAgenteSaldos(
      [
        retirado(4, 'Yulitza', 100),
        retirado(1, 'Ándres', 100),
        retirado(2, 'Carmen', 100),
        retirado(3, 'chelo', 100),
      ],
      [],
    );

    expect(saldos.map((s) => s.name)).toEqual(['Ándres', 'Carmen', 'chelo', 'Yulitza']);
  });

  it('breaks a tie on the name by id, so two namesakes have a stable order', () => {
    const saldos = buildAgenteSaldos([retirado(7, 'Andriu', 50), retirado(2, 'Andriu', 90)], []);

    expect(saldos.map((s) => s.agenteId)).toEqual([2, 7]);
  });

  it('is empty when nobody has retired or delivered anything', () => {
    expect(buildAgenteSaldos([], [])).toEqual([]);
  });
});

describe('sameSaldo', () => {
  it('accepts the same eight-decimal database amount', () => {
    expect(sameSaldo(800.12345678, 800.12345678)).toBe(true);
  });

  it('rejects a stale form after another delivery moved the saldo', () => {
    expect(sameSaldo(0, 800)).toBe(false);
  });
});
