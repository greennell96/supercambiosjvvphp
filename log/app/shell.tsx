import { logoutAction } from './actions';
import NavLinks from './components/nav-links';

/** The nav bar every logged-in page sits inside. */
export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">JVV Log</span>
        <nav aria-label="Navegación principal">
          <NavLinks />
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
