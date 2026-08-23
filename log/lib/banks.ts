/**
 * Bank handling: parsing the bank list a client has, and the CaixaBank DNI
 * reminder. Used by /codigos and /clientes.
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
 * CaixaBank payouts need the client's DNI/NIE on hand, so the UI shows it.
 * Case-insensitive, accent-insensitive, partial match: "Caixa", "CaixaBank",
 * "la caixa", "CAIXABANK ES" all trigger it.
 */
export function requiresDniReminder(bank: string | null | undefined): boolean {
  if (!bank) return false;
  return normalizeText(bank).includes('caixa');
}
