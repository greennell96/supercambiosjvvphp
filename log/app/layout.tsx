import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'JVV Log',
  description: 'Registro interno de envios, compras y codigos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
