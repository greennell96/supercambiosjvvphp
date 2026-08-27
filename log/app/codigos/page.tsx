import CodigosList from './codigos-list';
import NuevoCodigoForm from './nuevo-codigo-form';
import Shell from '../shell';
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
          <CodigosList codigos={codigos} />
        )}
      </div>
    </Shell>
  );
}
