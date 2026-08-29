import Link from 'next/link';

import ConsolidacionTable from '../components/consolidacion-table';
import Shell from '../shell';
import {
  fmtCount,
  fmtDayBucket,
  fmtEur,
  fmtMonthBucket,
  fmtPercent,
  fmtRate,
  fmtUsdt,
  fmtVes,
} from '@/lib/format';
import { getCodigoConsolidation, getCodigosPorBancoTotal, getStats } from '@/lib/queries';
import { averagePerItem, marginPercent } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  // Three independent reads. The two códigos ones deliberately stay outside
  // getStats()'s repeatable-read snapshot: neither is compared against the
  // earnings figures, so neither needs to be in the same transaction as them.
  const [stats, consolidacion, codigosPorBanco] = await Promise.all([
    getStats(),
    getCodigoConsolidation(),
    getCodigosPorBancoTotal(),
  ]);
  const { current, earnings, inventory } = stats;
  const margin = marginPercent(earnings.profit_eur, earnings.revenue_eur);
  const averageProfit = averagePerItem(earnings.profit_eur, earnings.paid_count);

  return (
    <Shell>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Control del negocio</p>
          <h1>Estadísticas</h1>
        </div>
        <p>Ganancia realizada, posiciones actuales y carga pendiente.</p>
      </header>

      <section className="earnings-summary" aria-labelledby="earnings-title">
        <div className="earnings-primary">
          <p className="eyebrow" id="earnings-title">
            Ganancia realizada total
          </p>
          <div className={earnings.profit_eur < 0 ? 'money-xl negative-value' : 'money-xl'}>
            {fmtEur(earnings.profit_eur)}
          </div>
          <p>
            {fmtCount(earnings.paid_count)} envíos pagados · {fmtEur(earnings.revenue_eur)}
            {' '}gestionados
          </p>
        </div>

        <dl className="earnings-strip">
          <div>
            <dt>Hoy</dt>
            <dd className={earnings.today_profit_eur < 0 ? 'negative-value' : undefined}>
              {fmtEur(earnings.today_profit_eur)}
            </dd>
          </div>
          <div>
            <dt>Este mes</dt>
            <dd className={earnings.month_profit_eur < 0 ? 'negative-value' : undefined}>
              {fmtEur(earnings.month_profit_eur)}
            </dd>
          </div>
          <div>
            <dt>Margen total</dt>
            <dd>{fmtPercent(margin)}</dd>
          </div>
          <div>
            <dt>Media por envío</dt>
            <dd>{averageProfit === null ? '—' : fmtEur(averageProfit)}</dd>
          </div>
        </dl>
      </section>

      {stats.zero_cost_paid_sendings > 0 ? (
        <p className="notice warn">
          {fmtCount(stats.zero_cost_paid_sendings)} envío(s) pagado(s) usaron inventario con costo
          EUR cero. La ganancia histórica puede estar incompleta.
        </p>
      ) : null}
      {earnings.negative_profit_count > 0 ? (
        <p className="notice warn">
          {fmtCount(earnings.negative_profit_count)} envío(s) pagado(s) cerraron con pérdida.
        </p>
      ) : null}

      <section aria-labelledby="position-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ahora mismo</p>
            <h2 id="position-title">Posición y pendientes</h2>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <p className="metric-label">Por cobrar de clientes</p>
            <p className="metric-value">{fmtEur(current.uncollected_eur)}</p>
            <p className="metric-meta">{fmtCount(current.uncollected_count)} envíos sin cobrar</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">VES a beneficiarios</p>
            <p className="metric-value">{fmtVes(current.pending_payout_ves)}</p>
            <p className="metric-meta">
              {fmtCount(current.pending_payout_count)} envíos pendientes
            </p>
          </article>
          <article className="metric-card">
            <p className="metric-label">Códigos pendientes</p>
            <p className="metric-value">{fmtEur(current.pending_codes_eur)}</p>
            <p className="metric-meta">{fmtCount(current.pending_codes_count)} por retirar</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">EUR pendientes · VES → EUR</p>
            <p className="metric-value">{fmtEur(current.unsettled_ves_eur)}</p>
            <p className="metric-meta">
              {fmtCount(current.unsettled_ves_eur_count)} entradas por pagar
            </p>
          </article>
          <article className={current.crypto_balance_usdt < 0 ? 'metric-card danger' : 'metric-card'}>
            <p className="metric-label">Pool USDT</p>
            <p className="metric-value">{fmtUsdt(current.crypto_balance_usdt)}</p>
            <p className="metric-meta">
              {fmtCount(inventory.active_usdt_lots)} lotes activos
              {inventory.backordered_usdt_lots > 0
                ? ` · ${fmtCount(inventory.backordered_usdt_lots)} en negativo`
                : ''}
            </p>
          </article>
          <article className={current.ves_pool_balance < 0 ? 'metric-card danger' : 'metric-card'}>
            <p className="metric-label">Pool VES</p>
            <p className="metric-value">{fmtVes(current.ves_pool_balance)}</p>
            <p className="metric-meta">
              {fmtCount(inventory.active_ves_lots)} lotes activos
              {inventory.backordered_ves_lots > 0
                ? ` · ${fmtCount(inventory.backordered_ves_lots)} en negativo`
                : ''}
            </p>
          </article>
        </div>
      </section>

      {/*
        Not an earnings figure: nothing here is realized, paid or costed. It is
        the integrity check on everything above it — if a day's envíos and that
        day's códigos disagree, one of the two logs the rest of this page is
        computed from is missing a row. Hence its place directly under the
        current position and above the first profit table.
      */}
      <section className="panel stats-panel" aria-labelledby="cuadre-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cuadre diario</p>
            <h2 id="cuadre-title">Envíos vs. códigos</h2>
          </div>
          <span className="section-note">Por fecha de registro</span>
        </div>
        <ConsolidacionTable data={consolidacion} />
      </section>

      <section className="panel stats-panel" aria-labelledby="monthly-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Por fecha de pago</p>
            <h2 id="monthly-title">Rendimiento mensual</h2>
          </div>
          <span className="section-note">Últimos 12 meses con actividad</span>
        </div>
        {stats.monthly.length === 0 ? (
          <EmptyEarnings />
        ) : (
          <div className="table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="num">Envíos</th>
                  <th className="num">EUR gestionados</th>
                  <th className="num">Costo</th>
                  <th className="num">Ganancia</th>
                  <th className="num">Margen</th>
                  <th className="num">Pool / directo</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly.map((period) => (
                  <tr key={period.period}>
                    <td data-label="Mes" data-wide className="period-cell">
                      {fmtMonthBucket(period.period)}
                    </td>
                    <td className="num" data-label="Envíos">
                      {fmtCount(period.paid_count)}
                    </td>
                    <td className="num" data-label="EUR gestionados">
                      {fmtEur(period.revenue_eur)}
                    </td>
                    <td className="num" data-label="Costo">
                      {fmtEur(period.cost_eur)}
                    </td>
                    <td
                      className={period.profit_eur < 0 ? 'num negative-value' : 'num profit-value'}
                      data-label="Ganancia"
                    >
                      {fmtEur(period.profit_eur)}
                    </td>
                    <td className="num" data-label="Margen">
                      {fmtPercent(marginPercent(period.profit_eur, period.revenue_eur))}
                    </td>
                    <td className="num" data-label="Pool / directo">
                      {fmtCount(period.pool_count)} / {fmtCount(period.direct_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="stats-columns">
        <section className="panel stats-panel" aria-labelledby="daily-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Detalle reciente</p>
              <h2 id="daily-title">Últimos días con pagos</h2>
            </div>
          </div>
          {stats.daily.length === 0 ? (
            <EmptyEarnings />
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th className="num">Envíos</th>
                    <th className="num">EUR</th>
                    <th className="num">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.daily.map((period) => (
                    <tr key={period.period}>
                      <td data-label="Día" data-wide className="period-cell">
                        {fmtDayBucket(period.period)}
                      </td>
                      <td className="num" data-label="Envíos">
                        {fmtCount(period.paid_count)}
                      </td>
                      <td className="num" data-label="EUR">
                        {fmtEur(period.revenue_eur)}
                      </td>
                      <td
                        className={period.profit_eur < 0 ? 'num negative-value' : 'num profit-value'}
                        data-label="Ganancia"
                      >
                        {fmtEur(period.profit_eur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel stats-panel" aria-labelledby="funding-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Cómo se pagó</p>
              <h2 id="funding-title">Ganancia por origen</h2>
            </div>
          </div>
          {stats.funding.length === 0 ? (
            <EmptyEarnings />
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Origen</th>
                    <th className="num">Envíos</th>
                    <th className="num">EUR</th>
                    <th className="num">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.funding.map((row) => (
                    <tr key={row.paid_via}>
                      <td data-label="Origen" data-wide>
                        {row.paid_via === 'pool' ? 'Pool VES' : 'Venta directa'}
                      </td>
                      <td className="num" data-label="Envíos">
                        {fmtCount(row.paid_count)}
                      </td>
                      <td className="num" data-label="EUR">
                        {fmtEur(row.revenue_eur)}
                      </td>
                      <td
                        className={row.profit_eur < 0 ? 'num negative-value' : 'num profit-value'}
                        data-label="Ganancia"
                      >
                        {fmtEur(row.profit_eur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="panel stats-panel" aria-labelledby="inventory-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Movimientos acumulados</p>
            <h2 id="inventory-title">Origen del inventario</h2>
          </div>
        </div>
        <div className="ledger-blocks">
          <article>
            <h3>Compras USDT</h3>
            <dl>
              <div><dt>EUR pagados</dt><dd>{fmtEur(inventory.purchase_eur)}</dd></div>
              <div><dt>USDT recibidos</dt><dd>{fmtUsdt(inventory.purchased_usdt)}</dd></div>
              <div>
                <dt>Precio medio ponderado</dt>
                <dd>
                  {inventory.weighted_purchase_price === null
                    ? '—'
                    : `${fmtRate(inventory.weighted_purchase_price)} EUR/USDT`}
                </dd>
              </div>
            </dl>
          </article>
          <article>
            <h3>VES desde Binance</h3>
            <dl>
              <div><dt>VES recibidos</dt><dd>{fmtVes(inventory.binance_ves)}</dd></div>
              <div><dt>USDT vendidos</dt><dd>{fmtUsdt(inventory.binance_usdt)}</dd></div>
              <div><dt>Costo EUR</dt><dd>{fmtEur(inventory.binance_eur_cost)}</dd></div>
            </dl>
          </article>
          <article>
            <h3>VES → EUR</h3>
            <dl>
              <div><dt>VES recibidos</dt><dd>{fmtVes(inventory.direct_ves)}</dd></div>
              <div><dt>Costo EUR acordado</dt><dd>{fmtEur(inventory.direct_eur_cost)}</dd></div>
              <div><dt>EUR aún pendientes</dt><dd>{fmtEur(current.unsettled_ves_eur)}</dd></div>
            </dl>
          </article>
        </div>
      </section>

      <div className="stats-columns">
        <section className="panel stats-panel" aria-labelledby="clients-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Ganancia realizada</p>
              <h2 id="clients-title">Clientes principales</h2>
            </div>
          </div>
          {stats.top_clients.length === 0 ? (
            <EmptyEarnings />
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="num">Envíos</th>
                    <th className="num">EUR</th>
                    <th className="num">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_clients.map((client) => (
                    <tr key={client.client_id}>
                      <td data-label="Cliente" data-wide>{client.client_name}</td>
                      <td className="num" data-label="Envíos">{fmtCount(client.paid_count)}</td>
                      <td className="num" data-label="EUR">{fmtEur(client.revenue_eur)}</td>
                      <td
                        className={client.profit_eur < 0 ? 'num negative-value' : 'num profit-value'}
                        data-label="Ganancia"
                      >
                        {fmtEur(client.profit_eur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel stats-panel" aria-labelledby="codes-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Carga operativa</p>
              <h2 id="codes-title">Códigos pendientes por banco</h2>
            </div>
          </div>
          {stats.pending_codes_by_bank.length === 0 ? (
            <p className="empty-state">No hay códigos pendientes.</p>
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th className="num">Códigos</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pending_codes_by_bank.map((row) => (
                    <tr key={row.bank}>
                      <td data-label="Banco" data-wide>{row.bank}</td>
                      <td className="num" data-label="Códigos">{fmtCount(row.pending_count)}</td>
                      <td className="num" data-label="Monto">{fmtEur(row.amount_eur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/*
          The same table with the status filter taken off, next to the one that
          has it. The one above is a route — where Jose still has to go this
          week. This one is the history: which banks the money actually comes
          through, which is a different question and only answerable over every
          código ever registered.
        */}
        <section className="panel stats-panel" aria-labelledby="codes-total-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Todo el histórico</p>
              <h2 id="codes-total-title">Códigos por banco</h2>
            </div>
          </div>
          {codigosPorBanco.length === 0 ? (
            <p className="empty-state">Todavía no hay códigos.</p>
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th className="num">Códigos</th>
                    <th className="num">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {codigosPorBanco.map((row) => (
                    <tr key={row.bank}>
                      <td data-label="Banco" data-wide>{row.bank}</td>
                      <td className="num" data-label="Códigos">{fmtCount(row.count)}</td>
                      <td className="num" data-label="Monto">{fmtEur(row.amount_eur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

function EmptyEarnings() {
  return (
    <p className="empty-state">
      Aún no hay envíos pagados con ganancia calculada. <Link href="/envios">Ir a envíos</Link>
    </p>
  );
}
