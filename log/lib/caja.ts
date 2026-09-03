/**
 * La caja: the euros Jose physically has in hand.
 *
 * Two things live here, and the reason they live together is worth stating,
 * because one of them is rendered on /stats and the other on /caja:
 *
 *   - the running balance and the journal it is walked from;
 *   - the confirmación de retiros, the day-by-day check of what the códigos said
 *     against what actually came out of the cajero.
 *
 * The retiros panel sits on /stats because that is where Jose already goes to
 * cuadrar his day, but what it produces is not a statistic. It is the ONLY entry
 * point for the biggest single inflow the caja has, so its arithmetic belongs
 * next to the ledger that consumes it rather than next to the earnings tables it
 * happens to be drawn beside.
 *
 * Same philosophy as lib/reconciliation.ts, and for the same reason: the balance
 * is never stored. Every line is derived from the row that is the source of
 * truth for it — a confirmation, a sending the client paid en efectivo, a manual
 * entry, a compra flagged as paid out of pocket — so correcting or deleting any
 * of those corrects the balance for free, and there is no column anywhere that
 * can drift away from the rows it was computed from.
 *
 * Pure module: no database, no React, no formatting. The SQL union that gathers
 * the four sources is in lib/queries.ts; the labels leave as raw source keys for
 * the component to render, the same split lib/reconciliation.ts and lib/stats.ts
 * keep.
 */

/**
 * Where one ledger line came from. Not a category Jose picks — every line is
 * derived, so the source IS the table it was read out of.
 */
export type CajaSource =
  | 'apertura'
  | 'retiro_codigos'
  | 'entrega_retiro'
  | 'envio_efectivo'
  | 'ajuste'
  | 'compra_usdt'
  | 'entrada_ves_eur';

/** One line as the union query in lib/queries.ts hands it over. */
export interface CajaMovement {
  occurred_at: Date;
  source: CajaSource;
  /** The id of the row this was derived from. Unique only within its source. */
  ref_id: number;
  /** Whatever that source has to say about the line: a note, a client, a proveedor. */
  note: string | null;
  /** Signed. Positive is money into the caja, negative is money out of it. */
  amount_eur: number;
}

/** The concepto column, per source. Kept beside the values, and typed as a
 * total Record, so a seventh source cannot be added without saying what it
 * reads as — the same guard CLIENT_PAYMENT_METHOD_LABELS uses in lib/types.ts. */
export const CAJA_SOURCE_LABELS: Record<CajaSource, string> = {
  apertura: 'Saldo inicial de caja',
  retiro_codigos: 'Retiro de códigos confirmado',
  entrega_retiro: 'Entrega de retiro recibida',
  envio_efectivo: 'Envío cobrado en efectivo',
  ajuste: 'Ajuste manual',
  compra_usdt: 'Compra de USDT pagada con caja',
  entrada_ves_eur: 'Entrada Bs → EUR pagada con caja',
};

/**
 * The tie-break when two lines carry the same instant, which is not a
 * hypothetical: the opening balance is dated to midnight of its Madrid day and
 * so is every confirmed retiro, so the two collide whenever a retiro is
 * confirmed for the day the caja was opened. 'apertura' has to come first there
 * or the balance would open below its own starting line.
 *
 * 'entrega_retiro' sits between the two collections and the spending for the
 * same reason 'retiro_codigos' sits where it does: a runner handing his notes
 * over is money arriving, and money arriving is read before the money that goes
 * out of the same pocket that day.
 */
const SOURCE_ORDER: Record<CajaSource, number> = {
  apertura: 0,
  retiro_codigos: 1,
  entrega_retiro: 2,
  envio_efectivo: 3,
  ajuste: 4,
  compra_usdt: 5,
  // Same reasoning as compra_usdt: money leaving the caja, so it sorts after it.
  entrada_ves_eur: 6,
};

/** One line of the journal, with the balance as it stood after it. */
export interface CajaLedgerRow {
  occurredAt: Date;
  source: CajaSource;
  refId: number;
  note: string | null;
  amountEur: number;
  /** The running balance AFTER this line. The last one is the caja's balance. */
  balanceEur: number;
}

export interface CajaLedger {
  /** Newest first, the way the page reads. The balance was accumulated oldest first. */
  rows: CajaLedgerRow[];
  /** What is in the caja right now. Zero when there is nothing at all. */
  balanceEur: number;
}

