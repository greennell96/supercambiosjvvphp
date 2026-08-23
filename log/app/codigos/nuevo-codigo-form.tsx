'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { crearCodigoAction, type NuevoCodigoState } from './actions';
import ClientPicker, { type PickerClient } from '../components/client-picker';
import { requiresDniReminder } from '@/lib/banks';
import { fmtEur } from '@/lib/format';

export default function NuevoCodigoForm({ clients }: { clients: PickerClient[] }) {
  const [state, formAction, pending] = useActionState<NuevoCodigoState, FormData>(
    crearCodigoAction,
    {},
  );
  const [client, setClient] = useState<PickerClient | null>(null);
  const [bank, setBank] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Picking a client decides how the bank field behaves:
  //  - exactly one bank on file -> filled in automatically
  //  - several -> a picker limited to those banks
  //  - none -> free text
  useEffect(() => {
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
    }
  }, [state.ok]);

  const showDni = requiresDniReminder(bank);

  return (
    <form ref={formRef} action={formAction} className="panel">
      <h2>Nuevo código</h2>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? (
        <p className="notice ok">
          Código de {fmtEur(state.ok.amount)} registrado en {state.ok.bank}.
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

        <div>
          <button className="primary" type="submit" disabled={pending || !client}>
            Registrar código
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
