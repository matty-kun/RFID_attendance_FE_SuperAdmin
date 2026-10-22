import { SessionAttendanceReport, AttendanceAnalyticsSummary } from '../models';

export const reportService = {
  async getReportData(): Promise<SessionAttendanceReport[]> {
    return [
      {
        session: 'Morning General Assembly',
        date: '2026-10-21',
        registered: 1250,
        attended: 1182,
        rate: '94.5%',
        onTimeRate: '91.2%',
      },
      {
        session: 'Afternoon Sports Competitions',
        date: '2026-10-21',
        registered: 1250,
        attended: 1160,
        rate: '92.8%',
        onTimeRate: '88.5%',
      },
      {
        session: 'Day 2 Championship Matches',
        date: '2026-10-22',
        registered: 1250,
        attended: 1210,
        rate: '96.8%',
        onTimeRate: '93.4%',
      },
    ];
  },

  async getSummary(): Promise<AttendanceAnalyticsSummary> {
    return {
      overallTurnoutRate: '94.7%',
      onTimePunctuality: '91.0%',
      totalCheckIns: '3,552',
    };
  },

  exportCsv(data: SessionAttendanceReport[]): void {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Session,Date,Registered,Attended,AttendanceRate,OnTimeRate\n' +
      data
        .map((e) => `${e.session},${e.date},${e.registered},${e.attended},${e.rate},${e.onTimeRate}`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RFID_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
