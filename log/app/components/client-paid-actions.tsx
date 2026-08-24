'use client';

import { useActionState, useEffect, useState } from 'react';

import { clientePagoAction, type ClientePagoState } from '../envios/actions';
import { fmtEur } from '@/lib/format';
import { codigosForSending } from '@/lib/linking';
import {
  CLIENT_PAYMENT_METHODS,
  CLIENT_PAYMENT_METHOD_LABELS,
  type ClientPaymentMethod,
} from '@/lib/types';

/** Just the fields this picker shows for one unlinked codigo. */
export interface PickerCodigo {
  id: number;
  client_id: number;
  client_name: string;
  code: string;
  amount: number;
}

/**
 * "Cliente pagó" — the client settled his side of this sending, here in Spain.
 *
 * Deliberately NOT one of the "Marcar pagado" buttons above it. Those two are
 * about Jose paying the beneficiary in Venezuela and they move real money; this
 * one records that the money arrived, and moves nothing. Same reveal-a-confirm
 * shape as PaySendingActions and DeleteRowForm, so it reads as one more row
 * action, but its own wording all the way through.
 *
 * The method picker comes first, and two of the six then ask for one more thing:
 *
 *   Código — which codigo, out of every codigo not yet pointed at a sending.
 *            This sending's client comes first in the list (codigosForSending),
 *            but the rest are all still there: a codigo is often issued under a
 *            relative's name. Picking one is optional.
 *   Otro   — free text, straight into "Cómo pagó el cliente". Optional too, by
 *            that field's own design.
 */
export default function ClientPaidActions({
  sendingId,
  clientId,
  codigos,
}: {
  sendingId: number;
  clientId: number;
  /** Every codigo with no sending yet, in list order. */
  codigos: PickerCodigo[];
}) {
  const [state, formAction, pending] = useActionState<ClientePagoState, FormData>(
    clientePagoAction,
    {},
  );
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<ClientPaymentMethod | ''>('');

  // Close on a successful save. The row re-renders without this control at all,
  // but the state has to be reset for the next time it appears.
  useEffect(() => {
    if (state.savedAt) {
      setOpen(false);
      setMethod('');
    }
  }, [state.savedAt]);

  if (!open) {
    return (
      <div className="client-paid">
        <button className="small action-info" type="button" onClick={() => setOpen(true)}>
          Cliente pagó
        </button>
        {state.error ? <p className="pay-error">{state.error}</p> : null}
      </div>
    );
  }

  const offered = codigosForSending(codigos, clientId);

  return (
    <form action={formAction} className="client-paid open">
      <input type="hidden" name="id" value={sendingId} />

      <select
        name="method"
        aria-label="Cómo pagó el cliente"
        value={method}
        onChange={(event) => setMethod(event.target.value as ClientPaymentMethod | '')}
      >
        <option value="">¿Cómo pagó?</option>
        {CLIENT_PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {CLIENT_PAYMENT_METHOD_LABELS[m]}
          </option>
        ))}
      </select>

      {method === 'CODIGO' ? (
        <select name="codigo_id" aria-label="Código del cliente" defaultValue="">
          <option value="">Sin código</option>
          {offered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code || 'sin código'} · {c.client_name} · {fmtEur(c.amount)}
            </option>
          ))}
        </select>
      ) : null}

      {method === 'OTRO' ? (
        <input
          name="client_payment_note"
          type="text"
          placeholder="¿Cómo pagó? (opcional)"
          autoFocus
        />
      ) : null}

      <button className="small action-info" type="submit" disabled={pending || !method}>
        {pending ? 'Guardando…' : 'Confirmar cobro'}
      </button>
      <button className="small quiet" type="button" onClick={() => setOpen(false)}>
        Cancelar
      </button>

      {method === 'CODIGO' && offered.length === 0 ? (
        <p className="muted">No hay códigos sin vincular. Puedes confirmar sin código.</p>
      ) : null}
      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </form>
  );
}
