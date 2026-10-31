import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, MapPin, ScanLine, Users } from 'lucide-react';
import { adminService } from '../services/adminService';
import { studentService } from '../features/students/services/studentService';
import { toast } from '../context';
import type { StudentRosterStats } from '../features/students/models';
import type { DashboardMetrics, EventRecord } from '../types';
import hawi from '../assets/illustrations/Hawi Tap Card.png';

type OverviewData = { metrics: DashboardMetrics; roster: StudentRosterStats; event: EventRecord | null };
const manilaDate = () => new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
const formatDay = (date: string) => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${date}T00:00:00+08:00`));
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString();

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [metrics, roster, active] = await Promise.all([
        adminService.getMetrics(), studentService.getRosterStats(), adminService.getActiveEvent(),
      ]);
      setData({ metrics, roster, event: active.event });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Could not load overview data. Showing cached view.';
      toast.error(msg);
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
      <section className="relative overflow-hidden rounded-[28px] bg-[#351567] px-6 py-7 text-white sm:px-9 sm:py-9">
        <div className="relative z-10 max-w-[72%] sm:max-w-[68%]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#D7B9FA]">{manilaDate()}</p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">Attendance today</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#EEE1FA]">{data?.event?.name || 'Student scans and checkpoint activity'}</p>
        </div>
        <img src={hawi} alt="Hawi holding an RFID card" className="pointer-events-none absolute bottom-0 right-1 z-0 h-[88%] w-auto max-w-[36%] object-contain object-bottom sm:right-8" />
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Scans today</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><ScanLine className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{number(scansToday)}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Active students</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><Users className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{number(data?.roster.active)}</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Cards assigned</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><CreditCard className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{cardRate}%</p>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">Checkpoints</span>
            <div className="rounded-xl bg-[#FAF8FC] p-2 text-[#7026B7]"><MapPin className="h-4 w-4" /></div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#24133F]">{locations.length}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#24133F]">Attendance volume</h2>
              <p className="text-xs text-[#756883]">Total daily scans recorded by date</p>
            </div>
            <Link to="/attendance" className="inline-flex items-center gap-1 text-xs font-bold text-[#7026B7] hover:underline">
              Full logs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-6 flex h-48 items-end gap-3 sm:gap-4">
            {hasAttendance ? days.map((day) => {
              const total = day.timeIns + day.timeOuts;
              const heightPct = Math.round((total / dayPeak) * 100);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-[#756883]">{total > 0 ? total : ''}</span>
                  <div
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-[#7026B7] to-[#A855F7] transition-all duration-300"
                  />
                  <span className="text-[10px] text-[#756883] truncate">{formatDay(day.date)}</span>
                </div>
              );
            }) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-[#756883]">
                No attendance scans recorded for this period yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#24133F]">Checkpoint activity</h2>
            <Link to="/locations" className="text-xs font-bold text-[#7026B7] hover:underline">Manage</Link>
          </div>
          <p className="text-xs text-[#756883]">Distribution across scan locations</p>

          <div className="mt-5 space-y-3">
            {hasCheckpointActivity ? locations.map((loc) => {
              const pct = Math.round((loc.scansToday / locationPeak) * 100);
              return (
                <div key={loc.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#24133F]">{loc.name}</span>
                    <span className="font-bold text-[#756883]">{loc.scansToday}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#FAF8FC]">
                    <div style={{ width: `${Math.max(6, pct)}%` }} className="h-2 rounded-full bg-[#7026B7]" />
                  </div>
                </div>
              );
            }) : (
              <p className="py-8 text-center text-xs text-[#756883]">No scan activity at checkpoints today.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
