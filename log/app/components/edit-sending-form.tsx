'use client';

import { useActionState, useEffect, useState } from 'react';

import { editSendingAction, type EditSendingState } from '../actions';
import { madridDayKey } from '@/lib/day-buckets';
import { payoutMethodOptions } from '@/lib/pricing';
import type { SendingStatus } from '@/lib/types';

/** Just the fields the edit form touches. */
export interface EditableSending {
  id: number;
  status: SendingStatus;
  is_personal: boolean;
  is_usdt: boolean;
  /** The day the sending is filed under. Editable in every status. */
  created_at: Date;
  personal_note: string | null;
  /** Null on an envío propio, where the bolívares below are the typed figure. */
  amount_eur: number | null;
  rate_tasa: number | null;
  /** Null only on an Envío USDT: it has no bolívares anywhere in it. Only ever
   *  read below inside the `is_personal` branch. */
  amount_ves_to_pay: number | null;
  /** Null on every kind except an Envío USDT, where it is the money field the
   *  usdt branch below reads instead of rate_tasa. See migration 020. */
  usdt_to_deliver: number | null;
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
 * Which fields those are depends on the kind of sending, because the three
 * hold different facts. A client sending has monto, tasa and método. An envío
 * propio has the bolívares themselves — nothing to derive them from ever
 * existed — and the método. An Envío USDT has monto (EUR) and "USDT a
 * entregar" — no tasa, because there are no bolívares to convert, and no
 * método, because it is always Binance (see migration 020).
 *
 * The note is editable in both states, and each kind has its own. "Cómo pagó el
 * cliente" is about the SPANISH side — código de cajero, efectivo,
 * transferencia. "Para quién" is about the Venezuelan one, and on an envío
 * propio it is the only record of who received the money. Neither ever feeds a
 * calculation, so nothing desyncs when either changes — which is why they are
 * not frozen with the money that funded the draw.
 *
 * La fecha is the third field in that same category, and the one that looks
 * least like it belongs there. It is not an input to anything: FIFO draws its
 * lots in the order of the LOTS' own timestamps, fixed at payment time, and no
 * money module reads a sending's created_at at all. What it decides is which
 * day the row is filed under — its heading in the log, and its column in el
 * cuadre de códigos. That is why it is editable in every status: a client who
 * sends today and pays tomorrow leaves the sending sitting on the wrong day,
 * and the cuadre then reports a difference that does not exist.
 *
 * An Envío USDT now gets its own third branch, because migration 020 made it
 * an ordinary pending sending like the other two: it is created pending and
 * stays open to editing exactly as long as they do, so editMoney behaves the
 * same way on it (open while pending, frozen once paid). It shares la fecha
 * and "Cómo pagó el cliente" with the client branch — both mean the same
 * thing on a row that has a real client — and is_personal is always false on
 * one, so it never takes the personal branch by mistake.
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
      <input type="hidden" name="is_usdt" value={sending.is_usdt ? '1' : '0'} />

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
      ) : sending.is_usdt ? (
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
            <label htmlFor={`usdt_to_deliver_${sending.id}`}>USDT a entregar</label>
            <input
              id={`usdt_to_deliver_${sending.id}`}
              name="usdt_to_deliver"
              type="text"
              inputMode="decimal"
              disabled={!editMoney}
              defaultValue={sending.usdt_to_deliver === null ? '' : String(sending.usdt_to_deliver)}
            />
          </div>
        </>
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

      {/* No método de pago on an Envío USDT: it is always Binance, never a
          later funding decision the way the other two kinds' payout is. */}
      {sending.is_usdt ? null : (
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
      )}

      {editMoney ? null : (
        <p className="muted">Envío pagado: solo puedes editar la fecha y la nota.</p>
      )}

      {/*
        Outside both the kind branch and the money branch, because it belongs to
        neither: every sending has a date, and a paid one can be filed on the
        wrong day exactly as easily as a pending one. Never disabled, for the
        same reason the notes are not.
      */}
      <div className="edit-field">
        <label htmlFor={`created_at_${sending.id}`}>Fecha</label>
        <input
          id={`created_at_${sending.id}`}
          name="created_at"
          type="date"
          required
          defaultValue={madridDayKey(sending.created_at)}
        />
      </div>

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
