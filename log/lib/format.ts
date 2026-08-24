/** Display helpers. Presentation only — never used in the money math. */

const eur = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ves = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const rate = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const count = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtEur(value: number): string {
  return `${eur.format(value)} €`;
}

export function fmtVes(value: number): string {
  return `${ves.format(value)} Bs`;
}

export function fmtUsdt(value: number): string {
  return `${usdt.format(value)} USDT`;
}

export function fmtRate(value: number): string {
  return rate.format(value);
}

export function fmtCount(value: number): string {
  return count.format(value);
}

export function fmtPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value !== 0 && Math.abs(value) < 0.01) return value < 0 ? '-<0,01%' : '<0,01%';
  return `${percent.format(Object.is(value, -0) ? 0 : value)}%`;
}

/** YYYY-MM bucket returned by the stats query, rendered without timezone drift. */
export function fmtMonthBucket(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return '—';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** YYYY-MM-DD bucket returned by the stats query, rendered without timezone drift. */
export function fmtDayBucket(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '—';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function fmtDateTime(value: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** DD/MM, hh:mm — compact form for the /codigos log, where the year rarely matters. */
export function fmtDateTimeShort(value: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  const day = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(d);
  return `${day}, ${time}`;
}

export function fmtDate(value: Date | string | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** For <input type="datetime-local">, which wants local time as YYYY-MM-DDTHH:mm. */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
