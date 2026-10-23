import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, ChartNoAxesColumn } from 'lucide-react';
import { adminService } from '../services/adminService';
import type { DashboardMetrics } from '../types';

function formatDay(date: string) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${date}T00:00:00+08:00`));
}

export function ReportsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getMetrics().then(setMetrics).catch(() => setError('Could not load reports. Try again later.'));
  }, []);

  const totals = metrics?.attendanceByDay.reduce((sum, day) => ({ timeIns: sum.timeIns + day.timeIns, timeOuts: sum.timeOuts + day.timeOuts }), { timeIns: 0, timeOuts: 0 });

  return <div className="space-y-6 text-[#24133F]">
    <div><h1 className="flex items-center gap-2 text-2xl font-black tracking-tight"><ChartNoAxesColumn className="h-6 w-6 text-brand-700" />Reports</h1><p className="mt-1 text-xs text-slate-500">Attendance and checkpoint activity from the last four days.</p></div>
    {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</p>}
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">Time Ins · 4 Days</p><p className="mt-2 text-3xl font-extrabold">{totals?.timeIns.toLocaleString() ?? '—'}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">Time Outs · 4 Days</p><p className="mt-2 text-3xl font-extrabold">{totals?.timeOuts.toLocaleString() ?? '—'}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">All Recorded Scans</p><p className="mt-2 text-3xl font-extrabold">{metrics?.totalScans.toLocaleString() ?? '—'}</p></div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-extrabold">Attendance by Day</h2><div className="mt-4 space-y-3">{metrics?.attendanceByDay.map((day) => <div key={day.date} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-bold">{formatDay(day.date)}</span><span className="text-[#16883F]">{day.timeIns.toLocaleString()} in</span><span className="text-[#C52736]">{day.timeOuts.toLocaleString()} out</span></div>) ?? <p className="text-sm text-slate-500">Loading…</p>}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-extrabold">Checkpoint Activity Today</h2><div className="mt-4 space-y-3">{metrics?.locationActivity.length ? metrics.locationActivity.map((location) => <div key={location.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="truncate font-bold">{location.name}</span><span className="font-semibold text-brand-700">{location.scansToday.toLocaleString()} scans</span></div>) : <p className="text-sm text-slate-500">{metrics ? 'No checkpoint activity today.' : 'Loading…'}</p>}</div></section>
    </div>
    <Link to="/attendance?tab=records" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline">View attendance records <ArrowRight className="h-4 w-4" /></Link>
  </div>;
}
