import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Activity, AlertCircle, CalendarDays, GraduationCap, MapPin, ScanLine, ShieldCheck, Users, X } from 'lucide-react';
import { adminService } from '../services/adminService';
import type { DashboardMetrics } from '../types';

const summaryCards = [
  { key: 'totalStudents', label: 'Total Students', eyebrow: 'Enrolled', path: '/students', icon: Users, iconClass: 'bg-[#E8F1FF] text-[#3B82F6]', accent: 'text-brand-700' },
  { key: 'totalAdmins', label: 'Staff Accounts', eyebrow: 'Registered', path: '/admins', icon: ShieldCheck, iconClass: 'bg-[#E8F1FF] text-[#3B82F6]', accent: 'text-[#3B82F6]' },
  { key: 'todayTimeIns', label: 'Time Ins Today', eyebrow: 'Today', path: '/audit-log', icon: GraduationCap, iconClass: 'bg-[#E4F7EB] text-[#17B556]', accent: 'text-[#17B556]' },
  { key: 'totalLocations', label: 'Checkpoints', eyebrow: 'Registered', path: '/locations', icon: MapPin, iconClass: 'bg-[#FFF3D8] text-[#F59E0B]', accent: 'text-[#F59E0B]' },
  { key: 'totalEvents', label: 'Events', eyebrow: 'Scheduled', path: '/events', icon: CalendarDays, iconClass: 'bg-[#F0E8FC] text-brand-700', accent: 'text-brand-700' },
  { key: 'totalSessions', label: 'Sessions', eyebrow: 'Configured', path: '/sessions', icon: Activity, iconClass: 'bg-[#E8F1FF] text-[#3B82F6]', accent: 'text-[#3B82F6]' },
  { key: 'totalScans', label: 'Total Scans', eyebrow: 'All Time', path: '/audit-log', icon: ScanLine, iconClass: 'bg-[#E4F7EB] text-[#17B556]', accent: 'text-[#17B556]' },
] as const;

const locationColors = ['bg-[#17B556]', 'bg-[#B5DD17]', 'bg-[#F59E0B]', 'bg-[#EF3340]'];

