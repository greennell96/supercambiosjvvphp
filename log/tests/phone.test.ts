import { describe, expect, it } from 'vitest';

import { normalizePhone } from '../lib/phone';

describe('normalizePhone', () => {
  it('keeps digits only, dropping spaces, dashes, parentheses and "+"', () => {
    expect(normalizePhone('612 345 678')).toBe('612345678');
    expect(normalizePhone('612-345-678')).toBe('612345678');
    expect(normalizePhone('(612) 345 678')).toBe('612345678');
    expect(normalizePhone('+34 612 345 678')).toBe('612345678');
  });

  it('drops a leading 0034 dialling prefix', () => {
    expect(normalizePhone('0034612345678')).toBe('612345678');
    expect(normalizePhone('0034 612 345 678')).toBe('612345678');
  });

  it('drops a leading 34 only when the digits before the drop are 11 long', () => {
    // "34" + 9-digit mobile = 11 digits, the shape of a Spanish number typed
    // with its country code and nothing else.
    expect(normalizePhone('34612345678')).toBe('612345678');
    // A shorter string that happens to start with "34" is not a country
    // code plus a domestic number, so it is left alone.
    expect(normalizePhone('341234')).toBe('341234');
    // A longer one is left alone too — this rule only fires on the one shape
    // it was validated against.
    expect(normalizePhone('3412345678901')).toBe('3412345678901');
  });

  it('never touches a leading 58 (Venezuela) or any other country code', () => {
    // 21 real rows normalize to 10 digits and 5 to 12 this way — stripping a
    // prefix this rule was not validated against would invent false matches.
    expect(normalizePhone('584121234567')).toBe('584121234567');
    expect(normalizePhone('+58 412 1234567')).toBe('584121234567');
  });

  it('returns null under the 6-digit floor: no usable phone, not a match key', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it('accepts exactly 6 digits as the floor', () => {
    expect(normalizePhone('123456')).toBe('123456');
  });
});
