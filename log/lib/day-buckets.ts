/**
 * Which of Jose's days a logged row belongs to.
 *
 * The three chronological logs — envios, ventas, codigos — show today in full,
 * one older day as one-line rows, and everything before that only when he asks
 * for it. The boundary between one day and the next is Europe/Madrid, the same
 * business day the earnings buckets in lib/queries.ts group by, so a row never
 * lands on a different day here than it does on /stats.
 *
 * Pure module: no database, no React, no formatting.
 */

const MADRID_DAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Madrid',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The Europe/Madrid calendar day an instant falls on, as YYYY-MM-DD. */
export function madridDayKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = MADRID_DAY.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The day before a YYYY-MM-DD key. Calendar arithmetic, no timezone involved. */
export function previousDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

/** True when a day key sits inside an inclusive range. '' means "no bound". */
export function withinDayRange(key: string, from: string, to: string): boolean {
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export interface DayBuckets<T> {
  /** Today in Europe/Madrid, as YYYY-MM-DD. */
  todayKey: string;
  /** Logged today. Shown as full cards, in the order the list came in. */
  today: T[];
  /**
   * The single older day still on screen, compressed to one-line rows:
   * yesterday when there is anything from today, and otherwise the most recent
   * day that has rows at all. Null when the list has neither.
   */
  recentKey: string | null;
  recent: T[];
  /** Everything else. Only reachable through the search box. */
  older: T[];
}

/**
 * Split a list into today / one compressed day / the archive.
 *
 * The fallback is the point: a day with no envios at all should not render an
 * empty "Hoy", so the most recent day that does have rows takes its place —
 * still compressed, because it is not today. Each list decides this on its own
 * rows; the three are unrelated.
 *
 * A row dated ahead of the clock counts as today. Ventas and compras take a
 * typed date, and a row Jose dated for later tonight belongs at the top of his
 * day, not in an archive he has to go looking for.
 */
export function bucketByDay<T>(
  items: readonly T[],
  getDate: (item: T) => Date | string,
  now: Date | string = new Date(),
): DayBuckets<T> {
  const todayKey = madridDayKey(now);
  const keyed = items.map((item) => ({ item, key: madridDayKey(getDate(item)) }));
  const today = keyed.filter((entry) => entry.key >= todayKey);

  let recentKey: string | null = null;
  if (today.length > 0) {
    const yesterdayKey = previousDayKey(todayKey);
    recentKey = keyed.some((entry) => entry.key === yesterdayKey) ? yesterdayKey : null;
  } else {
    for (const entry of keyed) {
      if (recentKey === null || entry.key > recentKey) recentKey = entry.key;
    }
  }

  return {
    todayKey,
    today: today.map((entry) => entry.item),
    recentKey,
    recent:
      recentKey === null
        ? []
        : keyed.filter((entry) => entry.key === recentKey).map((entry) => entry.item),
    older: keyed
      .filter((entry) => entry.key < todayKey && entry.key !== recentKey)
      .map((entry) => entry.item),
  };
}
