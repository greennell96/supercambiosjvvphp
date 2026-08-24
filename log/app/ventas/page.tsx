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
                      <td>{fmtDateTime(s.sold_at)}</td>
                      <td className="num">{fmtUsdt(s.usdt_sold)}</td>
                      <td className="num">{fmtVes(s.ves_received)}</td>
                      <td className="num">{fmtRate(s.price_ves_per_usdt)}</td>
                      <td
                        className="num"
                        style={backorder ? { color: '#8a1c1c', fontWeight: 700 } : undefined}
                      >
                        {fmtVes(s.remaining_ves)}
                      </td>
                      <td>
                        {backorder ? (
                          <span
                            className="badge"
                            style={{
                              background: '#fde7e7',
                              borderColor: '#c94b4b',
                              color: '#8a1c1c',
                            }}
                          >
                            en negativo
                          </span>
                        ) : depleted ? (
                          <span className="badge">agotada</span>
                        ) : (
                          <span className="badge paid">activa</span>
                        )}
                      </td>
                      <td>
                        <DeleteRowForm id={s.id} action={eliminarVentaAction} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          Las ventas agotadas se quedan aquí en gris: son el historial de precios de los envíos
          que ya se pagaron.
        </p>
        <p className="muted">
          Solo se puede eliminar una venta intacta: si ya pagó un envío, hay que eliminar primero
          ese envío. Al eliminarla, los USDT que entregó vuelven a las compras de donde salieron.
        </p>
      </div>
    </Shell>
  );
}
