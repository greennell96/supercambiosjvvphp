import EnviosList from './envios-list';
import styles from './envios.module.css';
import NuevoEnvioForm from './nuevo-envio-form';
import Shell from '../shell';
import { getRates, listClients, listSendings, listUnlinkedCodigos } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function EnviosPage() {
  const [clients, sendings, rates, unlinkedCodigos] = await Promise.all([
    listClients(),
    listSendings(),
    getRates(),
    listUnlinkedCodigos(),
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
        {sendings.length === 0 ? (
          <p className="muted">Todavía no hay envíos.</p>
        ) : (
          <EnviosList
            sendings={sendings}
            unlinkedCodigos={unlinkedCodigos}
            now={new Date().toISOString()}
          />
        )}
      </div>

      <NuevoEnvioForm clients={clients} suggestedTasa={rates.tasa_eur_ves} />
    </Shell>
  );
}
