'use client';

import { useActionState, useState } from 'react';

import type { DeleteState } from '../actions';

/**
 * Delete one row, with the confirm step shown in place.
 *
 * Same shape as PaySendingActions' "Marcar pagado (directo)": the first click
 * only reveals the real button, and the real button is right where the eye
 * already is. No browser confirm() — it would sit outside the table, say nothing
 * about which row it means, and there is nowhere in it to show a refusal.
 *
 * A refusal is the normal case here, not an exception: a pool lot that something
 * already drew from cannot be deleted, and the reason why is the point. So the
 * form stays open on an error, with the reason under it, and "Cancelar" is what
 * closes it.
 *
 * The action comes in as a prop because the four lists delete four different
 * things; the confirm-and-report behaviour is the only part they share.
 */
export default function DeleteRowForm({
  id,
  action,
  label = 'Eliminar',
}: {
  id: number;
  action: (prev: DeleteState, formData: FormData) => Promise<DeleteState>;
  /** Overridable so a row that means something else can say so. */
  label?: string;
}) {
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(action, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="delete-row">
      {confirming ? (
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <span className="muted">¿Eliminar?</span>
          <button className="small danger" type="submit" disabled={pending}>
            Confirmar
          </button>
          <button className="small quiet" type="button" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <button className="small danger-trigger" type="button" onClick={() => setConfirming(true)}>
          {label}
        </button>
      )}

      {state.error ? <p className="pay-error">{state.error}</p> : null}
    </div>
  );
}
