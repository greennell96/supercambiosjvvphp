'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { guardarClienteAction, type ClienteState } from './actions';
import { bankOptions } from '@/lib/banks';
import { digitsOnly, normalizeText } from '@/lib/text';

export interface ClienteRow {
  id: number;
  name: string;
  phone: string | null;
  banks: string[];
  dni_nie: string | null;
}

/**
 * The clients screen: one search box over the table, and one form that adds a
 * client or edits the one currently selected.
 */
export default function ClientesPanel({ clients }: { clients: ClienteRow[] }) {
  const [state, formAction, pending] = useActionState<ClienteState, FormData>(
    guardarClienteAction,
    {},
  );
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ClienteRow | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setEditing(null);
    }
  }, [state.ok]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return clients;
    const qDigits = digitsOnly(query);
    return clients.filter((c) => {
      if (normalizeText(c.name).includes(q)) return true;
      if (qDigits && c.phone && digitsOnly(c.phone).includes(qDigits)) return true;
      return false;
    });
  }, [clients, query]);

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className="panel"
        key={editing?.id ?? 'new'}
        aria-busy={pending}
      >
        <h2>{editing ? `Editar: ${editing.name}` : 'Añadir cliente'}</h2>
        {state.error ? <p className="notice error">{state.error}</p> : null}
        {state.ok ? (
          <p className="notice ok">
            {state.ok.created ? 'Cliente añadido' : 'Cliente actualizado'}: {state.ok.name}.
          </p>
        ) : null}
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

        <div className="form-row">
          <div>
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              defaultValue={editing?.name ?? ''}
            />
          </div>
          <div>
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={editing?.phone ?? ''}
            />
          </div>
          <div>
            {/*
              bankOptions() puts any spelling this client already has that is
              not one of the fixed five FIRST, so it always gets a checkbox to
              come back checked. Losing one on save would be silent data loss
              — see lib/banks.ts.
            */}
            <fieldset className="source-picker">
              <legend>Bancos</legend>
              {bankOptions(editing?.banks ?? []).map((bank) => (
                <label key={bank} className="checkbox-option">
                  <input
                    type="checkbox"
                    name="banks"
                    value={bank}
                    defaultChecked={(editing?.banks ?? []).includes(bank)}
                  />
                  {bank}
                </label>
              ))}
            </fieldset>
            <label htmlFor="banks_otro">Otro banco</label>
            <input
              id="banks_otro"
              name="banks_otro"
              type="text"
              placeholder="Si no está en la lista"
            />
          </div>
          <div>
            <label htmlFor="dni_nie">DNI / NIE</label>
            <input id="dni_nie" name="dni_nie" type="text" defaultValue={editing?.dni_nie ?? ''} />
          </div>
          <div className="form-actions">
            <button className="primary" type="submit" disabled={pending}>
              {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Añadir cliente'}
            </button>{' '}
            {editing ? (
              <button className="quiet" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            ) : null}
          </div>

          {/*
            Deliberately a warning, not a hard block: three real phone
            collisions turned up in the 664 imported clients and at least two
            are one household sharing a number, which a database constraint
            would have rejected outright. "Guardar de todos modos" resubmits
            this same form with confirm_duplicate set, so nothing typed above
            is lost.

            It sits AFTER the primary button, unlike the error/ok notices at
            the top, and that position is load-bearing rather than cosmetic:
            implicit submission (pressing Enter in a text field) picks the
            FIRST submit button in the form. With this one above, Enter would
            quietly submit confirm_duplicate and save the very duplicate the
            warning exists to stop. Keep it below "Guardar".
          */}
          {state.duplicate ? (
            <div className="notice warn">
              <p>Ya existe un cliente con ese teléfono: {state.duplicate.name}.</p>
              <button
                className="small secondary"
                type="submit"
                name="confirm_duplicate"
                value="1"
                disabled={pending}
              >
                Guardar de todos modos
              </button>
            </div>
          ) : null}
        </div>
      </form>

      <div className="panel">
        <div className="panel-heading">
          <h2>Directorio</h2>
          <span className="panel-count">
            {filtered.length} de {clients.length} clientes
          </span>
        </div>
        <div className="field">
          <label htmlFor="client-filter">Buscar por nombre o teléfono</label>
          <input
            id="client-filter"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Escribe para filtrar…"
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Bancos</th>
                <th>DNI / NIE</th>
                <th className="actions-heading">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td data-label="Nombre" data-lead>
                    {c.name}
                  </td>
                  {/*
                    Teléfono and DNI keep their dash on purpose: a client without
                    one is a withdrawal Jose cannot complete, and that gap is
                    worth seeing. The bank list is only a convenience and says
                    nothing when it is empty.
                  */}
                  <td data-label="Teléfono">{c.phone ?? '—'}</td>
                  <td data-label="Bancos" data-empty={c.banks.length ? undefined : true}>
                    {c.banks.length ? c.banks.join(', ') : '—'}
                  </td>
                  <td data-label="DNI / NIE">{c.dni_nie ?? '—'}</td>
                  <td data-label="Acción" data-wide data-actions>
                    <button
                      className="small secondary"
                      type="button"
                      onClick={() => {
                        setEditing(c);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
