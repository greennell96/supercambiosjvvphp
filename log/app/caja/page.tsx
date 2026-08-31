import NuevaEntradaCajaForm from './nueva-entrada-form';
import Shell from '../shell';
import { buildCajaLedger, CAJA_SOURCE_LABELS, type CajaLedgerRow } from '@/lib/caja';
import { fmtDate, fmtEur } from '@/lib/format';
import { listCajaMovements } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * La caja: what is in Jose's pocket, and every movement that put it there.
 *
 * A journal, not a list of things that happened to involve cash. It reads the
 * way a cash book reads — one line per movement, newest first, each with its
 * signed amount and the balance as it stood after it — so that any figure on
 * screen can be checked by adding up the column above it.
 *
 * Nothing on this page is stored as a balance. Every line is derived live from
 * the row that is the source of truth for it, so a compra deleted on /compras or
 * a código corrected on /codigos changes this page by itself, with no reversal
 * step anywhere. See lib/caja.ts.
 */
export default async function CajaPage() {
  const { rows, balanceEur } = buildCajaLedger(await listCajaMovements());

  return (
    <Shell>
      <h1>Caja</h1>

      {/*
        Same headline box /compras gives the pool balance, and negative in red
        for the same reason it is there: a pool can legitimately go negative
        (a backorder), but a pocket cannot, so a red caja means something in the
        journal below is wrong and needs finding.
      */}
      <div className={balanceEur < 0 ? 'stat negative' : 'stat'}>
        <div className="label">Efectivo en caja</div>
        <div className="value">{fmtEur(balanceEur)}</div>
      </div>

      <NuevaEntradaCajaForm />

      <div className="panel">
        <h2>Libro de caja ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="muted">Todavía no hay movimientos.</p>
        ) : (
          <div className="table-wrap">
            <table className="caja-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th className="num">Monto</th>
                  <th className="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const detail = detailFor(row);
                  return (
                    // refId is only unique within its source, so the key needs both.
                    <tr key={`${row.source}-${row.refId}`}>
                      <td data-label="Fecha">{fmtDate(row.occurredAt)}</td>
                      <td data-label="Concepto" data-wide data-lead>
                        {CAJA_SOURCE_LABELS[row.source]}
                        {detail ? <div className="muted">{detail}</div> : null}
                      </td>
                      {/*
                        The sign is the whole message, so it is shown explicitly
                        and left uncoloured — the same call ConsolidacionTable
                        makes about its Diferencia column. Green and red here
                        would say "good" and "bad" about a compra and a cobro,
                        which are both simply normal.
                      */}
                      <td className="num caja-amount" data-label="Monto" data-money>
                        {row.amountEur > 0 ? '+' : ''}
                        {fmtEur(row.amountEur)}
                      </td>
                      <td
                        className={
                          row.balanceEur < 0 ? 'num caja-saldo negative-value' : 'num caja-saldo'
                        }
                        data-label="Saldo"
                      >
                        {fmtEur(row.balanceEur)}
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

/**
 * The second line under the concepto: which row this line was derived from.
 *
 * Built here rather than in lib/caja.ts because it is wording, and that module
 * hands over raw source keys on purpose. The reference is the id Jose can go and
 * look the row up by, which is the point of showing it at all.
 *
 * Two sources have nothing to add. A confirmed retiro is about the whole día
 * already named in the Fecha column, and the opening balance says everything it
 * has to say in its own label.
 */
function detailFor(row: CajaLedgerRow): string | null {
  switch (row.source) {
    case 'envio_efectivo':
      return row.note ? `Envío #${row.refId} · ${row.note}` : `Envío #${row.refId}`;
    case 'compra_usdt':
      return row.note ? `Compra #${row.refId} · ${row.note}` : `Compra #${row.refId}`;
    case 'ajuste':
      return row.note;
    default:
      return null;
  }
}
