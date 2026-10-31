import React from 'react';
import { EmptyState } from '../../../components/common/EmptyState';
import { useAttendanceViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { Radio, RefreshCw, Filter } from 'lucide-react';

export const AttendanceListView: React.FC = () => {
  const {
    filteredRecords,
    filterType,
    setFilterType,
    isLoading,
    refresh,
    startDate, setStartDate, endDate, setEndDate, page, setPage, total, error,
  } = useAttendanceViewModel();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" /> Attendance Records
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Recorded time-in and time-out scans across campus sessions.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Attendance Records</CardTitle>
            <Badge variant="open">{total} records</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filter:</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'time_in', 'time_out'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterType === type
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'time_in' ? 'Time In' : 'Time Out'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="flex flex-wrap gap-3 px-6 pb-4 text-xs text-slate-600">
          <label>From <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="ml-2 rounded border border-slate-200 p-2" /></label>
          <label>To <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="ml-2 rounded border border-slate-200 p-2" /></label>
        </div>

        <CardContent className="p-0">
          {error && <p role="alert" className="px-6 pb-3 text-sm text-rose-600">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Tap Type</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      variant={filterType !== 'all' || startDate || endDate ? 'no-search-results' : 'empty-list'}
                      title={filterType !== 'all' || startDate || endDate ? 'No matching attendance scans' : 'No attendance records yet'}
                      description={
                        filterType !== 'all' || startDate || endDate
                          ? 'No scan records match the selected type or date filters.'
                          : 'Live card scans from checkpoints will appear here in real-time.'
                      }
                      action={
                        filterType !== 'all' || startDate || endDate
                          ? {
                              label: 'Reset Filters',
                              variant: 'secondary',
                              onClick: () => {
                                setFilterType('all');
                                setStartDate('');
                                setEndDate('');
                                setPage(1);
                              },
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-sm">
                        {scan.student?.name || 'Unknown Student'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {scan.student?.course || 'Student'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {scan.student?.student_id || scan.student_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {scan.session?.name || scan.session_id}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {scan.location?.name || scan.location_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant={scan.type === 'time_in' ? 'time_in' : 'time_out'} size="sm">
                        {scan.type === 'time_in' ? 'Time In' : 'Time Out'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {new Date(scan.recorded_at).toLocaleString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            <span>Page {page} of {Math.max(1, Math.ceil(total / 30))}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1 || isLoading}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page * 30 >= total || isLoading}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
