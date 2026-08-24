import Shell from '../shell';

export default function StatsLoading() {
  return (
    <Shell>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Control del negocio</p>
          <h1>Estadísticas</h1>
        </div>
      </header>
      <div className="skeleton skeleton-summary" role="status">
        <span className="sr-only">Cargando estadísticas…</span>
      </div>
      <div className="metric-grid" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="skeleton skeleton-metric" key={index} />
        ))}
      </div>
      <div className="skeleton skeleton-table" aria-hidden="true" />
    </Shell>
  );
}
