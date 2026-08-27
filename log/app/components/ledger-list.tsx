'use client';

import { Fragment, useId, useMemo, useState, type ReactNode } from 'react';

import { bucketByDay, madridDayKey, previousDayKey, withinDayRange } from '@/lib/day-buckets';
import { fmtDayBucket } from '@/lib/format';
import { normalizeText } from '@/lib/text';

/**
 * One line of a compressed row: what Jose needs to recognise the record without
 * opening it. Deliberately a fixed shape rather than free markup, so the three
 * logs compress to the same four things in the same four places.
 */
export interface TerseSummary {
  /** Date and hour, already formatted. */
  time: string;
  /** Who or what the row is about. */
  title: ReactNode;
  /** The one headline number. */
  value: ReactNode;
  /** One more muted word next to the time: a bank, an origin. Optional. */
  meta?: ReactNode;
  /** The row's status badge, in the same colours as its full card. */
  badge?: ReactNode;
}

export interface LedgerListProps<T> {
  /** The whole list, exactly as the page fetched it. */
  items: T[];
  getId: (item: T) => number;
  /** The instant the row belongs to: created_at, sold_at. */
  getDate: (item: T) => Date;
  /** Everything the search box matches against for one row. */
  getSearchText: (item: T) => string;
  getTerse: (item: T) => TerseSummary;
  /** The status class of the row's full card, so a compressed row is tinted the same. */
  rowClass?: (item: T) => string | undefined;
  /** The table's header row. Hidden on a phone; labels the columns on a desktop. */
  head: ReactNode;
  /** The full-detail row: one <tr>, or a component that renders one. */
  renderFull: (item: T) => ReactNode;
  /** What the free-text box searches, in Jose's words. */
  searchLabel: string;
}

/**
 * A chronological log, compressed by day.
 *
 * Today is worth the whole card; yesterday is worth one line you can open; the
 * archive is worth nothing at all until Jose goes looking for it. That is the
 * entire idea, and lib/day-buckets.ts decides which day a row is in.
 *
 * The list arrives whole and is never refetched: the page it sits on is already
 * a force-dynamic server component and the search is a filter over what it
 * already sent, not a round trip.
 */
export default function LedgerList<T>({
  items,
  getId,
  getDate,
  getSearchText,
  getTerse,
  rowClass,
  head,
  renderFull,
  searchLabel,
}: LedgerListProps<T>) {
  const fieldId = useId();
  const [searching, setSearching] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

  const buckets = useMemo(() => bucketByDay(items, getDate), [items, getDate]);

  // Nothing typed: the box is just the archive. One criterion and it becomes a
  // search over every row the page holds, today's included — the point of
  // looking something up is usually not knowing which day it was.
  const narrowed = from !== '' || to !== '' || query.trim() !== '';
  const found = useMemo(() => {
    if (!narrowed) return buckets.older;
    const q = normalizeText(query);
    return items.filter((item) => {
      if (!withinDayRange(madridDayKey(getDate(item)), from, to)) return false;
      if (q && !normalizeText(getSearchText(item)).includes(q)) return false;
      return true;
    });
  }, [narrowed, buckets.older, items, from, to, query, getDate, getSearchText]);

  const recentLabel =
    buckets.recentKey === null
      ? ''
      : buckets.recentKey === previousDayKey(buckets.todayKey)
        ? 'Ayer'
        : fmtDayBucket(buckets.recentKey);

  const terseRow = (item: T) => (
    <TerseRow key={getId(item)} summary={getTerse(item)} className={rowClass?.(item)}>
      <div className="table-wrap">
        <table>
          <thead>{head}</thead>
          <tbody>{renderFull(item)}</tbody>
        </table>
      </div>
    </TerseRow>
  );

  return (
    <div className="ledger">
      {buckets.today.length > 0 ? (
        <section className="ledger-day">
          <h3 className="ledger-day-heading">
            Hoy <span className="ledger-day-count">{buckets.today.length}</span>
          </h3>
          <div className="table-wrap">
            <table>
              <thead>{head}</thead>
              <tbody>
                {buckets.today.map((item) => (
                  <Fragment key={getId(item)}>{renderFull(item)}</Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {buckets.recent.length > 0 ? (
        <section className="ledger-day">
          <h3 className="ledger-day-heading">
            {recentLabel} <span className="ledger-day-count">{buckets.recent.length}</span>
          </h3>
          <div className="terse-list">{buckets.recent.map(terseRow)}</div>
        </section>
      ) : null}

      <section className="ledger-day ledger-search">
        <button
          className="small secondary"
          type="button"
          aria-expanded={searching}
          onClick={() => setSearching((open) => !open)}
        >
          {searching
            ? 'Cerrar búsqueda'
            : buckets.older.length > 0
              ? `Buscar en anteriores (${buckets.older.length})`
              : 'Buscar'}
        </button>

        {searching ? (
          <>
            <div className="ledger-filter">
              <div className="filter-fields">
                <div className="field">
                  <label htmlFor={`${fieldId}-from`}>Desde</label>
                  <input
                    id={`${fieldId}-from`}
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${fieldId}-to`}>Hasta</label>
                  <input
                    id={`${fieldId}-to`}
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${fieldId}-q`}>{searchLabel}</label>
                  <input
                    id={`${fieldId}-q`}
                    type="search"
                    value={query}
                    placeholder="Escribe para filtrar…"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="filter-foot">
                <p className="muted">
                  {narrowed
                    ? `${found.length} de ${items.length} en todo el registro.`
                    : `${found.length} anteriores. Filtra por fecha o nombre para buscar en todo el registro.`}
                </p>
                {narrowed ? (
                  <button
                    className="small quiet"
                    type="button"
                    onClick={() => {
                      setFrom('');
                      setTo('');
                      setQuery('');
                    }}
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>
            </div>

            {found.length === 0 ? (
              <p className="empty-state">Nada que mostrar con ese filtro.</p>
            ) : (
              <div className="terse-list">{found.map(terseRow)}</div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

/** One compressed row: the summary line, and the full card under it once opened. */
function TerseRow({
  summary,
  className,
  children,
}: {
  summary: TerseSummary;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className ? `terse-row ${className}` : 'terse-row'}>
      <button
        className="terse-summary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
      >
        <span className="terse-title">{summary.title}</span>
        <span className="terse-value">{summary.value}</span>
        <span className="terse-meta">
          {summary.time}
          {summary.meta ? <> · {summary.meta}</> : null}
        </span>
        {summary.badge ? <span className="terse-status">{summary.badge}</span> : null}
        <span className="terse-toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open ? <div className="terse-detail">{children}</div> : null}
    </div>
  );
}
