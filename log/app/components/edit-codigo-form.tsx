'use client';

import { useActionState, useEffect, useState } from 'react';

import { editarCodigoAction, type EditCodigoState } from '../actions';

/** Just the fields the edit form touches. */
export interface EditableCodigo {
  id: number;
  code: string;
  amount: number;
  bank: string;
}

/**
 * Fix a código that was typed wrong.
 *
 * Everything on this form is editable in every state, which is the difference
 * from EditSendingForm and the whole point of it. A sending freezes its money
 * when it is paid because the pools were drawn against those numbers; a código
 * draws nothing from anywhere. So a retirado código is corrected exactly like a
 * pendiente one — the money left the cajero either way, and a wrong código in
 * the log stays wrong until somebody fixes it.
 *
 * What is NOT here is as deliberate: the client and the linked envío. The link
 * is what makes a sending say the client paid, and moving it means updating both
 * halves of that fact under a lock — which is what registering and deleting a
 * código already do. A typo-fix form has no business in the middle of that, so
 * it never sees either column.
 *
 * El banco is a plain text box rather than the client's bank picker the create
 * form uses. That picker reads the client's own list of banks, and the client is
 * locked here — fetching a list this form cannot change the owner of, to correct
 * a spelling, would be machinery for nothing.
 */
export default function EditCodigoForm({ codigo }: { codigo: EditableCodigo }) {
  const [state, formAction, pending] = useActionState<EditCodigoState, FormData>(
    editarCodigoAction,
    {},
  );
  const [open, setOpen] = useState(false);

  // Close on a successful save. Keyed on the timestamp, so saving twice in a row
  // still closes it the second time.
  useEffect(() => {
    if (state.savedAt) setOpen(false);
  }, [state.savedAt]);

  if (!open) {
    return (
      <div className="edit-codigo">
        <button className="small secondary" type="button" onClick={() => setOpen(true)}>
          Editar
        </button>
        {state.error ? <p className="pay-error">{state.error}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="edit-codigo open">
      <input type="hidden" name="id" value={codigo.id} />

      <div className="edit-field">
        <label htmlFor={`code_${codigo.id}`}>Código</label>
        <input id={`code_${codigo.id}`} name="code" type="text" defaultValue={codigo.code} />
      </div>

      <div className="edit-field">
        <label htmlFor={`amount_${codigo.id}`}>Monto (EUR)</label>
        <input
          id={`amount_${codigo.id}`}
          name="amount"
          type="text"
          inputMode="decimal"
          defaultValue={String(codigo.amount)}
        />
      </div>

      <div className="edit-field">
        <label htmlFor={`bank_${codigo.id}`}>Banco</label>
        <input id={`bank_${codigo.id}`} name="bank" type="text" defaultValue={codigo.bank} />
      </div>

      <div className="edit-buttons">
        <button className="small primary" type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="small quiet" type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>

      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </form>
  );
}
