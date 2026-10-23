import { Plus } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useEventsViewModel } from '../features/events/viewmodels/useEventsViewModel';

export function AttendancePage() {
  const {
    isModalOpen, setIsModalOpen, isSubmitting, formError,
    name, setName, description, setDescription,
    startDate, setStartDate, endDate, setEndDate, handleCreate,
  } = useEventsViewModel();

  return <section aria-labelledby="attendance-heading" className="mx-auto min-h-[calc(100vh-180px)] w-full max-w-[1120px]">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 id="attendance-heading" className="text-[23px] font-extrabold leading-tight text-[#24133F]">Attendance Schedule</h1><p className="mt-1 text-[11px] text-[#756883]">Set when each IN/OUT window opens</p></div>
      <button type="button" onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-xs font-bold text-white shadow-[0_3px_0_#58158C] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"><Plus className="h-3.5 w-3.5" />Create Event</button>
    </div>
    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Event" description="Set up an event before adding its attendance windows.">
      <form onSubmit={handleCreate} className="mt-2 space-y-4">
        {formError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">{formError}</p>}
        <Input label="Event Name" placeholder="e.g. Foundation Day 2026" value={name} onChange={(event) => setName(event.target.value)} required />
        <div className="space-y-1.5"><label htmlFor="attendance-event-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Description</label><textarea id="attendance-event-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Brief details about the event" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-500" /></div>
        <div className="grid grid-cols-2 gap-3"><Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /><Input label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary" isLoading={isSubmitting}>Create Event</Button></div>
      </form>
    </Modal>
  </section>;
}

export default AttendancePage;
