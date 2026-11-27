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
});
