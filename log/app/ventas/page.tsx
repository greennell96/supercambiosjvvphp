import { eliminarVentaAction } from './actions';
import NuevaVentaForm from './nueva-venta-form';
import SettleEurForm from './settle-eur-form';
import Shell from '../shell';
import DeleteRowForm from '../components/delete-row-form';
import { isBackordered, isDepleted } from '@/lib/fifo';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import { listVesSales } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function VentasPage() {
  const sales = await listVesSales();
  const balance = sales.reduce((total, s) => total + s.remaining_ves, 0);

  return (
    <Shell>
      <h1>Ventas · pool de bolívares</h1>

      <div className={balance < 0 ? 'stat negative' : 'stat'}>
        <div className="label">Bolívares disponibles en tu cuenta</div>
        <div className="value">{fmtVes(balance)}</div>
      </div>

      <NuevaVentaForm />

      <div className="panel">
        <h2>Movimientos ({sales.length})</h2>
        {sales.length === 0 ? (
          <p className="muted">Todavía no hay entradas.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th className="num">Entregado</th>
                  <th className="num">Bs recibidos</th>
                  <th className="num">Tasa</th>
                  <th>Cliente / comentario</th>
                  <th>Pago EUR</th>
                  <th className="num">Disponible</th>
                  <th className="actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const depleted = isDepleted(s.remaining_ves);
                  const backorder = isBackordered(s.remaining_ves);
                  const directEur = s.source_type === 'ves_to_eur';
                  return (
                    <tr key={s.id} className={depleted && !backorder ? 'depleted' : undefined}>
                      <td data-label="Fecha">{fmtDateTime(s.sold_at)}</td>
                      <td data-label="Origen">
                        {directEur ? 'VES → EUR' : 'Binance'}
                      </td>
                      <td className="num" data-label="Entregado">
                        {directEur ? fmtEur(s.eur_amount ?? 0) : fmtUsdt(s.usdt_sold ?? 0)}
                      </td>
                      <td className="num" data-label="Bs recibidos">
                        {fmtVes(s.ves_received)}
                      </td>
                      <td className="num" data-label="Tasa">
                        {directEur
                          ? `${fmtRate(s.ves_received / (s.eur_amount ?? 1))} Bs/EUR`
                          : `${fmtRate(s.price_ves_per_usdt ?? 0)} Bs/USDT`}
                      </td>
                      <td data-label="Cliente / comentario">{s.note || '—'}</td>
                      <td data-label="Pago EUR" data-wide={directEur ? true : undefined}>
                        {directEur ? (
                          s.eur_settled_at ? (
                            <span className="badge paid">pagado</span>
                          ) : (
                            <div className="settlement-actions">
                              <span className="badge pending">pendiente</span>
                              <SettleEurForm id={s.id} />
                            </div>
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={backorder ? 'num backorder' : 'num'} data-label="Disponible">
                        <div className="inventory-cell">
                          <span>{fmtVes(s.remaining_ves)}</span>
                          {backorder ? (
                            <span className="badge negative">en negativo</span>
                          ) : depleted ? (
                            <span className="badge">agotada</span>
                          ) : (
                            <span className="badge paid">activa</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Acciones" data-wide>
                        <div className="venta-actions">
                          <DeleteRowForm id={s.id} action={eliminarVentaAction} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
