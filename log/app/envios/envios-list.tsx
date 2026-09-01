'use client';

import { Fragment } from 'react';

import { eliminarEnvioAction } from './actions';
import ClientPaidActions, { type PickerCodigo } from '../components/client-paid-actions';
import DeleteRowForm from '../components/delete-row-form';
import EditSendingForm from '../components/edit-sending-form';
import LedgerList from '../components/ledger-list';
import PaySendingActions from '../components/pay-sending-actions';
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
}: {
  sendings: Sending[];
  unlinkedCodigos: PickerCodigo[];
  /** Stable server-render instant so the Madrid-day colour cannot hydration-drift. */
  now: string;
}) {
  const incomplete = sendings
    .filter((s) => sendingPaymentState(s, now) !== 'complete')
    .sort((a, b) => a.created_at.getTime() - b.created_at.getTime() || a.id - b.id);
  const complete = sendings.filter((s) => sendingPaymentState(s, now) === 'complete');

  const renderFull = (s: Sending) => {
    const paymentState = sendingPaymentState(s, now);
    return (
      <tr className={sendingPaymentRowClass(s, now)}>
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
      */}
      <td className="num" data-label="Bs a pagar" data-wide data-money>
        <span className="payout-amount">{fmtVes(s.amount_ves_to_pay)}</span>
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
      <td data-label="Pagado vía" data-empty={s.paid_via === null ? true : undefined}>
        {s.paid_via === 'pool' ? 'pool' : s.paid_via === 'direct' ? 'directo' : '—'}
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
        data-wide
        data-empty={s.client_payment_note ? undefined : true}
      >
        {s.client_payment_note ?? '—'}
      </td>
      <td className="num" data-label="USDT" data-empty={s.usdt_used === null ? true : undefined}>
        {s.usdt_used === null ? '—' : fmtUsdt(s.usdt_used)}
      </td>
      <td className="num" data-label="Costo" data-empty={s.cost_eur === null ? true : undefined}>
        {s.cost_eur === null ? '—' : fmtEur(s.cost_eur)}
      </td>
      <td
        className="num"
        data-label="Ganancia"
        data-empty={s.profit_eur === null ? true : undefined}
      >
        {s.profit_eur === null ? '—' : fmtEur(s.profit_eur)}
      </td>
      <td data-label="Acciones" data-wide data-actions>
        <div className="row-actions">
          {s.status === 'pending' ? (
            <PaySendingActions sendingId={s.id} isPersonal={s.is_personal} />
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
      {incomplete.length > 0 ? (
        <div className="ledger">
          <section className="ledger-day">
            <h3 className="ledger-day-heading">
              Pendientes de pago <span className="ledger-day-count">{incomplete.length}</span>
            </h3>
            <div className="table-wrap">
              <table>
                <thead>{HEAD}</thead>
                <tbody>
                  {incomplete.map((s) => (
                    <Fragment key={s.id}>{renderFull(s)}</Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
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
              <span className="payout-amount">{fmtVes(s.amount_ves_to_pay)}</span>
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
        renderFull={renderFull}
        searchLabel="Cliente"
      />
    </>
  );
}
