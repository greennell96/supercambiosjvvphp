'use client';

import { useActionState, useEffect, useState } from 'react';

import { splitSendingAction, type SplitSendingState } from '../envios/actions';
import { fmtEur } from '@/lib/format';
import { SENDING_PAYOUT_METHODS } from '@/lib/pricing';

/**
 * "Dividir": part of this envío becomes an envío of its own.
 *
 * The client paid for 110 EUR once, but the bolívares sometimes leave in two
 * pieces through two different banks — 90 por Provincial, 20 por otro — and one
 * row can only hold one método. This peels the second piece off into its own
 * row, which is then paid, editado and eliminado entirely on its own.
 *
 * Same reveal-then-confirm shape as "Editar" right above it, and for the same
 * reason: this app has no dialogs anywhere, and a row action that leaves the row
 * would lose which envío it meant.
 *
 * Two fields, because two is all that differs between the piece that stays and
 * the piece that goes. The cliente and the tasa are the same by definition — the
 * same client agreed the same rate for the whole thing — so neither is asked for
 * or offered. What the new row is missing is only its own monto and its own
 * canal de pago.
 *
 * The monto is offered as a plain box rather than as "lo que queda menos X":
 * what Jose knows is the transfer he actually made (20 EUR through the other
 * bank), not the remainder. The remainder is what gets derived.
 *
 * Only pending client sendings ever render this — an envío propio has no monto en
 * EUR to divide and a paid one has already drawn the pools — but the server
 * refuses both again off the locked row, so a stale page cannot get past it.
 */
export default function SplitSendingForm({
  sendingId,
  amountEur,
}: {
  sendingId: number;
  /** What is on the row right now, so the form can say what it is dividing. */
  amountEur: number;
}) {
  const [state, formAction, pending] = useActionState<SplitSendingState, FormData>(
    splitSendingAction,
    {},
  );
  const [open, setOpen] = useState(false);

  // Close on a successful division. Keyed on the timestamp, so dividing the same
  // row twice in a row still closes it the second time.
  useEffect(() => {
    if (state.savedAt) setOpen(false);
  }, [state.savedAt]);

  if (!open) {
    return (
      <div className="split-sending">
        <button className="small secondary" type="button" onClick={() => setOpen(true)}>
          Dividir
        </button>
        {state.error ? <p className="pay-error">{state.error}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="split-sending open">
      <input type="hidden" name="id" value={sendingId} />

      <p className="muted">
        Separa una parte de {fmtEur(amountEur)} en un envío nuevo, a la misma tasa.
      </p>

      <div className="split-field">
        <label htmlFor={`split_amount_eur_${sendingId}`}>Monto a separar (EUR)</label>
        <input
          id={`split_amount_eur_${sendingId}`}
          name="amount_eur"
          type="text"
          inputMode="decimal"
          autoFocus
        />
      </div>

      {/*
        The same three options creation offers, and never the stored value as an
        extra: this is a NEW row, so it picks from the canonical list exactly as
        "Nuevo envío" does. payoutMethodOptions exists for editing an old row that
        predates the list, which is the opposite case.
      */}
      <div className="split-field">
        <label htmlFor={`split_payout_method_${sendingId}`}>Método de pago</label>
        <select id={`split_payout_method_${sendingId}`} name="payout_method">
          {SENDING_PAYOUT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="split-buttons">
        <button className="small primary" type="submit" disabled={pending}>
          {pending ? 'Dividiendo…' : 'Dividir'}
        </button>
        <button className="small quiet" type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </form>
  );
}
