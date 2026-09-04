'use client';

import { Fragment, useMemo, useState } from 'react';

import { eliminarEnvioAction } from './actions';
import {
  ENVIOS_FILTERS,
  filterEnvios,
  type EnviosFilter,
  type EnviosSort,
  orderPendingEnvios,
  sortEnvios,
} from './envios-filters';
import styles from './envios.module.css';
import NuevoEnvioForm from './nuevo-envio-form';
import ClientPaidActions, { type PickerCodigo } from '../components/client-paid-actions';
import { type PickerClient } from '../components/client-picker';
import DeleteRowForm from '../components/delete-row-form';
import EditSendingForm from '../components/edit-sending-form';
import LedgerList from '../components/ledger-list';
import PaySendingActions from '../components/pay-sending-actions';
import type { Lot } from '@/lib/fifo';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import { sendingPaymentRowClass, sendingPaymentState } from '@/lib/sending-payment-state';
import { CLIENT_PAYMENT_METHOD_LABELS, type Sending } from '@/lib/types';

/*
  Column order is the card order: the client, then what he sent and what that
  owes in bolivares, then the two independent statuses, then what the payout
  actually cost. On a phone each <td> becomes a labelled field of one card and
  the empty ones drop out entirely — a sending nobody has paid yet has no
  "pagado vía", no USDT and no ganancia, and saying so four times in dashes is
  noise, not information.
*/
const HEAD = (
  <tr>
    <th>Cliente</th>
    <th className="num">EUR</th>
    <th className="num">Tasa</th>
    <th className="num">Bs a pagar</th>
    <th>Fecha</th>
    <th>Estado</th>
    <th>Método</th>
    <th>Pagado vía</th>
    <th>Cobrado</th>
    <th>Cómo pagó</th>
    <th className="num">USDT</th>
    <th className="num">Costo</th>
    <th className="num">Ganancia</th>
    <th className="actions-heading">Acciones</th>
  </tr>
);

/**
 * Every envío, with every row missing an applicable payment side pinned above.
 *
 * The same split /codigos makes, for the same reason. Compressing by day is
 * right for a record of what happened — hoy in full, one older day folded up,
 * the rest behind a search — but a pending envío is not a record, it is money
 * the beneficiary has not received yet, and the day it was logged says nothing
 * about whether Jose still owes it. Left in the buckets, an envío from three
 * days ago disappears into the archive while the bolívares are still owed. So
 * the incomplete rows come out of the buckets entirely and are shown in full,
 * oldest first. A row José paid but the client did not is still incomplete and
 * stays pinned; only both-paid client rows (or paid envíos propios) enter the log.
 *
 * The split is also what stops an envío appearing twice: LedgerList only ever
 * sees the pagados.
 */
