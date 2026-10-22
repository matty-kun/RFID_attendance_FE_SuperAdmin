import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Download, FileSpreadsheet, BarChart3, TrendingUp } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const reportData = [
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

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        'Session,Date,Registered,Attended,AttendanceRate,OnTimeRate\n' +
        reportData.map((e) => `${e.session},${e.date},${e.registered},${e.attended},${e.rate},${e.onTimeRate}`).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `RFID_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Analytics & Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Export official tournament attendance statistics and student compliance reports.
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          isLoading={isExporting}
          leftIcon={<Download className="w-4 h-4" />}
          className="bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-emerald-900/30"
        >
          Export CSV Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Attendance Rate</p>
              <h3 className="text-2xl font-black text-slate-900">94.7%</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Scans Recorded</p>
              <h3 className="text-2xl font-black text-slate-900">3,552</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Students</p>
              <h3 className="text-2xl font-black text-slate-900">1,250</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Attendance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Target Students</TableHead>
                <TableHead>Unique Attended</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>On-Time Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-bold text-slate-900">{row.session}</TableCell>
                  <TableCell className="text-xs font-medium text-slate-500">{row.date}</TableCell>
                  <TableCell className="text-xs text-slate-600">{row.registered}</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">{row.attended}</TableCell>
                  <TableCell>
                    <Badge variant="open" dot>
                      {row.rate}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="purple" dot>
                      {row.onTimeRate}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
