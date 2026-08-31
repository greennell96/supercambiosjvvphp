'use client';

import { useActionState, useEffect, useRef } from 'react';

import { nuevaEntradaCajaAction, type NuevaEntradaCajaState } from './actions';
import { fmtEur } from '@/lib/format';

/**
 * Two fields, and the sign carries the direction.
 *
 * A plain signed amount rather than a toggle plus a magnitude, deliberately: the
 * column it lands in is signed, the journal renders it signed, and a separate
 * "entra / sale" control would be a second place for the direction to live and
 * therefore a second place for it to be wrong. The placeholder and the hint
 * under the field are what teach the minus sign; lib/parse.ts already reads
 * "-12,50" the same way it reads "12,50".
 */
export default function NuevaEntradaCajaForm() {
  const [state, formAction, pending] = useActionState<NuevaEntradaCajaState, FormData>(
    nuevaEntradaCajaAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="panel" aria-busy={pending}>
      <h2>Anotar entrada o salida</h2>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? (
        <p className="notice ok">
          Anotado: {state.ok.amountEur > 0 ? '+' : ''}
          {fmtEur(state.ok.amountEur)} · {state.ok.note}
        </p>
      ) : null}

      <div className="form-row">
        <div>
          <label htmlFor="amount_eur">Monto en EUR</label>
          <input
            id="amount_eur"
            name="amount_eur"
            type="text"
            inputMode="decimal"
            placeholder="50 o -50"
          />
          <p className="muted">En negativo si el dinero sale de la caja.</p>
        </div>
        <div>
          <label htmlFor="note">¿De qué es?</label>
          <input id="note" name="note" type="text" placeholder="Gasolina, vuelto, ajuste…" />
        </div>
        <div className="form-actions">
          <button className="primary" type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Anotar'}
          </button>
        </div>
      </div>
    </form>
  );
}
