import { eliminarEnvioAction } from './actions';
import NuevoEnvioForm from './nuevo-envio-form';
import Shell from '../shell';
import ClientPaidActions from '../components/client-paid-actions';
import DeleteRowForm from '../components/delete-row-form';
import EditSendingForm from '../components/edit-sending-form';
import PaySendingActions from '../components/pay-sending-actions';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import { getRates, listClients, listSendings, listUnlinkedCodigos } from '@/lib/queries';
import { CLIENT_PAYMENT_METHOD_LABELS } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EnviosPage() {
  const [clients, sendings, rates, unlinkedCodigos] = await Promise.all([
    listClients(),
    listSendings(),
    getRates(),
    listUnlinkedCodigos(),
  ]);

  return (
    <Shell>
      <h1>Envíos</h1>

      <NuevoEnvioForm clients={clients} suggestedTasa={rates.tasa_eur_ves} />

      <div className="panel">
        <h2>Todos los envíos ({sendings.length})</h2>
        {sendings.length === 0 ? (
          <p className="muted">Todavía no hay envíos.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th className="num">EUR</th>
                  <th className="num">Tasa</th>
                  <th className="num">Bs a pagar</th>
                  <th>Método</th>
                  <th>Cobrado</th>
                  <th>Cómo pagó</th>
                  <th>Pagado vía</th>
                  <th className="num">USDT</th>
                  <th className="num">Costo</th>
                  <th className="num">Ganancia</th>
                  <th>Estado</th>
                  <th className="actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sendings.map((s) => (
                  <tr key={s.id} className={`row-${s.status}`}>
                    <td data-label="Fecha">{fmtDateTime(s.created_at)}</td>
                    <td data-label="Cliente" data-wide>
                      {s.client_name}
                    </td>
                    <td className="num" data-label="EUR">
                      {fmtEur(s.amount_eur)}
                    </td>
                    <td className="num" data-label="Tasa">
                      {fmtRate(s.rate_tasa)}
                    </td>
                    <td className="num" data-label="Bs a pagar">
                      {fmtVes(s.amount_ves_to_pay)}
                    </td>
                    <td data-label="Método">{s.payout_method}</td>
                    {/*
                      The CLIENT's side, and its own words on purpose: "cobrado"
                      vs "sin cobrar" against the "pagado"/"pendiente" badge
                      further along the same row, in blue and grey against that
                      one's amber and green. The two answer different questions
                      and must never be read for each other at a glance.
                    */}
                    <td data-label="Cobrado">
                      {s.client_paid_at === null ? (
                        <span className="badge sin-cobrar">sin cobrar</span>
                      ) : (
                        <>
                          <span className="badge cobrado">cobrado</span>
                          {s.client_payment_method ? (
                            <span className="muted">
                              {' '}
                              {CLIENT_PAYMENT_METHOD_LABELS[s.client_payment_method]}
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td data-label="Cómo pagó">{s.client_payment_note ?? '—'}</td>
                    <td data-label="Pagado vía">
                      {s.paid_via === 'pool' ? 'pool' : s.paid_via === 'direct' ? 'directo' : '—'}
                      {s.fee_applied ? <span className="muted"> +0,3%</span> : null}
                    </td>
                    <td className="num" data-label="USDT">
                      {s.usdt_used === null ? '—' : fmtUsdt(s.usdt_used)}
                    </td>
                    <td className="num" data-label="Costo">
                      {s.cost_eur === null ? '—' : fmtEur(s.cost_eur)}
                    </td>
                    <td className="num" data-label="Ganancia">
                      {s.profit_eur === null ? '—' : fmtEur(s.profit_eur)}
                    </td>
                    <td data-label="Estado">
                      <span className={`badge ${s.status}`}>
                        {s.status === 'paid' ? 'pagado' : 'pendiente'}
                      </span>
                    </td>
                    <td data-label="Acciones" data-wide>
                      <div className="row-actions">
                        {s.status === 'pending' ? <PaySendingActions sendingId={s.id} /> : null}
                        {s.client_paid_at === null ? (
                          <ClientPaidActions
                            sendingId={s.id}
                            clientId={s.client_id}
                            codigos={unlinkedCodigos}
                          />
                        ) : null}
                        <EditSendingForm sending={s} />
                        <DeleteRowForm id={s.id} action={eliminarEnvioAction} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
