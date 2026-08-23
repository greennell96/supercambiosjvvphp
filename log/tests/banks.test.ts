import { describe, expect, it } from 'vitest';

import { parseBanks, requiresDniReminder } from '../lib/banks';

describe('requiresDniReminder - the CaixaBank reminder', () => {
  it('fires on any spelling of Caixa, case-insensitively and on partial matches', () => {
    expect(requiresDniReminder('Caixa')).toBe(true);
    expect(requiresDniReminder('CaixaBank')).toBe(true);
    expect(requiresDniReminder('caixabank')).toBe(true);
    expect(requiresDniReminder('CAIXA')).toBe(true);
    expect(requiresDniReminder('la caixa')).toBe(true);
    expect(requiresDniReminder('CaixaBank ES')).toBe(true);
    expect(requiresDniReminder('  caixa  ')).toBe(true);
  });

  it('stays quiet for every other bank', () => {
    expect(requiresDniReminder('Banesco')).toBe(false);
    expect(requiresDniReminder('BBVA')).toBe(false);
    expect(requiresDniReminder('Santander')).toBe(false);
    expect(requiresDniReminder('Banco de Venezuela')).toBe(false);
    expect(requiresDniReminder('')).toBe(false);
    expect(requiresDniReminder(null)).toBe(false);
  });
});

describe('parseBanks', () => {
  it('splits on every separator that shows up in real data', () => {
    expect(parseBanks('BBVA, Santander')).toEqual(['BBVA', 'Santander']);
    expect(parseBanks('BBVA/Santander')).toEqual(['BBVA', 'Santander']);
    expect(parseBanks('BBVA; Santander')).toEqual(['BBVA', 'Santander']);
    expect(parseBanks('BBVA y Santander')).toEqual(['BBVA', 'Santander']);
    expect(parseBanks('BBVA - Santander')).toEqual(['BBVA', 'Santander']);
    expect(parseBanks('BBVA\nSantander')).toEqual(['BBVA', 'Santander']);
  });

  it('trims, drops empties and removes duplicates ignoring case', () => {
    expect(parseBanks('  BBVA ,, bbva , Santander ')).toEqual(['BBVA', 'Santander']);
  });

  it('treats placeholders as no bank at all', () => {
    expect(parseBanks('n/a')).toEqual([]);
    expect(parseBanks('N/A')).toEqual([]);
    expect(parseBanks('-')).toEqual([]);
    expect(parseBanks('')).toEqual([]);
    expect(parseBanks(null)).toEqual([]);
  });
});
