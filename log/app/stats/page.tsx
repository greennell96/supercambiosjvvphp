import Link from 'next/link';

import ConsolidacionTable from '../components/consolidacion-table';
import DeleteRowForm from '../components/delete-row-form';
import EntregarDineroForm from '../components/entregar-dinero-form';
import RetirosTable from '../components/retiros-table';
import Shell from '../shell';
import styles from './stats.module.css';
import { anularEntregaAction } from './actions';
import {
  fmtCount,
  fmtDayBucket,
  fmtDateTimeShort,
  fmtEur,
  fmtMonthBucket,
  fmtPercent,
  fmtRate,
  fmtUsdt,
  fmtVes,
} from '@/lib/format';
import { CLIENT_PAYMENT_METHOD_LABELS, type StatsPeriod } from '@/lib/types';
import {
  getAgenteSaldos,
  getCodigoConsolidation,
  getCryptoSellerSummary,
  getRetirosDias,
  getStats,
  listRetiroEntregas,
} from '@/lib/queries';
import { marginPercent } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/** A decision-oriented reading of the short-lived operator log. */
export default async function StatsPage() {
  const [stats, consolidacion, retiros, agenteSaldos, cripto, entregas] =
    await Promise.all([
      getStats(),
      getCodigoConsolidation(),
      getRetirosDias(),
      getAgenteSaldos(),
      getCryptoSellerSummary(),
      listRetiroEntregas(),
    ]);
  const { current, earnings, inventory } = stats;
  const recent = earnings.seven_day;

  return (
    <Shell>
      <header className={`page-heading ${styles.heading}`}>
        <div>
          <p className="eyebrow">Lectura rápida del LOG</p>
          <h1>Estadísticas</h1>
        </div>
        <p>Decisiones de hoy primero; el detalle histórico queda a mano cuando haga falta.</p>
      </header>

      <section className={`earnings-summary ${styles.hero}`} aria-labelledby="recent-title">
        <div className="earnings-primary">
          <p className="eyebrow" id="recent-title">
            Últimos 7 días
          </p>
          <div className={recent.profit_eur < 0 ? 'money-xl negative-value' : 'money-xl'}>
            {fmtEur(recent.profit_eur)}
          </div>
          <p>
            {fmtCount(recent.paid_count)} grupos con pagos ·{' '}
            {fmtEur(recent.revenue_eur)} gestionados
          </p>
        </div>
        <dl className="earnings-strip">
          <div>
            <dt>Margen</dt>
            <dd>{fmtPercent(marginPercent(recent.profit_eur, recent.revenue_eur))}</dd>
          </div>
          <div>
            <dt>Operaciones pool VES</dt>
            <dd>{fmtCount(recent.pool_count)}</dd>
          </div>
          <div>
            <dt>Operaciones directas</dt>
            <dd>{fmtCount(recent.direct_count)}</dd>
          </div>
          <div>
            <dt>Ganancia acumulada</dt>
            <dd>{fmtEur(earnings.profit_eur)}</dd>
          </div>
        </dl>
      </section>

      {stats.zero_cost_paid_sendings > 0 ? (
        <p className="notice warn">
          {fmtCount(stats.zero_cost_paid_sendings)} grupo
          {stats.zero_cost_paid_sendings === 1 ? '' : 's'} con pagos usaron inventario con costo EUR
          cero; revisa el cálculo antes de tomar la ganancia histórica como definitiva.
        </p>
      ) : null}
      {earnings.negative_profit_count > 0 ? (
        <p className="notice warn">
          {fmtCount(earnings.negative_profit_count)} grupo(s) con pagos registraron una pérdida.
        </p>
      ) : null}

      <section aria-labelledby="position-title" className={styles.prioritySection}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ahora mismo</p>
            <h2 id="position-title">Lo que requiere atención</h2>
          </div>
          <Link className={styles.sectionLink} href="/envios">
            Abrir envíos →
          </Link>
        </div>
        <div className={`metric-grid ${styles.priorityGrid}`}>
          <MetricCard
            priority={current.uncollected_count > 0}
            label="Falta cobrar al cliente"
            value={fmtEur(current.uncollected_eur)}
            meta={`${fmtCount(current.uncollected_count)} grupos de cobro`}
          />
          <MetricCard
            priority={current.pending_payout_count > 0}
            label="Falta pagar al beneficiario"
            value={fmtVes(current.pending_payout_ves)}
            meta={`${fmtCount(current.pending_payout_count)} envíos pendientes`}
          />
          <MetricCard
            priority={current.pending_codes_count > 0}
            label="Códigos por retirar"
            value={fmtEur(current.pending_codes_eur)}
            meta={`${fmtCount(current.pending_codes_count)} códigos pendientes`}
          />
          <MetricCard
            priority={current.unsettled_ves_eur_count > 0}
            label="VES → EUR por liquidar"
            value={fmtEur(current.unsettled_ves_eur)}
            meta={`${fmtCount(current.unsettled_ves_eur_count)} entradas pendientes`}
          />
          <MetricCard
            priority={current.crypto_balance_usdt < 0}
            label="Saldo pool USDT"
            value={fmtUsdt(current.crypto_balance_usdt)}
            meta={`${fmtCount(inventory.active_usdt_lots)} lotes activos${
              inventory.backordered_usdt_lots > 0
                ? ` · ${fmtCount(inventory.backordered_usdt_lots)} en negativo`
                : ''
            }`}
          />
          <MetricCard
            priority={current.ves_pool_balance < 0}
            label="Saldo pool VES"
            value={fmtVes(current.ves_pool_balance)}
            meta={`${fmtCount(inventory.active_ves_lots)} lotes activos${
              inventory.backordered_ves_lots > 0
                ? ` · ${fmtCount(inventory.backordered_ves_lots)} en negativo`
                : ''
            }`}
          />
        </div>
      </section>

      <section className="panel stats-panel" aria-labelledby="daily-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Ritmo de trabajo</p>
            <h2 id="daily-title">Actividad reciente</h2>
          </div>
          <span className="section-note">Pagos por día de Madrid</span>
        </div>
        {stats.daily.length === 0 ? (
          <EmptyEarnings />
        ) : (
          <DailyTable periods={stats.daily} />
        )}
      </section>

      <div className={`stats-columns ${styles.insights}`}>
        <section className="panel stats-panel" aria-labelledby="clients-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Rendimiento por cliente</p>
              <h2 id="clients-title">Clientes principales</h2>
            </div>
            <span className="section-note">
              {fmtCount(stats.repeat_client_count)} clientes con 2+ solicitudes registradas
            </span>
          </div>
          {stats.top_clients.length === 0 ? (
            <EmptyEarnings />
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="num">Grupos con pagos</th>
                    <th className="num">EUR</th>
                    <th className="num">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_clients.map((client) => (
                    <tr key={client.client_id}>
                      <td data-label="Cliente" data-wide>
                        {client.client_name}
                      </td>
                      <td className="num" data-label="Grupos con pagos">
                        {fmtCount(client.paid_count)}
                      </td>
                      <td className="num" data-label="EUR">
                        {fmtEur(client.revenue_eur)}
                      </td>
                      <td
                        className={
                          client.profit_eur < 0
                            ? 'num negative-value'
                            : 'num profit-value'
                        }
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

        <section className="panel stats-panel" aria-labelledby="methods-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Cobros registrados</p>
              <h2 id="methods-title">Cómo pagan los clientes</h2>
            </div>
            <span className="section-note">Grupos de pago</span>
          </div>
          {stats.client_payment_methods.length === 0 ? (
            <p className="empty-state">Aún no hay cobros registrados.</p>
          ) : (
            <div className="table-wrap">
              <table className="stats-table compact-table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th className="num">Grupos con pagos</th>
                    <th className="num">EUR</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.client_payment_methods.map((row) => (
                    <tr key={row.method}>
                      <td data-label="Método" data-wide>
                        {clientPaymentMethodLabel(row.method)}
                      </td>
                      <td className="num" data-label="Grupos con pagos">
                        {fmtCount(row.payment_count)}
                      </td>
                      <td className="num" data-label="EUR">
                        {fmtEur(row.amount_eur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className={styles.control} aria-labelledby="control-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Control</p>
            <h2 id="control-title">Cuadres y dinero fuera de caja</h2>
          </div>
        </div>
        <section className="panel stats-panel" aria-labelledby="cuadre-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Cuadre diario</p>
              <h3 id="cuadre-title">Envíos vs. códigos</h3>
            </div>
            <span className="section-note">Por fecha de registro</span>
          </div>
          <ConsolidacionTable data={consolidacion} />
        </section>
        <section className="panel stats-panel" aria-labelledby="retiros-title">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Confirmación de retiros</p>
              <h3 id="retiros-title">Códigos retirados vs. efectivo</h3>
            </div>
            <span className="section-note">Últimos 4 días</span>
          </div>
          <RetirosTable dias={retiros} />
        </section>
        <ThirdPartyControl agenteSaldos={agenteSaldos} cripto={cripto} entregas={entregas} />
      </section>

      <details className={`panel stats-panel ${styles.detail}`}>
        <summary className={styles.detailSummary}>
          <span className={styles.detailSummaryText}>
            <span className="eyebrow">Detalle histórico</span>
            <span className={styles.detailTitle}>Inventario, origen y meses</span>
          </span>
          <span className={styles.detailAction}>Abrir</span>
        </summary>
        <div className={styles.detailBody}>
          <FundingTable rows={stats.funding} />
          <MonthlyTable rows={stats.monthly} />
          <InventoryDetail inventory={inventory} unsettled={current.unsettled_ves_eur} />
          <PendingCodesTable rows={stats.pending_codes_by_bank} />
          <p className="muted">
            Margen total registrado: {fmtPercent(marginPercent(earnings.profit_eur, earnings.revenue_eur))}.
            Los conteos de grupos no afirman que todas las partes de un split estén pagadas; los
            importes suman las filas reales.
          </p>
        </div>
      </details>
    </Shell>
  );
}

function MetricCard({
  priority,
  label,
  value,
  meta,
}: {
  priority: boolean;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <article className={priority ? 'metric-card warning' : 'metric-card'}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-meta">{meta}</p>
    </article>
  );
}

function DailyTable({ periods }: { periods: StatsPeriod[] }) {
  return (
    <div className="table-wrap">
      <table className="stats-table compact-table">
        <thead>
          <tr>
            <th>Día</th>
            <th className="num">Grupos con pagos</th>
            <th className="num">EUR</th>
            <th className="num">Ganancia</th>
            <th className="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.period}>
              <td data-label="Día" data-wide className="period-cell">{fmtDayBucket(period.period)}</td>
              <td className="num" data-label="Grupos con pagos">{fmtCount(period.paid_count)}</td>
              <td className="num" data-label="EUR">{fmtEur(period.revenue_eur)}</td>
              <td className={period.profit_eur < 0 ? 'num negative-value' : 'num profit-value'} data-label="Ganancia">
                {fmtEur(period.profit_eur)}
              </td>
              <td className="num" data-label="Margen">
                {fmtPercent(marginPercent(period.profit_eur, period.revenue_eur))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ThirdPartyProps = {
  agenteSaldos: Awaited<ReturnType<typeof import('@/lib/queries').getAgenteSaldos>>;
  cripto: Awaited<ReturnType<typeof import('@/lib/queries').getCryptoSellerSummary>>;
  entregas: Awaited<ReturnType<typeof import('@/lib/queries').listRetiroEntregas>>;
};

function ThirdPartyControl({ agenteSaldos, cripto, entregas }: ThirdPartyProps) {
  return (
    <section className="panel stats-panel" aria-labelledby="terceros-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Dinero en manos de terceros</p>
          <h3 id="terceros-title">Retirado por otros</h3>
        </div>
        <span className="section-note">Retirado − entregado</span>
      </div>
      {agenteSaldos.length === 0 ? (
        <p className="empty-state">Nadie ha retirado un código por encargo todavía.</p>
      ) : (
        <div className="table-wrap">
          <table className="stats-table compact-table">
            <thead>
              <tr>
                <th>Quién</th>
                <th className="num">Retirado</th>
                <th className="num">Entregado</th>
                <th className="num">Pendiente</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {agenteSaldos.map((saldo) => (
                <tr key={saldo.agenteId}>
                  <td data-label="Quién" data-wide>{saldo.name}</td>
                  <td className="num" data-label="Retirado">{fmtEur(saldo.retiradoEur)}</td>
                  <td className="num" data-label="Entregado">{fmtEur(saldo.entregadoEur)}</td>
                  <td className={saldo.saldoEur < 0 ? 'num negative-value' : 'num'} data-label="Pendiente">
                    {fmtEur(saldo.saldoEur)}
                  </td>
                  <td data-label="Entrega" data-actions>
                    <EntregarDineroForm agenteId={saldo.agenteId} saldoEur={saldo.saldoEur} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">
        Vendedores cripto: {fmtCount(cripto.count)} código(s) por {fmtEur(cripto.amountEur)};
        cobrados directamente como pago de USDT y nunca pasan por la caja.
      </p>
      {entregas.length > 0 ? (
        <div className="table-wrap">
          <table className="stats-table compact-table">
            <caption className="sr-only">Historial de dinero entregado por terceros</caption>
            <thead>
              <tr>
                <th>Entrega</th>
                <th>Quién</th>
                <th className="num">Monto</th>
                <th>Estado</th>
                <th>Corrección</th>
              </tr>
            </thead>
            <tbody>
              {entregas.map((entrega) => (
                <tr key={entrega.id}>
                  <td data-label="Entrega">{fmtDateTimeShort(entrega.delivered_at)}</td>
                  <td data-label="Quién" data-wide>{entrega.agente_name}</td>
                  <td className="num" data-label="Monto">{fmtEur(entrega.amount_eur)}</td>
                  <td data-label="Estado">
                    {entrega.voided_at ? (
                      <span className="badge">anulada</span>
                    ) : (
                      <span className="badge paid">activa</span>
                    )}
                  </td>
                  <td data-label="Corrección" data-actions>
                    {entrega.voided_at ? (
                      <span className="muted">Anulada {fmtDateTimeShort(entrega.voided_at)}</span>
                    ) : (
                      <DeleteRowForm
                        id={entrega.id}
                        action={anularEntregaAction}
                        label="Anular entrega"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function FundingTable({ rows }: { rows: import('@/lib/types').StatsFunding[] }) {
  return (
    <section aria-labelledby="funding-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Cómo se pagó</p>
          <h3 id="funding-title">Ganancia por origen</h3>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyEarnings />
      ) : (
        <div className="table-wrap">
          <table className="stats-table compact-table">
            <thead>
              <tr>
                <th>Origen</th>
                <th className="num">Grupos con pagos</th>
                <th className="num">EUR</th>
                <th className="num">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.paid_via}>
                  <td data-label="Origen" data-wide>
                    {row.paid_via === 'pool' ? 'Pool VES' : 'Venta directa'}
                  </td>
                  <td className="num" data-label="Grupos con pagos">{fmtCount(row.paid_count)}</td>
                  <td className="num" data-label="EUR">{fmtEur(row.revenue_eur)}</td>
                  <td className={row.profit_eur < 0 ? 'num negative-value' : 'num profit-value'} data-label="Ganancia">
                    {fmtEur(row.profit_eur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MonthlyTable({ rows }: { rows: StatsPeriod[] }) {
  return (
    <section aria-labelledby="monthly-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Por fecha de pago</p>
          <h3 id="monthly-title">Rendimiento mensual</h3>
        </div>
        <span className="section-note">Máximo 12 meses</span>
      </div>
      {rows.length === 0 ? (
        <EmptyEarnings />
      ) : (
        <div className="table-wrap">
          <table className="stats-table compact-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="num">Grupos con pagos</th>
                <th className="num">EUR</th>
                <th className="num">Ganancia</th>
                <th className="num">Margen</th>
                <th className="num">Operaciones pool/directas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((period) => (
                <tr key={period.period}>
                  <td data-label="Mes" data-wide className="period-cell">{fmtMonthBucket(period.period)}</td>
                  <td className="num" data-label="Grupos con pagos">{fmtCount(period.paid_count)}</td>
                  <td className="num" data-label="EUR">{fmtEur(period.revenue_eur)}</td>
                  <td className={period.profit_eur < 0 ? 'num negative-value' : 'num profit-value'} data-label="Ganancia">
                    {fmtEur(period.profit_eur)}
                  </td>
                  <td className="num" data-label="Margen">{fmtPercent(marginPercent(period.profit_eur, period.revenue_eur))}</td>
                  <td className="num" data-label="Operaciones pool/directas">
                    {fmtCount(period.pool_count)} / {fmtCount(period.direct_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function InventoryDetail({ inventory, unsettled }: { inventory: import('@/lib/types').StatsSnapshot['inventory']; unsettled: number }) {
  return (
    <section aria-labelledby="inventory-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Movimientos acumulados</p>
          <h3 id="inventory-title">Origen del inventario</h3>
        </div>
      </div>
      <div className="ledger-blocks">
        <article>
          <h4>Compras USDT</h4>
          <dl>
            <div><dt>EUR pagados</dt><dd>{fmtEur(inventory.purchase_eur)}</dd></div>
            <div><dt>USDT recibidos</dt><dd>{fmtUsdt(inventory.purchased_usdt)}</dd></div>
            <div>
              <dt>Precio medio</dt>
              <dd>{inventory.weighted_purchase_price === null ? '—' : `${fmtRate(inventory.weighted_purchase_price)} EUR/USDT`}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h4>VES desde Binance</h4>
          <dl>
            <div><dt>VES recibidos</dt><dd>{fmtVes(inventory.binance_ves)}</dd></div>
            <div><dt>USDT vendidos</dt><dd>{fmtUsdt(inventory.binance_usdt)}</dd></div>
            <div><dt>Costo EUR</dt><dd>{fmtEur(inventory.binance_eur_cost)}</dd></div>
          </dl>
        </article>
        <article>
          <h4>VES → EUR</h4>
          <dl>
            <div><dt>VES recibidos</dt><dd>{fmtVes(inventory.direct_ves)}</dd></div>
            <div><dt>Costo EUR acordado</dt><dd>{fmtEur(inventory.direct_eur_cost)}</dd></div>
            <div><dt>EUR pendientes</dt><dd>{fmtEur(unsettled)}</dd></div>
          </dl>
        </article>
      </div>
    </section>
  );
}

function PendingCodesTable({ rows }: { rows: import('@/lib/types').StatsCodeBank[] }) {
  return (
    <section aria-labelledby="codes-title">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Carga operativa</p>
          <h3 id="codes-title">Códigos pendientes por banco</h3>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="empty-state">No hay códigos pendientes.</p>
      ) : (
        <div className="table-wrap">
          <table className="stats-table compact-table">
            <thead><tr><th>Banco</th><th className="num">Códigos</th><th className="num">Monto</th></tr></thead>
            <tbody>
              {rows.map((row) => (
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
  );
}

function clientPaymentMethodLabel(method: string): string {
  if (method === 'SIN_REGISTRAR') return 'Sin registrar';
  return method in CLIENT_PAYMENT_METHOD_LABELS
    ? CLIENT_PAYMENT_METHOD_LABELS[method as keyof typeof CLIENT_PAYMENT_METHOD_LABELS]
    : method;
}

function EmptyEarnings() {
  return (
    <p className="empty-state">
      Aún no hay envíos pagados con ganancia calculada. <Link href="/envios">Ir a envíos</Link>
    </p>
  );
}
