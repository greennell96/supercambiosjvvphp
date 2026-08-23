'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text } from '@/lib/parse';
import { createCodigo, deleteCodigo } from '@/lib/queries';

export interface NuevoCodigoState {
  error?: string;
  ok?: { amount: number; bank: string };
}

export async function crearCodigoAction(
  _prev: NuevoCodigoState,
  formData: FormData,
): Promise<NuevoCodigoState> {
  const clientId = parseId(formData.get('client_id'));
  const amount = parseDecimal(formData.get('amount'));
  const bank = text(formData.get('bank'));

  if (!clientId) return { error: 'Elige un cliente de la lista.' };
  if (amount === null || !(amount > 0)) return { error: 'Escribe un monto mayor que cero.' };
  if (!bank) return { error: 'Indica el banco.' };

  try {
    await createCodigo({ client_id: clientId, amount, bank });
    revalidatePath('/');
    revalidatePath('/codigos');
    return { ok: { amount, bank } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el código.' };
  }
}

/**
 * Delete a codigo. Nothing to give back and nothing to refuse: a codigo is
 * independent of both pools, so only the codigos list and the dashboard count
 * change.
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
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el código.' };
  }
}
