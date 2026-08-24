'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { crearVentaAction, type NuevaVentaState } from './actions';
import { fmtRate, fmtVes, toDatetimeLocalValue } from '@/lib/format';

/**
 * Log a Binance P2P sale whose bolivares landed in Jose's own account.
 * Sales made straight into a beneficiary's account do NOT go here — those are
 * recorded on the sending itself, with "Marcar pagado (directo)".
 */
export default function NuevaVentaForm() {
  const [state, formAction, pending] = useActionState<NuevaVentaState, FormData>(
    crearVentaAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Filled in on the client so the default is the browser's local "now".
  const [defaultDate, setDefaultDate] = useState('');

  useEffect(() => {
    setDefaultDate(toDatetimeLocalValue(new Date()));
  }, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDefaultDate(toDatetimeLocalValue(new Date()));
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="panel">
      <h2>Registrar venta en Binance</h2>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? (
        <p className="notice ok">
          Venta registrada: {fmtVes(state.ok.vesReceived)} a {fmtRate(state.ok.pricePerUsdt)}{' '}
          Bs/USDT.
          {state.ok.usedToPayBackorders > 0 ? (
            <>
              {' '}
              {fmtVes(state.ok.usedToPayBackorders)} fueron a cubrir bolívares que ya habías
              pagado; quedan {fmtVes(state.ok.remainingForNewLot)} disponibles.
            </>
          ) : null}
        </p>
      ) : null}

      <div className="form-row">
        <div>
          <label htmlFor="usdt_sold">USDT vendidos</label>
          <input id="usdt_sold" name="usdt_sold" type="text" inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="ves_received">Bolívares recibidos</label>
          <input id="ves_received" name="ves_received" type="text" inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="sold_at">Fecha y hora</label>
          <input
            id="sold_at"
            name="sold_at"
            type="datetime-local"
            value={defaultDate}
            onChange={(event) => setDefaultDate(event.target.value)}
          />
        </div>
        <div>
          <button className="primary" type="submit" disabled={pending}>
            Registrar venta
          </button>
        </div>
      </div>
      <p className="muted">Solo ventas recibidas en tu cuenta.</p>
    </form>
  );
}
