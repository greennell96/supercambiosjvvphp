'use server';

import { revalidatePath } from 'next/cache';

import { parseDecimal, text } from '@/lib/parse';
import { createCajaManualEntry } from '@/lib/queries';

export interface NuevaEntradaCajaState {
  error?: string;
  ok?: { amountEur: number; note: string };
}

/**
 * Money in or out of the pocket that no other screen explains.
 *
 * Everything else in the caja journal is derived from a row that already exists
 * somewhere — a retiro confirmado, an envío cobrado en efectivo, a compra pagada
 * con caja — and none of those needs typing here. This is the remainder: change
 * given, a personal expense taken out of the takings, a correction to an earlier
 * count.
 *
 * The amount is signed, one field, and both signs are ordinary: a positive entry
 * puts euros in, a negative one takes them out. Zero is refused because the
 * schema refuses it — an entry that moves nothing is a note, and this is not a
 * notebook.
 *
 * The comment is REQUIRED, and it is the only field here that is. A manual entry
 * is by definition the one line of the journal that cannot be traced back to a
 * row that explains it, so the explanation has to travel with it or the balance
 * ends up holding euros nobody can account for a month later.
 *
 * Only /caja is revalidated: no other screen in the app reads this table.
 */
export async function nuevaEntradaCajaAction(
  _prev: NuevaEntradaCajaState,
  formData: FormData,
): Promise<NuevaEntradaCajaState> {
  const amountEur = parseDecimal(formData.get('amount_eur'));
  const note = text(formData.get('note'));

  if (amountEur === null || amountEur === 0) {
    return { error: 'Escribe un monto distinto de cero (negativo si sale de la caja).' };
  }
  if (!note) return { error: 'Escribe de qué es esta entrada.' };

  try {
    await createCajaManualEntry({ amount_eur: amountEur, note });
    revalidatePath('/caja');
    return { ok: { amountEur, note } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar la entrada.' };
  }
}
