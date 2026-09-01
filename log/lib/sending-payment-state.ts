/** The combined visual state of José's side and the client's side of a sending. */

import { madridDayKey } from './day-buckets';
import type { SendingStatus } from './types';

export type SendingPaymentState = 'complete' | 'partial' | 'overdue' | 'new';

export interface PaymentStateSending {
  created_at: Date | string;
  is_personal: boolean;
  status: SendingStatus;
  client_paid_at: Date | null;
}

/**
 * complete: every applicable side is paid.
 * partial: exactly one of the two client-sending sides is paid.
 * overdue: no applicable side is paid and the Madrid creation day has passed.
 * new: no applicable side is paid, but it still belongs to today (or later).
 */
export function sendingPaymentState(
  sending: PaymentStateSending,
  now: Date | string = new Date(),
): SendingPaymentState {
  const josePaid = sending.status === 'paid';

  // An envío propio has no client obligation. José paying is therefore the
  // complete state; while pending it can only be new or overdue, never partial.
  if (sending.is_personal) {
    if (josePaid) return 'complete';
    return madridDayKey(sending.created_at) < madridDayKey(now) ? 'overdue' : 'new';
  }

  const clientPaid = sending.client_paid_at !== null;
  if (josePaid && clientPaid) return 'complete';
  if (josePaid || clientPaid) return 'partial';
  return madridDayKey(sending.created_at) < madridDayKey(now) ? 'overdue' : 'new';
}

export function sendingPaymentRowClass(sending: PaymentStateSending, now?: Date | string): string {
  return `row-sending-${sendingPaymentState(sending, now)}`;
}
