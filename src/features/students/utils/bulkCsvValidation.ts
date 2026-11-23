import type { BulkImportStudentRow } from '../models';
import { normalizeCourse, saveCustomCourse } from '../../../utils/courseUtils';

export interface BulkCsvValidationError {
  rowNumber: number;
  field: 'header' | 'student_id' | 'name' | 'course' | 'year_level' | 'email' | 'duplicate';
  message: string;
}

export interface BulkCsvDuplicateWarning {
  rowNumber: number;
  student_id: string;
  name: string;
  reason: string;
}

export interface BulkCsvValidationResult {
  isValid: boolean;
  rows: BulkImportStudentRow[];
  errors: BulkCsvValidationError[];
  existingDuplicates: BulkCsvDuplicateWarning[];
  missingColumns: string[];
}

const ID_ALIASES = ['id', 'idno', 'studentid', 'studentno', 'studentnumber', 'schoolid'];
const NAME_ALIASES = ['students', 'student', 'name', 'fullname', 'studentname'];
const YEAR_ALIASES = ['yearlevel', 'year', 'gradelevel', 'lvl', 'yr'];
const COURSE_ALIASES = ['course', 'program', 'degree', 'department'];
const EMAIL_ALIASES = ['email', 'emailaddress', 'studentemail', 'mail'];
const RFID_ALIASES = ['rfid', 'rfiduid', 'carduid', 'uid', 'card'];
const PWD_ALIASES = ['temporarypassword', 'password', 'temppassword'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/[\s_.-]+/g, '');
}

/**
 * Strictly parses year level (1–6). Accepts numeric values or ordinal strings like
 * "1", "2nd", "3rd Year", "Year 4", but returns `null` for missing or out-of-range values.
 */
export function parseStrictYearLevel(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (!Number.isInteger(val) || val < 1 || val > 6) return null;
    return val;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Accept "1", "1st", "1st Year", "Year 1", "2nd yr", etc.
  const match = str.match(/^(?:year\s*)?([1-6])(?:st|nd|rd|th)?(?:\s*(?:year|yr))?$/i);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return parsed >= 1 && parsed <= 6 ? parsed : null;
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '');
}

function isRepeatedHeaderRow(rawId: string, rawName: string): boolean {
  return (
    /^(id|id\s*no\.?|student\s*id|no\.?)$/i.test(rawId) &&
    /^(students?|name|full\s*name|student\s*name)$/i.test(rawName)
  );
}

function isSectionBannerRow(row: unknown[], rawId: string, rawName: string): boolean {
  const nonEmptyCells = row.filter((c) => String(c ?? '').trim() !== '');
  if (nonEmptyCells.length === 1) {
    const text = String(nonEmptyCells[0]).trim();
    if (/bachelor of science|college|school year|list of students|department/i.test(text)) {
      return true;
    }
  }
  if (
    !rawId &&
    rawName &&
    /^(bachelor of science|college of|school year|list of students)/i.test(rawName)
  ) {
    return true;
  }
  return false;
}

