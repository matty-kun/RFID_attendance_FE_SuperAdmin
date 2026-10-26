import React, { useState, useMemo } from 'react';
import { useEventsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Plus, RefreshCw, Search, Sparkles, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEventStatus } from '../../../utils/status';

export const EventsView: React.FC = () => {
  const {
    events,
    isLoading,
    error,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    formError,
    name,
    setName,
    description,
    setDescription,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    loadEvents,
    handleCreate,
  } = useEventsViewModel();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(
      (ev) =>
        ev.name.toLowerCase().includes(query) ||
        (ev.description && ev.description.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
      {/* Top Header */}
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight">Campus Events</h1>
        <p className="text-[11px] text-[#756883]">
          Manage university celebrations, sports leagues, and departmental assemblies.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] sm:max-w-[310px]">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search events</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event name or description"
            className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadEvents()}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Event
          </Button>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
        {error && (
          <div role="alert" className="mb-2 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            <span>{error}</span>
            <button type="button" onClick={() => void loadEvents()} className="underline">
              Retry
            </button>
          </div>
        )}
        <table className="w-full min-w-[630px] text-left text-xs">
          <thead>
            <tr className="bg-[#F4F6FA] text-[10px] uppercase text-[#637596]">
              <th className="rounded-l-xl px-3 py-3 font-medium">Event Name</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Start Date</th>
              <th className="px-3 py-3 font-medium">End Date</th>
              <th className="rounded-r-xl px-3 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-[#756883]">
                  Loading campus events…
                </td>
              </tr>
            ) : error && events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-rose-600">
                  Unable to load campus events.{' '}
                  <button type="button" onClick={() => void loadEvents()} className="font-bold underline">
                    Retry
                  </button>
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-[#756883]">
                  {searchQuery ? 'No campus events match your search.' : 'No campus events registered yet. Click "Create Event" to add one.'}
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => {
                const status = getEventStatus(ev.start_date, ev.end_date);
                return (
                  <tr key={ev.id} className="border-b border-[#EEF0F4] last:border-b-0 hover:bg-[#FAF8FC]">
                    <td className="px-3 py-3">
                      <div className="font-bold text-slate-900 text-sm">{ev.name}</div>
                      <div className="text-xs text-[#756883] mt-0.5 line-clamp-1 max-w-xs">
                        {ev.description || 'No description provided'}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          status === 'ongoing'
                            ? 'emerald'
                            : status === 'upcoming'
                            ? 'brand'
                            : 'slate'
                        }
                        dot
                      >
                        {status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-[#637596]">
                      {new Date(`${ev.start_date}T00:00:00+08:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-[#637596]">
                      {new Date(`${ev.end_date}T00:00:00+08:00`).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        to={`/sessions?eventId=${ev.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Sessions →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[#EEF0F4] px-3 pt-3 text-xs text-[#756883]">
          <span>{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} listed</span>
        </div>
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Campus Event"
        description="Add a new campus-wide event to track RFID attendance sessions."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {formError && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}
          <Input
            label="Event Name"
            placeholder="e.g. Foundation Day 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description
            </label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              rows={3}
              placeholder="Brief details about the event venue or objective..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Register Event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
