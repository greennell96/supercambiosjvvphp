'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text } from '@/lib/parse';
import { createCodigo, deleteCodigo } from '@/lib/queries';

export interface NuevoCodigoState {
  error?: string;
  ok?: { code: string; amount: number; bank: string; linked: boolean };
}

/**
 * Register a codigo.
 *
 * The optional "vincular a un envío abierto" picker is the one thing here that
 * reaches outside /codigos: linking marks that sending's whole payment group as
 * paid by the client, with method CODIGO. Blank means unlinked, which is the
 * normal case and changes nothing else. lib/queries.ts does that in one
 * transaction and re-checks every sibling under a lock, so a stale pick is
 * refused rather than acted on.
 */
export async function crearCodigoAction(
  _prev: NuevoCodigoState,
  formData: FormData,
): Promise<NuevoCodigoState> {
  const clientId = parseId(formData.get('client_id'));
  const code = text(formData.get('code'));
  const amount = parseDecimal(formData.get('amount'));
  const bank = text(formData.get('bank'));
  // parseId returns null for a blank field, which is exactly "no link".
  const sendingId = parseId(formData.get('sending_id'));

  if (!clientId) return { error: 'Elige un cliente de la lista.' };
  if (!code) return { error: 'Escribe el código.' };
  if (amount === null || !(amount > 0)) return { error: 'Escribe un monto mayor que cero.' };
  if (!bank) return { error: 'Indica el banco.' };

  try {
    await createCodigo({ client_id: clientId, code, amount, bank, sending_id: sendingId });
    revalidatePath('/');
    revalidatePath('/codigos');
    // The linked sending now says the client paid, so its list changes too.
    revalidatePath('/envios');
    revalidatePath('/stats');
    return { ok: { code, amount, bank, linked: sendingId !== null } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el código.' };
  }
}

/**
 * Delete a codigo. Nothing to give back and nothing to refuse: a codigo is
 * independent of both pools, so no total moves.
 *
 * It can still change a sending, though: a linked codigo is the proof the client
 * paid, and deleting it puts that sending back to unpaid-by-client. So /envios
 * is revalidated too.
 */
export async function eliminarCodigoAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const codigoId = parseId(formData.get('id'));
  if (!codigoId) return { error: 'Código no válido.' };

  try {
    await deleteCodigo(codigoId);
    revalidatePath('/');
    revalidatePath('/codigos');
    revalidatePath('/envios');
    revalidatePath('/stats');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el código.' };
  }
}
