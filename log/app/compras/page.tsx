import { eliminarCompraAction } from './actions';
import NuevaCompraForm from './nueva-compra-form';
import Shell from '../shell';
import DeleteRowForm from '../components/delete-row-form';
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
                  <th className="actions-heading">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const depleted = isDepleted(p.remaining_usdt);
                  const backorder = isBackordered(p.remaining_usdt);
                  return (
                    <tr key={p.id} className={depleted && !backorder ? 'depleted' : undefined}>
                      <td data-label="Fecha">{fmtDateTime(p.purchased_at)}</td>
                      {/* Optional free text: on a phone an unnamed provider is no field at all. */}
                      <td data-label="Proveedor" data-wide data-empty={p.provider ? undefined : true}>
                        {p.provider ?? '—'}
                      </td>
                      <td className="num" data-label="EUR pagados">
                        {fmtEur(p.eur_paid)}
                      </td>
                      <td className="num" data-label="USDT recibidos">
                        {fmtUsdt(p.usdt_received)}
                      </td>
                      <td className="num" data-label="Precio EUR/USDT">
                        {fmtRate(p.price_eur_per_usdt)}
                      </td>
                      <td
                        className={backorder ? 'num backorder' : 'num'}
                        data-label="Disponible"
                      >
                        {fmtUsdt(p.remaining_usdt)}
                      </td>
                      <td data-label="Estado">
                        {backorder ? (
                          <span className="badge negative">
                            en negativo
                          </span>
                        ) : depleted ? (
                          <span className="badge">agotado</span>
                        ) : (
                          <span className="badge paid">activo</span>
                        )}
                      </td>
                      <td data-label="Acciones" data-wide data-actions>
                        <DeleteRowForm id={p.id} action={eliminarCompraAction} />
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
