import { describe, it, expect } from 'vitest';
import {
  REPORT_EXPORT_HEADERS,
  STUDENT_COMPLIANCE_HEADERS,
  buildStudentComplianceRows,
  formatReportSessionLabel,
  buildReportExportRowValues,
  safeCell,
} from './reportExports';

describe('SA-12 Report Exports — Non-Redundant Columns & Formatting', () => {
  it('excludes redundant Day and Period columns from export headers', () => {
    expect(REPORT_EXPORT_HEADERS).toEqual([
      'Name',
      'Course',
      'Event',
      'Session',
      'Time In',
      'Time Out',
      'Admin Officer',
      'Status',
    ]);
    expect(REPORT_EXPORT_HEADERS).not.toContain('Day');
    expect(REPORT_EXPORT_HEADERS).not.toContain('Period');
  });

  it('does not repeat Day or Period when Session already includes them', () => {
    expect(
      formatReportSessionLabel({
        session: 'Day 1 - Morning Session',
        day: 'Day 1',
        period: 'Morning',
      })
    ).toBe('Day 1 - Morning Session');

    expect(
      formatReportSessionLabel({
        session: 'Opening Assembly',
        day: 'Day 1',
        period: 'Morning',
      })
    ).toBe('Day 1 · Opening Assembly · Morning');

    expect(
      formatReportSessionLabel({
        session: '',
        day: 'Day 2',
        period: 'Afternoon',
      })
    ).toBe('Day 2 · Afternoon');
  });

  it('strips redundant trailing and leading hyphens from session names', () => {
    expect(
      formatReportSessionLabel({
        session: 'Day 1 - ',
        day: 'Day 1',
        period: 'Morning',
      })
    ).toBe('Day 1 · Morning');

    expect(
      formatReportSessionLabel({
        session: ' - Morning Session - ',
        day: '',
        period: '',
      })
    ).toBe('Morning Session');
  });

  it('safeguards Excel cells while preserving clean dashes without leading quotes', () => {
    // Empty timestamps / missing values show as clean '-' in Excel, NOT "'-"
    expect(safeCell('-')).toBe('-');
    expect(safeCell('--')).toBe('--');
    expect(safeCell('')).toBe('-');

    // Formula injection attempts are safely quoted
    expect(safeCell('=SUM(A1:B10)')).toBe("'=SUM(A1:B10)");
    expect(safeCell('+12345')).toBe("'+12345");
    expect(safeCell('@cmd')).toBe("'@cmd");
    expect(safeCell('-10+20')).toBe("'-10+20");
  });

  it('builds 8-column export rows cleanly with "-" fallbacks including Admin Officer', () => {
    const values = buildReportExportRowValues({
      id: '1',
      name: 'Juan Dela Cruz',
      initials: 'JD',
      avatarBg: '',
      avatarColor: '',
      course: 'BS Information Technology',
      event: 'Cite Fest 2026',
      session: 'Day 2 - Morning Session',
      day: 'Day 2',
      period: 'Morning',
      timeIn: '7:05 AM',
      timeOut: '',
      adminOfficer: 'LEO Admin',
      status: 'Time In Only',
    });

    expect(values).toEqual([
      'Juan Dela Cruz',
      'BS Information Technology',
      'Cite Fest 2026',
      'Day 2 - Morning Session',
      '7:05 AM',
      '-',
      'LEO Admin',
      'Time In Only',
    ]);
  });

  it('exports Student Compliance (X/Y) sorted by Course -> Year Level -> Student Name', () => {
    expect(STUDENT_COMPLIANCE_HEADERS).toEqual([
      'Course',
      'Year Level',
      'Student Name',
      'Present',
      'Absent',
      'Total Required',
      'Attendance Ratio (X/Y)',
      'Compliance Rate',
    ]);

    const mockRows = [
      {
        id: 's2::sess1',
        name: 'Vargas, Jan Matthew',
        initials: 'JV',
        avatarBg: '',
        avatarColor: '',
        course: 'BS Information Technology',
        yearLevel: 2,
        event: 'Festival',
        session: 'Day 1 - Morning',
        day: 'Day 1',
        period: 'Morning',
        timeIn: '8:00 AM',
        timeOut: '11:00 AM',
        status: 'Completed' as const,
      },
      {
        id: 's1::sess1',
        name: 'Borres, John Lorenz',
        initials: 'JB',
        avatarBg: '',
        avatarColor: '',
        course: 'BS Information Technology',
        yearLevel: 1,
        event: 'Festival',
        session: 'Day 1 - Morning',
        day: 'Day 1',
        period: 'Morning',
        timeIn: '8:05 AM',
        timeOut: '11:00 AM',
        status: 'Completed' as const,
      },
      {
        id: 's1::sess2',
        name: 'Borres, John Lorenz',
        initials: 'JB',
        avatarBg: '',
        avatarColor: '',
        course: 'BS Information Technology',
        yearLevel: 1,
        event: 'Festival',
        session: 'Day 2 - Morning',
        day: 'Day 2',
        period: 'Morning',
        timeIn: '8:10 AM',
        timeOut: '11:00 AM',
        status: 'Completed' as const,
      },
      {
        id: 's3::sess1',
        name: 'Abad, Eammiel Kurt',
        initials: 'EA',
        avatarBg: '',
        avatarColor: '',
        course: 'BS Computer Science',
        yearLevel: 3,
        event: 'Festival',
        session: 'Day 1 - Morning',
        day: 'Day 1',
        period: 'Morning',
        timeIn: '8:15 AM',
        timeOut: '11:00 AM',
        status: 'Completed' as const,
      },
    ];

    const compliance = buildStudentComplianceRows(mockRows, {
      sessionBreakdown: [
        { id: '1', name: 'Day 1 - Morning', timeIns: 3, timeOuts: 3 },
        { id: '2', name: 'Day 2 - Morning', timeIns: 1, timeOuts: 1 },
      ],
    });

    expect(compliance).toHaveLength(3);

    // 1. BS Computer Science comes before BS Information Technology
    expect(compliance[0].course).toBe('BS Computer Science');
    expect(compliance[0].name).toBe('Abad, Eammiel Kurt');
    expect(compliance[0].yearLabel).toBe('3rd Year');
    expect(compliance[0].present).toBe(1);
    expect(compliance[0].absent).toBe(1);
    expect(compliance[0].totalRequired).toBe(2);
    expect(compliance[0].ratio).toBe('1 / 2');
    expect(compliance[0].complianceRate).toBe('50%');

    // 2. In BS IT, 1st Year (Borres) comes before 2nd Year (Vargas)
    expect(compliance[1].course).toBe('BS Information Technology');
    expect(compliance[1].name).toBe('Borres, John Lorenz');
    expect(compliance[1].yearLabel).toBe('1st Year');
    expect(compliance[1].present).toBe(2);
    expect(compliance[1].absent).toBe(0);
    expect(compliance[1].totalRequired).toBe(2);
    expect(compliance[1].ratio).toBe('2 / 2');
    expect(compliance[1].complianceRate).toBe('100%');

    // 3. 2nd Year (Vargas)
    expect(compliance[2].course).toBe('BS Information Technology');
    expect(compliance[2].name).toBe('Vargas, Jan Matthew');
    expect(compliance[2].yearLabel).toBe('2nd Year');
    expect(compliance[2].present).toBe(1);
    expect(compliance[2].absent).toBe(1);
    expect(compliance[2].ratio).toBe('1 / 2');
    expect(compliance[2].complianceRate).toBe('50%');
  });

  it('successfully builds Excel workbook with valid sheet names', async () => {
    const { buildExcelWorkbook } = await import('./reportExports');
    const mockRows = [
      {
        id: 's1::sess1',
        name: 'Abad, Eammiel Kurt Oblianda',
        initials: 'AE',
        avatarBg: '',
        avatarColor: '',
        course: 'BS Information Technology',
        yearLevel: 3,
        event: 'French',
        session: 'Day 4 - Morning Session',
        day: 'Day 4',
        period: 'Morning',
        timeIn: '7:27 AM',
        timeOut: '-',
        adminOfficer: 'LEO Admin',
        status: 'Time In Only' as const,
      },
    ];

    const book = buildExcelWorkbook(mockRows, {
      summary: { studentsCheckedIn: 1, timeIns: 1, timeOuts: 0, totalScans: 1 },
      filters: {
        academicTerm: '2026-2027 · 1st Sem',
        event: 'French',
        day: 'All Days',
        session: 'All Sessions',
        course: 'All Courses',
        type: 'All Types',
        location: 'All Locations',
        dateRange: '2026-11-01 to 2026-11-27',
        generatedAt: 'Nov 27, 2026',
      },
    });

    expect(book.SheetNames).toEqual([
      'Attendance Summary',
      'Student Compliance',
      'Attendance Records',
    ]);
    for (const sheetName of book.SheetNames) {
      expect(sheetName).not.toMatch(/[:\\/?*\[\]]/);
      expect(sheetName.length).toBeLessThanOrEqual(31);
    }
  });

  it('includes zero-attendance students from master roster in compliance rows', () => {
    const mockRows = [
      {
        id: 's1::sess1',
        name: 'Abad, Eammiel Kurt Oblianda',
        initials: 'AE',
        avatarBg: '',
        avatarColor: '',
        course: 'BS Information Technology',
        yearLevel: 3,
        event: 'French',
        session: 'Day 4 - Morning Session',
        day: 'Day 4',
        period: 'Morning',
        timeIn: '7:27 AM',
        timeOut: '-',
        adminOfficer: 'LEO Admin',
        status: 'Time In Only' as const,
      },
    ];

    const allStudents = [
      { id: 's1', name: 'Abad, Eammiel Kurt Oblianda', course: 'BS Information Technology', year_level: 3 },
      { id: 's2', name: 'Absent Student', course: 'BS Information Technology', year_level: 1 },
    ];

    const compliance = buildStudentComplianceRows(mockRows, {
      allStudents,
      sessionBreakdown: [
        { id: '1', name: 'Day 1', timeIns: 1, timeOuts: 1 },
        { id: '2', name: 'Day 2', timeIns: 1, timeOuts: 1 },
      ],
    });

    expect(compliance).toHaveLength(2);
    const absent = compliance.find((c) => c.name === 'Absent Student');
    expect(absent).toBeDefined();
    expect(absent?.present).toBe(0);
    expect(absent?.absent).toBe(2);
    expect(absent?.ratio).toBe('0 / 2');
    expect(absent?.complianceRate).toBe('0%');

    const attended = compliance.find((c) => c.name === 'Abad, Eammiel Kurt Oblianda');
    expect(attended).toBeDefined();
    expect(attended?.present).toBe(1);
    expect(attended?.absent).toBe(1);
    expect(attended?.ratio).toBe('1 / 2');
    expect(attended?.complianceRate).toBe('50%');
  });

  it('inserts blank spacing rows below each course and per year level in Student Compliance sheet', async () => {
    const { buildExcelWorkbook } = await import('./reportExports');
    const XLSX = await import('xlsx');
    const allStudents = [
      { id: '1', name: 'Student CPE 2', course: 'BS Computer Engineering', year_level: 2 },
      { id: '2', name: 'Student CS 2', course: 'BS Computer Science', year_level: 2 },
      { id: '3', name: 'Student CS 3A', course: 'BS Computer Science', year_level: 3 },
      { id: '4', name: 'Student CS 3B', course: 'BS Computer Science', year_level: 3 },
      { id: '5', name: 'Student ECE 1', course: 'BS Electronics Engineering', year_level: 1 },
    ];

    const book = buildExcelWorkbook([], {
      allStudents,
      sessionBreakdown: [{ id: '1', name: 'Session 1', timeIns: 0, timeOuts: 0 }],
    });

    const sheet = book.Sheets['Student Compliance'];
    const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Header row is index 0
    expect(aoa[0]).toEqual(STUDENT_COMPLIANCE_HEADERS);

    // Row 1: Student CPE 2
    expect(aoa[1][0]).toBe('BS Computer Engineering');
    expect(aoa[1][1]).toBe('2nd Year');

    // Row 2: BLANK row separating BS Computer Engineering (course change)
    expect(aoa[2]).toEqual([]);

    // Row 3: Student CS 2
    expect(aoa[3][0]).toBe('BS Computer Science');
    expect(aoa[3][1]).toBe('2nd Year');

    // Row 4: BLANK row separating BS Computer Science 2nd Year from 3rd Year (year change)
    expect(aoa[4]).toEqual([]);

    // Row 5: Student CS 3A
    expect(aoa[5][0]).toBe('BS Computer Science');
    expect(aoa[5][1]).toBe('3rd Year');

    // Row 6: Student CS 3B (same course, same year -> no blank row between them)
    expect(aoa[6][0]).toBe('BS Computer Science');
    expect(aoa[6][1]).toBe('3rd Year');

    // Row 7: BLANK row separating BS Computer Science from BS Electronics Engineering (course change)
    expect(aoa[7]).toEqual([]);

    // Row 8: Student ECE 1
    expect(aoa[8][0]).toBe('BS Electronics Engineering');
    expect(aoa[8][1]).toBe('1st Year');
  });
});
