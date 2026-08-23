import NuevaCompraForm from './nueva-compra-form';
import Shell from '../shell';
import { isBackordered, isDepleted } from '@/lib/fifo';
import { fmtDateTime, fmtEur, fmtRate, fmtUsdt } from '@/lib/format';
import { listPurchases } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const purchases = await listPurchases();
  const balance = purchases.reduce((total, p) => total + p.remaining_usdt, 0);

  return (
    <Shell>
      <h1>Compras de cripto</h1>

      <div className={balance < 0 ? 'stat negative' : 'stat'}>
        <div className="label">Saldo del pool</div>
        <div className="value">{fmtUsdt(balance)}</div>
      </div>

      <NuevaCompraForm />

      <div className="panel">
        <h2>Todas las compras ({purchases.length})</h2>
        {purchases.length === 0 ? (
          <p className="muted">Todavía no hay compras.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th className="num">EUR pagados</th>
                  <th className="num">USDT recibidos</th>
                  <th className="num">Precio EUR/USDT</th>
                  <th className="num">Disponible</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const depleted = isDepleted(p.remaining_usdt);
                  const backorder = isBackordered(p.remaining_usdt);
                  return (
                    <tr key={p.id} className={depleted && !backorder ? 'depleted' : undefined}>
                      <td>{fmtDateTime(p.purchased_at)}</td>
                      <td>{p.provider ?? '—'}</td>
                      <td className="num">{fmtEur(p.eur_paid)}</td>
                      <td className="num">{fmtUsdt(p.usdt_received)}</td>
                      <td className="num">{fmtRate(p.price_eur_per_usdt)}</td>
                      <td className="num" style={backorder ? { color: '#8a1c1c', fontWeight: 700 } : undefined}>
                        {fmtUsdt(p.remaining_usdt)}
                      </td>
                      <td>
                        {backorder ? (
                          <span className="badge" style={{ background: '#fde7e7', borderColor: '#c94b4b', color: '#8a1c1c' }}>
                            en negativo
                          </span>
                        ) : depleted ? (
                          <span className="badge">agotado</span>
                        ) : (
                          <span className="badge paid">activo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          Los lotes agotados se quedan aquí en gris: son el historial de costos de los envíos que
          ya salieron.
        </p>
      </div>
    </Shell>
  );
}
