'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text, textOrNull } from '@/lib/parse';
import {
  createSending,
  deleteSending,
  markClientPaid,
  type CreateSendingResult,
} from '@/lib/queries';
import { isClientPaymentMethod } from '@/lib/types';

export interface NuevoEnvioState {
  error?: string;
  result?: CreateSendingResult;
}

export async function crearEnvioAction(
  _prev: NuevoEnvioState,
  formData: FormData,
): Promise<NuevoEnvioState> {
  const clientId = parseId(formData.get('client_id'));
  const amountEur = parseDecimal(formData.get('amount_eur'));
  const rateTasa = parseDecimal(formData.get('rate_tasa'));
  const payoutMethod = text(formData.get('payout_method'));

  if (!clientId) return { error: 'Elige un cliente de la lista.' };
  if (amountEur === null || !(amountEur > 0)) {
    return { error: 'Escribe un monto en EUR mayor que cero.' };
  }
  if (rateTasa === null || !(rateTasa > 0)) {
    return { error: 'Escribe la tasa EUR/VES de este envío (mayor que cero).' };
  }
  if (!payoutMethod) return { error: 'Elige un método de pago.' };

  try {
    const result = await createSending({
      client_id: clientId,
      amount_eur: amountEur,
      rate_tasa: rateTasa,
      payout_method: payoutMethod,
    });
    revalidatePath('/');
    revalidatePath('/envios');
    revalidatePath('/stats');
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el envío.' };
  }
}

export interface ClientePagoState {
  error?: string;
  /**
   * Timestamp of the last successful save, not a boolean, for the same reason
   * EditSendingState uses one: the form closes itself on it, and two saves in a
   * row have to look different.
   */
  savedAt?: number;
}

/**
 * Record that the CLIENT paid Jose for this sending.
 *
 * Not to be confused with the "Marcar pagado" buttons next to it: those settle
 * the Venezuelan side, Jose paying the beneficiary, and they move both pools.
 * This one only says the money arrived here in Spain. It touches no pool, no
 * cost and no profit, and it works whatever the payout status is.
 *
 * Both extras belong to exactly one method, so each is read only when that
 * method was chosen. The form already unmounts the control that does not apply,
 * so this is the same guard the money actions use: what decides the write is
 * read here, not trusted from whatever the request happened to carry.
 */
export async function clientePagoAction(
  _prev: ClientePagoState,
  formData: FormData,
): Promise<ClientePagoState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  const method = text(formData.get('method'));
  if (!isClientPaymentMethod(method)) return { error: 'Elige cómo pagó el cliente.' };

  const codigoId = method === 'CODIGO' ? parseId(formData.get('codigo_id')) : null;
  const note = method === 'OTRO' ? textOrNull(formData.get('client_payment_note')) : null;

  try {
    await markClientPaid(sendingId, { method, codigo_id: codigoId, note });
    revalidatePath('/');
    revalidatePath('/envios');
    // A linked codigo now points at this sending, so its list changes too.
    revalidatePath('/codigos');
    revalidatePath('/stats');
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el cobro.' };
  }
}

/**
 * Delete a sending and give back whatever it drew.
 *
 * This never refuses on business grounds — a sending is a leaf — but it does
 * move a pool whenever the sending was already paid, so the compras and ventas
 * lists are revalidated too. A linked codigo is unlinked by the foreign key
 * itself (on delete set null, migration 012), so /codigos changes as well.
 */
export async function eliminarEnvioAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  try {
    await deleteSending(sendingId);
    revalidatePath('/');
    revalidatePath('/envios');
    revalidatePath('/codigos');
    revalidatePath('/compras');
    revalidatePath('/ventas');
    revalidatePath('/stats');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el envío.' };
  }
}
