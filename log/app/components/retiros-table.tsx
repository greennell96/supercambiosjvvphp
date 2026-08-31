import ConfirmarRetiroForm from './confirmar-retiro-form';
import { buildRetiroRows, type RetiroDia } from '@/lib/caja';
import { fmtDayBucket, fmtEur } from '@/lib/format';

/**
 * La confirmación de retiros, as one table.
 *
 * Read left to right it says: this is what the códigos retirados that día were
 * worth, this is what Jose counted in his hand afterwards, and this is the gap.
 * The counted figure is the one that matters — it is what the caja is credited
 * with — and the system total is there so a wrong one is visible instead of
 * merely wrong.
 *
 * Four real consecutive days, deliberately unlike the cuadre next to it, which
 * is three days plus an all-time total. There is no total row here and there
 * should not be: an all-time sum of retiros would look like a balance and it is
 * not one — /caja is where the balance lives, and it counts a great deal more
 * than this.
 *
 * A día outside the window that was never confirmed is unreachable, on purpose.
 * See RETIRO_WINDOW_DAYS in lib/caja.ts.
 *
 * The diff is left uncoloured, the same call ConsolidacionTable makes and for
 * the same reason: its job is to say which side is short, by its sign, and it
 * does that better without competing with the badge beside it. The badge itself
 * is the health light — red on any difference, green when it cuadra — which is
 * José's explicit convention for a cuadre and not this app's usual reading of
 * red.
 *
 * Presentational only: the arithmetic is lib/caja.ts's and the day boundary is
 * lib/day-buckets.ts's. The one interactive cell is its own client component.
 */
export default function RetirosTable({ dias }: { dias: RetiroDia[] }) {
  const rows = buildRetiroRows(dias);

  return (
    <div className="table-wrap">
      <table className="stats-table compact-table">
        <thead>
          <tr>
            <th>Día</th>
            <th className="num">Según códigos</th>
            <th className="num">Retirado de verdad</th>
            <th className="num">Diferencia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const confirmed = row.countedEur !== null;
            const cuadra = row.diffEur === 0;

            return (
              <tr key={row.day}>
                <td data-label="Día" data-wide className="period-cell">
                  {fmtDayBucket(row.day)}
                </td>
                <td className="num" data-label="Según códigos">
                  {fmtEur(row.systemEur)}
                </td>
                {/* An em dash, not 0,00 €: nothing was counted, which is not the
                    same claim as having counted nothing. */}
                <td className="num" data-label="Retirado de verdad">
                  {row.countedEur === null ? '—' : fmtEur(row.countedEur)}
                </td>
                <td className="num" data-label="Diferencia">
                  {row.diffEur === null ? '—' : fmtEur(row.diffEur)}
                </td>
                {/* data-actions and not data-wide: the cell is a control, so on
                    a phone card it is fenced off below the figures like every
                    other action block. */}
                <td data-label="Estado" data-actions>
                  {confirmed ? (
                    <span className={cuadra ? 'badge cuadra' : 'badge no-cuadra'}>
                      {cuadra ? 'Cuadra' : 'Diferencia'}
                    </span>
                  ) : (
                    <span className="badge pendiente">Sin confirmar</span>
                  )}
                  {row.moved ? (
                    <p className="muted retiro-nota">
                      El total de códigos cambió después de confirmar. Vuelve a confirmar para
                      cuadrarlo.
                    </p>
                  ) : null}
                  <ConfirmarRetiroForm
                    day={row.day}
                    systemEur={row.systemEur}
                    confirmed={confirmed}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
