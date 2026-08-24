import { eliminarVentaAction } from './actions';
import NuevaVentaForm from './nueva-venta-form';
import Shell from '../shell';
import DeleteRowForm from '../components/delete-row-form';
import { isBackordered, isDepleted } from '@/lib/fifo';
import { fmtDateTime, fmtRate, fmtUsdt, fmtVes } from '@/lib/format';
import { listVesSales } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function VentasPage() {
  const sales = await listVesSales();
  const balance = sales.reduce((total, s) => total + s.remaining_ves, 0);

  return (
    <Shell>
      <h1>Ventas en Binance (pool de bolívares)</h1>

      <div className={balance < 0 ? 'stat negative' : 'stat'}>
        <div className="label">Bolívares disponibles en tu cuenta</div>
        <div className="value">{fmtVes(balance)}</div>
      </div>

      <NuevaVentaForm />

      <div className="panel">
        <h2>Todas las ventas ({sales.length})</h2>
        {sales.length === 0 ? (
          <p className="muted">Todavía no hay ventas.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="num">USDT vendidos</th>
                  <th className="num">Bs recibidos</th>
                  <th className="num">Precio Bs/USDT</th>
                  <th className="num">Disponible</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const depleted = isDepleted(s.remaining_ves);
                  const backorder = isBackordered(s.remaining_ves);
                  return (
                    <tr key={s.id} className={depleted && !backorder ? 'depleted' : undefined}>
                      <td data-label="Fecha">{fmtDateTime(s.sold_at)}</td>
                      <td className="num" data-label="USDT vendidos">
                        {fmtUsdt(s.usdt_sold)}
                      </td>
                      <td className="num" data-label="Bs recibidos">
                        {fmtVes(s.ves_received)}
                      </td>
                      <td className="num" data-label="Precio Bs/USDT">
                        {fmtRate(s.price_ves_per_usdt)}
                      </td>
                      <td
                        className={backorder ? 'num backorder' : 'num'}
                        data-label="Disponible"
                      >
                        {fmtVes(s.remaining_ves)}
                      </td>
                      <td data-label="Estado">
                        {backorder ? (
                          <span className="badge negative">
                            en negativo
                          </span>
                        ) : depleted ? (
                          <span className="badge">agotada</span>
                        ) : (
                          <span className="badge paid">activa</span>
                        )}
                      </td>
                      <td data-label="Acciones" data-wide>
                        <DeleteRowForm id={s.id} action={eliminarVentaAction} />
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
