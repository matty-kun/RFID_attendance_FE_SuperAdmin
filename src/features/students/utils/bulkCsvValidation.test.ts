import { describe, it, expect } from 'vitest';
import { validateBulkStudentGrid, parseStrictYearLevel } from './bulkCsvValidation';

describe('SA-05 Bulk Student CSV Validation', () => {
  it('strictly parses valid year levels (1–6) and rejects invalid/empty values', () => {
    expect(parseStrictYearLevel(1)).toBe(1);
    expect(parseStrictYearLevel('2nd Year')).toBe(2);
    expect(parseStrictYearLevel('Year 4')).toBe(4);
    expect(parseStrictYearLevel('')).toBeNull();
    expect(parseStrictYearLevel('abc')).toBeNull();
    expect(parseStrictYearLevel(0)).toBeNull();
    expect(parseStrictYearLevel(9)).toBeNull();
  });

  it('rejects the entire file when required columns are missing', () => {
    const grid = [
      ['student_id', 'name', 'email'],
      ['2026-0001', 'Juan Dela Cruz', 'juan@cite.edu'],
    ];

    const result = validateBulkStudentGrid(grid);
    expect(result.isValid).toBe(false);
    expect(result.rows).toHaveLength(0);
    expect(result.missingColumns).toEqual(['Course', 'Year Level']);
    expect(result.errors[0].message).toContain('Missing required columns: Course, Year Level');
  });

  it('rejects the entire file when any row is broken/invalid (no silent partial upload)', () => {
    const grid = [
      ['student_id', 'name', 'email', 'course', 'year_level'],
      ['2026-0001', 'Juan Dela Cruz', 'juan@cite.edu', 'BSIT', 1],
      ['', 'Missing ID Student', 'missing@cite.edu', 'BSIT', 2],
      ['2026-0003', 'Bad Year Student', 'badyear@cite.edu', 'BSCS', 'not-a-year'],
      ['2026-0004', 'Bad Email Student', 'not-an-email', 'BSCS', 3],
    ];

    const result = validateBulkStudentGrid(grid);
    expect(result.isValid).toBe(false);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.rowNumber === 3 && e.field === 'student_id')).toBe(true);
    expect(result.errors.some((e) => e.rowNumber === 4 && e.field === 'year_level')).toBe(true);
    expect(result.errors.some((e) => e.rowNumber === 5 && e.field === 'email')).toBe(true);
  });

  it('rejects files containing duplicate Student IDs within the same CSV', () => {
    const grid = [
      ['student_id', 'name', 'email', 'course', 'year_level'],
      ['2026-0001', 'Juan Dela Cruz', 'juan@cite.edu', 'BSIT', 1],
      ['2026-0001', 'Maria Santos', 'maria@cite.edu', 'BSCS', 2],
    ];

    const result = validateBulkStudentGrid(grid);
    expect(result.isValid).toBe(false);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.field === 'duplicate' && e.message.includes('2026-0001'))).toBe(true);
  });

  it('accepts a valid CSV and flags any Student IDs already registered in the system', () => {
    const grid = [
      ['student_id', 'name', 'email', 'course', 'year_level'],
      ['2026-0001', 'Juan Dela Cruz', 'juan@cite.edu', 'BSIT', 1],
      ['2026-0002', 'Maria Santos', 'maria@cite.edu', 'BSCS', 2],
    ];

    const result = validateBulkStudentGrid(grid, [
      { student_id: '2026-0001', email: 'juan@cite.edu' },
    ]);

    expect(result.isValid).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.existingDuplicates).toHaveLength(1);
    expect(result.existingDuplicates[0].student_id).toBe('2026-0001');
  });
});
