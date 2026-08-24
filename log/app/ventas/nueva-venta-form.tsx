'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { crearVentaAction, type NuevaVentaState } from './actions';
import { fmtEur, fmtRate, fmtVes, toDatetimeLocalValue } from '@/lib/format';

/**
 * Both ways bolivares can enter Jose's own account. Sales made straight into a
 * beneficiary's account still belong on the sending itself, not here.
 */
export default function NuevaVentaForm() {
  const [state, formAction, pending] = useActionState<NuevaVentaState, FormData>(
    crearVentaAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [sourceType, setSourceType] = useState<'binance' | 'ves_to_eur'>('binance');
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
    <form ref={formRef} action={formAction} className="panel" aria-busy={pending}>
      <h2>Registrar entrada de bolívares</h2>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? (
        <p className="notice ok">
          {state.ok.sourceType === 'binance' ? (
            <>
              Venta registrada: {fmtVes(state.ok.vesReceived)} a {fmtRate(state.ok.price)} Bs/USDT.
            </>
          ) : (
            <>
              Entrada registrada: {fmtVes(state.ok.vesReceived)} por {fmtEur(state.ok.eurAmount)} a{' '}
              {fmtRate(state.ok.price)} Bs/EUR · EUR {state.ok.eurPaid ? 'pagados' : 'pendientes'}.
            </>
          )}
          {state.ok.usedToPayBackorders > 0 ? (
            <>
              {' '}
              {fmtVes(state.ok.usedToPayBackorders)} fueron a cubrir bolívares que ya habías
              pagado; quedan {fmtVes(state.ok.remainingForNewLot)} disponibles.
            </>
          ) : null}
        </p>
      ) : null}

      <fieldset className="source-picker">
        <legend>Tipo de entrada</legend>
        <label className="radio-option">
          <input
            type="radio"
            name="source_type"
            value="binance"
            checked={sourceType === 'binance'}
            onChange={() => setSourceType('binance')}
          />
          <span>Venta Binance</span>
        </label>
        <label className="radio-option">
          <input
            type="radio"
            name="source_type"
            value="ves_to_eur"
            checked={sourceType === 'ves_to_eur'}
            onChange={() => setSourceType('ves_to_eur')}
          />
          <span>VES → EUR</span>
        </label>
      </fieldset>

      <div className="form-row">
        {sourceType === 'binance' ? (
          <div>
            <label htmlFor="usdt_sold">USDT vendidos</label>
            <input id="usdt_sold" name="usdt_sold" type="text" inputMode="decimal" />
          </div>
        ) : (
          <div>
            <label htmlFor="eur_amount">EUR acordados</label>
            <input id="eur_amount" name="eur_amount" type="text" inputMode="decimal" />
          </div>
        )}
        <div>
          <label htmlFor="ves_received">Bolívares recibidos</label>
          <input id="ves_received" name="ves_received" type="text" inputMode="decimal" />
        </div>
        {sourceType === 'ves_to_eur' ? (
          <>
            <div>
              <label htmlFor="note">Cliente / comentario</label>
              <input id="note" name="note" type="text" autoComplete="off" />
            </div>
            <fieldset className="payment-picker">
              <legend>Pago de EUR</legend>
              <label className="radio-option compact">
                <input type="radio" name="eur_status" value="pending" defaultChecked />
                <span>Pendiente</span>
              </label>
              <label className="radio-option compact">
                <input type="radio" name="eur_status" value="paid" />
                <span>Pagado</span>
              </label>
            </fieldset>
          </>
        ) : null}
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
        <div className="form-actions">
          <button className="primary" type="submit" disabled={pending}>
            {pending ? 'Guardando…' : 'Registrar entrada'}
          </button>
        </div>
      </div>
    </form>
  );
}
