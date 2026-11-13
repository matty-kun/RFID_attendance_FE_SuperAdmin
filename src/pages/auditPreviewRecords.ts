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
  session: string;
  day: string;
  period: string;
  timeIn: string;
  timeOut: string;
  status: 'Completed' | 'Missing Out' | 'Time Out Only';
}
