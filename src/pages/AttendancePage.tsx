import { useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useEventsViewModel } from '../features/events/viewmodels/useEventsViewModel';

export function AttendancePage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('all');
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
    <div role="search" aria-label="Search attendance schedule" className="mt-9 flex flex-wrap items-center gap-3">
      <label className="flex h-10 w-full max-w-80 items-center gap-2 rounded-full border border-[#E5DFEB] bg-white px-4 text-[#786C89] focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 sm:w-80">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">Search events</span>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent text-sm text-[#24133F] outline-none placeholder:text-[#786C89]" />
      </label>
      <label className="relative inline-flex h-10 items-center rounded-full border border-[#E5DFEB] bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <span className="sr-only">Filter by status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-full appearance-none rounded-full bg-transparent pl-4 pr-10 text-sm text-[#24133F] outline-none">
          <option value="all">All Status</option><option value="ongoing">Ongoing</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#786C89]" aria-hidden="true" />
      </label>
      <label className="relative inline-flex h-10 items-center rounded-full border border-[#E5DFEB] bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <span className="sr-only">Filter by date</span>
        <select value={date} onChange={(event) => setDate(event.target.value)} className="h-full appearance-none rounded-full bg-transparent pl-4 pr-10 text-sm text-[#24133F] outline-none">
          <option value="all">All Dates</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#786C89]" aria-hidden="true" />
      </label>
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
