import { eliminarCodigoAction } from './actions';
import NuevoCodigoForm from './nuevo-codigo-form';
import { markCodigoRetiradoAction } from '../actions';
import Shell from '../shell';
import DeleteRowForm from '../components/delete-row-form';
import { requiresDniReminder } from '@/lib/banks';
import { fmtDateTimeShort, fmtEur } from '@/lib/format';
import { listClients, listCodigos, listOpenSendings } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function CodigosPage() {
  const [clients, codigos, openSendings] = await Promise.all([
    listClients(),
    listCodigos(),
    listOpenSendings(),
  ]);

  return (
    <Shell>
      <h1>Códigos</h1>

      <NuevoCodigoForm clients={clients} openSendings={openSendings} />

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
                  <th>Datos</th>
                  <th>Banco</th>
                  <th>Envío</th>
                  <th>Estado</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {codigos.map((c) => (
                  <tr key={c.id} className={`row-${c.status}`}>
                    <td>{fmtDateTimeShort(c.created_at)}</td>
                    <td>{c.client_name}</td>
                    <td>
                      {/*
                        Caixa withdrawals ask phone -> código -> DNI, in that order; every other
                        bank asks código -> phone -> amount and never needs the DNI on screen.
                      */}
                      {requiresDniReminder(c.bank) ? (
                        <>
                          Tel {c.client_phone ?? '—'} · Cód {c.code || '—'} · DNI{' '}
                          {c.client_dni_nie ?? '—'}
                          <span className="muted"> · {fmtEur(c.amount)}</span>
                        </>
                      ) : (
                        <>
                          Cód {c.code || '—'} · Tel {c.client_phone ?? '—'} · {fmtEur(c.amount)}
                        </>
                      )}
                    </td>
                    <td>{c.bank}</td>
                    <td>
                      {/*
                        The sending this codigo paid for, when there is one. The
                        client is named even though it is usually the same one:
                        a codigo can be linked from /envios to a sending logged
                        under a relative's name, and that is the case worth
                        seeing.
                      */}
                      {c.sending_id === null ? (
                        <span className="muted">—</span>
                      ) : (
                        <>
                          {c.sending_client_name}
                          <span className="muted">
                            {' · '}
                            {c.sending_amount_eur === null ? '' : fmtEur(c.sending_amount_eur)}
                          </span>
                        </>
                      )}
                    </td>
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
                        <span className="muted">{fmtDateTimeShort(c.retired_at)}</span>
                      )}
                    </td>
                    <td>
                      <DeleteRowForm id={c.id} action={eliminarCodigoAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          Un código vinculado a un envío es la prueba de que el cliente pagó ese envío. Si lo
          eliminas, ese envío vuelve a quedar sin cobrar.
        </p>
      </div>
    </Shell>
  );
}
