import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CreditCard, MapPin, ScanLine, Users } from 'lucide-react';
import { adminService } from '../services/adminService';
import { studentService } from '../features/students/services/studentService';
import type { StudentRosterStats } from '../features/students/models';
import type { DashboardMetrics, EventRecord } from '../types';
import hawi from '../assets/illustrations/Hawi Tap Card.png';

type OverviewData = { metrics: DashboardMetrics; roster: StudentRosterStats; event: EventRecord | null };
const manilaDate = () => new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
const formatDay = (date: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${date}T00:00:00+08:00`));
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString();

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [metrics, roster, active] = await Promise.all([
        adminService.getMetrics(), studentService.getRosterStats(), adminService.getActiveEvent(),
      ]);
      setData({ metrics, roster, event: active.event });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load the overview. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const days = data?.metrics.attendanceByDay ?? [];
  const locations = data?.metrics.locationActivity ?? [];
  const dayPeak = Math.max(1, ...days.map((day) => day.timeIns + day.timeOuts));
  const locationPeak = Math.max(1, ...locations.map((location) => location.scansToday));
  const hasCheckpointActivity = locations.some((location) => location.scansToday > 0);
  const today = days.at(-1);
  const scansToday = today ? today.timeIns + today.timeOuts : undefined;
  const cardRate = data?.roster.active ? Math.round(data.roster.with_cards / data.roster.active * 100) : 0;
  const hasAttendance = days.some((day) => day.timeIns + day.timeOuts > 0);

  return (
    <div className="space-y-6 pb-8">
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-[#F8B9C0] bg-[#FDE8EA] px-4 py-3 text-sm text-[#B91C2A]">
        <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
        <button type="button" onClick={() => void refresh()} className="font-bold underline">Retry</button>
      </div>}

      <section className="relative overflow-hidden rounded-[28px] bg-[#351567] px-6 py-7 text-white sm:px-9 sm:py-9">
        <div className="relative z-10 max-w-[72%] sm:max-w-[68%]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D7B9FA]">{manilaDate()}</p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">Attendance today</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">{data?.event?.name || 'Student scans and checkpoint activity'}</p>
        </div>
        <img src={hawi} alt="Hawi holding an RFID card" className="pointer-events-none absolute bottom-0 right-1 z-0 h-[88%] w-auto max-w-[36%] object-contain object-bottom sm:right-8" />
      </section>

      <section aria-label="Daily snapshot" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/students" className="group rounded-[22px] border border-[#E8E0EE] bg-white p-5 transition-colors hover:border-[#B78BE9] focus-visible:outline-2 focus-visible:outline-brand-700">
          <div className="flex items-start justify-between"><span className="rounded-xl bg-[#F1E9FC] p-2.5 text-[#7025BE]"><Users className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-[#A496B0] group-hover:text-[#7025BE]" /></div>
          <p className="mt-5 text-3xl font-extrabold text-[#24133F]">{number(data?.roster.active)}</p><p className="mt-1 text-sm font-bold text-[#24133F]">Active students</p><p className="mt-1 text-xs text-[#897B96]">Currently on the roster</p>
        </Link>
        <Link to="/audit-log" className="group rounded-[22px] border border-[#E8E0EE] bg-white p-5 transition-colors hover:border-[#A8DDBA] focus-visible:outline-2 focus-visible:outline-brand-700">
          <div className="flex items-start justify-between"><span className="rounded-xl bg-[#E5F7EA] p-2.5 text-[#16883F]"><ScanLine className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-[#A496B0] group-hover:text-[#16883F]" /></div>
          <p className="mt-5 text-3xl font-extrabold text-[#24133F]">{number(data?.metrics.todayTimeIns)}</p><p className="mt-1 text-sm font-bold text-[#24133F]">Time ins today</p><p className="mt-1 text-xs text-[#897B96]">Recorded check-in scans</p>
        </Link>
        <Link to="/students" className="group rounded-[22px] border border-[#E8E0EE] bg-white p-5 transition-colors hover:border-[#B78BE9] focus-visible:outline-2 focus-visible:outline-brand-700">
          <div className="flex items-start justify-between"><span className="rounded-xl bg-[#F1E9FC] p-2.5 text-[#7025BE]"><CreditCard className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-[#A496B0] group-hover:text-[#7025BE]" /></div>
          <p className="mt-5 text-3xl font-extrabold text-[#24133F]">{number(data?.roster.with_cards)}<span className="ml-1 text-base font-semibold text-[#897B96]">/ {number(data?.roster.active)}</span></p><p className="mt-1 text-sm font-bold text-[#24133F]">Students with cards</p><p className="mt-1 text-xs text-[#897B96]">{data ? `${cardRate}% ready to tap · ${data.roster.without_cards} need a card` : 'Card pairing progress'}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F1E9FC]"><div className="h-full rounded-full bg-[#7427BF]" style={{ width: `${cardRate}%` }} /></div>
        </Link>
        <Link to="/audit-log" className="group rounded-[22px] border border-[#E8E0EE] bg-white p-5 transition-colors hover:border-[#F5C5C9] focus-visible:outline-2 focus-visible:outline-brand-700">
          <div className="flex items-start justify-between"><span className="rounded-xl bg-[#FDEBED] p-2.5 text-[#D63A48]"><ScanLine className="h-5 w-5" /></span><ArrowRight className="h-4 w-4 text-[#A496B0] group-hover:text-[#D63A48]" /></div>
          <p className="mt-5 text-3xl font-extrabold text-[#24133F]">{number(scansToday)}</p><p className="mt-1 text-sm font-bold text-[#24133F]">Scans today</p><p className="mt-1 text-xs text-[#897B96]">Time ins and time outs combined</p>
        </Link>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
        <section id="attendance-chart" aria-labelledby="attendance-chart-title" className="rounded-[24px] border border-[#E8E0EE] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 id="attendance-chart-title" className="text-lg font-extrabold text-[#24133F]">Attendance by day</h2><p className="mt-1 text-xs text-[#897B96]">Time in and time out scans · last four days</p></div><Link to="/reports" className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#7427BF] hover:underline">Reports <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          {loading && !data ? <div className="mt-8 h-48 animate-pulse rounded-2xl bg-[#F7F4FA]" /> : !hasAttendance ? <div className="mt-8 flex h-48 flex-col items-center justify-center text-center"><ScanLine className="h-9 w-9 text-[#C3ACD8]" /><p className="mt-3 font-bold text-[#24133F]">No scans in the last four days</p><p className="mt-1 text-xs text-[#897B96]">Activity will appear as students tap their cards.</p></div> : <div className="mt-8 flex h-48 items-end gap-3 sm:gap-6">
            {days.map((day) => { const total = day.timeIns + day.timeOuts; return <div key={day.date} tabIndex={0} aria-label={`${formatDay(day.date)}: ${day.timeIns} time ins, ${day.timeOuts} time outs, ${total} total scans`} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-700">
              <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 rounded-xl bg-[#24133F] px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <p className="mb-1 font-bold">{formatDay(day.date)}</p><p>Time in: {day.timeIns}</p><p>Time out: {day.timeOuts}</p><p className="mt-1 border-t border-white/20 pt-1 font-bold">Total scans: {total}</p>
              </div>
              <span className="text-xs font-bold text-[#6B557A]">{total}</span><span className="flex w-full max-w-16 flex-col justify-end gap-1" style={{ height: `${Math.max(8, total / dayPeak * 72)}%` }}>
                {day.timeOuts > 0 && <span className="block min-h-2 rounded-[10px] bg-[#F25560]" style={{ flex: day.timeOuts }} />}
                {day.timeIns > 0 && <span className="block min-h-2 rounded-[10px] bg-[#19B96A]" style={{ flex: day.timeIns }} />}
                {total === 0 && <span className="h-2 rounded-full bg-[#EDE6F2]" />}
              </span><span className="text-xs text-[#897B96] group-hover:text-[#7427BF]">{formatDay(day.date)}</span>
            </div>; })}
          </div>}
          <div className="mt-6 flex gap-5 border-t border-[#F0EBF3] pt-4 text-xs text-[#756883]"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#19B96A]" />Time in</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#F25560]" />Time out</span></div>
        </section>
        <section id="locations-chart" aria-labelledby="locations-title" className="rounded-[24px] border border-[#E8E0EE] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 id="locations-title" className="text-lg font-extrabold text-[#24133F]">Checkpoint activity</h2><p className="mt-1 text-xs text-[#897B96]">Scans today by location</p></div><MapPin className="h-5 w-5 text-[#A88ABC]" /></div>
          {loading && !data ? <div className="mt-8 h-48 animate-pulse rounded-2xl bg-[#F7F4FA]" /> : locations.length && !hasCheckpointActivity ? <div className="mt-8 flex h-48 flex-col items-center justify-center text-center"><MapPin className="h-9 w-9 text-[#C3ACD8]" /><p className="mt-3 font-bold text-[#24133F]">No checkpoint scans today</p><p className="mt-1 text-xs text-[#897B96]">Activity appears here when students tap their cards.</p></div> : locations.length ? <div className="mt-7 space-y-5">{locations.map((location) => <div key={location.id}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="truncate font-bold text-[#24133F]" title={location.name}>{location.name}</span><span className="shrink-0 font-bold text-[#7427BF]">{location.scansToday} scans</span></div><div className="h-2 rounded-full bg-[#F1EBF5]"><div className="h-full rounded-full bg-[#8A42D2]" style={{ width: `${location.scansToday ? Math.max(4, location.scansToday / locationPeak * 100) : 0}%` }} /></div></div>)}</div> : <div className="mt-8 flex h-48 flex-col items-center justify-center text-center"><MapPin className="h-9 w-9 text-[#C3ACD8]" /><p className="mt-3 font-bold text-[#24133F]">No checkpoints yet</p><Link to="/locations" className="mt-1 text-xs font-bold text-[#7427BF] hover:underline">Add a checkpoint</Link></div>}
          <Link to="/locations" className="mt-6 flex items-center gap-1 border-t border-[#F0EBF3] pt-4 text-xs font-bold text-[#7427BF] hover:underline">View locations <ArrowRight className="h-3.5 w-3.5" /></Link>
        </section>
      </div>

    </div>
  );
}

export default OverviewPage;