export default function EnviosList({
  sendings,
  unlinkedCodigos,
  now,
  clients,
  suggestedTasa,
  usdtLots,
}: {
  sendings: Sending[];
  unlinkedCodigos: PickerCodigo[];
  /** Stable server-render instant so the Madrid-day colour cannot hydration-drift. */
  now: string;
  /*
    The creation form's three props, passed straight through. The form used to
    be a sibling of this component, mounted below the whole log; it now opens
    from the toolbar, so its open/closed state and this component's filters have
    to live in the same place — here, the only client component on the page that
    already owns state.
  */
  clients: PickerClient[];
  suggestedTasa: number;
  usdtLots: Lot[];
}) {
  const [filter, setFilter] = useState<EnviosFilter>('all');
  const [sort, setSort] = useState<EnviosSort>('oldest');
  const [creating, setCreating] = useState(false);

  const pendingRows = useMemo(
    () => orderPendingEnvios(filterEnvios(sendings, filter, now), sort),
    [filter, now, sendings, sort],
  );
  const complete = useMemo(
    () => sortEnvios(sendings.filter((s) => sendingPaymentState(s, now) === 'complete'), sort),
    [now, sendings, sort],
  );
  const pendingCounts = useMemo(
    () =>
      Object.fromEntries(
        ENVIOS_FILTERS.map(({ value }) => [value, filterEnvios(sendings, value, now).length]),
      ) as Record<EnviosFilter, number>,
    [now, sendings],
  );

  const renderFull = (s: Sending, pendingWorkspace = false) => {
    const paymentState = sendingPaymentState(s, now);
    return (
      <tr
        className={`${sendingPaymentRowClass(s, now)} ${styles.sendingRow}`}
        data-pending-row={pendingWorkspace ? 'true' : undefined}
      >
      {/*
        On an envío propio the client is the placeholder row, whose name already
        reads "Envío propio", and the note saying who received the money goes
        here beside it. Deliberately NOT under "Cómo pagó": that column means how
        the CLIENT handed Jose the money in Spain, which is the other direction
        entirely and the one distinction this table works hardest to keep.
      */}
      <td data-label="Cliente" data-lead>
        {s.client_name}
        {s.is_personal && s.personal_note ? (
          <span className="muted"> — {s.personal_note}</span>
        ) : null}
      </td>
      {/* Null, not zero: nobody agreed a EUR amount or a tasa on a propio. */}
      <td className="num" data-label="EUR" data-empty={s.amount_eur === null ? true : undefined}>
        {s.amount_eur === null ? '—' : fmtEur(s.amount_eur)}
      </td>
      <td className="num" data-label="Tasa" data-empty={s.rate_tasa === null ? true : undefined}>
        {s.rate_tasa === null ? '—' : fmtRate(s.rate_tasa)}
      </td>
      {/*
        The figure the whole row exists for: what Jose still owes over there.
        Coloured so it is found rather than read past — see .payout-amount, which
        is only ever this number. The cell's own attributes are untouched;
        data-money is the mobile card's sizing hook and says nothing about colour.

        Null, not zero, on an Envío USDT: no bolívares exist anywhere in that
        operation, and it must read exactly as empty as it is — see the USDT
        column further down for what a USDT row shows instead.
      */}
      <td
        className="num"
        data-label="Bs a pagar"
        data-wide
        data-money
        data-empty={s.amount_ves_to_pay === null ? true : undefined}
      >
        {s.amount_ves_to_pay === null ? (
          '—'
        ) : (
          <span className="payout-amount">{fmtVes(s.amount_ves_to_pay)}</span>
        )}
      </td>
      <td data-label="Fecha">{fmtDateTime(s.created_at)}</td>
      <td data-label="Estado">
        <span className={`badge ${s.status}`}>
          {s.status === 'paid' ? 'pagado' : 'pendiente'}
        </span>
        {paymentState === 'overdue' ? (
          <span className="badge negative sending-overdue-badge">sin pagos · atrasado</span>
        ) : null}
      </td>
      <td data-label="Método">{s.payout_method}</td>
      <td
        data-label="Pagado vía"
        data-secondary-accounting
        data-empty={s.paid_via === null ? true : undefined}
      >
        {s.paid_via === 'pool'
          ? 'pool'
          : s.paid_via === 'direct'
            ? 'directo'
            : s.paid_via === 'usdt'
              ? 'USDT'
              : '—'}
        {s.fee_applied ? <span className="muted"> +0,3%</span> : null}
      </td>
      {/*
        The CLIENT's side, and its own words on purpose: "cobrado" vs "sin
        cobrar" against the "pagado"/"pendiente" badge further up the same card,
        in blue and grey against that one's amber and green. The two answer
        different questions and must never be read for each other at a glance.
      */}
      <td
        data-label="Cobrado"
        data-wide
        data-sep
        data-empty={s.is_personal ? true : undefined}
      >
        {/*
          An envío propio has no client and therefore no debt: neither badge
          applies, and "sin cobrar" on one would read as money Jose is still
          owed. A dash, which the card layout drops entirely on a phone.
        */}
        {s.is_personal ? (
          '—'
        ) : s.client_paid_at === null ? (
          <span className="badge sin-cobrar">sin cobrar</span>
        ) : (
          <>
            <span className="badge cobrado">cobrado</span>
            {s.client_payment_method ? (
              <span className="muted"> {CLIENT_PAYMENT_METHOD_LABELS[s.client_payment_method]}</span>
            ) : null}
          </>
        )}
      </td>
      <td
        data-label="Cómo pagó"
        data-secondary-accounting
        data-wide
        data-empty={s.client_payment_note ? undefined : true}
      >
        {s.client_payment_note ?? '—'}
      </td>
      <td
        className="num"
        data-label="USDT"
        data-secondary-accounting
        data-empty={s.usdt_used === null && s.usdt_to_deliver === null ? true : undefined}
      >
        {s.usdt_used === null ? (
          s.usdt_to_deliver === null ? (
            '—'
          ) : (
            <>
              {/*
                A pending Envío USDT (migration 020): nothing has been drawn
                yet, so this is what José undertook to deliver, not what it
                cost — hence the muted suffix, same voice as the " +0,3%" and
                " €/USDT" suffixes below, so it reads as a qualifier and not a
                second number.
              */}
              {fmtUsdt(s.usdt_to_deliver)}
              <span className="muted"> a entregar</span>
            </>
          )
        ) : (
          <>
            {fmtUsdt(s.usdt_used)}
            {/*
              A price, never a tasa: an Envío USDT has no bolívares anywhere in
              it, so there is no VES/EUR rate to show — see the "Tasa" and "Bs a
              pagar" cells above, both dashes on this row. What it DOES have is
              a EUR/USDT price, and exactly like every price in lib/pools.ts it
              is derived from the two real amounts that changed hands rather
              than stored: amount_eur is never null on this kind of row (see
              migration 020), so this division is always safe here. Only shown
              once usdt_used is real — while pending there is no cost yet.
            */}
            {s.is_usdt && s.amount_eur !== null && s.usdt_used > 0 ? (
              <span className="muted"> · {fmtRate(s.amount_eur / s.usdt_used)} €/USDT</span>
            ) : null}
          </>
        )}
      </td>
      <td
        className="num"
        data-label="Costo"
        data-secondary-accounting
        data-empty={s.cost_eur === null ? true : undefined}
      >
        {s.cost_eur === null ? '—' : fmtEur(s.cost_eur)}
      </td>
      <td
        className="num"
        data-label="Ganancia"
        data-secondary-accounting
        data-empty={s.profit_eur === null ? true : undefined}
      >
        {s.profit_eur === null ? '—' : fmtEur(s.profit_eur)}
      </td>
      <td data-label="Acciones" data-wide data-actions>
        <div className={`row-actions ${styles.actionRail}`}>
          {s.status === 'pending' ? (
            <PaySendingActions sendingId={s.id} isPersonal={s.is_personal} isUsdt={s.is_usdt} />
          ) : null}
          {/* Nothing to collect on an envío propio; markClientPaid refuses one too. */}
          {!s.is_personal && s.client_paid_at === null ? (
            <ClientPaidActions sendingId={s.id} clientId={s.client_id} codigos={unlinkedCodigos} />
          ) : null}
          <EditSendingForm sending={s} />
          <DeleteRowForm id={s.id} action={eliminarEnvioAction} />
        </div>
      </td>
      </tr>
    );
  };

  return (
    <>
      <div className={styles.toolbar} role="toolbar" aria-label="Filtros y orden de envíos">
        <div className={styles.filterBlock}>
          <span className={styles.filterLabel}>Trabajo pendiente</span>
          <div className={styles.filterRow}>
            <div className={styles.filterButtons} role="group" aria-label="Filtrar pendientes">
              {ENVIOS_FILTERS.map(({ value, label }) => (
                <button
                  className={`${styles.filterButton} ${
                    filter === value ? styles.filterButtonActive : ''
                  }`}
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span className={styles.filterCount}>{pendingCounts[value]}</span>
                </button>
              ))}
            </div>
            {/*
              Deliberately OUTSIDE the filter group above: it is the one control
              here that does not filter anything, and putting it inside would
              announce it as a fifth filter to a screen reader. It sits beside
              them because that is where the work starts — logging an envío is
              the first thing José does on this page, and the form used to be
              below the entire log.
            */}
            <button
              className={styles.newSendingButton}
              type="button"
              aria-expanded={creating}
              onClick={() => setCreating((shown) => !shown)}
            >
              {creating ? 'Cerrar formulario' : 'Nuevo envío'}
            </button>
          </div>
        </div>
        <div className={styles.sortControl}>
          <label className={styles.sortLabel} htmlFor="envios-sort">
            Ordenar
          </label>
          <select
            id="envios-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as EnviosSort)}
          >
            <option value="oldest">Más antiguos primero</option>
            <option value="newest">Más recientes primero</option>
            <option value="amount">Mayor Bs primero</option>
          </select>
        </div>
      </div>

      <NuevoEnvioForm
        clients={clients}
        suggestedTasa={suggestedTasa}
        usdtLots={usdtLots}
        open={creating}
      />

      <section className={styles.pendingSection} aria-labelledby="pending-heading">
        <div className={styles.pendingHeader}>
          <h3 id="pending-heading">
            Pendientes <span className="ledger-day-count">{pendingRows.length}</span>
          </h3>
          <p>
            {filter === 'all'
              ? 'Cada envío aparece una vez; puede faltar uno o ambos pagos.'
              : 'Este filtro muestra solo la tarea elegida.'}
          </p>
        </div>
        {pendingRows.length > 0 ? (
          <div className="table-wrap" data-pending-workspace>
            <table>
              <thead>{HEAD}</thead>
              <tbody>
                {pendingRows.map((s) => (
                  <Fragment key={s.id}>{renderFull(s, true)}</Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.pendingEmpty}>
            {sendings.length === 0
              ? 'Todavía no hay envíos.'
              : filter === 'all'
                ? 'Todo al día. No hay pagos pendientes.'
                : 'No hay envíos en este filtro.'}
          </p>
        )}
      </section>

      {complete.length > 0 ? (
        <div className={styles.archiveHeading}>
          <h3>Registro cerrado</h3>
          <p>
            {complete.length} envío{complete.length === 1 ? '' : 's'} ya resuelto
            {complete.length === 1 ? '' : 's'}.
          </p>
        </div>
      ) : null}

      <LedgerList
        items={complete}
        getId={(s) => s.id}
        getDate={(s) => s.created_at}
        getSearchText={(s) =>
          [s.client_name, s.personal_note, s.client_payment_note, s.payout_method]
            .filter(Boolean)
            .join(' ')
        }
        getTerse={(s) => ({
          time: fmtDateTime(s.created_at),
          title:
            s.is_personal && s.personal_note
              ? `${s.client_name} — ${s.personal_note}`
              : s.client_name,
          // The one-line row shows what the sending is worth. On a propio that is
          // the bolívares: there is no EUR figure to show and no zero to imply.
          // Only that branch is coloured — the EUR one is what the client paid,
          // not what Jose owes, and .payout-amount means exactly the second.
          value:
            s.amount_eur === null ? (
              // This branch is an envío propio (an Envío USDT always has an
              // amount_eur), and a propio always has bolívares to pay — the
              // ?? 0 only satisfies the type, it is never actually reached.
              <span className="payout-amount">{fmtVes(s.amount_ves_to_pay ?? 0)}</span>
            ) : (
              fmtEur(s.amount_eur)
            ),
          badge: (
            <span className={`badge ${s.status}`}>
              {s.status === 'paid' ? 'pagado' : 'pendiente'}
            </span>
          ),
        })}
        rowClass={(s) => sendingPaymentRowClass(s, now)}
        head={HEAD}
        renderFull={(s) => renderFull(s)}
        searchLabel="Cliente"
      />
    </>
  );
}
