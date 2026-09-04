import EnviosList from './envios-list';
import styles from './envios.module.css';
import Shell from '../shell';
import {
  getRates,
  listActiveUsdtLots,
  listClients,
  listSendings,
  listUnlinkedCodigos,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function EnviosPage() {
  const [clients, sendings, rates, unlinkedCodigos, usdtLots] = await Promise.all([
    listClients(),
    listSendings(),
    getRates(),
    listUnlinkedCodigos(),
    // Read once, server-side, for the Envío USDT calculator — the same pattern
    // app/page.tsx uses to hand RatesForm the pool it prices.
    listActiveUsdtLots(),
  ]);

  return (
    <Shell>
      <div className={styles.pageHeading}>
        <div>
          <h1>Envíos</h1>
          <p>Pendientes de cobro, pago y cierre.</p>
        </div>
        <p>
          {sendings.length} registro{sendings.length === 1 ? '' : 's'} en el log
        </p>
      </div>

      <div className={`panel ${styles.workspacePanel}`}>
        <div className={styles.operationHeading}>
          <h2>Operación</h2>
          <p>Primero lo pendiente; lo cerrado queda debajo.</p>
        </div>
        {/*
          Rendered even with an empty log, unlike before: the "Nuevo envío"
          button now lives inside this component's toolbar, so short-circuiting
          it on zero rows would leave the page with no way to log the first
          envío. The empty case is handled inside instead.
        */}
        <EnviosList
          sendings={sendings}
          unlinkedCodigos={unlinkedCodigos}
          now={new Date().toISOString()}
          clients={clients}
          suggestedTasa={rates.tasa_eur_ves}
          usdtLots={usdtLots}
        />
      </div>
    </Shell>
  );
}
