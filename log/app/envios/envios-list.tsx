'use client';

import { eliminarEnvioAction } from './actions';
import ClientPaidActions, { type PickerCodigo } from '../components/client-paid-actions';
import DeleteRowForm from '../components/delete-row-form';
import EditSendingForm from '../components/edit-sending-form';
import LedgerList from '../components/ledger-list';
import PaySendingActions from '../components/pay-sending-actions';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
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

export default function EnviosList({
  sendings,
  unlinkedCodigos,
}: {
  sendings: Sending[];
  unlinkedCodigos: PickerCodigo[];
}) {
  const renderFull = (s: Sending) => (
    <tr className={`row-${s.status}`}>
      <td data-label="Cliente" data-lead>
        {s.client_name}
      </td>
      <td className="num" data-label="EUR">
        {fmtEur(s.amount_eur)}
      </td>
      <td className="num" data-label="Tasa">
        {fmtRate(s.rate_tasa)}
      </td>
      <td className="num" data-label="Bs a pagar" data-wide data-money>
        {fmtVes(s.amount_ves_to_pay)}
      </td>
      <td data-label="Fecha">{fmtDateTime(s.created_at)}</td>
      <td data-label="Estado">
        <span className={`badge ${s.status}`}>
          {s.status === 'paid' ? 'pagado' : 'pendiente'}
        </span>
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
      <td data-label="Cobrado" data-wide data-sep>
        {s.client_paid_at === null ? (
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
          {s.status === 'pending' ? <PaySendingActions sendingId={s.id} /> : null}
          {s.client_paid_at === null ? (
            <ClientPaidActions sendingId={s.id} clientId={s.client_id} codigos={unlinkedCodigos} />
          ) : null}
          <EditSendingForm sending={s} />
          <DeleteRowForm id={s.id} action={eliminarEnvioAction} />
        </div>
      </td>
    </tr>
  );

  return (
    <LedgerList
      items={sendings}
      getId={(s) => s.id}
      getDate={(s) => s.created_at}
      getSearchText={(s) => `${s.client_name} ${s.client_payment_note ?? ''} ${s.payout_method}`}
      getTerse={(s) => ({
        time: fmtDateTime(s.created_at),
        title: s.client_name,
        value: fmtEur(s.amount_eur),
        badge: (
          <span className={`badge ${s.status}`}>
            {s.status === 'paid' ? 'pagado' : 'pendiente'}
          </span>
        ),
      })}
      rowClass={(s) => `row-${s.status}`}
      head={HEAD}
      renderFull={renderFull}
      searchLabel="Cliente"
    />
  );
}
