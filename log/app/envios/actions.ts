'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteState } from '../actions';
import { parseDecimal, parseId, text, textOrNull } from '@/lib/parse';
import { SENDING_PAYOUT_METHODS, type SendingPayoutMethod } from '@/lib/pricing';
import {
  createPersonalSending,
  createSending,
  deleteSending,
  markClientPaid,
  previewDirectPayment,
  previewPoolPayment,
  type CreatePersonalSendingResult,
  type CreateSendingResult,
  type PayPreview,
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
  const splitAmounts = formData.getAll('split_amount_eur');
  const splitMethods = formData.getAll('split_payout_method');

  if (!clientId) return { error: 'Elige un cliente de la lista.' };
  if (amountEur === null || !(amountEur > 0)) {
    return { error: 'Escribe un monto en EUR mayor que cero.' };
  }
  if (rateTasa === null || !(rateTasa > 0)) {
    return { error: 'Escribe la tasa EUR/VES de este envío (mayor que cero).' };
  }
  if (!(SENDING_PAYOUT_METHODS as readonly string[]).includes(payoutMethod)) {
    return { error: 'Elige un método de pago.' };
  }
  if (splitAmounts.length !== splitMethods.length) {
    return { error: 'Las partes divididas están incompletas. Revísalas e inténtalo otra vez.' };
  }

  const additionalParts: { amountEur: number; payoutMethod: SendingPayoutMethod }[] = [];
  for (let index = 0; index < splitAmounts.length; index += 1) {
    const amount = parseDecimal(splitAmounts[index]);
    const method = text(splitMethods[index]);
    if (amount === null || !(amount > 0)) {
      return { error: `Escribe un monto mayor que cero para la parte ${index + 2}.` };
    }
    if (!(SENDING_PAYOUT_METHODS as readonly string[]).includes(method)) {
      return { error: `Elige un método de pago para la parte ${index + 2}.` };
    }
    additionalParts.push({ amountEur: amount, payoutMethod: method as SendingPayoutMethod });
  }

  const registerCodigo = text(formData.get('register_codigo')) === '1';
  const codigo = registerCodigo
    ? {
        code: text(formData.get('codigo_code')),
        amount: parseDecimal(formData.get('codigo_amount')),
        bank: text(formData.get('codigo_bank')),
      }
    : null;
  if (codigo !== null) {
    if (!codigo.code) return { error: 'Escribe el código que pagó este envío.' };
    if (codigo.amount === null || !(codigo.amount > 0)) {
      return { error: 'Escribe el monto del código (mayor que cero).' };
    }
    if (!codigo.bank) return { error: 'Indica el banco del código.' };
  }

  try {
    const result = await createSending({
      client_id: clientId,
      amount_eur: amountEur,
      rate_tasa: rateTasa,
      payout_method: payoutMethod as SendingPayoutMethod,
      additional_parts: additionalParts,
      codigo:
        codigo === null
          ? null
          : { code: codigo.code, amount: codigo.amount as number, bank: codigo.bank },
    });
    revalidatePath('/');
    revalidatePath('/envios');
    revalidatePath('/codigos');
    revalidatePath('/stats');
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el envío.' };
  }
}

export interface NuevoEnvioPersonalState {
  error?: string;
  result?: CreatePersonalSendingResult;
}

/**
 * Log an "envío propio": money José is sending to his own family.
 *
 * Three fields, and each is required for its own reason. The bolívares are what
 * he actually knows — there is no client EUR amount and no tasa, so none is
 * asked for or invented. The método de pago is the same three-option list a
 * client sending uses, because the 0,3% interbank rule is the same rule. The
 * comment is the ONLY record of who received the money: no client row carries
 * that name here, so it is required rather than optional.
 *
 * /codigos is deliberately not revalidated: a códigos is a client's proof of
 * payment and an envío propio has no client, so that screen cannot change.
 */
export async function crearEnvioPersonalAction(
  _prev: NuevoEnvioPersonalState,
  formData: FormData,
): Promise<NuevoEnvioPersonalState> {
  const amountVes = parseDecimal(formData.get('amount_ves'));
  const payoutMethod = text(formData.get('payout_method'));
  const personalNote = text(formData.get('personal_note'));

  if (amountVes === null || !(amountVes > 0)) {
    return { error: 'Escribe un monto en bolívares mayor que cero.' };
  }
  if (!(SENDING_PAYOUT_METHODS as readonly string[]).includes(payoutMethod)) {
    return { error: 'Elige un método de pago.' };
  }
  if (!personalNote) return { error: 'Escribe a quién le enviaste el dinero.' };

  try {
    const result = await createPersonalSending({
      amount_ves: amountVes,
      payout_method: payoutMethod,
      personal_note: personalNote,
    });
    revalidatePath('/');
    revalidatePath('/envios');
    revalidatePath('/stats');
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo registrar el envío.' };
  }
}

export interface PreviewPagoState {
  error?: string;
  result?: PayPreview;
}

/*
  What paying an envío propio would cost, before anything is paid.

  Called straight from onClick rather than through useActionState: there is no
  form here and nothing to submit — the button asks a question and gets numbers
  back. Neither of these revalidates anything, on purpose: nothing changed, and
  revalidating would throw away the very page state holding the preview.

  Both are personal-only, and lib/queries.ts is where that is enforced.
*/
export async function previewPagoPoolAction(sendingId: number): Promise<PreviewPagoState> {
  try {
    return { result: await previewPoolPayment(sendingId) };
  } catch (error) {
    // computePoolPayment throws outright when the VES pool holds no lots at all,
    // rather than reporting it as a shortfall. That is a normal thing to ask
    // about, so it comes back as a message, not a crash.
    return { error: error instanceof Error ? error.message : 'No se pudo calcular el coste.' };
  }
}

export async function previewPagoDirectoAction(
  sendingId: number,
  usdtSold: number,
): Promise<PreviewPagoState> {
  if (!(usdtSold > 0)) return { error: 'Escribe los USDT vendidos (mayor que cero).' };

  try {
    return { result: await previewDirectPayment(sendingId, usdtSold) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo calcular el coste.' };
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
    // EFECTIVO means notes in the pocket, which is a line of the libro de caja.
    // Revalidated for every method rather than only that one: the balance is
    // derived live, so guessing which methods can move it is a bug waiting on
    // the day a seventh method is added.
    revalidatePath('/caja');
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
    // A sending the client paid EFECTIVO was a caja line; deleting the row takes
    // the line with it, with no reversal step of its own.
    revalidatePath('/caja');
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el envío.' };
  }
}
