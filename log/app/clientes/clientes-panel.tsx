'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';

import { guardarClienteAction, type ClienteState } from './actions';
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
            <label htmlFor="banks">Bancos (separados por coma)</label>
            <input
              id="banks"
              name="banks"
              type="text"
              defaultValue={(editing?.banks ?? []).join(', ')}
              placeholder="BBVA, Santander"
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
        </div>
      </form>

      <div className="panel">
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

        <p className="muted">
          {filtered.length} de {clients.length} clientes
        </p>

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
                  <td data-label="Nombre" data-wide>
                    {c.name}
                  </td>
                  <td data-label="Teléfono">{c.phone ?? '—'}</td>
                  <td data-label="Bancos">{c.banks.length ? c.banks.join(', ') : '—'}</td>
                  <td data-label="DNI / NIE">{c.dni_nie ?? '—'}</td>
                  <td className="num" data-label="Acción" data-wide>
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
