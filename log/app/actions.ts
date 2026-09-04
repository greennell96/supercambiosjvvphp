'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { parseDecimal, parseId, text, textOrNull } from '@/lib/parse';
import {
  editSending,
  findOrCreateRetiroAgente,
  markCodigoRetirado,
  markCodigosRetiradosPorTercero,
  paySendingDirect,
  paySendingFromPool,
  paySendingUsdt,
  reassignCodigoRetirado,
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

/**
 * Every screen that can change a pending sending or codigo.
 *
 * /caja is in the list because a sending the client paid EFECTIVO is a line of
 * the libro de caja, derived live from amount_eur and client_paid_at — so an
 * edit to either moves the balance, even though nothing here knows about cash.
 */
function revalidateEverything(): void {
  revalidatePath('/');
  revalidatePath('/envios');
  revalidatePath('/codigos');
  revalidatePath('/compras');
  revalidatePath('/ventas');
  revalidatePath('/stats');
  revalidatePath('/caja');
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

/**
 * (c) Pay a pending Envío USDT. One click, like the pool button: the amount
 * was fixed when the sending was logged (usdt_to_deliver), so there is
 * nothing left to ask José for, only the id of what to draw.
 */
export async function paySendingUsdtAction(_prev: PayState, formData: FormData): Promise<PayState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  try {
    await paySendingUsdt(sendingId);
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
 *
 * The date is the third thing in that category and the least obvious one: it
 * decides which day the row is filed under and nothing else. See the block
 * where it is parsed for why it is stored at noon.
 */
export async function editSendingAction(
  _prev: EditSendingState,
  formData: FormData,
): Promise<EditSendingState> {
  const sendingId = parseId(formData.get('id'));
  if (!sendingId) return { error: 'Envío no válido.' };

  const personal = text(formData.get('is_personal')) === '1';
  const usdt = text(formData.get('is_usdt')) === '1';
  const clientPaymentNote = personal ? null : textOrNull(formData.get('client_payment_note'));

  // Read whatever the status: it is the only record of who received the money,
  // and a paid envío propio must still be correctable.
  const personalNote = personal ? textOrNull(formData.get('personal_note')) : null;
  if (personal && !personalNote) return { error: 'Escribe a quién le enviaste el dinero.' };

  /*
    The day the sending is filed under, and the reason it is editable at all:
    some clients send today and pay tomorrow, and the sending has to sit on the
    day it actually reconciles against or the cuadre reports a gap that is not
    there. Read on every submit, whatever the kind and whatever the status —
    nothing computes from it, exactly like the notes.

    Noon UTC, deliberately not midnight. <input type="date"> gives back a bare
    YYYY-MM-DD with no zone, and everything that reads this column groups it in
    Europe/Madrid — which is UTC+1 or UTC+2, always ahead. Midnight UTC would
    land at 01:00 or 02:00 Madrid on the SAME day, which happens to work, but
    midnight is only two hours from being the previous day and any future change
    of that shape would silently move rows. Noon has twelve hours of margin on
    both sides, so the date Jose picked is the date Madrid reads back, in either
    half of the year and with no DST case to reason about.
  */
  const createdAtRaw = text(formData.get('created_at'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAtRaw)) return { error: 'Elige una fecha válida.' };
  const createdAt = new Date(`${createdAtRaw}T12:00:00.000Z`);
  if (Number.isNaN(createdAt.getTime())) return { error: 'Elige una fecha válida.' };

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
  } else if (money && usdt) {
    const amountEur = parseDecimal(formData.get('amount_eur'));
    const usdtToDeliver = parseDecimal(formData.get('usdt_to_deliver'));

    if (amountEur === null || !(amountEur > 0)) {
      return { error: 'Escribe un monto en EUR mayor que cero.' };
    }
    if (usdtToDeliver === null || !(usdtToDeliver > 0)) {
      return { error: 'Escribe los USDT a entregar (mayor que cero).' };
    }

    moneyInput = { kind: 'usdt', amount_eur: amountEur, usdt_to_deliver: usdtToDeliver };
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
      created_at: createdAt,
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

export interface MarcarRetiradoPorState {
  error?: string;
  /** Same timestamp-not-boolean as the other two: the form watches it to close. */
  savedAt?: number;
}

/**
 * Mark a selection of códigos retirado by somebody who is not Jose.
 *
 * The sibling of markCodigoRetiradoAction above, and deliberately a separate
 * action rather than an optional argument to it. That one is the errand Jose ran
 * himself, one row at a time, and its cash lands in la caja the moment he
 * confirms the día. This one says the money is somewhere else — in a runner's
 * pocket, or already spent on USDT — and every one of those códigos is excluded
 * from that confirmation for good. Two different claims about where real money
 * is should not share a code path where a missing field silently picks one.
 *
 * A batch and not a row, because that is how it happens: a runner comes back
 * having emptied six codes in one trip.
 *
 * The "Otro" branch creates the agente before marking anything. That order
 * matters — a failed name should leave the códigos untouched, not half-marked
 * against nobody. It is not one transaction with the update, and does not need
 * to be: an agente created and then never used is an unused name in a picker,
 * which is harmless, whereas the reverse would be codigos attributed to an id
 * that does not exist.
 */
export async function marcarRetiradoPorAction(
  _prev: MarcarRetiradoPorState,
  formData: FormData,
): Promise<MarcarRetiradoPorState> {
  const ids = formData
    .getAll('ids')
    .map((raw) => parseId(raw))
    .filter((value): value is number => value !== null);
  if (ids.length === 0) return { error: 'Selecciona al menos un código.' };

  const kind = text(formData.get('kind'));
  if (kind !== 'runner' && kind !== 'crypto_seller') {
    return { error: 'Elige quién retiró el dinero.' };
  }

  try {
    if (kind === 'crypto_seller') {
      await markCodigosRetiradosPorTercero(ids, { kind: 'crypto_seller' });
    } else {
      // A typed name wins over the picker: the "Otro" option is what revealed
      // the field, so anything in it is the answer.
      const newName = text(formData.get('new_agente_name'));
      const agenteId = newName
        ? await findOrCreateRetiroAgente(newName)
        : parseId(formData.get('agente_id'));
      if (!agenteId) return { error: 'Elige quién retiró, o escribe un nombre.' };

      await markCodigosRetiradosPorTercero(ids, { kind: 'runner', agenteId });
    }

    // revalidateEverything and not the narrower list the other códigos actions
    // use: this moves what /stats says a runner is holding AND what /caja says
    // is confirmable, on top of everything a plain retiro touches.
    revalidateEverything();
    return { savedAt: Date.now() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo marcar el retiro.' };
  }
}

export interface ReasignarRetiradoPorState {
  error?: string;
  savedAt?: number;
  notice?: string;
}

/** Correct the actor on an already-retired codigo without deleting its record. */
export async function reasignarRetiradoPorAction(
  _prev: ReasignarRetiradoPorState,
  formData: FormData,
): Promise<ReasignarRetiradoPorState> {
  const codigoId = parseId(formData.get('id'));
  if (!codigoId) return { error: 'Código no válido.' };

  const kind = text(formData.get('kind'));
  try {
    let confirmationRemoved = false;
    if (kind === 'jose') {
      ({ confirmationRemoved } = await reassignCodigoRetirado(codigoId, { kind: 'jose' }));
    } else if (kind === 'crypto_seller') {
      ({ confirmationRemoved } = await reassignCodigoRetirado(codigoId, {
        kind: 'crypto_seller',
      }));
    } else if (kind === 'runner') {
      const newName = text(formData.get('new_agente_name'));
      const agenteId = newName
        ? await findOrCreateRetiroAgente(newName)
        : parseId(formData.get('agente_id'));
      if (!agenteId) return { error: 'Elige quién retiró, o escribe un nombre.' };
      ({ confirmationRemoved } = await reassignCodigoRetirado(codigoId, {
        kind: 'runner',
        agenteId,
      }));
    } else {
      return { error: 'Elige quién retiró el dinero.' };
    }

    revalidateEverything();
    return {
      savedAt: Date.now(),
      notice: confirmationRemoved
        ? 'La confirmación de ese día se quitó. Vuelve a confirmarla en Estadísticas.'
        : undefined,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo corregir el retiro.' };
  }
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
