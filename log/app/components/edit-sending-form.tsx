'use client';

import { useActionState, useEffect, useState } from 'react';

import { editSendingAction, type EditSendingState } from '../actions';
import { payoutMethodOptions } from '@/lib/pricing';
import type { SendingStatus } from '@/lib/types';

/** Just the fields the edit form touches. */
export interface EditableSending {
  id: number;
  status: SendingStatus;
  is_personal: boolean;
  personal_note: string | null;
  /** Null on an envío propio, where the bolívares below are the typed figure. */
  amount_eur: number | null;
  rate_tasa: number | null;
  amount_ves_to_pay: number;
  payout_method: string;
  client_payment_note: string | null;
}

/**
 * Fix a sending that was typed wrong.
 *
 * What can be edited depends on the status, and the split is the whole point:
 *
 *   pending — the money fields are all still open. Saving recomputes the
 *             bolivares owed through the same function creation uses, so
 *             amount_ves_to_pay can never drift from what the inputs say.
 *   paid    — they are frozen and shown read-only. The pool draws and the
 *             cost/profit were locked in at payment time against the numbers as
 *             they were; rewriting them afterwards would leave the ledger saying
 *             one thing and the pools another.
 *
 * Which fields those are depends on the kind of sending, because the two hold
 * different facts. A client sending has monto, tasa and método. An envío propio
 * has the bolívares themselves — nothing to derive them from ever existed — and
 * the método.
 *
 * The note is editable in both states, and each kind has its own. "Cómo pagó el
 * cliente" is about the SPANISH side — código de cajero, efectivo,
 * transferencia. "Para quién" is about the Venezuelan one, and on an envío
 * propio it is the only record of who received the money. Neither ever feeds a
 * calculation, so nothing desyncs when either changes — which is why they are
 * not frozen with the money that funded the draw.
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
        <button className="small secondary" type="button" onClick={() => setOpen(true)}>
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
        The kind is sent so the action knows which fields it is reading, but it
        is not what decides it: lib/queries.ts re-reads is_personal from the
        locked row and refuses a mismatch, exactly as it does for the status.
      */}
      <input type="hidden" name="is_personal" value={sending.is_personal ? '1' : '0'} />

      {/*
        The money fields are always shown, so it is visible what the sending
        actually says. On a paid one they are disabled: a disabled control is not
        submitted at all, which lines up with edit_money=0 telling the action to
        leave them alone.
      */}
      {sending.is_personal ? (
        <div className="edit-field">
          <label htmlFor={`amount_ves_${sending.id}`}>Monto (Bs)</label>
          <input
            id={`amount_ves_${sending.id}`}
            name="amount_ves"
            type="text"
            inputMode="decimal"
            disabled={!editMoney}
            defaultValue={String(sending.amount_ves_to_pay)}
          />
        </div>
      ) : (
        <>
          <div className="edit-field">
            <label htmlFor={`amount_eur_${sending.id}`}>Monto (EUR)</label>
            <input
              id={`amount_eur_${sending.id}`}
              name="amount_eur"
              type="text"
              inputMode="decimal"
              disabled={!editMoney}
              defaultValue={sending.amount_eur === null ? '' : String(sending.amount_eur)}
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
              defaultValue={sending.rate_tasa === null ? '' : String(sending.rate_tasa)}
            />
          </div>
        </>
      )}

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

      {editMoney ? null : <p className="muted">Envío pagado: solo puedes editar la nota.</p>}

      {/*
        The note, and never disabled — each kind has its own, both are purely
        descriptive, and both stay correctable after the sending is paid. On an
        envío propio this is the ONLY record of who received the money, so
        freezing it would mean a typo could never be fixed.
      */}
      {sending.is_personal ? (
        <div className="edit-field">
          <label htmlFor={`personal_note_${sending.id}`}>Para quién</label>
          <input
            id={`personal_note_${sending.id}`}
            name="personal_note"
            type="text"
            placeholder="a mi hermana"
            defaultValue={sending.personal_note ?? ''}
          />
        </div>
      ) : (
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
      )}

      <div className="edit-buttons">
        <button className="small primary" type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="small quiet" type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </form>
  );
}
