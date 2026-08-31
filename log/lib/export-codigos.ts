/**
 * The text Jose takes to the cajero, built from the códigos he ticked on
 * /codigos.
 *
 * The withdrawal itself is done standing at a machine, one hand on the phone:
 * the screen asks for a field, he reads it off WhatsApp, he types it. So this
 * is not an export in the spreadsheet sense — no columns, no separators, no
 * header row. It is the same route the pendientes table already lays out,
 * written so that each block can be read top to bottom in the order that bank's
 * cajero asks for it, and so that a field he still has to chase says so out
 * loud instead of leaving a hole he only notices at the machine.
 *
 * That is why the bank decides the shape of the entry rather than just its
 * heading: CaixaBank wants the DNI and treats the amount as something you pick
 * from a menu afterwards, Sabadell likewise takes the amount at the machine,
 * and everything else is código, teléfono, monto. Banks are free text, so a
 * name this file does not recognise still gets a block — spelled the way it was
 * typed, uppercased, because inventing a canonical name would hide a typo Jose
 * needs to see.
 *
 * Pure module, no database and no React.
 */

import { compareBankNames, requiresDniReminder } from './banks';
import { fmtEur } from './format';
import { normalizeText } from './text';
import type { Codigo } from './types';

/** A field Jose has not got yet, said out loud rather than left blank. */
const MISSING = '(falta)';

type Category = 'caixa' | 'bbva' | 'sabadell' | 'generic';

/**
 * Same precedence as BANK_COLOURS in lib/banks.ts: Caixa first, because
 * requiresDniReminder is the one spelling rule the rest of the app already
 * agrees on, then the two banks with a form of their own, then everything else.
 */
function categoryOf(bank: string): Category {
  if (requiresDniReminder(bank)) return 'caixa';
  const normalized = normalizeText(bank);
  if (normalized.includes('bbva')) return 'bbva';
  if (normalized.includes('sabadell')) return 'sabadell';
  return 'generic';
}

function entryFor(c: Codigo, category: Category): string {
  const lines = [`Código: ${c.code || MISSING}`, `Teléfono: ${c.client_phone ?? MISSING}`];
  if (category === 'caixa') lines.push(`DNI: ${c.client_dni_nie ?? MISSING}`);
  lines.push(
    category === 'caixa' || category === 'sabadell'
      ? `Monto (informativo): ${fmtEur(c.amount)}`
      : `Monto: ${fmtEur(c.amount)}`,
  );
  return lines.join('\n');
}

interface Group {
  category: Category;
  /** Raw bank text, handed to compareBankNames so a placeholder still sorts last. */
  sortKey: string;
  entries: Codigo[];
}

export function formatCodigosForExport(codigos: Codigo[]): string {
  const groups = new Map<string, Group>();

  for (const c of codigos) {
    const category = categoryOf(c.bank);
    // Two spellings of one unknown bank are one block, the same way
    // compareBankNames calls them one group in the table.
    const key = category === 'generic' ? `generic:${normalizeText(c.bank)}` : category;
    let group = groups.get(key);
    if (!group) {
      group = { category, sortKey: category === 'generic' ? c.bank : category, entries: [] };
      groups.set(key, group);
    }
    group.entries.push(c);
  }

  return [...groups.values()]
    .sort((a, b) => compareBankNames(a.sortKey, b.sortKey))
    .map((group) => {
      const entries = [...group.entries].sort(
        (a, b) => a.created_at.getTime() - b.created_at.getTime() || a.id - b.id,
      );
      const heading =
        group.category === 'generic'
          ? entries[0].bank.trim().toUpperCase() || MISSING
          : group.category.toUpperCase();
      return `${heading}\n${entries.map((c) => entryFor(c, group.category)).join('\n\n')}`;
    })
    .join('\n\n')
    .trim();
}
