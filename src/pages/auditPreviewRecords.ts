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

export type AttendanceStatus = 'Completed' | 'Missing Out' | 'Time Out Only' | 'No Time-Out' | 'No Time-In';

export interface ReportStudentAttendanceRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarColor: string;
  course: string;
  session: string;
  day: string;
  period: string;
  timeIn: string;
  timeOut: string;
  status: AttendanceStatus;
}

export function formatReportSession(session?: string | null, day?: string | null, period?: string | null): string {
  let s = (session || '').trim();
  s = s.replace(/\s+session$/i, '');
  s = s.replace(/\s*[-–—]\s*/g, ' · ');
  if (!/day\s*\d+/i.test(s) && day) {
    s = `${day}${s ? ` · ${s}` : period ? ` · ${period}` : ''}`;
  }
  return s || (day ? `${day}${period ? ` · ${period}` : ''}` : period || 'General');
}

export function formatReportStatus(status: string): 'Completed' | 'No Time-Out' | 'No Time-In' {
  if (status === 'Completed' || status === 'Complete') return 'Completed';
  if (status === 'Missing Out' || status === 'No Time-Out' || status === 'time_in_only') return 'No Time-Out';
  if (status === 'Time Out Only' || status === 'No Time-In' || status === 'time_out_only') return 'No Time-In';
  return 'No Time-Out';
}
