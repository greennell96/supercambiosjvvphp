import CodigosList from './codigos-list';
import NuevoCodigoForm from './nuevo-codigo-form';
import Shell from '../shell';
import { listClients, listCodigos, listOpenSendings, listRetiroAgentes } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function CodigosPage() {
  const [clients, codigos, openSendings, agentes] = await Promise.all([
    listClients(),
    listCodigos(),
    listOpenSendings(),
    listRetiroAgentes(),
  ]);

  return (
    <Shell>
      <header className="page-heading">
        <div>
          <h1>Códigos</h1>
          <p className="page-description">Retiros pendientes arriba; el historial queda debajo.</p>
        </div>
        <p className="page-count">
          {codigos.length} código{codigos.length === 1 ? '' : 's'}
        </p>
      </header>

      <NuevoCodigoForm clients={clients} openSendings={openSendings} />

      <div className="panel">
        <div className="panel-heading">
          <h2>Todos los códigos</h2>
          <span className="panel-count">
            {codigos.length} código{codigos.length === 1 ? '' : 's'}
          </span>
        </div>
        {codigos.length === 0 ? (
          <p className="muted">Todavía no hay códigos.</p>
        ) : (
          <CodigosList codigos={codigos} agentes={agentes} />
        )}
      </div>
    </Shell>
  );
}
