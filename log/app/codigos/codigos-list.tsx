'use client';

import { useState } from 'react';

import { eliminarCodigoAction } from './actions';
import { markCodigoRetiradoAction } from '../actions';
import DeleteRowForm from '../components/delete-row-form';
import LedgerList from '../components/ledger-list';
import { requiresDniReminder } from '@/lib/banks';
import { fmtDateTimeShort, fmtEur, fmtRate, fmtVes } from '@/lib/format';
import type { Codigo } from '@/lib/types';

/** Matches the number of <th> below: the linked-sending panel spans the card. */
const COLUMNS = 8;

const HEAD = (
  <tr>
    <th>Cliente</th>
    <th>Datos</th>
    <th>Banco</th>
    <th>Fecha</th>
    <th>Estado</th>
    <th>Envío</th>
    <th className="actions-heading">Retiro</th>
    <th className="actions-heading">Acciones</th>
  </tr>
);

/**
 * Every código, with the ones still waiting on a retiro pinned above the log.
 *
 * The day compression underneath is right for a record of what happened: today
 * in full, one older day folded up, the rest behind a search. A pendiente
 * código is not a record, it is an open task — and the day it was issued says
 * nothing about whether Jose still has to do something about it. Left in the
 * buckets, a código from three days ago disappears into the archive while the
 * money is still sitting in the bank, so pendientes come out of the buckets
 * entirely and are shown in full, oldest first, the same order and for the same
 * reason as listPendingCodigos on the dashboard.
 *
 * The split is what stops a código appearing twice: LedgerList only ever sees
 * the retirados.
 */
export default function CodigosList({ codigos }: { codigos: Codigo[] }) {
  const pending = codigos
    .filter((c) => c.status === 'pendiente')
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime() || a.id - b.id);
  const resolved = codigos.filter((c) => c.status !== 'pendiente');

  return (
    <>
      {pending.length > 0 ? (
        <div className="ledger">
          <section className="ledger-day">
            <h3 className="ledger-day-heading">
              Pendientes de retiro <span className="ledger-day-count">{pending.length}</span>
            </h3>
            <div className="table-wrap">
              <table>
                <thead>{HEAD}</thead>
                <tbody>
                  {pending.map((c) => (
                    <CodigoRow key={c.id} codigo={c} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <LedgerList
        items={resolved}
        getId={(c) => c.id}
        getDate={(c) => c.created_at}
        getSearchText={(c) => `${c.client_name} ${c.code} ${c.bank} ${c.sending_client_name ?? ''}`}
        getTerse={(c) => ({
          time: fmtDateTimeShort(c.created_at),
          title: c.client_name,
          value: fmtEur(c.amount),
          meta: c.bank,
          badge: <span className={`badge ${c.status}`}>{c.status}</span>,
        })}
        rowClass={(c) => `row-${c.status}`}
        head={HEAD}
        renderFull={(c) => <CodigoRow codigo={c} />}
        searchLabel="Cliente o código"
      />
    </>
  );
}

/**
 * One codigo, and the sending it paid for folded up underneath it.
 *
 * The link used to spell the sending's client out in full, right next to the
 * codigo's own client, which is the same name nearly every time. What is worth
 * seeing is the sending itself — its monto, its tasa, what it owes in bolivares
 * — so the cell is now a button that opens exactly that, without leaving the
 * page. The name is only repeated in the one case it is not a repetition: a
 * codigo linked from /envios to a sending logged under a relative's name.
 */
function CodigoRow({ codigo: c }: { codigo: Codigo }) {
  const [showSending, setShowSending] = useState(false);
  const linked = c.sending_id !== null;
  const otherName = c.sending_client_name !== null && c.sending_client_name !== c.client_name;

  return (
    <>
      <tr className={`row-${c.status}`}>
        <td data-label="Cliente" data-lead>
          {c.client_name}
        </td>
        <td data-label="Datos" data-wide>
          {/*
            Caixa withdrawals ask phone -> código -> DNI, in that order; every other
            bank asks código -> phone -> amount and never needs the DNI on screen.

            A dash here is not an empty field but a missing one: it is the thing
            Jose still has to ask the client for before the money can be taken out.
          */}
          {requiresDniReminder(c.bank) ? (
            <>
              Tel {c.client_phone ?? '—'} · Cód {c.code || '—'} · DNI {c.client_dni_nie ?? '—'}
              <span className="muted"> · {fmtEur(c.amount)}</span>
            </>
          ) : (
            <>
              Cód {c.code || '—'} · Tel {c.client_phone ?? '—'} · {fmtEur(c.amount)}
            </>
          )}
        </td>
        <td data-label="Banco">{c.bank}</td>
        <td data-label="Fecha">{fmtDateTimeShort(c.created_at)}</td>
        <td data-label="Estado">
          <span className={`badge ${c.status}`}>{c.status}</span>
        </td>
        <td data-label="Envío">
          {linked ? (
            <button
              className="small secondary sending-link"
              type="button"
              aria-expanded={showSending}
              onClick={() => setShowSending((open) => !open)}
            >
              <span aria-hidden="true">↗</span>
              <span className="sr-only">Ver el envío vinculado</span>
            </button>
          ) : (
            <span className="badge sin-cobrar">sin vincular</span>
          )}
        </td>
        <td className="num" data-label="Retiro" data-wide data-actions>
          {c.status === 'pendiente' ? (
            <form action={markCodigoRetiradoAction}>
              <input type="hidden" name="id" value={c.id} />
              <button className="small action-success" type="submit">
                Marcar retirado
              </button>
            </form>
          ) : (
            <span className="muted">{fmtDateTimeShort(c.retired_at)}</span>
          )}
        </td>
        <td data-label="Acciones" data-wide data-actions>
          <DeleteRowForm id={c.id} action={eliminarCodigoAction} />
        </td>
      </tr>

      {linked && showSending ? (
        <tr className="linked-sending">
          <td data-label="Envío vinculado" data-wide colSpan={COLUMNS}>
            <dl className="linked-sending-fields">
              {otherName ? (
                <div>
                  <dt>Cliente del envío</dt>
                  <dd>{c.sending_client_name}</dd>
                </div>
              ) : null}
              <div>
                <dt>Monto</dt>
                <dd>{c.sending_amount_eur === null ? '—' : fmtEur(c.sending_amount_eur)}</dd>
              </div>
              <div>
                <dt>Tasa</dt>
                <dd>{c.sending_rate_tasa === null ? '—' : fmtRate(c.sending_rate_tasa)}</dd>
              </div>
              <div>
                <dt>Bs a pagar</dt>
                <dd>
                  {c.sending_amount_ves_to_pay === null
                    ? '—'
                    : fmtVes(c.sending_amount_ves_to_pay)}
                </dd>
              </div>
              <div>
                <dt>Método</dt>
                <dd>{c.sending_payout_method ?? '—'}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {c.sending_status === null ? (
                    '—'
                  ) : (
                    <span className={`badge ${c.sending_status}`}>
                      {c.sending_status === 'paid' ? 'pagado' : 'pendiente'}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
