'use client';

import { useActionState, useEffect, useState } from 'react';

import { editSendingAction, type EditSendingState } from '../actions';
import { payoutMethodOptions } from '@/lib/pricing';
import type { SendingStatus } from '@/lib/types';

/** Just the fields the edit form touches. */
export interface EditableSending {
  id: number;
  status: SendingStatus;
  amount_eur: number;
  rate_tasa: number;
  payout_method: string;
  client_payment_note: string | null;
}

/**
 * Fix a sending that was typed wrong.
 *
 * What can be edited depends on the status, and the split is the whole point:
 *
 *   pending — monto, tasa and método are all still open. Saving recomputes the
 *             bolivares owed through the same function creation uses, so
 *             amount_ves_to_pay can never drift from monto * tasa.
 *   paid    — those three are frozen and shown read-only. The pool draws and the
 *             cost/profit were locked in at payment time against the numbers as
 *             they were; rewriting them afterwards would leave the ledger saying
 *             one thing and the pools another.
 *
 * "Cómo pagó el cliente" is editable in both states. It is a free-text note
 * about the SPANISH side — código de cajero, efectivo, transferencia — and it
 * never feeds a calculation, so nothing desyncs when it changes.
 */
export default function EditSendingForm({ sending }: { sending: EditableSending }) {
  const [state, formAction, pending] = useActionState<EditSendingState, FormData>(
    editSendingAction,
    {},
  );
  const [open, setOpen] = useState(false);

  // Close on a successful save. Keyed on the timestamp, so saving twice in a row
  // still closes it the second time.
  useEffect(() => {
    if (state.savedAt) setOpen(false);
  }, [state.savedAt]);

  const editMoney = sending.status === 'pending';

  if (!open) {
    return (
      <div className="edit-sending">
        <button className="small" type="button" onClick={() => setOpen(true)}>
          Editar
        </button>
        {state.error ? <p className="pay-error">{state.error}</p> : null}
      </div>
    );
  }

  // An old sending may hold a payout method that predates the fixed list (a bank
  // name, "Pago Móvil"). payoutMethodOptions keeps it in the dropdown so saving
  // cannot silently rewrite it. Trimmed so defaultValue matches an option.
  const storedMethod = sending.payout_method.trim();
  const methods = payoutMethodOptions(storedMethod);

  return (
    <form action={formAction} className="edit-sending open">
      <input type="hidden" name="id" value={sending.id} />
      <input type="hidden" name="edit_money" value={editMoney ? '1' : '0'} />

      {/*
        The three money fields are always shown, so it is visible what the sending
        actually says. On a paid one they are disabled: a disabled control is not
        submitted at all, which lines up with edit_money=0 telling the action to
        leave them alone.
      */}
      <div className="edit-field">
        <label htmlFor={`amount_eur_${sending.id}`}>Monto (EUR)</label>
        <input
          id={`amount_eur_${sending.id}`}
          name="amount_eur"
          type="text"
          inputMode="decimal"
          disabled={!editMoney}
          defaultValue={String(sending.amount_eur)}
        />
      </div>
      <div className="edit-field">
        <label htmlFor={`rate_tasa_${sending.id}`}>Tasa (EUR → Bs)</label>
        <input
          id={`rate_tasa_${sending.id}`}
          name="rate_tasa"
          type="text"
          inputMode="decimal"
          disabled={!editMoney}
          defaultValue={String(sending.rate_tasa)}
        />
      </div>
      <div className="edit-field">
        <label htmlFor={`payout_method_${sending.id}`}>Método de pago</label>
        <select
          id={`payout_method_${sending.id}`}
          name="payout_method"
          disabled={!editMoney}
          defaultValue={storedMethod}
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {editMoney ? null : (
        <p className="muted">Envío pagado: solo puedes editar la nota.</p>
      )}

      <div className="edit-field">
        <label htmlFor={`client_payment_note_${sending.id}`}>Cómo pagó el cliente</label>
        <input
          id={`client_payment_note_${sending.id}`}
          name="client_payment_note"
          type="text"
          placeholder="código de cajero, efectivo…"
          defaultValue={sending.client_payment_note ?? ''}
        />
      </div>

      <div className="edit-buttons">
        <button className="small primary" type="submit" disabled={pending}>
          Guardar
        </button>
        <button className="small" type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </form>
  );
}
