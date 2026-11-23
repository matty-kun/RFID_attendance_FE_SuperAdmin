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
 */
export function formatReportSessionLabel(
  row: Pick<ReportStudentAttendanceRow, 'session' | 'day' | 'period'>
): string {
  const session = (row.session || '').trim();
  const day = (row.day || '').trim();
  const period = (row.period || '').trim();

  const validDay = day && day !== '-' ? day : '';
  const validPeriod = period && period !== '-' ? period : '';

  if (session && session !== '-') {
    const lower = session.toLowerCase();
    const parts = [session];
    if (validDay && !lower.includes(validDay.toLowerCase())) {
      parts.unshift(validDay);
    }
    if (validPeriod && !lower.includes(validPeriod.toLowerCase())) {
      parts.push(validPeriod);
    }
    return parts.join(' · ');
  }

  return [validDay, validPeriod].filter(Boolean).join(' · ') || '-';
}
