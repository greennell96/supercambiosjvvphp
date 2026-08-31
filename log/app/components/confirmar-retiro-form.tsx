'use client';

import { useActionState, useEffect, useState } from 'react';

import { confirmarRetiroAction, type ConfirmarRetiroState } from '../stats/actions';

/**
 * "Confirmar" — how much money actually came out of the cajero that día.
 *
 * Same reveal-then-confirm shape as ClientPaidActions and DeleteRowForm: the
 * first click only opens the field, and the field is right where the eye already
 * is. One deliberate difference from those two — this control never disappears.
 * A delete removes its row and "Cliente pagó" settles a debt once, but a día's
 * system total can still move afterwards (a retirado código's amount is
 * correctable through updateCodigo), so a confirmed día keeps a way back in and
 * says "Volver a confirmar" instead.
 *
 * The amount is prefilled with the system total, because on almost every día
 * that is the answer and Jose is confirming rather than correcting. It is a
 * default and nothing more: the server stores what is submitted, and the whole
 * value of the panel is the días where the two numbers differ.
 *
 * A text input with inputMode="decimal" rather than type="number", matching
 * every other money field in this app — lib/parse.ts accepts "1070,5" and
 * "1.070,50" and a number input would not.
 */
export default function ConfirmarRetiroForm({
  day,
  systemEur,
  confirmed,
}: {
  /** YYYY-MM-DD, the Madrid day being confirmed. */
  day: string;
  /** The system total as rendered, used only as the prefilled default. */
  systemEur: number;
  confirmed: boolean;
}) {
  const [state, formAction, pending] = useActionState<ConfirmarRetiroState, FormData>(
    confirmarRetiroAction,
    {},
  );
  const [open, setOpen] = useState(false);

  // Close on a successful save. The row re-renders with the new figures behind
  // this control, so leaving it open would show a stale prefill over them.
  useEffect(() => {
    if (state.savedAt) setOpen(false);
  }, [state.savedAt]);

  if (!open) {
    return (
      <div className="confirmar-retiro">
        <button className="small action-info" type="button" onClick={() => setOpen(true)}>
          {confirmed ? 'Volver a confirmar' : 'Confirmar'}
        </button>
        {state.error ? <p className="pay-error">{state.error}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="confirmar-retiro open">
      <input type="hidden" name="day" value={day} />
      <input
        name="counted_eur"
        type="text"
        inputMode="decimal"
        aria-label="EUR retirados de verdad"
        defaultValue={systemEur.toFixed(2)}
        autoFocus
      />
      <button className="small action-info" type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
      <button className="small quiet" type="button" onClick={() => setOpen(false)}>
        Cancelar
      </button>
      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </form>
  );
}
