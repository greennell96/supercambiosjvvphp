import EnviosList from './envios-list';
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
      <h1>Envíos</h1>

      <NuevoEnvioForm clients={clients} suggestedTasa={rates.tasa_eur_ves} />

      <div className="panel">
        <h2>Todos los envíos ({sendings.length})</h2>
        {sendings.length === 0 ? (
          <p className="muted">Todavía no hay envíos.</p>
        ) : (
          <EnviosList sendings={sendings} unlinkedCodigos={unlinkedCodigos} />
        )}
      </div>
    </Shell>
  );
}