/**
 * Walk every movement oldest-first, accumulating the balance, and hand the
 * journal back newest-first.
 *
 * Two rules that are not obvious from the signature:
 *
 * 1. The apertura line is the floor, not merely the first row. Anything dated
 *    before it is DROPPED. The opening balance is a physical count of the notes
 *    in Jose's pocket, so everything that ever went in or out before that count
 *    is already inside the number — and the EFECTIVO sendings in the database
 *    predate the caja by months. Adding them on top would invent euros that are
 *    not there. This is the only place that rule is applied, and it is applied
 *    here rather than in SQL so it is one readable line with one explanation
 *    instead of a repeated `where` on all four branches of the union.
 *
 * 2. With no apertura line at all the balance simply starts at zero and nothing
 *    is dropped. That state only exists if the seed in migration 015 never ran;
 *    reporting a plausible-looking balance off a partial ledger would be worse
 *    than reporting the small one it can actually justify.
 */
export function buildCajaLedger(movements: readonly CajaMovement[]): CajaLedger {
  const ordered = [...movements].sort(compareMovements);
  const opening = ordered.find((m) => m.source === 'apertura');
  const counted = opening
    ? ordered.filter((m) => m.occurred_at.getTime() >= opening.occurred_at.getTime())
    : ordered;

  let balance = 0;
  const rows = counted.map((movement) => {
    balance += movement.amount_eur;
    return {
      occurredAt: movement.occurred_at,
      source: movement.source,
      refId: movement.ref_id,
      note: movement.note,
      amountEur: movement.amount_eur,
      balanceEur: balance,
    };
  });

  return { rows: rows.reverse(), balanceEur: balance };
}

function compareMovements(a: CajaMovement, b: CajaMovement): number {
  const byTime = a.occurred_at.getTime() - b.occurred_at.getTime();
  if (byTime !== 0) return byTime;
  const bySource = SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source];
  if (bySource !== 0) return bySource;
  return a.ref_id - b.ref_id;
}

/* ------------------------------------------------- confirmación de retiros */

/**
 * How many consecutive días the retiros panel offers.
 *
 * A day that falls out of this window without ever being confirmed stays
 * unconfirmed for good — there is no archive and no search, by Jose's own
 * decision. Confirming is a same-day errand; a panel that let him confirm a
 * fortnight late would mostly be a way to confirm from memory.
 */
export const RETIRO_WINDOW_DAYS = 4;

/** One día of the panel, as the database counted it. */
export interface RetiroDia {
  /** YYYY-MM-DD, the Europe/Madrid day of retired_at. */
  day: string;
  /** sum(codigos.amount) for retirado códigos on that day, as it stands NOW. */
  system_eur: number;
  /** The same sum as it stood when Jose confirmed. Null when he has not. */
  confirmed_system_eur: number | null;
  /** What he actually counted. Null when unconfirmed. This is what the caja gets. */
  counted_eur: number | null;
  confirmed_at: Date | null;
}

export interface RetiroRow {
  day: string;
  systemEur: number;
  countedEur: number | null;
  confirmedAt: Date | null;
  /**
   * counted − system, against the LIVE system total rather than the one stored
   * with the confirmation. The stored figure is the audit trail; the live one is
   * what the códigos say today, and a diff quoted against anything else would
   * stop matching the two numbers printed beside it.
   */
  diffEur: number | null;
  /**
   * The system total moved after the confirmation was taken — a retirado
   * código's amount was corrected through updateCodigo(). Not an error, but the
   * reason the "volver a confirmar" control exists, so the row says so.
   */
  moved: boolean;
}

/**
 * The panel's rows, always RETIRO_WINDOW_DAYS of them and always in the order
 * the query returned.
 *
 * Every day is shown even when nothing was withdrawn on it, the same rule
 * buildConsolidacionRows follows and for the same reason: a día with no retiros
 * is a fact worth seeing, and dropping it would make an empty day look like a
 * day nobody checked.
 */
export function buildRetiroRows(dias: readonly RetiroDia[]): RetiroRow[] {
  return dias.map((dia) => ({
    day: dia.day,
    systemEur: dia.system_eur,
    countedEur: dia.counted_eur,
    confirmedAt: dia.confirmed_at,
    diffEur: dia.counted_eur === null ? null : dia.counted_eur - dia.system_eur,
    moved:
      dia.confirmed_system_eur !== null && dia.confirmed_system_eur !== dia.system_eur,
  }));
}
