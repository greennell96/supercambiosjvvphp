'use client';

import { useActionState, useState } from 'react';

import { paySendingDirectAction, paySendingPoolAction, type PayState } from '../actions';

/**
 * The two ways to settle a pending sending.
 *
 *  - "Marcar pagado (pool)" is one click: the bolivares come out of the account,
 *    and how much to draw was already fixed when the sending was logged.
 *  - "Marcar pagado (directo)" opens one small field, because only Jose knows
 *    how much USDT he sold straight into the beneficiary's account.
 */
export default function PaySendingActions({ sendingId }: { sendingId: number }) {
  const [poolState, poolAction, poolPending] = useActionState<PayState, FormData>(
    paySendingPoolAction,
    {},
  );
  const [directState, directAction, directPending] = useActionState<PayState, FormData>(
    paySendingDirectAction,
    {},
  );
  const [showDirect, setShowDirect] = useState(false);

  return (
    <div className="pay-actions">
      <form action={poolAction}>
        <input type="hidden" name="id" value={sendingId} />
        <button className="small" type="submit" disabled={poolPending}>
          Marcar pagado (pool)
        </button>
      </form>

      {showDirect ? (
        <form action={directAction} className="pay-direct">
          <input type="hidden" name="id" value={sendingId} />
          <input
            name="usdt_sold"
            type="text"
            inputMode="decimal"
            placeholder="USDT vendidos"
            autoFocus
          />
          <button className="small primary" type="submit" disabled={directPending}>
            Pagar directo
          </button>
          <button className="small" type="button" onClick={() => setShowDirect(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <button className="small" type="button" onClick={() => setShowDirect(true)}>
          Marcar pagado (directo)
        </button>
      )}

      {poolState.error ? <p className="pay-error">{poolState.error}</p> : null}
      {directState.error ? <p className="pay-error">{directState.error}</p> : null}
    </div>
  );
}
