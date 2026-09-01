'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import {
  crearEnvioAction,
  crearEnvioPersonalAction,
  type NuevoEnvioPersonalState,
  type NuevoEnvioState,
} from './actions';
import styles from './envios.module.css';
import ClientPicker, { type PickerClient } from '../components/client-picker';
import { requiresDniReminder } from '@/lib/banks';
import { fmtEur, fmtRate, fmtVes } from '@/lib/format';
import { SENDING_PAYOUT_METHODS, type SendingPayoutMethod } from '@/lib/pricing';

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
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.creationDock} aria-label="Registrar un envío">
      <div className={styles.creationHeader}>
        <div>
          <h2>Registrar un envío</h2>
          <p>Abre para registrar un movimiento.</p>
        </div>
        <button
          className={`primary ${styles.creationToggle}`}
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((shown) => !shown)}
        >
          {open ? 'Cerrar formulario' : 'Nuevo envío'}
        </button>
      </div>

      {open ? (
        mode === 'cliente' ? (
          <ClienteEnvioForm
            clients={clients}
            suggestedTasa={suggestedTasa}
            mode={mode}
            onMode={setMode}
          />
        ) : (
          <PropioEnvioForm mode={mode} onMode={setMode} />
        )
      ) : null}
    </section>
  );
}

/** The two tabs, rendered identically inside whichever form is showing. */
function ModeTabs({ mode, onMode }: { mode: Mode; onMode: (mode: Mode) => void }) {
  return (
    <div className={`form-actions ${styles.modeTabs}`}>
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
  const [amountEur, setAmountEur] = useState('');
  const [additionalParts, setAdditionalParts] = useState<
    { key: number; payoutMethod: SendingPayoutMethod }[]
  >([]);
  const [registerCodigo, setRegisterCodigo] = useState(false);
  const [codigoAmount, setCodigoAmount] = useState('');
  const [codigoBank, setCodigoBank] = useState('');
  const nextPartKey = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful save, clear the form so the next envio can be typed.
  useEffect(() => {
    if (state.result) {
      formRef.current?.reset();
      setClient(null);
      setAmountEur('');
      setAdditionalParts([]);
      setRegisterCodigo(false);
      setCodigoAmount('');
      setCodigoBank('');
    }
  }, [state.result]);

  useEffect(() => {
    if (!client) {
      setCodigoBank('');
      return;
    }
    setCodigoBank(client.banks.length === 1 ? client.banks[0] : '');
  }, [client]);

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
            <input
              id="amount_eur"
              name="amount_eur"
              type="text"
              inputMode="decimal"
              value={amountEur}
              onChange={(event) => setAmountEur(event.target.value)}
            />
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
        </div>

        <fieldset className="creation-section">
          <legend>División del envío</legend>
          <p className="muted">
            Añade cada parte que irá por otro método. La primera parte será el resto del monto
            total y todas compartirán el mismo cobro del cliente.
          </p>

          {additionalParts.map((part, index) => (
            <div className="creation-part" key={part.key}>
              <div>
                <label htmlFor={`split_amount_eur_${part.key}`}>Parte {index + 2} (EUR)</label>
                <input
                  id={`split_amount_eur_${part.key}`}
                  name="split_amount_eur"
                  type="text"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label htmlFor={`split_payout_method_${part.key}`}>Método de pago</label>
                <select
                  id={`split_payout_method_${part.key}`}
                  name="split_payout_method"
                  defaultValue={part.payoutMethod}
                >
                  {SENDING_PAYOUT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="small quiet"
                type="button"
                onClick={() =>
                  setAdditionalParts((current) => current.filter((item) => item.key !== part.key))
                }
              >
                Quitar parte
              </button>
            </div>
          ))}

          <button
            className="small secondary"
            type="button"
            onClick={() => {
              const key = nextPartKey.current;
              nextPartKey.current += 1;
              setAdditionalParts((current) => [
                ...current,
                { key, payoutMethod: SENDING_PAYOUT_METHODS[0] },
              ]);
            }}
          >
            {additionalParts.length === 0 ? 'Dividir' : 'Añadir otra parte'}
          </button>
        </fieldset>

        <fieldset className="creation-section">
          <legend>Cobro por código</legend>
          <button
            className="small action-info"
            type="button"
            aria-expanded={registerCodigo}
            onClick={() => {
              setRegisterCodigo((open) => {
                if (!open && !codigoAmount) setCodigoAmount(amountEur);
                return !open;
              });
            }}
          >
            {registerCodigo ? 'No registrar código ahora' : 'Registrar código ahora'}
          </button>

          {registerCodigo ? (
            <>
              <input type="hidden" name="register_codigo" value="1" />
              <div className="form-row creation-code-fields">
                <div>
                  <label htmlFor="codigo_code">Código</label>
                  <input
                    id="codigo_code"
                    name="codigo_code"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label htmlFor="codigo_amount">Monto del código</label>
                  <input
                    id="codigo_amount"
                    name="codigo_amount"
                    type="text"
                    inputMode="decimal"
                    value={codigoAmount}
                    onChange={(event) => setCodigoAmount(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="codigo_bank">Banco</label>
                  {client && client.banks.length > 1 ? (
                    <select
                      id="codigo_bank"
                      name="codigo_bank"
                      value={codigoBank}
                      onChange={(event) => setCodigoBank(event.target.value)}
                    >
                      <option value="">Elige banco…</option>
                      {client.banks.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="codigo_bank"
                      name="codigo_bank"
                      type="text"
                      value={codigoBank}
                      placeholder={client ? 'Escribe el banco' : 'Elige un cliente primero'}
                      disabled={!client}
                      onChange={(event) => setCodigoBank(event.target.value)}
                    />
                  )}
                </div>
              </div>

              {requiresDniReminder(codigoBank) ? (
                <div className="notice warn">
                  CaixaBank — recuerda el DNI/NIE: {client?.dni_nie ?? 'sin DNI en ficha'}
                </div>
              ) : null}
            </>
          ) : null}
        </fieldset>

        <div className={`form-actions creation-submit ${styles.creationSubmit}`}>
          <button className="primary" type="submit" disabled={pending || !client}>
            {pending ? 'Registrando…' : 'Registrar envío'}
          </button>
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
        </div>
        <div className={`form-actions creation-submit ${styles.creationSubmit}`}>
          <button className="primary" type="submit" disabled={pending}>
            {pending ? 'Registrando…' : 'Registrar envío'}
          </button>
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
      {result.partCount > 1 ? (
        <div className={styles.confirmationDetail}>
          {result.partCount} partes comparten el mismo cobro.
        </div>
      ) : null}
      {result.codigo ? (
        <div className={styles.confirmationDetail}>
          Código <strong>{result.codigo.code}</strong> por {fmtEur(result.codigo.amount)} registrado
          en {result.codigo.bank}; el cliente queda cobrado en{' '}
          {result.partCount === 1 ? 'el envío' : 'todas las partes'}.
        </div>
      ) : null}
      <div className={styles.confirmationAmountLabel}>Bolívares a pagar</div>
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
      <div className={styles.confirmationAmountLabel}>Bolívares a pagar</div>
      <div className="big-number">{fmtVes(result.amountVesToPay)}</div>
    </div>
  );
}
