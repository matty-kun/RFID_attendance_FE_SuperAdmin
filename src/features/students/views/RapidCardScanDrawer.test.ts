import { describe, it, expect } from 'vitest';
import {
  sanitizePrintedCardSuffix,
  formatPrintedCardNumber,
} from './RapidCardScanDrawer';

describe('Rapid Card Scanner — Card Number Sanitization & Formatting', () => {
  it('strips redundant RFID prefix without creating double hyphens', () => {
    expect(sanitizePrintedCardSuffix('001')).toBe('001');
    expect(formatPrintedCardNumber('001')).toBe('RFID-001');

    // Leading hyphen typed by user behind RFID- label
    expect(sanitizePrintedCardSuffix('-001')).toBe('001');
    expect(formatPrintedCardNumber('-001')).toBe('RFID-001');

    // Multiple leading hyphens
    expect(sanitizePrintedCardSuffix('--001')).toBe('001');
    expect(formatPrintedCardNumber('--001')).toBe('RFID-001');

    // Pasting or typing full RFID-001
    expect(sanitizePrintedCardSuffix('RFID-001')).toBe('001');
    expect(formatPrintedCardNumber('RFID-001')).toBe('RFID-001');

    // Typing RFID--001
    expect(sanitizePrintedCardSuffix('RFID--001')).toBe('001');
    expect(formatPrintedCardNumber('RFID--001')).toBe('RFID-001');

    // Lowercase input
    expect(sanitizePrintedCardSuffix('rfid-abc')).toBe('ABC');
    expect(formatPrintedCardNumber('rfid-abc')).toBe('RFID-ABC');
  });

  it('handles empty input cleanly', () => {
    expect(sanitizePrintedCardSuffix('')).toBe('');
    expect(formatPrintedCardNumber('')).toBe('');
    expect(sanitizePrintedCardSuffix('   ')).toBe('');
    expect(formatPrintedCardNumber('   ')).toBe('');
  });
});