export function validateBulkStudentGrid(
  rawGrid: unknown[][],
  existingStudents: Array<{ student_id?: string | null; email?: string | null }> = []
): BulkCsvValidationResult {
  const errors: BulkCsvValidationError[] = [];
  const existingDuplicates: BulkCsvDuplicateWarning[] = [];
  const missingColumns: string[] = [];

  if (!Array.isArray(rawGrid) || rawGrid.length === 0) {
    return {
      isValid: false,
      rows: [],
      errors: [{ rowNumber: 1, field: 'header', message: 'The uploaded file is empty.' }],
      existingDuplicates: [],
      missingColumns: ['Student ID', 'Name', 'Course', 'Year Level'],
    };
  }

  // 1. Locate header row within first 35 rows (must match at least 2 known aliases, or 1 if single-column)
  let headerIdx = -1;
  let idCol = -1;
  let nameCol = -1;
  let yearCol = -1;
  let courseCol = -1;
  let emailCol = -1;
  let rfidCol = -1;
  let pwdCol = -1;

  for (let i = 0; i < Math.min(rawGrid.length, 35); i++) {
    const row = rawGrid[i];
    if (!Array.isArray(row) || isBlankRow(row)) continue;

    const lower = row.map((cell) => normalizeKey(String(cell ?? '')));
    const fId = lower.findIndex((c) => ID_ALIASES.includes(c));
    const fName = lower.findIndex((c) => NAME_ALIASES.includes(c));
    const fYear = lower.findIndex((c) => YEAR_ALIASES.includes(c));
    const fCourse = lower.findIndex((c) => COURSE_ALIASES.includes(c));
    const fEmail = lower.findIndex((c) => EMAIL_ALIASES.includes(c));
    const fRfid = lower.findIndex((c) => RFID_ALIASES.includes(c));
    const fPwd = lower.findIndex((c) => PWD_ALIASES.includes(c));

    const matchCount = [fId, fName, fYear, fCourse, fEmail, fRfid, fPwd].filter((idx) => idx !== -1).length;
    if (matchCount >= 2 || (fId !== -1 && fName !== -1)) {
      headerIdx = i;
      idCol = fId;
      nameCol = fName;
      yearCol = fYear;
      courseCol = fCourse;
      emailCol = fEmail;
      rfidCol = fRfid;
      pwdCol = fPwd;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      isValid: false,
      rows: [],
      errors: [
        {
          rowNumber: 1,
          field: 'header',
          message: 'Missing required columns: Student ID, Name, Course, Year Level.',
        },
      ],
      existingDuplicates: [],
      missingColumns: ['Student ID', 'Name', 'Course', 'Year Level'],
    };
  }

  if (idCol === -1) missingColumns.push('Student ID');
  if (nameCol === -1) missingColumns.push('Name');
  if (courseCol === -1) missingColumns.push('Course');
  if (yearCol === -1) missingColumns.push('Year Level');

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      rows: [],
      errors: [
        {
          rowNumber: headerIdx + 1,
          field: 'header',
          message: `Missing required column${missingColumns.length === 1 ? '' : 's'}: ${missingColumns.join(', ')}.`,
        },
      ],
      existingDuplicates: [],
      missingColumns,
    };
  }

  // Build existing student lookup sets for duplicate flagging
  const existingIdSet = new Set(
    existingStudents
      .map((s) => (s.student_id ? s.student_id.trim().toLowerCase() : ''))
      .filter(Boolean)
  );
  const existingEmailSet = new Set(
    existingStudents
      .map((s) => (s.email ? s.email.trim().toLowerCase() : ''))
      .filter(Boolean)
  );

  // 2. Validate every non-empty data row strictly (zero silent skipping!)
  const rows: BulkImportStudentRow[] = [];
  const seenIdsInFile = new Map<string, number>();
  const seenEmailsInFile = new Map<string, number>();

  for (let i = headerIdx + 1; i < rawGrid.length; i++) {
    const row = rawGrid[i];
    if (!Array.isArray(row) || isBlankRow(row)) continue;

    const rawId = String(row[idCol] ?? '').trim();
    const rawName = String(row[nameCol] ?? '').trim();
    const rawCourse = String(row[courseCol] ?? '').trim();
    const rawYear = row[yearCol];
    const rawEmail = emailCol !== -1 ? String(row[emailCol] ?? '').trim() : '';
    const rawRfid = rfidCol !== -1 ? String(row[rfidCol] ?? '').trim() : '';
    const rawPwd = pwdCol !== -1 ? String(row[pwdCol] ?? '').trim() : '';

    if (isRepeatedHeaderRow(rawId, rawName) || isSectionBannerRow(row, rawId, rawName)) {
      continue;
    }

    const rowNumber = i + 1;
    let rowHasError = false;

    if (!rawId) {
      errors.push({ rowNumber, field: 'student_id', message: `Row ${rowNumber}: Missing Student ID.` });
      rowHasError = true;
    }
    if (!rawName) {
      errors.push({ rowNumber, field: 'name', message: `Row ${rowNumber}: Missing Full Name.` });
      rowHasError = true;
    }
    if (!rawCourse) {
      errors.push({ rowNumber, field: 'course', message: `Row ${rowNumber}: Missing Course.` });
      rowHasError = true;
    }

    const parsedYear = parseStrictYearLevel(rawYear);
    if (parsedYear === null) {
      const displayVal = String(rawYear ?? '').trim();
      errors.push({
        rowNumber,
        field: 'year_level',
        message: displayVal
          ? `Row ${rowNumber}: Invalid Year Level ("${displayVal}"). Must be 1–6.`
          : `Row ${rowNumber}: Missing Year Level.`,
      });
      rowHasError = true;
    }

    if (rawEmail && !EMAIL_REGEX.test(rawEmail)) {
      errors.push({
        rowNumber,
        field: 'email',
        message: `Row ${rowNumber}: Invalid email address ("${rawEmail}").`,
      });
      rowHasError = true;
    }

    const cleanIdKey = rawId.toLowerCase();
    if (rawId) {
      const firstSeen = seenIdsInFile.get(cleanIdKey);
      if (firstSeen !== undefined) {
        errors.push({
          rowNumber,
          field: 'duplicate',
          message: `Row ${rowNumber}: Duplicate Student ID "${rawId}" in file (first seen at Row ${firstSeen}).`,
        });
        rowHasError = true;
      } else {
        seenIdsInFile.set(cleanIdKey, rowNumber);
      }
    }

    const cleanIdSlug = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
    const resolvedEmail = (rawEmail || (cleanIdSlug ? `${cleanIdSlug}@ndmc.edu.ph` : '')).toLowerCase();

    if (rawEmail) {
      const firstEmailRow = seenEmailsInFile.get(resolvedEmail);
      if (firstEmailRow !== undefined) {
        errors.push({
          rowNumber,
          field: 'duplicate',
          message: `Row ${rowNumber}: Duplicate email "${rawEmail}" in file (first seen at Row ${firstEmailRow}).`,
        });
        rowHasError = true;
      } else {
        seenEmailsInFile.set(resolvedEmail, rowNumber);
      }
    }

    if (rowHasError) {
      continue;
    }

    // Flag existing DB duplicates (do not silently hide them)
    if (existingIdSet.has(cleanIdKey)) {
      existingDuplicates.push({
        rowNumber,
        student_id: rawId,
        name: rawName,
        reason: 'Student ID is already registered in the system.',
      });
    } else if (resolvedEmail && existingEmailSet.has(resolvedEmail)) {
      existingDuplicates.push({
        rowNumber,
        student_id: rawId,
        name: rawName,
        reason: 'Email address is already registered in the system.',
      });
    }

    const normalizedCourse = normalizeCourse(rawCourse) || rawCourse;
    if (normalizedCourse) {
      saveCustomCourse(normalizedCourse);
    }

    rows.push({
      student_id: rawId,
      name: rawName,
      email: resolvedEmail,
      course: normalizedCourse,
      year_level: parsedYear!,
      rfid_uid: rawRfid || undefined,
      temporary_password: rawPwd || undefined,
    });
  }

  if (errors.length > 0) {
    // Reject the ENTIRE file when any broken/invalid row or in-file duplicate exists (no partial upload)
    return {
      isValid: false,
      rows: [],
      errors,
      existingDuplicates: [],
      missingColumns: [],
    };
  }

  if (rows.length === 0) {
    return {
      isValid: false,
      rows: [],
      errors: [{ rowNumber: headerIdx + 1, field: 'header', message: 'No student data rows found in file.' }],
      existingDuplicates: [],
      missingColumns: [],
    };
  }

  return {
    isValid: true,
    rows,
    errors: [],
    existingDuplicates,
    missingColumns: [],
  };
}
