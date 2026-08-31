'use server';

import { revalidatePath } from 'next/cache';

import { parseDecimal, text } from '@/lib/parse';
import { confirmarRetiroDia } from '@/lib/queries';

export interface ConfirmarRetiroState {
  error?: string;
  /**
   * Timestamp of the last successful confirmation, not a boolean: the inline
   * form watches this to close itself, and confirming the same día twice in a
   * row — which is the whole point of the "volver a confirmar" control — has to
   * look different to it.
   */
  savedAt?: number;
}

/**
 * Confirm what actually came out of the cajero on one día.
 *
 * The día is validated as a shape and then handed over as a key, never parsed
 * into a Date here: it is a Europe/Madrid calendar day, lib/day-buckets.ts is
 * what produced it, and turning it into an instant on the way past is how a
 * confirmation would end up filed against the day before.
 *
 * Zero is accepted and only negatives are refused. A día on which nothing was
 * withdrawn is a real answer, and being able to say "I checked, there was
 * nothing" is worth more than the field being non-empty.
 *
 * The system total is not read from the form at all — lib/queries.ts recomputes
 * it inside the transaction, so what is stored is what the códigos said at the
 * moment of confirming rather than what the page happened to be showing.
 */
export async function confirmarRetiroAction(
  _prev: ConfirmarRetiroState,
  formData: FormData,
): Promise<ConfirmarRetiroState> {
  const day = text(formData.get('day'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: 'Día no válido.' };

  const countedEur = parseDecimal(formData.get('counted_eur'));
  if (countedEur === null || countedEur < 0) {
    return { error: 'Escribe cuánto retiraste (cero o más).' };
  }

  try {
    await confirmarRetiroDia(day, countedEur);
    revalidatePath('/stats');
    // The counted amount IS a caja entry, so the balance and the journal move
    // with it. Nothing else in the app reads a confirmation.
    revalidatePath('/caja');
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo confirmar el retiro.' };
  }
}
