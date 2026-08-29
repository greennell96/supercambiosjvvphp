import Link from 'next/link';

import RatesForm from './rates-form';
import Shell from './shell';
import { fmtUsdt, fmtVes } from '@/lib/format';
import { getDashboardTotals, getRates } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [totals, rates] = await Promise.all([getDashboardTotals(), getRates()]);

  const cryptoNegative = totals.cryptoBalanceUsdt < 0;
  const vesNegative = totals.vesPoolBalance < 0;
  // What is owed minus what is on hand: the gap he still has to sell for.
  const gap = totals.bolivaresPendientes - totals.vesPoolBalance;

  return (
    <Shell>
      <h1>Resumen</h1>

      <div className="grid2">
        <div className={cryptoNegative ? 'stat negative' : 'stat'}>
          <div className="label">Cripto (USDT) disponible</div>
          <div className="value">{fmtUsdt(totals.cryptoBalanceUsdt)}</div>
          {cryptoNegative ? (
            <div className="muted" style={{ color: 'inherit' }}>
              Saldo negativo: USDT gastado que aún no has comprado.
            </div>
          ) : null}
        </div>

        <div className={vesNegative ? 'stat negative' : 'stat'}>
          <div className="label">VES en tu cuenta (pool)</div>
          <div className="value">{fmtVes(totals.vesPoolBalance)}</div>
          {vesNegative ? (
            <div className="muted" style={{ color: 'inherit' }}>
              Saldo negativo: bolívares pagados que ninguna venta cubre todavía.
            </div>
          ) : null}
        </div>

        <div className="stat">
          <div className="label">Bolívares pendientes de pagar</div>
          <div className="value">{fmtVes(totals.bolivaresPendientes)}</div>
          <div className="muted">
            {totals.pendingSendingsCount} envío(s) sin pagar
            {gap > 0 ? ` · te faltan ${fmtVes(gap)} por vender` : ' · el pool los cubre'}
          </div>
        </div>
      </div>

      {/*
        Two counts and two links, and deliberately nothing else.

        Both lists used to be previewed here in full, with their own action
        buttons — which meant every envío and every código pendiente was rendered
        twice in the app, and the screen that is supposed to answer "cómo está
        todo" instead re-asked "¿qué hago con cada uno de estos?". The rows, and
        every action on them, live on their own pages; /envios and /codigos each
        pin their pendientes above their day-compressed log, so nothing pendiente
        can hide inside a collapsed bucket once José gets there.

        The counts come straight off getDashboardTotals, which already carried
        both — no list is fetched here any more.
      */}
      <div className="grid2">
        <div className="stat">
          <div className="label">Envíos pendientes</div>
          <div className="value">{totals.pendingSendingsCount}</div>
          <div className="muted">
            <Link href="/envios">Ver todos</Link>
          </div>
        </div>

        <div className="stat">
          <div className="label">Códigos pendientes</div>
          <div className="value">{totals.pendingCodigosCount}</div>
          <div className="muted">
            <Link href="/codigos">Ver todos</Link>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Tasa sugerida</h2>
        <RatesForm tasa={rates.tasa_eur_ves} updatedAt={rates.updated_at} />
      </div>
    </Shell>
  );
}
