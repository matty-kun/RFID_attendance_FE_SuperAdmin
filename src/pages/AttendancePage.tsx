import { Plus } from 'lucide-react';

export function AttendancePage() {
  return <section aria-labelledby="attendance-heading" className="mx-auto w-full max-w-[1120px]">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 id="attendance-heading" className="text-[23px] font-extrabold leading-tight text-[#24133F]">Attendance</h1>
      <button type="button" disabled title="Attendance creation flow is being designed" className="flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-bold text-white"><Plus className="h-4 w-4" />Add Attendance</button>
    </div>
  </section>;
}

export default AttendancePage;
