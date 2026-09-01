'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { crearCodigoAction, type NuevoCodigoState } from './actions';
import ClientPicker, { type PickerClient } from '../components/client-picker';
import { requiresDniReminder } from '@/lib/banks';
import { fmtDate, fmtEur } from '@/lib/format';
import { openSendingsForClient } from '@/lib/linking';

/**
 * Just the fields the link picker shows for one open sending.
 *
 * amount_eur is nullable because a sending in general can be an envío propio,
 * which has none. listOpenSendings never hands one over — a codigo is a client's
 * proof of payment and a propio has no client — so the dash below is a guard
 * that should not be reachable, not a case the picker expects to show.
 */
export interface PickerSending {
  id: number;
  payment_group_id: string;
  client_id: number;
  amount_eur: number;
  payout_method: string;
  created_at: Date;
  part_count: number;
}

export default function NuevoCodigoForm({
  clients,
  openSendings,
}: {
  clients: PickerClient[];
  /** Sendings the client has not paid for yet, across every client. */
  openSendings: PickerSending[];
}) {
  const [state, formAction, pending] = useActionState<NuevoCodigoState, FormData>(
    crearCodigoAction,
    {},
  );
  const [client, setClient] = useState<PickerClient | null>(null);
  const [bank, setBank] = useState('');
  const [sendingId, setSendingId] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Picking a client decides how the bank field behaves:
  //  - exactly one bank on file -> filled in automatically
  //  - several -> a picker limited to those banks
  //  - none -> free text
  //
  // It also drops any sending already picked: the link list is that client's
  // own sendings, so a leftover pick would point at somebody else's.
  useEffect(() => {
    setSendingId('');
    if (!client) {
      setBank('');
      return;
    }
    setBank(client.banks.length === 1 ? client.banks[0] : '');
  }, [client]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setClient(null);
      setBank('');
      setSendingId('');
    }
  }, [state.ok]);

  const showDni = requiresDniReminder(bank);
  const linkable = openSendingsForClient(openSendings, client?.id ?? null);

  return (
    <form ref={formRef} action={formAction} className="panel" aria-busy={pending}>
      <h2>Nuevo código</h2>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? (
        <p className="notice ok">
          Código {state.ok.code} de {fmtEur(state.ok.amount)} registrado en {state.ok.bank}.
          {state.ok.linked ? ' El envío queda cobrado al cliente.' : null}
        </p>
      ) : null}

      <ClientPicker
        clients={clients}
        value={client}
        onChange={setClient}
        addClientHref="/clientes?from=codigos"
      />
      <input type="hidden" name="client_id" value={client?.id ?? ''} />

      <div className="form-row">
        <div>
          <label htmlFor="code">Código</label>
          <input
            id="code"
            name="code"
            type="text"
            autoComplete="off"
            placeholder="El código del banco"
          />
        </div>

        <div>
          <label htmlFor="amount">Monto</label>
          <input id="amount" name="amount" type="text" inputMode="decimal" />
        </div>

        <div>
          <label htmlFor="bank">Banco</label>
          {client && client.banks.length > 1 ? (
            <select
              id="bank"
              name="bank"
              value={bank}
              onChange={(event) => setBank(event.target.value)}
            >
              <option value="">Elige banco…</option>
              {client.banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="bank"
              name="bank"
              type="text"
              value={bank}
              placeholder={client ? 'Escribe el banco' : 'Elige un cliente primero'}
              disabled={!client}
              onChange={(event) => setBank(event.target.value)}
            />
          )}
        </div>

        {/*
          Optional, and only ever this client's own open sendings. Picking one
          says "this codigo is how he paid for that envío", which marks it
          cobrado con código in the same save. Hidden when he has none open, so
          the common case stays four fields.
        */}
        {linkable.length > 0 ? (
          <div>
            <label htmlFor="sending_id">Vincular a un envío abierto</label>
            <select
              id="sending_id"
              name="sending_id"
              value={sendingId}
              onChange={(event) => setSendingId(event.target.value)}
            >
              <option value="">Sin vincular</option>
              {linkable.map((s) => (
                <option key={s.id} value={s.id}>
                  {fmtEur(s.amount_eur)} · {fmtDate(s.created_at)} · {s.payout_method}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="form-actions">
          <button className="primary" type="submit" disabled={pending || !client}>
            {pending ? 'Registrando…' : 'Registrar código'}
          </button>
        </div>
      </div>

      {showDni ? (
        <div className="notice warn">
          <label htmlFor="dni-reminder">CaixaBank — recuerda el DNI/NIE del cliente</label>
          <input id="dni-reminder" type="text" readOnly value={client?.dni_nie ?? 'sin DNI en ficha'} />
        </div>
      ) : null}
    </form>
  );
}
