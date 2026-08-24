'use client';

import { useActionState } from 'react';

import { updateRatesAction, type RatesState } from './actions';
import { fmtDateTime } from '@/lib/format';

/**
 * The suggested tasa. This is NOT applied to anything on its own — it only
 * prefills the tasa box on "Nuevo envío", which stays editable. Logging a
 * sending also updates this value to whatever was typed there.
 */
export default function RatesForm({ tasa, updatedAt }: { tasa: number; updatedAt: Date }) {
  const [state, formAction, pending] = useActionState<RatesState, FormData>(updateRatesAction, {});

  return (
    <form action={formAction}>
      {state.error ? <p className="notice error">{state.error}</p> : null}
      {state.ok ? <p className="notice ok">Tasa sugerida actualizada.</p> : null}
      <div className="form-row">
        <div>
          <label htmlFor="tasa_eur_ves">Tasa sugerida EUR → Bs</label>
          <input
            id="tasa_eur_ves"
            name="tasa_eur_ves"
            type="text"
            inputMode="decimal"
            defaultValue={tasa || ''}
          />
        </div>
        <div>
          <button className="primary" type="submit" disabled={pending}>
            Guardar sugerencia
          </button>
        </div>
      </div>
      <p className="muted">Actualizada {fmtDateTime(updatedAt)}</p>
    </form>
  );
}
