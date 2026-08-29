/**
 * Dividing one pending sending into two.
 *
 * A client hands over 110 EUR once, but the bolivares do not always leave in one
 * piece: 90 through one bank and 20 through another is a normal afternoon. Until
 * now a sending was one atomic row, so the second half had nowhere to live and
 * the payout_method on the row was a lie about half the money.
 *
 * Dividing peels a portion off the row and gives it a row of its own. Nothing is
 * created out of nothing: the EUR that leaves the original is exactly the EUR the
 * new row receives, at the same tasa, so the two rows together still owe the same
 * bolivares the one row owed. From that moment they are independent — each is
 * paid, edited and deleted on its own, and each draws the pools separately when
 * it is paid.
 *
 * Everything here is pure. lib/queries.ts locks the row, calls this once, and
 * writes back the two shapes it returns.
 *
 * Three rules are worth spelling out, because each is a decision and not an
 * accident:
 *
 *   - Only a PENDING CLIENT sending can be divided. A paid one has already drawn
 *     the pools against the amount it had, so moving that amount afterwards would
 *     leave the ledger saying one thing and the pools another — the same reason
 *     editSending freezes the money fields at payment. An envio propio has no
 *     amount_eur at all (migration 014): there is no EUR figure to divide.
 *
 *   - The portion must be STRICTLY smaller than what is on the row. Splitting off
 *     the whole thing would leave a zero-EUR original, which the schema calls a
 *     client sending and every sum would then read as a free transfer. Wanting to
 *     move the entire sending to another bank is a different intent, and "Editar"
 *     is where it already lives.
 *
 *   - The client paid ONCE, for the whole amount, so whatever the original says
 *     about that payment is copied verbatim onto the new row — including null,
 *     when he has not paid yet. Deciding anything else here would either invent a
 *     cobro that never happened or lose one that did.
 *
 * What is deliberately NOT here: any codigo linked to the original stays linked
 * to the original. A codigo's amount has no relationship to sendings.amount_eur
 * in the schema and never did, so there is nothing to re-split and nothing to
 * re-point.
 */

import { SENDING_PAYOUT_METHODS, computeNewSending, type SendingPayoutMethod } from './pricing';
import type { ClientPaymentMethod, SendingStatus } from './types';

/** The row being divided, exactly as it stands in the database right now. */
export interface DivisibleSending {
  client_id: number;
  is_personal: boolean;
  status: SendingStatus;
  /** Null only on an envio propio, which is why one cannot be divided. */
  amount_eur: number | null;
  rate_tasa: number | null;
  client_paid_at: Date | null;
  client_payment_method: ClientPaymentMethod | null;
  client_payment_note: string | null;
}

export interface SendingSplitInput {
  sending: DivisibleSending;
  /** The portion being peeled off, in EUR. */
  amountEur: number;
  /** Which channel THAT portion gets paid through. */
  payoutMethod: SendingPayoutMethod;
}

/**
 * The two writes, in the shape they are written.
 *
 * `created` is the whole column set of the new row rather than just its money,
 * so the constraint migration 014 added (sendings_kind_shape_check: a client row
 * carries both money fields and no personal_note) is decided here, in one place
 * that can be read and tested, instead of being left to the column defaults.
 */
export interface SendingSplit {
  /** What the original row becomes. Everything else on it is left alone. */
  original: {
    amountEur: number;
    amountVesToPay: number;
  };
  created: {
    clientId: number;
    amountEur: number;
    rateTasa: number;
    amountVesToPay: number;
    payoutMethod: SendingPayoutMethod;
    /** A brand new sending, whatever the original's status was allowed to be. */
    status: 'pending';
    /** Always a client row: an envio propio is refused before we get here. */
    isPersonal: false;
    personalNote: null;
    /** Copied verbatim: one payment by the client covered both rows. */
    clientPaidAt: Date | null;
    clientPaymentMethod: ClientPaymentMethod | null;
    clientPaymentNote: string | null;
  };
}

/**
 * Work out both rows, or say why the division cannot happen.
 *
 * The bolivares on each side are recomputed through computeNewSending — the same
 * function creation and editSending use — so neither row's amount_ves_to_pay can
 * drift from its own amount_eur * rate_tasa.
 */
export function computeSendingSplit(input: SendingSplitInput): SendingSplit {
  const { sending, amountEur, payoutMethod } = input;

  if (sending.is_personal) {
    throw new Error('Un envio propio no se puede dividir: no tiene monto en EUR que repartir.');
  }
  if (sending.status !== 'pending') {
    throw new Error('Ese envio ya esta pagado: solo se puede dividir un envio pendiente.');
  }
  // Defensive: the check constraint guarantees both on a client row, so a null
  // here means the row is not what it claims rather than something Jose typed.
  if (sending.amount_eur === null || sending.rate_tasa === null) {
    throw new Error('Ese envio no tiene monto ni tasa, asi que no hay nada que dividir.');
  }
  // The method decides the 0,3% interbank rule at payment time, so it is checked
  // against the list here too and not only in the action that read the form.
  if (!(SENDING_PAYOUT_METHODS as readonly string[]).includes(payoutMethod)) {
    throw new Error('Elige un metodo de pago valido para la parte que separas.');
  }
  if (!(amountEur > 0)) {
    throw new Error('La parte que separas debe ser mayor que cero.');
  }
  if (!(amountEur < sending.amount_eur)) {
    throw new Error(
      'La parte que separas tiene que ser menor que el monto del envio. Para cambiar el envio entero usa Editar.',
    );
  }

  const rateTasa = sending.rate_tasa;
  const remainderEur = sending.amount_eur - amountEur;

  return {
    original: {
      amountEur: remainderEur,
      amountVesToPay: computeNewSending({ amountEur: remainderEur, rateTasa }).amountVesToPay,
    },
    created: {
      clientId: sending.client_id,
      amountEur,
      rateTasa,
      amountVesToPay: computeNewSending({ amountEur, rateTasa }).amountVesToPay,
      payoutMethod,
      status: 'pending',
      isPersonal: false,
      personalNote: null,
      clientPaidAt: sending.client_paid_at,
      clientPaymentMethod: sending.client_payment_method,
      clientPaymentNote: sending.client_payment_note,
    },
  };
}
