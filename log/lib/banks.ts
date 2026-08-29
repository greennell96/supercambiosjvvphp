/**
 * Bank handling: parsing the bank list a client has, the CaixaBank DNI
 * reminder, and the two things /codigos does with the bank a código belongs to
 * — group the pendientes by it, and colour the row's border with it. Used by
 * /codigos and /clientes.
 *
 * A sending's payout method is deliberately NOT in here. It used to be built
 * from the client's banks, but it turned out to describe how JOSE funds the
 * payout, not which bank the client likes, so it is now the fixed three-value
 * list SENDING_PAYOUT_METHODS in lib/pricing.ts, next to the fee rule that
 * reads it. /codigos still asks about the client's own banks, because there the
 * question really is "which bank does this client's withdrawal code work with".
 *
 * Pure module, no database.
 */

import { normalizeText } from './text';

/** Values that mean "no bank recorded" rather than an actual bank name. */
const BANK_PLACEHOLDERS = new Set([
  'n/a',
  'na',
  'n.a',
  'n/d',
  'none',
  'ninguno',
  'ninguna',
  '-',
  '--',
  'x',
  '?',
]);

/** True when the WHOLE field is a "nothing here" marker, e.g. "n/a" or "-". */
export function isBankPlaceholder(raw: string | null | undefined): boolean {
  if (!raw) return true;
  return BANK_PLACEHOLDERS.has(normalizeText(String(raw)));
}

/**
 * Split a free-text bank field into a clean list.
 *
 * Accepts every separator seen in the source spreadsheet and in hand typing:
 * comma, slash, semicolon, newline, dash, and the Spanish " y ".
 * Trims, drops empties and placeholders, and removes duplicates
 * (case-insensitively, keeping the first spelling).
 */
export function parseBanks(raw: string | null | undefined): string[] {
  // "n/a" is a placeholder, not a bank called "n" and a bank called "a", so it
  // has to be caught before the field is split on "/".
  if (isBankPlaceholder(raw)) return [];
  const pieces = String(raw).split(/\s+y\s+|[,/;\n\r-]+/i);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const piece of pieces) {
    const value = piece.trim();
    if (!value) continue;
    const key = normalizeText(value);
    if (BANK_PLACEHOLDERS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/**
 * The one spelling of CaixaBank this file matches on. Shared by the DNI
 * reminder and the colour, so the two can never disagree about what "Caixa"
 * means.
 */
const CAIXA = 'caixa';

/**
 * CaixaBank payouts need the client's DNI/NIE on hand, so the UI shows it.
 * Case-insensitive, accent-insensitive, partial match: "Caixa", "CaixaBank",
 * "la caixa", "CAIXABANK ES" all trigger it.
 */
export function requiresDniReminder(bank: string | null | undefined): boolean {
  if (!bank) return false;
  return normalizeText(bank).includes(CAIXA);
}

/**
 * The banks Jose withdraws from often enough to recognise by colour, and the
 * class that colours them. Same fuzzy match as requiresDniReminder, because the
 * field is free text and gets typed a different way every week.
 *
 * Order is the tie-break: a field naming two of them takes the first listed.
 * That case is rare enough not to be worth a rule of its own, but it has to be
 * decided somewhere, and "first in this list" is at least stable.
 */
const BANK_COLOURS: ReadonlyArray<readonly [needle: string, className: string]> = [
  ['bbva', 'bank-bbva'],
  ['sabadell', 'bank-sabadell'],
  ['santander', 'bank-santander'],
  [CAIXA, 'bank-caixa'],
  ['halcash', 'bank-halcash'],
];

/**
 * The colour class for a código's bank, or '' for a bank with no colour of its
 * own.
 *
 * Only ever a border colour (globals.css owns which). The point is to let the
 * eye find the end of the BBVA block while working down the pendientes; it is
 * not a status, and nothing about the row's meaning is in it.
 */
export function bankColorClass(bank: string | null | undefined): string {
  if (!bank) return '';
  const normalized = normalizeText(bank);
  for (const [needle, className] of BANK_COLOURS) {
    if (normalized.includes(needle)) return className;
  }
  return '';
}

/**
 * Order two bank names for a work list: alphabetically, ignoring case and
 * accents, with the ones that name no bank at all pushed to the end.
 *
 * Withdrawals are done bank by bank — you get to a cajero and empty every code
 * that works there — so the pendientes are grouped by bank rather than by when
 * they were issued. A blank bank is not a group, it is a gap in the record, so
 * it sorts last instead of first.
 */
export function compareBankNames(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const left = isBankPlaceholder(a) ? '' : normalizeText(String(a));
  const right = isBankPlaceholder(b) ? '' : normalizeText(String(b));
  if (!left || !right) return left === right ? 0 : left ? -1 : 1;
  return left.localeCompare(right, 'es');
}
