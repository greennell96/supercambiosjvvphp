'use client';

import { useActionState, useEffect, useState } from 'react';

import { entregarDineroAction, type EntregarDineroState } from '../stats/actions';

/**
 * "Dinero entregado a José" — a runner handed over some of what he is holding.
 *
 * The same reveal-then-confirm shape as ConfirmarRetiroForm beside it on the
 * same page, and the same reason it never disappears: a saldo of zero is not the
 * end of anything, because the runner will be sent out again tomorrow.
 *
 * The amount is prefilled with his current saldo, because handing over
 * everything is the usual case and typing it again is just a chance to typo it.
 * It is only a default — partial deliveries are normal and the field is plain
 * editable text, so what is submitted is what is stored.
 *
 * A text input with inputMode="decimal" rather than type="number", matching
 * every other money field in this app: lib/parse.ts accepts "1070,5" and
 * "1.070,50" and a number input would not.
 */
export default function EntregarDineroForm({
  agenteId,
  saldoEur,
}: {
  agenteId: number;
  /** What he is holding as rendered, used only as the prefilled default. */
  saldoEur: number;
}) {
  const [state, formAction, pending] = useActionState<EntregarDineroState, FormData>(
    entregarDineroAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const [operationKey, setOperationKey] = useState('');

  // Close on a successful save. The row re-renders with the new saldo behind
  // this control, so leaving it open would show a stale prefill over it.
  useEffect(() => {
    if (state.savedAt) setOpen(false);
  }, [state.savedAt]);

  if (!open) {
    return (
      <div className="entregar-dinero">
        <button
          className="small action-info"
          type="button"
          onClick={() => {
            setOperationKey(globalThis.crypto.randomUUID());
            setOpen(true);
          }}
        >
          Dinero entregado a José
        </button>
        {state.error ? <p className="pay-error">{state.error}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="entregar-dinero open">
      <input type="hidden" name="agente_id" value={agenteId} />
      <input type="hidden" name="expected_saldo_eur" value={saldoEur} />
      <input type="hidden" name="operation_key" value={operationKey} />
      <input
        name="amount_eur"
        type="text"
        inputMode="decimal"
        aria-label="EUR entregados a José"
        // A negative saldo is an advance: there is nothing to hand over, so the
        // prefill is blank rather than a minus sign the field would reject.
        defaultValue={saldoEur > 0 ? saldoEur.toFixed(2) : ''}
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
