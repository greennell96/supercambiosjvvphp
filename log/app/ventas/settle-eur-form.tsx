'use client';

import { useActionState } from 'react';

import type { DeleteState } from '../actions';
import { marcarEurPagadoAction } from './actions';

export default function SettleEurForm({ id }: { id: number }) {
  const [state, formAction, pending] = useActionState<DeleteState, FormData>(
    marcarEurPagadoAction,
    {},
  );

  return (
    <form action={formAction} className="settle-eur-form">
      <input type="hidden" name="id" value={id} />
      <button className="small action-success" type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Marcar pagado'}
      </button>
      {state.error ? <span className="inline-error">{state.error}</span> : null}
    </form>
  );
}
