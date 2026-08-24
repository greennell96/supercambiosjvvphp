'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { parseDecimal, parseId, text, textOrNull } from '@/lib/parse';
import {
  editSending,
  markCodigoRetirado,
  paySendingDirect,
  paySendingFromPool,
  updateRates,
} from '@/lib/queries';
import { SESSION_COOKIE } from '@/lib/session';

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

/** Every screen that can change a pending sending or codigo. */
function revalidateEverything(): void {
  revalidatePath('/');
  revalidatePath('/envios');
  revalidatePath('/codigos');
  revalidatePath('/compras');
  revalidatePath('/ventas');
  revalidatePath('/stats');
}

export interface PayState {
  error?: string;
}

/**
 * What every row-level delete answers: nothing when the row is gone, or the
 * reason it is still there.
 *
 * One shape for all four lists, because DeleteRowForm is one component. Each
 * entity's own delete action lives in its own app/<seccion>/actions.ts.
 */
export interface DeleteState {
  error?: string;
}

/**
 * (a) Pay a pending sending out of the bolivares already in the account.
 * One click: the amount was fixed when the sending was logged.
 */
export async function paySendingPoolAction(_prev: PayState, formData: FormData): Promise<PayState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  try {
    await paySendingFromPool(sendingId);
    revalidateEverything();
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo pagar el envío.' };
  }
}

/**
 * (b) Pay a pending sending by selling USDT straight into the beneficiary's
 * account. Jose supplies the USDT he sold; the bolivares never enter the pool.
 */
export async function paySendingDirectAction(
  _prev: PayState,
  formData: FormData,
): Promise<PayState> {
  const sendingId = parseId(formData.get('id'));
  const usdtSold = parseDecimal(formData.get('usdt_sold'));

  if (!sendingId) return { error: 'Envío no válido.' };
  if (usdtSold === null || !(usdtSold > 0)) {
    return { error: 'Escribe los USDT vendidos (mayor que cero).' };
  }

  try {
    await paySendingDirect(sendingId, usdtSold);
    revalidateEverything();
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo pagar el envío.' };
  }
}

export interface EditSendingState {
  error?: string;
  /**
   * Timestamp of the last successful save, not a boolean: the form watches this
   * to close itself, and two saves in a row have to look different to it.
   */
  savedAt?: number;
}

/**
 * Correct a sending by hand.
 *
 * The three money fields are only sent when the row was pending as rendered.
 * That is a UI convenience, not the guard — lib/queries.ts re-reads the status
 * from the locked row and refuses the money edit if it got paid meanwhile.
 *
 * The note is sent every time, whatever the status: it is Jose's own reminder of
 * how the client handed the money over in Spain and feeds no calculation.
 */
export async function editSendingAction(
  _prev: EditSendingState,
  formData: FormData,
): Promise<EditSendingState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  const clientPaymentNote = textOrNull(formData.get('client_payment_note'));
  const money = text(formData.get('edit_money')) === '1';

  let moneyInput: { amount_eur: number; rate_tasa: number; payout_method: string } | null = null;
  if (money) {
    const amountEur = parseDecimal(formData.get('amount_eur'));
    const rateTasa = parseDecimal(formData.get('rate_tasa'));
    const payoutMethod = text(formData.get('payout_method'));

    if (amountEur === null || !(amountEur > 0)) {
      return { error: 'Escribe un monto en EUR mayor que cero.' };
    }
    if (rateTasa === null || !(rateTasa > 0)) {
      return { error: 'Escribe la tasa EUR/VES de este envío (mayor que cero).' };
    }
    if (!payoutMethod) return { error: 'Elige un método de pago.' };

    moneyInput = { amount_eur: amountEur, rate_tasa: rateTasa, payout_method: payoutMethod };
  }

  try {
    await editSending(sendingId, {
      money: moneyInput,
      client_payment_note: clientPaymentNote,
    });
    revalidateEverything();
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el envío.' };
  }
}

export async function markCodigoRetiradoAction(formData: FormData): Promise<void> {
  const codigoId = parseId(formData.get('id'));
  if (!codigoId) return;
  await markCodigoRetirado(codigoId);
  revalidatePath('/');
  revalidatePath('/codigos');
  revalidatePath('/stats');
}

export interface RatesState {
  error?: string;
  ok?: boolean;
}

/**
 * Updates the suggested tasa. This is only the prefill for the next sending's
 * tasa input; it is never applied to a sending on its own.
 */
export async function updateRatesAction(
  _prev: RatesState,
  formData: FormData,
): Promise<RatesState> {
  const tasa = parseDecimal(formData.get('tasa_eur_ves'));
  if (tasa === null || !(tasa > 0)) return { error: 'La tasa EUR/VES debe ser mayor que cero.' };

  await updateRates(tasa);
  revalidatePath('/');
  revalidatePath('/envios');
  return { ok: true };
}
