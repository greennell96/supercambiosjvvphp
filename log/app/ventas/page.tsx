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
          <VentasList sales={sales} />
        )}
      </div>
    </Shell>
  );
}
