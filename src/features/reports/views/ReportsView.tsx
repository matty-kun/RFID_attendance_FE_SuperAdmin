import React from 'react';
import { useReportsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { Badge } from '../../../components/common/Badge';
import { Download, FileSpreadsheet, BarChart3, TrendingUp } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    reports,
    summary,
    isExporting,
    handleExportCSV,
  } = useReportsViewModel();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Analytics & Reports</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Aggregated attendance audit, punctuality breakdowns, and CSV exports for administration.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleExportCSV}
          isLoading={isExporting}
        >
          Export CSV Report
        </Button>
      </div>

      {/* Top Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Turnout</span>
              <BarChart3 className="w-5 h-5 text-brand-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {summary?.overallTurnoutRate ?? '94.7%'}
            </div>
            <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +2.3% higher than previous event
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Punctuality Rate</span>
              <Badge variant="emerald" dot>91% On-time</Badge>
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {summary?.onTimePunctuality ?? '91.0%'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Arrived within designated Time In window
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Check-ins</span>
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {summary?.totalCheckIns ?? '3,552'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Verified physical card scans logged</div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Session Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Window</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Enrolled Students</TableHead>
                <TableHead>Verified Attendees</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>On-Time Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((row) => (
                <TableRow key={row.session}>
                  <TableCell className="font-bold text-slate-800 text-sm">{row.session}</TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">{row.date}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-700">{row.registered}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-700">{row.attended}</TableCell>
                  <TableCell>
                    <Badge variant="emerald">{row.rate}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="purple">{row.onTimeRate}</Badge>
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
