import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, GraduationCap, MapPin, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { adminService } from '../services/adminService';
import type { DashboardMetrics } from '../types';

const summaryCards = [
  { key: 'totalStudents', label: 'Total Students', eyebrow: 'Enrolled', path: '/students', icon: Users, iconClass: 'bg-[#E8F1FF] text-[#3B82F6]', accent: 'text-brand-700' },
  { key: 'totalAdmins', label: 'Staff Accounts', eyebrow: 'Registered', path: '/admins', icon: ShieldCheck, iconClass: 'bg-[#E8F1FF] text-[#3B82F6]', accent: 'text-[#3B82F6]' },
  { key: 'todayTimeIns', label: 'Time Ins Today', eyebrow: 'Today', path: '/attendance', icon: GraduationCap, iconClass: 'bg-[#E4F7EB] text-[#17B556]', accent: 'text-[#17B556]' },
  { key: 'totalLocations', label: 'Checkpoints', eyebrow: 'Registered', path: '/locations', icon: MapPin, iconClass: 'bg-[#FFF3D8] text-[#F59E0B]', accent: 'text-[#F59E0B]' },
] as const;

const locationColors = ['bg-[#17B556]', 'bg-[#B5DD17]', 'bg-[#F59E0B]', 'bg-[#EF3340]'];

function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
    .format(new Date(`${date}T00:00:00+08:00`));
}

export function OverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setMetrics(await adminService.getMetrics()); }
    catch { setError('Could not load the overview. Try again.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const attendanceByDay = metrics?.attendanceByDay ?? [];
  const locationActivity = metrics?.locationActivity ?? [];
  const dayPeak = Math.max(1, ...attendanceByDay.map((day) => day.timeIns + day.timeOuts));
  const locationPeak = Math.max(1, ...locationActivity.map((location) => location.scansToday));
  const hasAttendance = attendanceByDay.some((day) => day.timeIns + day.timeOuts > 0);

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-slate-500">Attendance overview</p>
      <button type="button" onClick={refresh} disabled={loading} aria-label="Refresh overview" title="Refresh overview" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-700">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {error && <div role="alert" className="flex items-center gap-2 rounded-2xl border border-[#F8B9C0] bg-[#FDE8EA] px-4 py-3 text-sm text-[#B91C2A]">
      <AlertCircle className="h-4 w-4 shrink-0" />{error}
    </div>}

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {summaryCards.map(({ key, label, eyebrow, path, icon: Icon, iconClass, accent }) => <Link key={key} to={path} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-brand-700">
        <div className="flex h-full min-h-[150px] flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-700 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClass}`}><Icon className="h-4 w-4" /></span>
            <span className={`text-[11px] font-bold ${accent}`}>{eyebrow}</span>
          </div>
          {loading && !metrics ? <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
            : <p className="mt-3 text-[32px] font-extrabold leading-none text-slate-900">{metrics?.[key]?.toLocaleString() ?? '—'}</p>}
          <p className="mt-auto pt-3 text-xs font-medium text-slate-500">{label}</p>
        </div>
      </Link>)}
    </div>

    <div className="grid gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <section aria-labelledby="attendance-chart-title" className="min-h-[325px] rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="attendance-chart-title" className="text-base font-extrabold text-slate-900">Attendance by Day</h2>
            <p className="mt-1 text-xs text-slate-500">Recorded scans over the last four days</p>
          </div>
          <Link to="/attendance" className="text-xs font-bold text-brand-700 hover:underline">View records</Link>
        </div>
        {loading && !metrics ? <div className="mt-7 flex h-48 items-end justify-around gap-5">
          {[60, 80, 50, 70].map((height, index) => <div key={index} className="w-10 animate-pulse rounded-lg bg-slate-100" style={{ height: `${height}%` }} />)}
        </div> : hasAttendance ? <div className="mt-6 flex h-48 items-end justify-around gap-3">
          {attendanceByDay.map((day) => {
            const total = day.timeIns + day.timeOuts;
            return <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${formatDay(day.date)}: ${day.timeIns} time ins, ${day.timeOuts} time outs`}>
              <div className="flex h-[160px] w-full max-w-12 flex-col justify-end overflow-hidden rounded-lg">
                {total > 0 && <div className="flex min-h-[4px] flex-col-reverse overflow-hidden rounded-lg" style={{ height: `${Math.max(4, total / dayPeak * 100)}%` }}>
                  <div className="bg-[#17B556]" style={{ flex: day.timeIns }} />
                  <div className="bg-[#EF3340]" style={{ flex: day.timeOuts }} />
                </div>}
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{formatDay(day.date)}</span>
            </div>;
          })}
        </div> : <div className="flex h-48 items-center justify-center text-center text-sm text-slate-500">No attendance scans in the last four days.</div>}
        <div className="mt-5 flex gap-5 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#17B556]" />Time In</span>
          <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#EF3340]" />Time Out</span>
        </div>
      </section>

      <section aria-labelledby="locations-title" className="min-h-[325px] rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="locations-title" className="text-base font-extrabold text-slate-900">Locations</h2>
            <p className="mt-1 text-xs text-slate-500">Scans today by checkpoint</p>
          </div>
          <Link to="/locations" className="text-xs font-bold text-brand-700 hover:underline">View all</Link>
        </div>
        {loading && !metrics ? <div className="mt-7 space-y-5">{[0, 1, 2, 3].map((index) => <div key={index} className="h-9 animate-pulse rounded-lg bg-slate-100" />)}</div>
          : locationActivity.length ? <div className="mt-6 space-y-5">
            {locationActivity.map((location, index) => <div key={location.id}>
              <div className="mb-2 flex justify-between gap-3 text-xs">
                <span className="truncate font-bold text-slate-900" title={location.name}>{location.name}</span>
                <span className="font-semibold text-slate-500">{location.scansToday.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                {location.scansToday > 0 && <div className={`h-full rounded-full ${locationColors[index]}`} style={{ width: `${Math.max(3, location.scansToday / locationPeak * 100)}%` }} />}
              </div>
            </div>)}
          </div> : <div className="flex h-48 items-center justify-center text-center text-sm text-slate-500">No checkpoints registered yet.</div>}
      </section>
    </div>
  </div>;
}
