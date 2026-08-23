import NuevoCodigoForm from './nuevo-codigo-form';
import { markCodigoRetiradoAction } from '../actions';
import Shell from '../shell';
import { requiresDniReminder } from '@/lib/banks';
import { fmtDateTime, fmtEur } from '@/lib/format';
import { listClients, listCodigos } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function CodigosPage() {
  const [clients, codigos] = await Promise.all([listClients(), listCodigos()]);

  return (
    <Shell>
      <h1>Códigos</h1>

      <NuevoCodigoForm clients={clients} />

      <div className="panel">
        <h2>Todos los códigos ({codigos.length})</h2>
        {codigos.length === 0 ? (
          <p className="muted">Todavía no hay códigos.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th className="num">Monto</th>
                  <th>Banco</th>
                  <th>DNI</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {codigos.map((c) => (
                  <tr key={c.id} className={`row-${c.status}`}>
                    <td>{fmtDateTime(c.created_at)}</td>
                    <td>{c.client_name}</td>
                    <td className="num">{fmtEur(c.amount)}</td>
                    <td>{c.bank}</td>
                    <td>{requiresDniReminder(c.bank) ? (c.client_dni_nie ?? '—') : ''}</td>
                    <td>
                      <span className={`badge ${c.status}`}>{c.status}</span>
                    </td>
                    <td className="num">
                      {c.status === 'pendiente' ? (
                        <form action={markCodigoRetiradoAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="small" type="submit">
                            Marcar retirado
                          </button>
                        </form>
                      ) : (
                        <span className="muted">{fmtDateTime(c.retired_at)}</span>
                      )}
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
