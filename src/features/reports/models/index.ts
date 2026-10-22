export interface SessionAttendanceReport {
  session: string;
  date: string;
  registered: number;
  attended: number;
  rate: string;
  onTimeRate: string;
}

export interface AttendanceAnalyticsSummary {
  overallTurnoutRate: string;
  onTimePunctuality: string;
  totalCheckIns: string;
}
