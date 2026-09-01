import NuevaVentaForm from './nueva-venta-form';
import VentasList from './ventas-list';
import Shell from '../shell';
import { fmtVes } from '@/lib/format';
import { listVesSales } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function VentasPage() {
  const sales = await listVesSales();
  const balance = sales.reduce((total, s) => total + s.remaining_ves, 0);

  return (
    <Shell>
      <header className="page-heading">
        <div>
          <h1>Ventas · pool de bolívares</h1>
          <p className="page-description">Entradas de bolívares y saldo disponible del pool.</p>
        </div>
        <p className="page-count">
          {sales.length} movimiento{sales.length === 1 ? '' : 's'}
        </p>
      </header>

      <div className={balance < 0 ? 'stat negative' : 'stat'}>
        <div className="label">Bolívares disponibles en tu cuenta</div>
        <div className="value">{fmtVes(balance)}</div>
      </div>

      <NuevaVentaForm />

      <div className="panel">
        <div className="panel-heading">
          <h2>Movimientos</h2>
          <span className="panel-count">
            {sales.length} movimiento{sales.length === 1 ? '' : 's'}
          </span>
        </div>
        {sales.length === 0 ? (
          <p className="muted">Todavía no hay entradas.</p>
        ) : (
          <VentasList sales={sales} />
        )}
      </div>
    </Shell>
  );
}
