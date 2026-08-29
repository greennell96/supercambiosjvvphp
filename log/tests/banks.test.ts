import { describe, expect, it } from 'vitest';

import { bankColorClass, compareBankNames, parseBanks, requiresDniReminder } from '../lib/banks';

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

describe('bankColorClass - the /codigos row border', () => {
  it('matches the five known banks however they are typed', () => {
    expect(bankColorClass('BBVA')).toBe('bank-bbva');
    expect(bankColorClass('bbva es')).toBe('bank-bbva');
    expect(bankColorClass('Banco Sabadell')).toBe('bank-sabadell');
    expect(bankColorClass('SANTANDER')).toBe('bank-santander');
    expect(bankColorClass('  Banco Santander  ')).toBe('bank-santander');
    expect(bankColorClass('halcash')).toBe('bank-halcash');
    expect(bankColorClass('HalCash Movil')).toBe('bank-halcash');
  });

  it('colours Caixa on exactly the spellings that ask for the DNI', () => {
    for (const spelling of ['Caixa', 'CaixaBank', 'caixabank', 'CAIXA', 'la caixa']) {
      expect(bankColorClass(spelling)).toBe('bank-caixa');
      expect(requiresDniReminder(spelling)).toBe(true);
    }
  });

  it('leaves every other bank alone', () => {
    expect(bankColorClass('Banesco')).toBe('');
    expect(bankColorClass('Banco de Venezuela')).toBe('');
    expect(bankColorClass('')).toBe('');
    expect(bankColorClass(null)).toBe('');
  });
});

describe('compareBankNames - grouping the pendientes into a route', () => {
  it('groups alphabetically, ignoring case and accents', () => {
    const banks = ['santander', 'BBVA', 'Caixa', 'bbva', 'Halcash'];
    expect([...banks].sort(compareBankNames)).toEqual([
      'BBVA',
      'bbva',
      'Caixa',
      'Halcash',
      'santander',
    ]);
  });

  it('says two spellings of one bank are the same group', () => {
    expect(compareBankNames('BBVA', 'bbva')).toBe(0);
  });

  it('pushes a missing bank to the end, where the gap is visible', () => {
    expect([...['', 'Santander', 'n/a', 'BBVA']].sort(compareBankNames)).toEqual([
      'BBVA',
      'Santander',
      '',
      'n/a',
    ]);
  });
});
