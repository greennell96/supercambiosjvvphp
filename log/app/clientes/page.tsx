import Link from 'next/link';

import ClientesPanel from './clientes-panel';
import Shell from '../shell';
import { listClients } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** `?from=envios` / `?from=codigos` shows a link straight back to that screen. */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [clients, params] = await Promise.all([listClients(), searchParams]);

  const backTo =
    params.from === 'envios'
      ? { href: '/envios', label: 'Volver a nuevo envío' }
      : params.from === 'codigos'
        ? { href: '/codigos', label: 'Volver a códigos' }
        : null;

  return (
    <Shell>
      <header className="page-heading">
        <div>
          <h1>Clientes</h1>
          <p className="page-description">Fichas para registrar envíos y códigos.</p>
        </div>
        <p className="page-count">
          {clients.length} cliente{clients.length === 1 ? '' : 's'}
        </p>
      </header>
      {backTo ? (
        <p className="notice warn">
          <Link href={backTo.href}>{backTo.label}</Link>
        </p>
      ) : null}
      <ClientesPanel clients={clients} />
    </Shell>
  );
}
