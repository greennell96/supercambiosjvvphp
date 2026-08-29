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
  updateCodigo,
  updateRates,
  type EditSendingMoney,
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
 * The money fields are only sent when the row was pending as rendered. That is a
 * UI convenience, not the guard — lib/queries.ts re-reads the status from the
 * locked row and refuses the money edit if it got paid meanwhile, and re-reads
 * is_personal so neither kind of sending can be edited through the other's
 * fields.
 *
 * Which fields those are depends on the kind. A client sending has monto, tasa
 * and método; an envío propio has bolívares and método — it never had a EUR
 * amount or a tasa to correct.
 *
 * The note is sent every time, whatever the status, and each kind has its own.
 * "Cómo pagó el cliente" is Jose's reminder of how the money was handed over in
 * Spain; "Para quién" is the only record of who received an envío propio. Both
 * are descriptive and feed no calculation, so neither freezes when the sending
 * is paid — which is exactly why "Para quién" is read out here and not inside
 * the money branch.
 */
export async function editSendingAction(
  _prev: EditSendingState,
  formData: FormData,
): Promise<EditSendingState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  const personal = text(formData.get('is_personal')) === '1';
  const clientPaymentNote = personal ? null : textOrNull(formData.get('client_payment_note'));

  // Read whatever the status: it is the only record of who received the money,
  // and a paid envío propio must still be correctable.
  const personalNote = personal ? textOrNull(formData.get('personal_note')) : null;
  if (personal && !personalNote) return { error: 'Escribe a quién le enviaste el dinero.' };

  const money = text(formData.get('edit_money')) === '1';

  let moneyInput: EditSendingMoney | null = null;
  if (money && personal) {
    const amountVes = parseDecimal(formData.get('amount_ves'));
    const payoutMethod = text(formData.get('payout_method'));

    if (amountVes === null || !(amountVes > 0)) {
      return { error: 'Escribe un monto en bolívares mayor que cero.' };
    }
    if (!payoutMethod) return { error: 'Elige un método de pago.' };

    moneyInput = { kind: 'personal', amount_ves: amountVes, payout_method: payoutMethod };
  } else if (money) {
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

    moneyInput = {
      kind: 'client',
      amount_eur: amountEur,
      rate_tasa: rateTasa,
      payout_method: payoutMethod,
    };
  }

  try {
    await editSending(sendingId, {
      money: moneyInput,
      client_payment_note: clientPaymentNote,
      personal_note: personalNote,
    });
    revalidateEverything();
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el envío.' };
  }
}

export interface EditCodigoState {
  error?: string;
  /** Same timestamp-not-boolean as EditSendingState: the form watches it to close. */
  savedAt?: number;
}

/**
 * Correct a codigo by hand.
 *
 * Lives here rather than in app/codigos/actions.ts because it is the same kind
 * of thing editSendingAction is — a row correction reached from a list — and
 * because the form that calls it is a shared component. app/codigos/actions.ts
 * holds what only /codigos does: create and delete.
 *
 * Three fields and no more. The client and the linked sending are not in the
 * form and are not read here; lib/queries.ts does not touch those columns
 * either, so a typo fix can never move a codigo onto another client or
 * un-prove a sending's payment. The status is not here either: a retirado
 * codigo is corrected exactly like a pendiente one.
 *
 * The validation is crearCodigoAction's, word for word, because it is the same
 * three fields — the same typo has to be refused the same way whichever screen
 * it was typed on.
 */
export async function editarCodigoAction(
  _prev: EditCodigoState,
  formData: FormData,
): Promise<EditCodigoState> {
  const codigoId = parseId(formData.get('id'));
  const code = text(formData.get('code'));
  const amount = parseDecimal(formData.get('amount'));
  const bank = text(formData.get('bank'));

  if (!codigoId) return { error: 'Código no válido.' };
  if (!code) return { error: 'Escribe el código.' };
  if (amount === null || !(amount > 0)) return { error: 'Escribe un monto mayor que cero.' };
  if (!bank) return { error: 'Indica el banco.' };

  try {
    await updateCodigo(codigoId, { code, amount, bank });
    // crearCodigoAction's list exactly, and for its reason: /envios shows the
    // código's monto and banco in the "Cliente pagó" picker, and both /stats and
    // the dashboard cuadre count its amount.
    revalidatePath('/');
    revalidatePath('/codigos');
    revalidatePath('/envios');
    revalidatePath('/stats');
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo guardar el código.' };
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
