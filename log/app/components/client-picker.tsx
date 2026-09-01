'use client';

import { useMemo, useState } from 'react';

import { digitsOnly, normalizeText } from '@/lib/text';

export interface PickerClient {
  id: number;
  name: string;
  phone: string | null;
  banks: string[];
  dni_nie: string | null;
}

/**
 * Search-as-you-type over the client list. Matches name or phone. A client must
 * be picked from the list; there is no free text.
 *
 * The full list is handed down from the server page and filtered in the
 * browser. That is deliberate: the list is a few hundred rows, so this avoids
 * an API round trip per keystroke.
 */
export default function ClientPicker({
  clients,
  value,
  onChange,
  label = 'Cliente',
  addClientHref,
}: {
  clients: PickerClient[];
  value: PickerClient | null;
  onChange: (client: PickerClient | null) => void;
  label?: string;
  addClientHref?: string;
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return [];
    const qDigits = digitsOnly(query);
    return clients
      .filter((c) => {
        if (normalizeText(c.name).includes(q)) return true;
        if (qDigits && c.phone && digitsOnly(c.phone).includes(qDigits)) return true;
        return false;
      })
      .slice(0, 10);
  }, [clients, query]);

  if (value) {
    return (
      <div className="field">
        <label>{label}</label>
        <div className="chosen picker">
          <span className="name">{value.name}</span>
          <span className="muted">{value.phone ?? 'sin teléfono'}</span>
          <span className="picker-spacer" aria-hidden="true" />
          <button
            type="button"
            className="link"
            onClick={() => {
              onChange(null);
              setQuery('');
            }}
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="field picker">
      <label htmlFor="client-search">{label}</label>
      <input
        id="client-search"
        type="search"
        autoComplete="off"
        placeholder="Nombre o teléfono…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query && matches.length > 0 ? (
        <div className="results">
          {matches.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                onChange(client);
                setQuery('');
              }}
            >
              {client.name}
              {client.phone ? <span className="muted"> · {client.phone}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {query && matches.length === 0 ? (
        <p className="muted">
          Ningún cliente coincide.{' '}
          {addClientHref ? <a href={addClientHref}>Añadir cliente nuevo</a> : null}
        </p>
      ) : null}
    </div>
  );
}
