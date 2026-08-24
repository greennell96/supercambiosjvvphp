import Link from 'next/link';

import { logoutAction } from './actions';

/** The nav bar every logged-in page sits inside. */
export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">JVV Log</span>
        <nav aria-label="Navegación principal">
          <Link href="/">Inicio</Link>
          <Link href="/envios">Envíos</Link>
          <Link href="/codigos">Códigos</Link>
          <Link href="/ventas">Ventas</Link>
          <Link href="/compras">Compras</Link>
          <Link href="/clientes">Clientes</Link>
        </nav>
        <span className="spacer" />
        <form action={logoutAction}>
          <button className="link" type="submit">
            Salir
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
