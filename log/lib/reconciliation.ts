/**
 * El cuadre de códigos: what the envíos say against what the códigos say.
 *
 * A código is how a client's payment gets logged, so the EUR written into envíos
 * on a day and the EUR written into códigos on that same day are two records of
 * the same money. They should agree. When they do not, something was mistyped or
 * never written down at all — and that is the only thing this module reports:
 * the gap, never a guess about what caused it.
 *
 * The gap points both ways and neither way is a loss. More envíos than códigos
 * means a payment was never logged; more códigos than envíos means a código was
 * registered for an envío that is not there. Both are the same instruction: go
 * look at that day.
 *
 * Pure module: no database, no React, no formatting. The Europe/Madrid day
 * boundary is decided once in lib/day-buckets.ts and arrives here already
 * resolved, and the labels leave as raw YYYY-MM-DD keys for the component to
 * render — the same split lib/stats.ts keeps.
 */

/** The two sides of one day, as the database counted them. */
export interface ConsolidacionDia {
  envios_eur: number;
  codigos_eur: number;
}

export interface CodigoConsolidacion {
  today: ConsolidacionDia & { day: string };
  yesterday: ConsolidacionDia & { day: string };
  before_yesterday: ConsolidacionDia & { day: string };
  /** Every envío and every código ever logged, with no date filter at all. */
  total: ConsolidacionDia;
}

export interface ConsolidacionRow {
  /** A YYYY-MM-DD day key, or TOTAL_LABEL on the last row. */
  label: string;
  enviosEur: number;
  codigosEur: number;
  diffEur: number;
}

/**
 * What the total row carries instead of a day key. Not a date, so the component
 * can tell the two apart without matching a date shape.
 */
export const TOTAL_LABEL = 'total';

/**
 * The four rows of the cuadre, always in the same order: the three most recent
 * days, then the all-time total.
 *
 * Always four, even when a day has nothing on either side. A day with no envíos
 * and no códigos is a fact worth seeing on a reconciliation table — dropping it
 * would make an empty day look like a day that was never checked.
 */
export function buildConsolidacionRows(data: CodigoConsolidacion): ConsolidacionRow[] {
  return [
    toRow(data.today.day, data.today),
    toRow(data.yesterday.day, data.yesterday),
    toRow(data.before_yesterday.day, data.before_yesterday),
    toRow(TOTAL_LABEL, data.total),
  ];
}

function toRow(label: string, dia: ConsolidacionDia): ConsolidacionRow {
  return {
    label,
    enviosEur: dia.envios_eur,
    codigosEur: dia.codigos_eur,
    diffEur: dia.envios_eur - dia.codigos_eur,
  };
}
