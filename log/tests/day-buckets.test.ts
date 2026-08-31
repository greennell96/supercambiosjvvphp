import { describe, expect, it } from 'vitest';

import {
  bucketByDay,
  madridDayKey,
  previousDayKey,
  recentDayKeys,
  withinDayRange,
} from '../lib/day-buckets';

/** Rows as the three logs hand them over: an id and the instant they happened. */
const row = (id: number, iso: string) => ({ id, at: new Date(iso) });
const at = (item: { at: Date }) => item.at;
const ids = (items: { id: number }[]) => items.map((i) => i.id);

describe('the Europe/Madrid day of a row', () => {
  it('reads an instant in Madrid, not in UTC', () => {
    // 23:30 UTC in summer is already 01:30 the next day in Madrid.
    expect(madridDayKey(new Date('2026-08-22T23:30:00Z'))).toBe('2026-08-23');
    // And 22:30 UTC in winter is 23:30 the same day.
    expect(madridDayKey(new Date('2026-01-22T22:30:00Z'))).toBe('2026-01-22');
  });

  it('steps back over a month and a year boundary', () => {
    expect(previousDayKey('2026-08-23')).toBe('2026-08-22');
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
  });

  it('counts back real consecutive days from the one it is standing on', () => {
    // The window the retiros panel offers. Newest first, and it has to step over
    // a month boundary the same way previousDayKey does.
    expect(recentDayKeys(4, new Date('2026-03-02T10:00:00Z'))).toEqual([
      '2026-03-02',
      '2026-03-01',
      '2026-02-28',
      '2026-02-27',
    ]);
    // Read in Madrid, like everything else: 23:30 UTC is already tomorrow.
    expect(recentDayKeys(2, new Date('2026-08-22T23:30:00Z'))).toEqual([
      '2026-08-23',
      '2026-08-22',
    ]);
  });

  it('bounds a range only where a bound was given', () => {
    expect(withinDayRange('2026-08-23', '', '')).toBe(true);
    expect(withinDayRange('2026-08-23', '2026-08-24', '')).toBe(false);
    expect(withinDayRange('2026-08-23', '', '2026-08-22')).toBe(false);
    expect(withinDayRange('2026-08-23', '2026-08-23', '2026-08-23')).toBe(true);
  });
});

describe('splitting a log into today, one older day and the archive', () => {
  const now = new Date('2026-08-23T10:00:00Z');

  it('keeps today whole, compresses yesterday and archives the rest', () => {
    const items = [
      row(1, '2026-08-23T09:00:00Z'),
      row(2, '2026-08-22T23:30:00Z'), // 01:30 on the 23rd in Madrid: today
      row(3, '2026-08-22T09:00:00Z'),
      row(4, '2026-08-20T09:00:00Z'),
    ];
    const buckets = bucketByDay(items, at, now);

    expect(buckets.todayKey).toBe('2026-08-23');
    expect(ids(buckets.today)).toEqual([1, 2]);
    expect(buckets.recentKey).toBe('2026-08-22');
    expect(ids(buckets.recent)).toEqual([3]);
    expect(ids(buckets.older)).toEqual([4]);
  });

  it('falls back to the most recent day that has rows when today has none', () => {
    const items = [row(1, '2026-08-20T09:00:00Z'), row(2, '2026-08-20T08:00:00Z'), row(3, '2026-08-18T09:00:00Z')];
    const buckets = bucketByDay(items, at, now);

    expect(buckets.today).toEqual([]);
    expect(buckets.recentKey).toBe('2026-08-20');
    expect(ids(buckets.recent)).toEqual([1, 2]);
    expect(ids(buckets.older)).toEqual([3]);
  });

  it('leaves no compressed day when today is the only day with rows', () => {
    const buckets = bucketByDay([row(1, '2026-08-23T09:00:00Z')], at, now);
    expect(ids(buckets.today)).toEqual([1]);
    expect(buckets.recentKey).toBeNull();
    expect(buckets.recent).toEqual([]);
    expect(buckets.older).toEqual([]);
  });

  it('archives the day before yesterday even when yesterday is empty', () => {
    const items = [row(1, '2026-08-23T09:00:00Z'), row(2, '2026-08-21T09:00:00Z')];
    const buckets = bucketByDay(items, at, now);

    expect(buckets.recentKey).toBeNull();
    expect(ids(buckets.older)).toEqual([2]);
  });

  it('shows a row dated ahead of the clock with today', () => {
    const items = [row(1, '2026-08-24T20:00:00Z'), row(2, '2026-08-23T09:00:00Z')];
    const buckets = bucketByDay(items, at, now);

    expect(ids(buckets.today)).toEqual([1, 2]);
    expect(buckets.older).toEqual([]);
  });

  it('has nothing to show for an empty log', () => {
    const buckets = bucketByDay([], at, now);
    expect(buckets.today).toEqual([]);
    expect(buckets.recentKey).toBeNull();
    expect(buckets.older).toEqual([]);
  });
});
