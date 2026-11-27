import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  GraduationCap,
  Check,
  Printer,
} from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { request } from '../../services/apiClient';
import { adminService } from '../../services/adminService';
import type { SessionRecord } from '../../types';
import type { RecordedScan } from '../../features/students/views/studentScan';
import { cn } from '../../utils/cn';

export interface StudentAttendanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName?: string;
  studentNumber?: string;
  studentCourse?: string;
  studentYearLevel?: number;
  eventId?: string | 'all';
  eventName?: string;
  termName?: string;
}

interface SessionAttendanceDetail {
  session: SessionRecord;
  timeInScan?: RecordedScan;
  timeOutScan?: RecordedScan;
  status: 'completed' | 'time_in_only' | 'time_out_only' | 'missed';
}

const formatWindowTime = (val?: string | null) => {
  if (!val) return '';
  return new Date(`2000-01-01T${val}+08:00`).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
};

const formatScanTime = (val?: string | null) => {
  if (!val) return '--:--';
  return new Date(val).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
};

const formatDateLong = (val?: string | null) => {
  if (!val) return 'Date TBD';
  const d = new Date(`${val.substring(0, 10)}T00:00:00+08:00`);
  return d.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
};

export const StudentAttendanceDrawer: React.FC<StudentAttendanceDrawerProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName = 'Student Attendance',
  studentNumber,
  studentCourse,
  studentYearLevel,
  eventId = 'all',
  eventName,
  termName,
}) => {
  const [loading, setLoading] = useState(false);
  const [scans, setScans] = useState<RecordedScan[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'missed' | 'attended'>('all');

  // Load student scans and event sessions
  useEffect(() => {
    if (!isOpen || !studentId) {
      setScans([]);
      setSessions([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const scansPromise = request
          .get<{ scans: RecordedScan[] }>(`/students/${studentId}/scans`)
          .then((res) => res.scans || [])
          .catch(() => [] as RecordedScan[]);

        let sessionsPromise: Promise<SessionRecord[]>;
        if (eventId && eventId !== 'all') {
          sessionsPromise = adminService.getSessions(eventId).catch(() => [] as SessionRecord[]);
        } else {
          sessionsPromise = Promise.resolve([]);
        }

        const [fetchedScans, fetchedSessions] = await Promise.all([scansPromise, sessionsPromise]);

        if (!isMounted) return;

        setScans(fetchedScans);

        // If specific event sessions fetched, use them.
        // Otherwise derive unique sessions from student's historical scans.
        if (fetchedSessions.length > 0) {
          setSessions(fetchedSessions);
        } else {
          const sessionMap = new Map<string, SessionRecord>();
          for (const s of fetchedScans) {
            if (s.session?.id && !sessionMap.has(s.session.id)) {
              sessionMap.set(s.session.id, {
                id: s.session.id,
                event_id: s.session.event_id,
                name: s.session.name,
                date: s.session.date,
                time_in_start: s.session.time_in_start,
                time_in_end: s.session.time_in_end,
                time_out_start: s.session.time_out_start,
                time_out_end: s.session.time_out_end,
                event: { name: s.session.event_name || 'Campus Event' },
              });
            }
          }
          setSessions(Array.from(sessionMap.values()));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, studentId, eventId]);

  // Map each session to student's attendance records
  const sessionDetails: SessionAttendanceDetail[] = useMemo(() => {
    // Sort sessions chronologically
    const sorted = [...sessions].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.time_in_start || '').localeCompare(b.time_in_start || '');
    });

    return sorted.map((session) => {
      // Find scans for this session
      const matchingScans = scans.filter(
        (s) => s.session?.id === session.id || (s as any).session_id === session.id
      );

      const inScan = matchingScans.find((s) => s.type === 'time_in');
      const outScan = matchingScans.find((s) => s.type === 'time_out');

      let status: SessionAttendanceDetail['status'] = 'missed';
      if (inScan && outScan) {
        status = 'completed';
      } else if (inScan) {
        status = 'time_in_only';
      } else if (outScan) {
        status = 'time_out_only';
      }

      return {
        session,
        timeInScan: inScan,
        timeOutScan: outScan,
        status,
      };
    });
  }, [sessions, scans]);

  // Aggregate stats (The Dean's X/Y Compliance Metric)
  const stats = useMemo(() => {
    const total = sessionDetails.length;
    const completed = sessionDetails.filter((s) => s.status === 'completed').length;
    const partial = sessionDetails.filter(
      (s) => s.status === 'time_in_only' || s.status === 'time_out_only'
    ).length;
    const attended = completed + partial;
    const missed = sessionDetails.filter((s) => s.status === 'missed').length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    let standing: { label: string; bg: string; text: string; border: string } = {
      label: 'Good Standing',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    };
    if (rate < 50) {
      standing = {
        label: 'Critical / At Risk',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
      };
    } else if (rate < 75) {
      standing = {
        label: 'Needs Attention',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
      };
    }

    return { total, completed, partial, attended, missed, rate, standing };
  }, [sessionDetails]);

  // Filtered session list
  const filteredList = useMemo(() => {
    if (filterMode === 'missed') {
      return sessionDetails.filter((s) => s.status === 'missed');
    }
    if (filterMode === 'attended') {
      return sessionDetails.filter((s) => s.status !== 'missed');
    }
    return sessionDetails;
  }, [sessionDetails, filterMode]);

  // Group by Date for day-by-day checklist
  const groupedByDay = useMemo(() => {
    const map = new Map<string, SessionAttendanceDetail[]>();
    for (const item of filteredList) {
      const dateKey = item.session.date ? item.session.date.substring(0, 10) : 'Undated';
      const list = map.get(dateKey) || [];
      list.push(item);
      map.set(dateKey, list);
    }
    return Array.from(map.entries());
  }, [filteredList]);

  // Print attendance slip
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title="Student Attendance Compliance"
      description={
        termName
          ? `Detailed attendance record & day-by-day session checklist for ${termName}`
          : 'Detailed attendance record & day-by-day session checklist'
      }
      icon={<GraduationCap className="h-5 w-5 text-[#7026B7]" />}
    >
      <div className="space-y-6 pb-8">
        {/* Student Profile Hero Header */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-gradient-to-br from-white via-[#FAF7FD] to-[#F5EEFB] p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7026B7] to-[#9333EA] text-lg font-black text-white shadow-sm">
                {studentName
                  .split(' ')
                  .filter(Boolean)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'ST'}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-[#24133F]">{studentName}</h3>
                  {studentNumber && (
                    <span className="rounded-lg bg-white/90 border border-[#E5E0EB] px-2 py-0.5 font-mono text-[11px] font-bold text-[#756883]">
                      {studentNumber}
                    </span>
                  )}
                </div>

                <p className="mt-1 flex items-center gap-1.5 text-xs text-[#756883]">
                  <GraduationCap className="h-3.5 w-3.5 text-[#7026B7]" />
                  <span>
                    {studentCourse || 'Enrolled Student'}
                    {studentYearLevel ? ` · Year ${studentYearLevel}` : ''}
                  </span>
                </p>

                {eventName && (
                  <p className="mt-0.5 text-[11px] font-medium text-[#7026B7]">
                    Event: {eventName}
                  </p>
                )}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="gap-1.5 text-xs self-start sm:self-auto cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Record
            </Button>
          </div>
        </div>

        {/* Dean's Requirement: Big X/Y Attendance KPI Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. X/Y Sessions */}
          <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">
              Attendance Ratio
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#24133F]">
                {stats.attended}
              </span>
              <span className="text-sm font-bold text-[#A59AAB]">
                / {stats.total}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-[#756883]">
              Sessions attended
            </p>
          </div>

          {/* 2. Attendance Rate */}
          <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">
              Attendance Rate
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span
                className={cn(
                  'text-2xl font-black',
                  stats.rate >= 80
                    ? 'text-emerald-700'
                    : stats.rate >= 50
                    ? 'text-amber-600'
                    : 'text-rose-600'
                )}
              >
                {stats.rate}%
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  stats.rate >= 80
                    ? 'bg-emerald-500'
                    : stats.rate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
                style={{ width: `${Math.min(100, stats.rate)}%` }}
              />
            </div>
          </div>

          {/* 3. Completed Sessions */}
          <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">
              Completed
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-700">
                {stats.completed}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-[#756883]">
              Both Time-In & Out
            </p>
          </div>

          {/* 4. Missed Sessions (Dean's drill down) */}
          <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">
              Missed Sessions
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span
                className={cn(
                  'text-2xl font-black',
                  stats.missed > 0 ? 'text-rose-600' : 'text-slate-400'
                )}
              >
                {stats.missed}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-[#756883]">
              {stats.missed === 0 ? 'Zero absences' : 'Absent / unrecorded'}
            </p>
          </div>
        </div>

        {/* Filter Tabs for Quick Review */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1EEF4] pb-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                filterMode === 'all'
                  ? 'bg-white text-[#7026B7] shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              )}
            >
              All Sessions ({sessionDetails.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('missed')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                filterMode === 'missed'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              )}
            >
              Missed / Absent ({stats.missed})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('attended')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                filterMode === 'attended'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-[#756883] hover:text-[#24133F]'
              )}
            >
              Attended ({stats.attended})
            </button>
          </div>

          {/* Compliance Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border',
              stats.standing.bg,
              stats.standing.text,
              stats.standing.border
            )}
          >
            {stats.rate >= 80 ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5" />
            )}
            {stats.standing.label}
          </span>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="rounded-2xl border border-[#E5E0EB] bg-white p-12 text-center space-y-3">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-[3px] border-[#E9DCFA] border-t-[#7026B7]" />
            <p className="text-xs text-[#756883]">Loading attendance timeline…</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && groupedByDay.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#E5E0EB] bg-[#FAF8FB] p-8 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#7026B7]">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-[#24133F]">No sessions match this filter</p>
            <p className="text-[11px] text-[#756883]">
              {filterMode === 'missed'
                ? 'Great job! This student has zero missed sessions.'
                : 'No session activity recorded.'}
            </p>
          </div>
        )}

        {/* Dean's Drill-Down: Day-by-Day Session Timeline Checklist */}
        {!loading && groupedByDay.length > 0 && (
          <div className="space-y-4">
            {groupedByDay.map(([dateKey, daySessions], dayIdx) => (
              <div
                key={dateKey}
                className="overflow-hidden rounded-2xl border border-[#E5E0EB] bg-white shadow-2xs"
              >
                {/* Day Header Banner */}
                <div className="flex items-center justify-between border-b border-[#F1EEF4] bg-[#FAF8FB] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7026B7] text-[11px] font-bold text-white">
                      {dayIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-[#24133F]">
                      Day {dayIdx + 1}
                    </span>
                    <span className="text-xs text-[#756883]">·</span>
                    <span className="text-xs text-[#756883]">
                      {formatDateLong(dateKey)}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-[#756883]">
                    {daySessions.filter((s) => s.status !== 'missed').length} /{' '}
                    {daySessions.length} present
                  </span>
                </div>

                {/* Sessions in this day */}
                <div className="divide-y divide-[#F1EEF4]">
                  {daySessions.map(({ session, timeInScan, timeOutScan, status }) => {
                    const isCompleted = status === 'completed';
                    const isTimeInOnly = status === 'time_in_only';
                    const isTimeOutOnly = status === 'time_out_only';
                    const isMissed = status === 'missed';

                    return (
                      <div
                        key={session.id}
                        className={cn(
                          'p-4 transition-colors',
                          isMissed ? 'bg-rose-50/20' : 'hover:bg-slate-50/50'
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Session Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#24133F]">
                                {session.name}
                              </span>

                              {/* Status Badge */}
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                                  <Check className="h-3 w-3" />
                                  Present
                                </span>
                              )}
                              {isTimeInOnly && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-200">
                                  <Clock className="h-3 w-3" />
                                  Time In Only
                                </span>
                              )}
                              {isTimeOutOnly && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 border border-amber-200">
                                  <Clock className="h-3 w-3" />
                                  Time Out Only
                                </span>
                              )}
                              {isMissed && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 border border-rose-200">
                                  <XCircle className="h-3 w-3" />
                                  Missed / Absent
                                </span>
                              )}
                            </div>

                            {/* Session Windows */}
                            <p className="flex items-center gap-1.5 text-[11px] text-[#756883]">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>
                                Window: {formatWindowTime(session.time_in_start)} –{' '}
                                {formatWindowTime(session.time_out_end || session.time_in_end)}
                              </span>
                            </p>
                          </div>

                          {/* Timestamps & Checkpoint Info */}
                          <div className="text-right">
                            {isMissed ? (
                              <p className="text-[11px] font-semibold text-rose-600">
                                No attendance scan recorded
                              </p>
                            ) : (
                              <div className="flex items-center gap-4 text-xs">
                                {/* Time In Details */}
                                <div>
                                  <span className="block text-[10px] font-bold text-[#A59AAB] uppercase tracking-wider">
                                    Time In
                                  </span>
                                  <span
                                    className={cn(
                                      'font-bold font-mono',
                                      timeInScan ? 'text-emerald-700' : 'text-slate-400'
                                    )}
                                  >
                                    {formatScanTime(timeInScan?.recorded_at)}
                                  </span>
                                  {timeInScan?.location_name && (
                                    <span className="block text-[10px] text-[#756883] truncate max-w-[130px]">
                                      {timeInScan.location_name}
                                    </span>
                                  )}
                                </div>

                                <div className="h-6 w-[1px] bg-slate-200" />

                                {/* Time Out Details */}
                                <div>
                                  <span className="block text-[10px] font-bold text-[#A59AAB] uppercase tracking-wider">
                                    Time Out
                                  </span>
                                  <span
                                    className={cn(
                                      'font-bold font-mono',
                                      timeOutScan ? 'text-purple-700' : 'text-slate-400'
                                    )}
                                  >
                                    {formatScanTime(timeOutScan?.recorded_at)}
                                  </span>
                                  {timeOutScan?.location_name && (
                                    <span className="block text-[10px] text-[#756883] truncate max-w-[130px]">
                                      {timeOutScan.location_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default StudentAttendanceDrawer;
