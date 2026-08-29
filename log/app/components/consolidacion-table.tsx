import Link from 'next/link';

import { fmtDayBucket, fmtEur } from '@/lib/format';
import {
  buildConsolidacionRows,
  TOTAL_LABEL,
  type CodigoConsolidacion,
} from '@/lib/reconciliation';

/**
 * El cuadre de códigos, as one table.
 *
 * Read left to right it says: this is what the envíos claim came in, this is
 * what the códigos claim was paid, this is the gap between the two records of
 * the same money, and this is whether that day is fine.
 *
 * Rojo y verde by explicit instruction from José — red on any difference, green
 * when it cuadra. Worth writing down because it is NOT this file's usual
 * convention talking: elsewhere in this app red means trouble or a loss and
 * amber means "still waiting on him", and on that reading a gap pointing either
 * way would have been amber. He asked for a health light, and a health light is
 * red or green.
 *
 * The status is a badge and only a badge. The row is not tinted with it — a
 * pendiente código on /codigos does not tint its row either — and the
 * Diferencia figure is left uncoloured on purpose: the number's job is to say
 * WHICH side is short, by its sign, and it says that better without competing
 * with the badge for attention.
 *
 * A row that does not cuadrar carries the two links out to the raw logs, which
 * is the whole point of noticing: seeing a gap and getting to the rows behind it
 * are one click apart. They go to the lists themselves — nothing in this app
 * filters either one by date, and a filtered view is a bigger thing than this
 * table. Not on the total row, where "go and look" is not an instruction
 * anybody can act on.
 *
 * Presentational only: the arithmetic is lib/reconciliation.ts's and the day
 * boundary is lib/day-buckets.ts's. No 'use client' — a <Link> is an anchor and
 * needs nothing from the browser.
 */
export default function ConsolidacionTable({ data }: { data: CodigoConsolidacion }) {
  const rows = buildConsolidacionRows(data);

  return (
    <div className="table-wrap">
      <table className="stats-table compact-table">
        <thead>
          <tr>
            <th>Día</th>
            <th className="num">Envíos</th>
            <th className="num">Códigos</th>
            <th className="num">Diferencia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cuadra = row.diffEur === 0;
            const isTotal = row.label === TOTAL_LABEL;

            return (
              <tr key={row.label}>
                <td data-label="Día" data-wide className="period-cell">
                  {isTotal ? 'Total histórico' : fmtDayBucket(row.label)}
                </td>
                <td className="num" data-label="Envíos">
                  {fmtEur(row.enviosEur)}
                </td>
                <td className="num" data-label="Códigos">
                  {fmtEur(row.codigosEur)}
                </td>
                <td className="num" data-label="Diferencia">
                  {fmtEur(row.diffEur)}
                </td>
                <td data-label="Estado" data-wide>
                  <span className={cuadra ? 'badge cuadra' : 'badge no-cuadra'}>
                    {cuadra ? 'Cuadra' : 'Diferencia'}
                  </span>
                  {!cuadra && !isTotal ? (
                    <div className="muted">
                      <Link href="/envios">Ver envíos</Link>
                      {' · '}
                      <Link href="/codigos">Ver códigos</Link>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
