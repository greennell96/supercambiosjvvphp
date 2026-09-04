'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import {
  crearEnvioAction,
  crearEnvioPersonalAction,
  crearEnvioUsdtAction,
  type NuevoEnvioPersonalState,
  type NuevoEnvioState,
  type NuevoEnvioUsdtState,
} from './actions';
import styles from './envios.module.css';
import ClientPicker, { type PickerClient } from '../components/client-picker';
import { requiresDniReminder } from '@/lib/banks';
import { madridDayKey } from '@/lib/day-buckets';
import type { Lot } from '@/lib/fifo';
import { fmtEur, fmtPercent, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import { parseDecimal } from '@/lib/parse';
import { SENDING_PAYOUT_METHODS, type SendingPayoutMethod } from '@/lib/pricing';
import { computeUsdtPreview } from '@/lib/usdt-preview';

/**
 * One panel, three ways of logging a sending. They are separate forms rather
 * than one form with fields hidden, because they take different inputs and
 * post to different actions — and because a hidden-but-mounted client picker
 * would keep submitting a client for a transfer that has none.
 *
 * The mode lives out here so it survives a save: Jose logs family remittances in
 * runs, and having to re-pick the tab after each one would be the wrong default.
 */
type Mode = 'cliente' | 'propio' | 'usdt';

export default function NuevoEnvioForm({
  clients,
  suggestedTasa,
  usdtLots,
  open,
}: {
  clients: PickerClient[];
  suggestedTasa: number;
  /** The crypto pool, read once server-side, for the Envío USDT calculator. */
  usdtLots: Lot[];
  /**
   * Controlled from the toolbar in envios-list.tsx, which owns the button that
   * opens this. It used to be a dock at the bottom of the page with its own
   * header and its own toggle; the header went with the toggle, because the
   * form inside already carries the "Nuevo envío" heading and a second one
   * above it said the same thing twice.
   */
  open: boolean;
}) {
  const [mode, setMode] = useState<Mode>('cliente');

  if (!open) return null;

  return (
    <section className={styles.creationDock} aria-label="Registrar un envío">
      {mode === 'cliente' ? (
        <ClienteEnvioForm
          clients={clients}
          suggestedTasa={suggestedTasa}
          mode={mode}
          onMode={setMode}
        />
      ) : mode === 'propio' ? (
        <PropioEnvioForm mode={mode} onMode={setMode} />
      ) : (
        <UsdtEnvioForm clients={clients} usdtLots={usdtLots} mode={mode} onMode={setMode} />
      )}
    </section>
  );
}

/** The three tabs, rendered identically inside whichever form is showing. */
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
      <button
        className={mode === 'usdt' ? 'small action-primary' : 'small secondary'}
        type="button"
        aria-pressed={mode === 'usdt'}
        onClick={() => onMode('usdt')}
      >
        Envío USDT
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

/**
 * Log an obligation to send USDT straight to a Binance account the client
 * gave him, instead of bolívares into a Venezuelan bank — see migration 020.
 * A client picker plus three fields: what the client paid in EUR, what José
 * is agreeing to deliver in USDT, and the date. Nothing is drawn from the
 * pool by this form; that happens later, when the envío is marked paid.
 *
 * No método de pago here, unlike the other two forms: an Envío USDT is always
 * Binance, never a choice among payout channels the way the other two kinds'
 * later funding is. There is no código section and no split-parts section
 * either, and deliberately so: both of those exist only for a client sending
 * whose payout is still an open decision, and an Envío USDT is a fixed,
 * single obligation from the moment it is logged (see createUsdtSending and
 * paySendingUsdt).
 *
 * The preview underneath is still a calculator, not a receipt — nothing here
 * is drawn or booked: computeUsdtPreview runs synchronously against
 * `usdtLots`, a server-read prop, on every keystroke in either amount box —
 * no server round trip, exactly like app/rates-form.tsx's pool margin — to
 * answer "what would marking this paid cost right now", knowing the real
 * draw happens later against the pool as it stands then.
 */
function UsdtEnvioForm({
  clients,
  usdtLots,
  mode,
  onMode,
}: {
  clients: PickerClient[];
  usdtLots: Lot[];
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  const [state, formAction, pending] = useActionState<NuevoEnvioUsdtState, FormData>(
    crearEnvioUsdtAction,
    {},
  );
  const [client, setClient] = useState<PickerClient | null>(null);
  const [amountEurText, setAmountEurText] = useState('');
  const [usdtDeliveredText, setUsdtDeliveredText] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful save, clear the form so the next envío can be typed.
  useEffect(() => {
    if (state.result) {
      formRef.current?.reset();
      setClient(null);
      setAmountEurText('');
      setUsdtDeliveredText('');
    }
  }, [state.result]);

  const preview = computeUsdtPreview({
    amountEur: parseDecimal(amountEurText),
    usdtDelivered: parseDecimal(usdtDeliveredText),
    usdtLots,
  });

  return (
    <>
      {state.result ? <UsdtConfirmation result={state.result} /> : null}

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
            <label htmlFor="usdt_amount_eur">EUR recibidos</label>
            <input
              id="usdt_amount_eur"
              name="amount_eur"
              type="text"
              inputMode="decimal"
              value={amountEurText}
              onChange={(event) => setAmountEurText(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="usdt_to_deliver">USDT a entregar</label>
            <input
              id="usdt_to_deliver"
              name="usdt_to_deliver"
              type="text"
              inputMode="decimal"
              value={usdtDeliveredText}
              onChange={(event) => setUsdtDeliveredText(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="usdt_created_at">Fecha</label>
            <input
              id="usdt_created_at"
              name="created_at"
              type="date"
              required
              // Madrid's today, not UTC's — the same reason fmtDateTime always
              // names its zone: the server renders in UTC, and near midnight
              // that is a different calendar day from the one José is in.
              defaultValue={madridDayKey(new Date())}
            />
          </div>
        </div>

        <UsdtPreviewPanel preview={preview} />

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
 * What this Envío USDT WOULD cost and earn if it were marked paid right now,
 * against the pool as it stands at this instant — not what it already cost,
 * because nothing has been drawn yet (see createUsdtSending): the real draw
 * happens later, in paySendingUsdt, against the pool as it stands then, and
 * can land on a different figure if it moves between now and that click.
 * Three rows only — coste, ganancia, margen — because there is no separate
 * "bolívares obtenibles" step the way the tasa calculator has: José already
 * knows both real numbers, EUR and USDT, so nothing here is hypothetical the
 * way a candidate Binance price is.
 */
function UsdtPreviewPanel({ preview }: { preview: ReturnType<typeof computeUsdtPreview> }) {
  if (!preview) {
    return (
      <p className="muted rate-preview-hint">
        Escribe los EUR recibidos y los USDT a entregar para ver cuánto costaría y ganarías al
        marcarlo pagado.
      </p>
    );
  }

  const profitClass = preview.profitEur < 0 ? 'negative-value' : 'profit-value';

  return (
    <div className="rate-preview">
      <dl>
        <div>
          <dt>Te costarían esos USDT</dt>
          <dd>{fmtEur(preview.costEur)}</dd>
        </div>
        <div className="rate-preview-total">
          <dt>Ganancia</dt>
          <dd className={profitClass}>{fmtEur(preview.profitEur)}</dd>
        </div>
        <div className="rate-preview-total">
          <dt>Margen</dt>
          <dd className={profitClass}>{fmtPercent(preview.marginPct)}</dd>
        </div>
      </dl>

      {/*
        Honest, not an error: a shortfall books as a backorder on the newest
        purchase (costUsdtDraw / drawFifo), the same as a direct payout running
        the pool short. It just means the next compra will need to cover it.
      */}
      {preview.shortfallUsdt > 0 ? (
        <p className="muted rate-preview-note">
          El pool no cubre {fmtUsdt(preview.shortfallUsdt)}: quedarán como saldo negativo en la
          compra más reciente hasta que compres más USDT.
        </p>
      ) : null}
    </div>
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

/**
 * No coste, no ganancia and no shortfall here — unlike the old already-paid
 * confirmation, nothing was drawn (see createUsdtSending): the pool has not
 * been touched, so there is nothing real to report yet, only the obligation
 * that was just logged. The headline is the USDT to deliver, since that is
 * the figure paySendingUsdt will draw later, exactly as agreed here.
 */
function UsdtConfirmation({ result }: { result: NonNullable<NuevoEnvioUsdtState['result']> }) {
  return (
    <div className="notice ok">
      <div>
        Envío USDT registrado para <strong>{result.clientName}</strong> (
        {fmtEur(result.amountEur)} → {fmtUsdt(result.usdtToDeliver)}).
      </div>
      <div className={styles.confirmationDetail}>
        Queda pendiente. Los USDT saldrán del pool cuando lo marques pagado.
      </div>
      <div className={styles.confirmationAmountLabel}>USDT a entregar</div>
      <div className="big-number">{fmtUsdt(result.usdtToDeliver)}</div>
    </div>
  );
}
