export interface ReportTrendDay {
  day: string;
  present: number;
  absent: number;
  presentPct: number;
  absentPct: number;
}

export interface ReportSessionItem {
  id: string;
  name: string;
  timeIns: number;
  timeOuts: number;
}

export interface ReportCheckpointItem {
  name: string;
  inScans: number;
  outScans: number;
  total: number;
}

export interface ReportCourseItem {
  course: string;
  expected: number;
  timeIn: number;
  timeOut: number;
}

export interface ReportStudentAttendanceRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  course: string;
  event: string;
  session: string;
  day: string;
  period: string;
  timeIn: string;
  timeOut: string;
  status: 'Completed' | 'Time In Only' | 'Time Out Only';
}

/**
 * Formats a concise, non-redundant Session label.
 * Avoids repeating Day or Period when the session name already contains them.
 * Cleans trailing or leading hyphens/dashes to prevent redundant punctuation.
 */
export function formatReportSessionLabel(
  row: Pick<ReportStudentAttendanceRow, 'session' | 'day' | 'period'>
): string {
  const rawSession = (row.session || '').trim();
  const rawDay = (row.day || '').trim();
  const rawPeriod = (row.period || '').trim();

  // Strip leading/trailing dashes, hyphens, and whitespace
  const cleanDay = rawDay.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
  const cleanPeriod = rawPeriod.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
  const cleanSession = rawSession.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();

  const validDay = cleanDay && cleanDay !== '-' ? cleanDay : '';
  const validPeriod = cleanPeriod && cleanPeriod !== '-' ? cleanPeriod : '';

  if (cleanSession && cleanSession !== '-') {
    const lower = cleanSession.toLowerCase();
    const parts = [cleanSession];
    if (validDay && !lower.includes(validDay.toLowerCase())) {
      parts.unshift(validDay);
    }
    const hasPeriodInSession =
      lower.includes('morning') ||
      lower.includes('afternoon') ||
      lower.includes('evening') ||
      lower.includes('session');
    if (validPeriod && !lower.includes(validPeriod.toLowerCase()) && !hasPeriodInSession) {
      parts.push(validPeriod);
    }
    return parts.join(' · ');
  }

  return [validDay, validPeriod].filter(Boolean).join(' · ') || '-';
}
