'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Resumen' },
  { href: '/stats', label: 'Estadísticas' },
  { href: '/envios', label: 'Envíos' },
  { href: '/ventas', label: 'Ventas' },
  { href: '/compras', label: 'Compras' },
  { href: '/codigos', label: 'Códigos' },
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
