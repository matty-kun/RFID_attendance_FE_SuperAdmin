import { describe, it, expect } from 'vitest';
import {
  REPORT_EXPORT_HEADERS,
  formatReportSessionLabel,
  buildReportExportRowValues,
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

  it('builds 7-column export rows cleanly with "-" fallbacks', () => {
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
      status: 'Time In Only',
    });

    expect(values).toEqual([
      'Juan Dela Cruz',
      'BS Information Technology',
      'Cite Fest 2026',
      'Day 2 - Morning Session',
      '7:05 AM',
      '-',
      'Time In Only',
    ]);
  });
});
