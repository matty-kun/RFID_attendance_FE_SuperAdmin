import { describe, it, expect } from 'vitest';
import { extractCardNumberNumeric, compareCardNumbers } from '../utils/cardSort';

describe('RFID Card Number Sorting (Least to Greatest 001 to 999)', () => {
  it('extracts numeric value correctly from card number strings', () => {
    expect(extractCardNumberNumeric('RFID-001')).toBe(1);
    expect(extractCardNumberNumeric('RFID-010')).toBe(10);
    expect(extractCardNumberNumeric('RFID-119')).toBe(119);
    expect(extractCardNumberNumeric('RFID-546')).toBe(546);
    expect(extractCardNumberNumeric('RFID-833')).toBe(833);
    expect(extractCardNumberNumeric('RFID-999')).toBe(999);
    expect(extractCardNumberNumeric('005')).toBe(5);
    expect(extractCardNumberNumeric('')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('sorts card numbers least to greatest (001 to 999) accurately', () => {
    const rawCards = [
      'RFID-546',
      'RFID-833',
      'RFID-119',
      'RFID-638',
      'RFID-846',
      'RFID-494',
      'RFID-001',
      'RFID-010',
      'RFID-002',
    ];

    const sortedAsc = [...rawCards].sort((a, b) => compareCardNumbers(a, b, 'asc'));

    expect(sortedAsc).toEqual([
      'RFID-001',
      'RFID-002',
      'RFID-010',
      'RFID-119',
      'RFID-494',
      'RFID-546',
      'RFID-638',
      'RFID-833',
      'RFID-846',
    ]);
  });

  it('sorts card numbers greatest to least (999 to 001) accurately', () => {
    const rawCards = [
      'RFID-546',
      'RFID-833',
      'RFID-119',
      'RFID-001',
      'RFID-999',
    ];

    const sortedDesc = [...rawCards].sort((a, b) => compareCardNumbers(a, b, 'desc'));

    expect(sortedDesc).toEqual([
      'RFID-999',
      'RFID-833',
      'RFID-546',
      'RFID-119',
      'RFID-001',
    ]);
  });
});