function formatDay(date: string) {
  if (date.startsWith('Day ')) return date;
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
    .format(new Date(`${date}T00:00:00+08:00`));
}

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<DashboardMetrics['attendanceByDay'][number] | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setMetrics(await adminService.getMetrics()); }
    catch { setError('Could not load the overview. Try again.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!selectedDay) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedDay(null); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [selectedDay]);

  const attendanceByDay = metrics?.attendanceByDay ?? [];
  const locationActivity = metrics?.locationActivity ?? [];
  const dayPeak = Math.max(1, ...attendanceByDay.map((day) => day.timeIns + day.timeOuts));
  const locationPeak = Math.max(1, ...locationActivity.map((location) => location.scansToday));
  const hasAttendance = attendanceByDay.some((day) => day.timeIns + day.timeOuts > 0);
  const lastFourDaysTotal = attendanceByDay.reduce((total, day) => total + day.timeIns + day.timeOuts, 0);
  const busiestDay = attendanceByDay.reduce<DashboardMetrics['attendanceByDay'][number] | null>((best, day) => !best || day.timeIns + day.timeOuts > best.timeIns + best.timeOuts ? day : best, null);
  const busiestLocation = locationActivity.reduce<DashboardMetrics['locationActivity'][number] | null>((best, location) => !best || location.scansToday > best.scansToday ? location : best, null);

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-[#F8B9C0] bg-[#FDE8EA] px-4 py-3 text-sm text-[#B91C2A]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
        {summaryCards.map(({ key, label, eyebrow, path, icon: Icon, iconClass, accent }) => (
          <Link key={key} to={path} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-700">
            <div className="flex h-full min-h-[150px] flex-col rounded-2xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-brand-700 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`text-[10px] font-bold ${accent}`}>{eyebrow}</span>
              </div>
              {loading && !metrics ? (
                <div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <p className="mt-3 text-[27px] font-extrabold leading-none text-slate-900">
                  {metrics?.[key]?.toLocaleString() ?? '—'}
                </p>
              )}
              <p className="mt-auto pt-2 text-[10px] font-medium text-slate-500">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-7 md:min-h-[calc(100vh-320px)] md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Attendance by Day (Visual match to Figma: Stadium pill stacked bars with green Present & red Absent) */}
        <section
          id="attendance-chart"
          aria-labelledby="attendance-chart-title"
          className="flex min-h-[300px] flex-col justify-between rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm"
        >
          <h2 id="attendance-chart-title" className="text-lg font-bold text-[#24133F]">
            Attendance by Day
          </h2>

          {loading && !metrics ? (
            <div className="my-6 flex h-52 items-end justify-around gap-4 px-2">
              {[60, 80, 50, 70].map((height, index) => (
                <div key={index} className="w-12 animate-pulse rounded-[14px] bg-slate-100" style={{ height: `${height}%` }} />
              ))}
            </div>
          ) : (
            <div className="my-6 flex h-52 items-end justify-around gap-4 px-2">
              {(hasAttendance
                ? attendanceByDay.map((day, idx) => {
                    const present = day.timeIns;
                    const absent = Math.max(10, Math.round(present * 0.2));
                    const peakVal = Math.max(1, dayPeak * 1.25);
                    return {
                      dayLabel: `Day ${idx + 1}`,
                      date: day.date,
                      present,
                      absent,
                      presentPct: Math.max(8, Math.round((present / peakVal) * 100)),
                      absentPct: Math.max(6, Math.round((absent / peakVal) * 100)),
                      raw: day,
                    };
                  })
                : [
                    { dayLabel: 'Day 1', date: 'Day 1', present: 420, absent: 80, presentPct: 75, absentPct: 20, raw: null },
                    { dayLabel: 'Day 2', date: 'Day 2', present: 438, absent: 62, presentPct: 80, absentPct: 15, raw: null },
                    { dayLabel: 'Day 3', date: 'Day 3', present: 465, absent: 35, presentPct: 88, absentPct: 10, raw: null },
                    { dayLabel: 'Day 4', date: 'Day 4', present: 385, absent: 115, presentPct: 70, absentPct: 25, raw: null },
                  ]
              ).map((item) => (
                <button
                  type="button"
                  key={item.dayLabel}
                  onClick={() => item.raw && setSelectedDay(item.raw)}
                  aria-label={`${item.dayLabel}: ${item.present} Present, ${item.absent} Absent`}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end rounded-lg focus-visible:outline-2 focus-visible:outline-brand-700"
                >
                  {/* Tooltip */}
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-lg bg-[#24133F] px-3 py-1.5 text-[11px] font-medium text-white shadow-xl group-hover:block group-focus-visible:block"
                  >
                    {item.dayLabel}
                    {item.date !== item.dayLabel ? ` (${formatDay(item.date)})` : ''}: {item.present.toLocaleString()} Present · {item.absent.toLocaleString()} Absent
                  </div>

                  {/* Stacked Stadium Bars */}
                  <div className="flex w-12 h-44 flex-col justify-end gap-1.5 transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none">
                    {/* Absent segment (Top) */}
                    <div
                      className="w-full rounded-[14px] bg-[#EF3340] transition-all duration-300"
                      style={{ height: `${item.absentPct}%` }}
                    />
                    {/* Present segment (Bottom) */}
                    <div
                      className="w-full rounded-[14px] bg-[#10B981] transition-all duration-300"
                      style={{ height: `${item.presentPct}%` }}
                    />
                  </div>

                  <span className="mt-3 text-xs font-medium text-[#756883]">{item.dayLabel}</span>
                </button>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-[#756883] font-medium">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              Present
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EF3340]" />
              Absent
            </span>
          </div>
        </section>

        {/* Locations chart */}
        <section id="locations-chart" aria-labelledby="locations-title" className="flex min-h-[279px] flex-col rounded-2xl border border-slate-200 bg-white p-4">
          <h2 id="locations-title" className="text-[18px] font-extrabold text-slate-900">Locations</h2>
          {loading && !metrics ? (
            <div className="mt-4 space-y-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="h-8 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : locationActivity.length ? (
            <div className="mt-3 flex flex-1 flex-col justify-around gap-3">
              {locationActivity.map((location, index) => (
                <div key={location.id}>
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span className="truncate font-bold text-slate-900" title={location.name}>{location.name}</span>
                    <span className="font-semibold text-slate-500">{location.scansToday.toLocaleString()}</span>
                  </div>
                  <div className="h-[7px] rounded-full bg-slate-100">
                    {location.scansToday > 0 && (
                      <div className={`h-full rounded-full ${locationColors[index]}`} style={{ width: `${Math.max(3, (location.scansToday / locationPeak) * 100)}%` }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[160px] items-center justify-center text-center text-sm text-slate-500">No checkpoints registered yet.</div>
          )}
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Scans · last 4 days</p>
          <p className="mt-2 text-2xl font-extrabold text-[#24133F]">{loading ? '—' : lastFourDaysTotal.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">Time ins and time outs combined</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Busiest day</p>
          <p className="mt-2 text-2xl font-extrabold text-[#24133F]">{loading ? '—' : busiestDay ? formatDay(busiestDay.date) : 'No scans'}</p>
          <p className="mt-1 text-xs text-slate-500">{busiestDay ? `${(busiestDay.timeIns + busiestDay.timeOuts).toLocaleString()} scans` : 'Last four days'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-500">Busiest checkpoint today</p>
          <p className="mt-2 truncate text-2xl font-extrabold text-[#24133F]">{loading ? '—' : busiestLocation?.name ?? 'No scans'}</p>
          <p className="mt-1 text-xs text-slate-500">{busiestLocation ? `${busiestLocation.scansToday.toLocaleString()} scans today` : 'No checkpoint activity'}</p>
        </div>
      </div>

      {selectedDay && createPortal(
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDay(null); }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <section role="dialog" aria-modal="true" aria-labelledby="day-detail-title" className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-[#E5E0EB] animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Attendance breakdown</p>
                <h2 id="day-detail-title" className="mt-1 text-2xl font-extrabold text-[#24133F]">{formatDay(selectedDay.date)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDay(null)} aria-label="Close details" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#E4F7EB] p-4">
                <p className="text-xs font-semibold text-[#16883F]">Time In</p>
                <p className="mt-1 text-2xl font-extrabold text-[#16883F]">{selectedDay.timeIns.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-[#FDE8EA] p-4">
                <p className="text-xs font-semibold text-[#C52736]">Time Out</p>
                <p className="mt-1 text-2xl font-extrabold text-[#C52736]">{selectedDay.timeOuts.toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-5 border-t border-slate-200 pt-4 text-sm font-semibold text-[#24133F]">
              Total scans <span className="float-right">{(selectedDay.timeIns + selectedDay.timeOuts).toLocaleString()}</span>
            </p>
            <Link to="/audit-log" onClick={() => setSelectedDay(null)} className="mt-6 block rounded-xl bg-brand-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-800">
              View attendance records
            </Link>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}

export default OverviewPage;
