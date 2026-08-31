'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Resumen' },
  { href: '/envios', label: 'Envíos' },
  { href: '/codigos', label: 'Códigos' },
  { href: '/ventas', label: 'Ventas' },
  { href: '/compras', label: 'Compras' },
  // After the four logs and before the two read-only screens: la caja is the
  // last of the day-to-day money screens, not a report about them.
  { href: '/caja', label: 'Caja' },
  { href: '/stats', label: 'Estadísticas' },
  { href: '/clientes', label: 'Clientes' },
];

export default function NavLinks() {
  const pathname = usePathname();

  return links.map(({ href, label }) => {
    const active = href === '/' ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        className={active ? 'active' : undefined}
        href={href}
        aria-current={active ? 'page' : undefined}
        key={href}
      >
        {label}
      </Link>
    );
  });
}
