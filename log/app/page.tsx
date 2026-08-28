import { markCodigoRetiradoAction } from './actions';
import RatesForm from './rates-form';
import Shell from './shell';
import EditSendingForm from './components/edit-sending-form';
import PaySendingActions from './components/pay-sending-actions';
import { requiresDniReminder } from '@/lib/banks';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import {
  getDashboardTotals,
  getRates,
  listPendingCodigos,
  listPendingSendings,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [totals, rates, pendingSendings, pendingCodigos] = await Promise.all([
    getDashboardTotals(),
    getRates(),
    listPendingSendings(),
    listPendingCodigos(),
  ]);

  const cryptoNegative = totals.cryptoBalanceUsdt < 0;
  const vesNegative = totals.vesPoolBalance < 0;
  // What is owed minus what is on hand: the gap he still has to sell for.
  const gap = totals.bolivaresPendientes - totals.vesPoolBalance;

  return (
    <Shell>
      <h1>Resumen</h1>

      <div className="grid2">
        <div className={cryptoNegative ? 'stat negative' : 'stat'}>
          <div className="label">Cripto (USDT) disponible</div>
          <div className="value">{fmtUsdt(totals.cryptoBalanceUsdt)}</div>
          {cryptoNegative ? (
            <div className="muted" style={{ color: 'inherit' }}>
              Saldo negativo: USDT gastado que aún no has comprado.
            </div>
          ) : null}
        </div>

        <div className={vesNegative ? 'stat negative' : 'stat'}>
          <div className="label">VES en tu cuenta (pool)</div>
          <div className="value">{fmtVes(totals.vesPoolBalance)}</div>
          {vesNegative ? (
            <div className="muted" style={{ color: 'inherit' }}>
              Saldo negativo: bolívares pagados que ninguna venta cubre todavía.
            </div>
          ) : null}
        </div>

        <div className="stat">
          <div className="label">Bolívares pendientes de pagar</div>
          <div className="value">{fmtVes(totals.bolivaresPendientes)}</div>
          <div className="muted">
            {totals.pendingSendingsCount} envío(s) sin pagar
            {gap > 0 ? ` · te faltan ${fmtVes(gap)} por vender` : ' · el pool los cubre'}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Envíos pendientes ({pendingSendings.length})</h2>
        {pendingSendings.length === 0 ? (
          <p className="muted">Nada pendiente.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">EUR</th>
                  <th className="num">Tasa</th>
                  <th className="num">Bs a pagar</th>
                  <th>Método</th>
                  <th>Fecha</th>
                  <th>Cómo pagó</th>
                  <th className="actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingSendings.map((s) => (
                  <tr key={s.id} className="row-pending">
                    {/*
                      An envío propio is pending like any other — the bolívares
                      are really owed and really come out of the pool — but it
                      has no client EUR amount and no tasa, so those two cells
                      show a dash and the beneficiary note rides with the name.
                    */}
                    <td data-label="Cliente" data-lead>
                      {s.client_name}
                      {s.is_personal && s.personal_note ? (
                        <span className="muted"> — {s.personal_note}</span>
                      ) : null}
                    </td>
                    <td
                      className="num"
                      data-label="EUR"
                      data-empty={s.amount_eur === null ? true : undefined}
                    >
                      {s.amount_eur === null ? '—' : fmtEur(s.amount_eur)}
                    </td>
                    <td
                      className="num"
                      data-label="Tasa"
                      data-empty={s.rate_tasa === null ? true : undefined}
                    >
                      {s.rate_tasa === null ? '—' : fmtRate(s.rate_tasa)}
                    </td>
                    <td className="num" data-label="Bs a pagar" data-wide data-money>
                      <strong>{fmtVes(s.amount_ves_to_pay)}</strong>
                    </td>
                    <td data-label="Método">{s.payout_method}</td>
                    <td data-label="Fecha">{fmtDateTime(s.created_at)}</td>
                    <td
                      data-label="Cómo pagó"
                      data-wide
                      data-empty={s.client_payment_note ? undefined : true}
                    >
                      {s.client_payment_note ?? '—'}
                    </td>
                    <td data-label="Acciones" data-wide data-actions>
                      <div className="row-actions">
                        <PaySendingActions sendingId={s.id} isPersonal={s.is_personal} />
                        <EditSendingForm sending={s} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Códigos pendientes ({pendingCodigos.length})</h2>
        {pendingCodigos.length === 0 ? (
          <p className="muted">Nada pendiente.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Monto</th>
                  <th>Banco</th>
                  <th>Fecha</th>
                  <th className="actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingCodigos.map((c) => (
                  <tr key={c.id} className="row-pendiente">
                    <td data-label="Cliente" data-lead>
                      {c.client_name}
                      {requiresDniReminder(c.bank) && c.client_dni_nie ? (
                        <span className="muted"> · DNI {c.client_dni_nie}</span>
                      ) : null}
                    </td>
                    <td className="num" data-label="Monto" data-money>
                      {fmtEur(c.amount)}
                    </td>
                    <td data-label="Banco">{c.bank}</td>
                    <td data-label="Fecha">{fmtDateTime(c.created_at)}</td>
                    <td className="num" data-label="Acción" data-wide data-actions>
                      <form action={markCodigoRetiradoAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="small action-success" type="submit">
                          Marcar retirado
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Tasa sugerida</h2>
        <RatesForm tasa={rates.tasa_eur_ves} updatedAt={rates.updated_at} />
      </div>
    </Shell>
  );
}
