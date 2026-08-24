'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { crearEnvioAction, type NuevoEnvioState } from './actions';
import ClientPicker, { type PickerClient } from '../components/client-picker';
import { fmtEur, fmtRate, fmtVes } from '@/lib/format';
import { SENDING_PAYOUT_METHODS } from '@/lib/pricing';

/**
 * Four inputs: client, monto, tasa, método de pago.
 *
 * The tasa is typed per sending. `suggestedTasa` only prefills the box — the
 * value actually submitted is what gets stored.
 *
 * The método is the fixed three-value list, not the client's banks: it says how
 * JOSE funds the payout, which is his own decision and the same three options
 * for every client. So it is enabled before a client is picked.
 *
 * "Cómo pagó el cliente" is deliberately NOT here — intake stays four fields.
 * It is added later from the edit action, once he has the detail to hand.
 *
 * Nothing about cost or profit is shown here, because none of it is known yet:
 * that is decided when the sending is marked paid.
 */
export default function NuevoEnvioForm({
  clients,
  suggestedTasa,
}: {
  clients: PickerClient[];
  suggestedTasa: number;
}) {
  const [state, formAction, pending] = useActionState<NuevoEnvioState, FormData>(
    crearEnvioAction,
    {},
  );
  const [client, setClient] = useState<PickerClient | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful save, clear the form so the next envio can be typed.
  useEffect(() => {
    if (state.result) {
      formRef.current?.reset();
      setClient(null);
    }
  }, [state.result]);

  // Prefill with the tasa just used, if there is one, otherwise the saved one.
  const defaultTasa = state.result?.rateTasa ?? suggestedTasa;

  return (
    <>
      {state.result ? <Confirmation result={state.result} /> : null}

      <form ref={formRef} action={formAction} className="panel" aria-busy={pending}>
        <h2>Nuevo envío</h2>
        {state.error ? <p className="notice error">{state.error}</p> : null}

        <ClientPicker
          clients={clients}
          value={client}
          onChange={setClient}
          addClientHref="/clientes?from=envios"
        />
        <input type="hidden" name="client_id" value={client?.id ?? ''} />

        <div className="form-row">
          <div>
            <label htmlFor="amount_eur">Monto (EUR)</label>
            <input id="amount_eur" name="amount_eur" type="text" inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="rate_tasa">Tasa (EUR → Bs)</label>
            <input
              id="rate_tasa"
              name="rate_tasa"
              type="text"
              inputMode="decimal"
              defaultValue={defaultTasa || ''}
              key={defaultTasa}
            />
          </div>
          <div>
            <label htmlFor="payout_method">Método de pago</label>
            <select id="payout_method" name="payout_method">
              {SENDING_PAYOUT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={pending || !client}>
              {pending ? 'Registrando…' : 'Registrar envío'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function Confirmation({ result }: { result: NonNullable<NuevoEnvioState['result']> }) {
  return (
    <div className="notice ok">
      <div>
        Envío registrado para <strong>{result.clientName}</strong> ({fmtEur(result.amountEur)} a{' '}
        {fmtRate(result.rateTasa)} · {result.payoutMethod}).
      </div>
      <div style={{ marginTop: 6 }}>Bolívares a pagar</div>
      <div className="big-number">{fmtVes(result.amountVesToPay)}</div>
    </div>
  );
}
