import React from 'react';
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
  } = useAttendanceViewModel();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" /> RFID Attendance Audit
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time tap stream and validated attendance audit logs across campus sessions.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Feed
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Attendance Records</CardTitle>
            <Badge variant="open" dot>
              LIVE 5s SYNC
            </Badge>
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

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>RFID Tag / Student ID</TableHead>
                <TableHead>Session Window</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Tap Type</TableHead>
                <TableHead>Validation Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No attendance records found.
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
                        {scan.student?.student_number || scan.student_id} • {scan.student?.course || 'Student'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {scan.rfid_tag_id || scan.student_id}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {scan.session?.name || scan.session_id}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {scan.location?.name || scan.location_id || 'Campus Gate'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={scan.type === 'time_in' ? 'time_in' : 'time_out'} size="sm">
                        {scan.type === 'time_in' ? 'Time In' : 'Time Out'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          scan.status === 'on_time'
                            ? 'on_time'
                            : scan.status === 'late'
                            ? 'late'
                            : 'missed'
                        }
                        size="sm"
                        dot
                      >
                        {scan.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {new Date(scan.recorded_at || scan.scanned_at || Date.now()).toLocaleTimeString([], {
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
        </CardContent>
      </Card>
    </div>
  );
};
