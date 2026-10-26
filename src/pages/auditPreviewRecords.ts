export interface ReportTrendDay {
  day: string;
  present: number;
  absent: number;
  presentPct: number;
  absentPct: number;
}

export interface ReportSessionItem {
  name: string;
  expected: number;
  timeIns: number;
  timeOuts: number;
  noRecord: number;
  rate: string;
  rateBadgeColor: string;
}

export interface ReportCheckpointItem {
  name: string;
  inScans: number;
  outScans: number;
  total: number;
}

export interface ReportIssueItem {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  badgeBg: string;
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
  session: string;
  timeIn: string;
  timeOut: string;
  status: 'Completed' | 'Missing Out' | 'No Record';
}
