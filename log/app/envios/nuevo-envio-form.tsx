'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import {
  crearEnvioAction,
  crearEnvioPersonalAction,
  type NuevoEnvioPersonalState,
  type NuevoEnvioState,
} from './actions';
import ClientPicker, { type PickerClient } from '../components/client-picker';
import { fmtEur, fmtRate, fmtVes } from '@/lib/format';
import { SENDING_PAYOUT_METHODS } from '@/lib/pricing';

/**
 * One panel, two ways of logging a sending. They are separate forms rather than
 * one form with fields hidden, because they take different inputs and post to
 * different actions — and because a hidden-but-mounted client picker would keep
 * submitting a client for a transfer that has none.
 *
 * The mode lives out here so it survives a save: Jose logs family remittances in
 * runs, and having to re-pick the tab after each one would be the wrong default.
 */
type Mode = 'cliente' | 'propio';

export default function NuevoEnvioForm({
  clients,
  suggestedTasa,
}: {
  clients: PickerClient[];
  suggestedTasa: number;
}) {
  const [mode, setMode] = useState<Mode>('cliente');

  return mode === 'cliente' ? (
    <ClienteEnvioForm
      clients={clients}
      suggestedTasa={suggestedTasa}
      mode={mode}
      onMode={setMode}
    />
  ) : (
    <PropioEnvioForm mode={mode} onMode={setMode} />
  );
}

/** The two tabs, rendered identically inside whichever form is showing. */
function ModeTabs({ mode, onMode }: { mode: Mode; onMode: (mode: Mode) => void }) {
  return (
    <div className="form-actions" style={{ marginBottom: 14 }}>
      <button
        className={mode === 'cliente' ? 'small action-primary' : 'small secondary'}
        type="button"
        aria-pressed={mode === 'cliente'}
        onClick={() => onMode('cliente')}
      >
        Para un cliente
      </button>
      <button
        className={mode === 'propio' ? 'small action-primary' : 'small secondary'}
        type="button"
        aria-pressed={mode === 'propio'}
        onClick={() => onMode('propio')}
      >
        Envío propio
      </button>
    </div>
  );
}

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
function ClienteEnvioForm({
  clients,
  suggestedTasa,
  mode,
  onMode,
}: {
  clients: PickerClient[];
  suggestedTasa: number;
  mode: Mode;
  onMode: (mode: Mode) => void;
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
        <ModeTabs mode={mode} onMode={onMode} />
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

/**
 * Money José sends to his own family. Three inputs, and no client picker.
 *
 * There is no monto en EUR and no tasa here, because nobody agreed either: what
 * he knows is the bolívares he wants to arrive, and that IS what gets stored.
 * Nothing is derived, so nothing about revenue or ganancia can be shown — that
 * concept does not apply to these, now or after they are paid.
 *
 * The método de pago is the same three-option list a client sending uses, and
 * for the same reason: it decides the 0,3% interbank cost, which does not care
 * who the money was for.
 *
 * The comment is required. No client row carries the beneficiary's name on these
 * rows, so this box is the only place it is ever written down.
 */
function PropioEnvioForm({ mode, onMode }: { mode: Mode; onMode: (mode: Mode) => void }) {
  const [state, formAction, pending] = useActionState<NuevoEnvioPersonalState, FormData>(
    crearEnvioPersonalAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.result) formRef.current?.reset();
  }, [state.result]);

  return (
    <>
      {state.result ? <PropioConfirmation result={state.result} /> : null}

      <form ref={formRef} action={formAction} className="panel" aria-busy={pending}>
        <h2>Nuevo envío</h2>
        <ModeTabs mode={mode} onMode={onMode} />
        {state.error ? <p className="notice error">{state.error}</p> : null}

        <div className="form-row">
          <div>
            <label htmlFor="amount_ves">Monto (Bs)</label>
            <input id="amount_ves" name="amount_ves" type="text" inputMode="decimal" />
          </div>
          <div>
            <label htmlFor="personal_payout_method">Método de pago</label>
            <select id="personal_payout_method" name="payout_method">
              {SENDING_PAYOUT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="personal_note">Para quién</label>
            <input
              id="personal_note"
              name="personal_note"
              type="text"
              placeholder="a mi hermana"
            />
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={pending}>
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

/** No client name, no EUR, no tasa: none of the three exists on an envío propio. */
function PropioConfirmation({
  result,
}: {
  result: NonNullable<NuevoEnvioPersonalState['result']>;
}) {
  return (
    <div className="notice ok">
      <div>
        Envío propio registrado (<strong>{result.personalNote}</strong> · {result.payoutMethod}).
      </div>
      <div style={{ marginTop: 6 }}>Bolívares a pagar</div>
      <div className="big-number">{fmtVes(result.amountVesToPay)}</div>
    </div>
  );
}
