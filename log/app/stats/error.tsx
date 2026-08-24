'use client';

import Link from 'next/link';

export default function StatsError({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <div className="panel error-panel">
        <p className="eyebrow">Estadísticas</p>
        <h1>No se pudieron cargar</h1>
        <p>Vuelve a intentarlo. El resto del registro no se ha modificado.</p>
        <div className="button-row">
          <button className="primary" type="button" onClick={reset}>
            Reintentar
          </button>
          <Link className="button-link" href="/">
            Volver al resumen
          </Link>
        </div>
      </div>
    </main>
  );
}
