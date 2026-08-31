'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { crearCompraAction, type NuevaCompraState } from './actions';
import { fmtEur, fmtRate, fmtUsdt, toDatetimeLocalValue } from '@/lib/format';

/**
 * Two numbers, exactly the ones known at the moment of buying: EUR handed over
 * and USDT received. The price per USDT is worked out on the server.
 */
export default function NuevaCompraForm() {
  const [state, formAction, pending] = useActionState<NuevaCompraState, FormData>(
    crearCompraAction,
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
    <form ref={formRef} action={formAction} className="panel" aria-busy={pending}>
      <h2>Registrar compra de cripto</h2>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? (
        <p className="notice ok">
          Compra registrada: {fmtEur(state.ok.eurPaid)} por {fmtUsdt(state.ok.usdtReceived)} ={' '}
          {fmtRate(state.ok.priceEurPerUsdt)} EUR/USDT.
          {state.ok.usedToPayBackorders > 0 ? (
            <>
              {' '}
              {fmtUsdt(state.ok.usedToPayBackorders)} fueron a cubrir USDT que ya habías gastado;
              quedan {fmtUsdt(state.ok.remainingForNewLot)} disponibles.
            </>
          ) : null}
          {state.ok.paidFromCash ? (
            <> Salió de la caja, así que el saldo en caja ya lo descuenta.</>
          ) : null}
        </p>
      ) : null}

      <div className="form-row">
        <div>
          <label htmlFor="eur_paid">EUR pagados</label>
          <input id="eur_paid" name="eur_paid" type="text" inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="usdt_received">USDT recibidos</label>
          <input id="usdt_received" name="usdt_received" type="text" inputMode="decimal" />
        </div>
        <div>
          <label htmlFor="provider">Proveedor</label>
          <input
            id="provider"
            name="provider"
            type="text"
            placeholder="Andriu, Kacem, Binance P2P…"
          />
        </div>
        <div>
          <label htmlFor="purchased_at">Fecha y hora</label>
          <input
            id="purchased_at"
            name="purchased_at"
            type="datetime-local"
            value={defaultDate}
            onChange={(event) => setDefaultDate(event.target.value)}
          />
        </div>
        {/*
          Unchecked is the normal case: most compras are paid from a bank, and
          only the ones paid with the notes in Jose's pocket belong in the caja.
          Checking it is what makes this purchase a salida in the libro de caja
          — nothing about the lot, the price or the FIFO draw changes either way.
        */}
        <div>
          <label className="checkbox-option" htmlFor="paid_from_cash">
            <input id="paid_from_cash" name="paid_from_cash" type="checkbox" value="1" />
            Pagada con dinero de la caja
          </label>
        </div>
        <div className="form-actions">
          <button className="primary" type="submit" disabled={pending}>
            {pending ? 'Registrando…' : 'Registrar compra'}
          </button>
        </div>
      </div>
    </form>
  );
}
