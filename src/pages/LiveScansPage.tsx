import React, { useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { AttendanceRecord } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/common/Table';
import { Radio, RefreshCw, Filter } from 'lucide-react';

export const LiveScansPage: React.FC = () => {
  const [scans, setScans] = useState<AttendanceRecord[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'time_in' | 'time_out'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchScans = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getRecentScans(30);
      setScans(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
    const interval = setInterval(fetchScans, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredScans = scans.filter((sc) => {
    if (filterType === 'all') return true;
    return sc.type === filterType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" /> Live RFID Telemetry
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time tap stream from all active physical USB OTG & Bluetooth campus kiosks.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchScans} isLoading={isLoading} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Stream
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Scan Audit Stream</CardTitle>
            <Badge variant="open" dot>
              LIVE 5s POLL
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-700"
            >
              <option value="all">All Scan Types</option>
              <option value="time_in">Time In Only</option>
              <option value="time_out">Time Out Only</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Scan Type</TableHead>
                <TableHead>Kiosk Venue</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                    No matching scans recorded.
                  </TableCell>
                </TableRow>
              ) : (
                filteredScans.map((sc) => (
                  <TableRow key={sc.id}>
                    <TableCell className="font-bold text-slate-900">{sc.student?.name || 'Juan Dela Cruz'}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{sc.student?.student_id || '2026-00001'}</TableCell>
                    <TableCell>
                      <Badge variant={sc.type === 'time_in' ? 'success' : 'purple'} dot>
                        {sc.type === 'time_in' ? 'TIME IN' : 'TIME OUT'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">{sc.location?.name || 'Gymnasium - Gate 1'}</TableCell>
                    <TableCell className="text-xs text-slate-500">{sc.session?.name || 'Afternoon Sports Competitions'}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-400">
                      {new Date(sc.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
