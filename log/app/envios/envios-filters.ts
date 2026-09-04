import { sendingPaymentState, type SendingPaymentState } from '../../lib/sending-payment-state';
import type { Sending } from '../../lib/types';

/** The four operational views of the unfinished side of the log. */
export type EnviosFilter = 'all' | 'client' | 'jose' | 'overdue';

/** How the unfinished and archived rows are ordered on /envios. */
export type EnviosSort = 'oldest' | 'newest' | 'amount';

function stateFor(sending: Sending, now: Date | string): SendingPaymentState {
  return sendingPaymentState(sending, now);
}

/**
 * Pending filters intentionally overlap. A client sending missing both payments
 * belongs in both side views because both jobs still exist; an envio propio has
 * no client side and therefore never appears in `client`.
 */
export function matchesEnviosFilter(
  sending: Sending,
  filter: EnviosFilter,
  now: Date | string,
): boolean {
  if (stateFor(sending, now) === 'complete') return false;
  if (filter === 'all') return true;
  if (filter === 'client') return !sending.is_personal && sending.client_paid_at === null;
  if (filter === 'jose') return sending.status === 'pending';
  return stateFor(sending, now) === 'overdue';
}

export function filterEnvios(
  sendings: readonly Sending[],
  filter: EnviosFilter,
  now: Date | string,
): Sending[] {
  return sendings.filter((sending) => matchesEnviosFilter(sending, filter, now));
}

/** Stable tie-breakers keep rows from jumping when two amounts/dates match. */
export function sortEnvios<T extends Pick<Sending, 'id' | 'created_at' | 'amount_ves_to_pay'>>(
  sendings: readonly T[],
  sort: EnviosSort,
): T[] {
  return [...sendings].sort((a, b) => {
    if (sort === 'amount') {
      // Null only on an Envío USDT, which has no bolívares to rank by "Mayor Bs
      // primero" in the first place. Treated as 0, the same as if it owed
      // nothing over there — which, in bolívares, is exactly true.
      const aVes = a.amount_ves_to_pay ?? 0;
      const bVes = b.amount_ves_to_pay ?? 0;
      return (
        bVes - aVes ||
        a.created_at.getTime() - b.created_at.getTime() ||
        a.id - b.id
      );
    }
    const dateOrder = a.created_at.getTime() - b.created_at.getTime();
    return sort === 'newest' ? -dateOrder || b.id - a.id : dateOrder || a.id - b.id;
  });
}

/**
 * The order the pending workspace stands in: what José still owes first, then
 * what he is still owed.
 *
 * Both are unfinished, but they are not the same kind of unfinished. A sending
 * José has not paid is a beneficiary in Venezuela who has not received money —
 * it is work, and it is somebody else's problem until he does it. A sending he
 * has paid but not collected is his own money outstanding: real, but nobody is
 * waiting on him for it. So the first group goes on top whatever the sort.
 *
 * `status === 'pending'` is the whole test for the first group. It catches the
 * rows where neither side has paid and the envíos propios alike, because both
 * are money that still has to leave José's hands. Every row reaching here has
 * already been filtered to the unfinished ones, so the remainder is exactly
 * "José paid, the client has not" — see matchesEnviosFilter above.
 *
 * The chosen sort is applied FIRST and the split is a stable partition of that
 * result, so "Más antiguos primero" still means oldest-first inside each group
 * rather than being overridden by it.
 */
export function orderPendingEnvios<
  T extends Pick<Sending, 'id' | 'created_at' | 'amount_ves_to_pay' | 'status'>,
>(sendings: readonly T[], sort: EnviosSort): T[] {
  const sorted = sortEnvios(sendings, sort);
  return [
    ...sorted.filter((sending) => sending.status === 'pending'),
    ...sorted.filter((sending) => sending.status !== 'pending'),
  ];
}

export const ENVIOS_FILTERS: readonly { value: EnviosFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'client', label: 'Falta cobrar' },
  { value: 'jose', label: 'Falta pagar José' },
  { value: 'overdue', label: 'Atrasados' },
];
