/**
 * What each runner is holding of Jose's money.
 *
 * A runner retires a codigo at the cajero and keeps the notes until he can hand
 * them over, which may be days later and may happen in pieces. The question this
 * module answers is the only one that matters about that: how much is still in
 * his hands right now.
 *
 * Same philosophy as lib/caja.ts, and it is the reason this is a pure function
 * and not a column. A saldo is never stored anywhere — it is
 * (everything he ever retired) − (everything he ever delivered), recomputed on
 * every read, so correcting a codigo's amount through updateCodigo or deleting
 * an entrega corrects what he owes for free. A `balance_eur` column on
 * retiro_agentes would drift the first time either of those happened.
 *
 * The crypto sellers are deliberately NOT here. That case has no saldo to track
 * by design: the cash paid a USDT provider at the cajero and never entered the
 * pocket, so there is nothing owed in either direction and nothing to compute.
 *
 * Pure module: no database, no React, no formatting. The two grouped sums are
 * gathered by getAgenteSaldos in lib/queries.ts, the same split buildCajaLedger
 * keeps from listCajaMovements.
 */

/** sum(codigos.amount) per agente, for codigos he retired. */
export interface AgenteRetirado {
  agente_id: number;
  agente_name: string;
  retirado_eur: number;
}

/** sum(retiro_entregas.amount_eur) per agente. */
export interface AgenteEntregado {
  agente_id: number;
  agente_name: string;
  entregado_eur: number;
}

export interface AgenteSaldo {
  agenteId: number;
  name: string;
  retiradoEur: number;
  entregadoEur: number;
  /** retirado − entregado: what he is still holding. Negative means an advance. */
  saldoEur: number;
}

/** Database money uses eight decimal places; ignore only smaller float noise. */
export function sameSaldo(current: number, expected: number): boolean {
  return Math.abs(current - expected) <= 0.00000001;
}

/**
 * Every agente who ever retired a codigo, with what he still holds.
 *
 * Three rules worth stating:
 *
 * 1. An agente with no activity at all is not a row. retiro_agentes is seeded
 *    with five names in migration 016 and grows every time "Otro" is used, so
 *    listing all of them would fill the panel with people holding nothing and
 *    bury the one who is holding 600 €. Only what shows up in these two inputs
 *    is reported.
 *
 * 2. A settled agente stays, at zero. He carried money and gave it back, which
 *    is worth seeing on the same panel as the ones who have not — dropping him
 *    the moment he settles would make the list read as "people who owe money"
 *    when it is actually "people who carry money".
 *
 * 3. The saldo is not clamped at zero. An entrega bigger than what was owed is
 *    an advance (or a mistake), and either way the negative number is the
 *    finding — flooring it would hide exactly the case worth looking at.
 *
 * An agente present only in `entregados` is a data anomaly rather than a normal
 * state: it means his codigos were deleted or reassigned after he delivered. He
 * is merged in anyway because the money he handed over is real. The delivery
 * aggregate carries the joined agente name so that correcting the last codigo
 * never turns a known person into an opaque database id.
 */
export function buildAgenteSaldos(
  retirados: readonly AgenteRetirado[],
  entregados: readonly AgenteEntregado[],
): AgenteSaldo[] {
  const entregadoById = new Map(entregados.map((e) => [e.agente_id, e.entregado_eur]));

  const saldos = retirados.map((r) => {
    const entregadoEur = entregadoById.get(r.agente_id) ?? 0;
    return {
      agenteId: r.agente_id,
      name: r.agente_name,
      retiradoEur: r.retirado_eur,
      entregadoEur,
      saldoEur: r.retirado_eur - entregadoEur,
    };
  });

  const retiradoIds = new Set(retirados.map((r) => r.agente_id));
  for (const e of entregados) {
    if (retiradoIds.has(e.agente_id)) continue;
    saldos.push({
      agenteId: e.agente_id,
      name: e.agente_name,
      retiradoEur: 0,
      entregadoEur: e.entregado_eur,
      saldoEur: -e.entregado_eur,
    });
  }

  // Alphabetical, ignoring nothing but the collation — the same localeCompare
  // convention compareBankNames uses. The id is the tie-break so two people
  // sharing a name still come out in a stable order.
  return saldos.sort((a, b) => a.name.localeCompare(b.name, 'es') || a.agenteId - b.agenteId);
}
