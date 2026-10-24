import { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  MoreVertical,
  Plus,
  Search,
  Users,
  MapPin,
} from 'lucide-react';
import { Dropdown } from '../components/common/Dropdown';
import { CreateEventModal } from '../features/events/views/CreateEventModal';
import {
  AssignOfficersDrawer,
  type AssignedOfficer,
} from '../features/events/views/AssignOfficersDrawer';

interface SessionItem {
  id: string;
  name: string;
  timeWindow: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Not Started';
  officers: AssignedOfficer[];
}

interface DaySchedule {
  dayId: string;
  dayLabel: string;
  dateStr: string;
  sessions: SessionItem[];
  status: 'Active' | 'Upcoming' | 'Not Started';
}

interface EventData {
  id: string;
  name: string;
  dateRange: string;
  durationDays: number;
  status: 'Ongoing' | 'Upcoming' | 'Completed';
  days: DaySchedule[];
}

const initialEvent: EventData = {
  id: 'ev-1',
  name: 'Cite Festival',
  dateRange: 'October 2 - 5, 2026 · 4 days',
  durationDays: 4,
  status: 'Ongoing',
  days: [
    {
      dayId: 'd1',
      dayLabel: 'Day 1 - October 2, 2026',
      dateStr: 'October 2, 2026',
      status: 'Active',
      sessions: [
        {
          id: 's1',
          name: 'Morning - Time IN',
          timeWindow: '7:00 - 9:00 AM',
          status: 'Active',
          officers: [
            { id: 'o1', name: 'Juan bayot', initials: 'JD', role: 'Admin', location: 'Cite Building', status: 'Online' },
            { id: 'o2', name: 'Ako si batman', initials: 'JD', role: 'Admin', location: 'Cite Building', status: 'Online' },
            { id: 'o3', name: 'Nonoy Kaibo', initials: 'JD', role: 'Admin', location: 'CR ETD', status: 'Online' },
          ],
        },
        {
          id: 's2',
          name: 'Morning - Time OUT',
          timeWindow: '11:00 - 12:30 PM',
          status: 'Upcoming',
          officers: [
            { id: 'o4', name: 'Ako si batman', initials: 'JD', role: 'Admin', location: 'Cite Building', status: 'Online' },
            { id: 'o5', name: 'Nonoy Kaibo', initials: 'JD', role: 'Admin', location: 'CR ETD', status: 'Online' },
          ],
        },
        {
          id: 's3',
          name: 'Afternoon - Time IN',
          timeWindow: '1:00 - 2:00 PM',
          status: 'Upcoming',
          officers: [
            { id: 'o6', name: 'Ako si batman', initials: 'JD', role: 'Admin', location: 'ETD Court', status: 'Online' },
            { id: 'o7', name: 'King Kong', initials: 'KK', role: 'Admin', location: 'Cite 4th floor', status: 'Offline' },
          ],
        },
      ],
    },
    {
      dayId: 'd2',
      dayLabel: 'Day 2 - October 3, 2026',
      dateStr: 'October 3, 2026',
      status: 'Not Started',
      sessions: [
        {
          id: 's4',
          name: 'Morning - Time IN',
          timeWindow: '7:00 - 9:00 AM',
          status: 'Not Started',
          officers: [],
        },
        {
          id: 's5',
          name: 'Afternoon - Time IN',
          timeWindow: '1:00 - 2:00 PM',
          status: 'Not Started',
          officers: [],
        },
        {
          id: 's6',
          name: 'Evening - Time OUT',
          timeWindow: '5:00 - 6:30 PM',
          status: 'Not Started',
          officers: [],
        },
      ],
    },
    {
      dayId: 'd3',
      dayLabel: 'Day 3 - October 4, 2026',
      dateStr: 'October 4, 2026',
      status: 'Not Started',
      sessions: [
        {
          id: 's7',
          name: 'Morning - Time IN',
          timeWindow: '7:00 - 9:00 AM',
          status: 'Not Started',
          officers: [],
        },
        {
          id: 's8',
          name: 'Afternoon - Time OUT',
          timeWindow: '12:00 - 1:30 PM',
          status: 'Not Started',
          officers: [],
        },
      ],
    },
    {
      dayId: 'd4',
      dayLabel: 'Day 4 - October 5, 2026',
      dateStr: 'October 5, 2026',
      status: 'Not Started',
      sessions: [
        {
          id: 's9',
          name: 'Morning - Time IN',
          timeWindow: '7:00 - 9:00 AM',
          status: 'Not Started',
          officers: [],
        },
        {
          id: 's10',
          name: 'Evening - Time OUT',
          timeWindow: '5:00 - 7:00 PM',
          status: 'Not Started',
          officers: [],
        },
      ],
    },
  ],
};

export function AttendancePage() {
  const [eventData, setEventData] = useState<EventData>(initialEvent);
  const [isEventExpanded, setIsEventExpanded] = useState(true);
  const [expandedDayId, setExpandedDayId] = useState<string>('d1');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [assigningSession, setAssigningSession] = useState<{
    dayId: string;
    session: SessionItem;
    dateStr: string;
  } | null>(null);

  const handleOpenAssign = (dayId: string, session: SessionItem, dateStr: string) => {
    setAssigningSession({ dayId, session, dateStr });
  };

  const handleSaveAssignedOfficers = (updatedOfficers: AssignedOfficer[]) => {
    if (!assigningSession) return;
    setEventData((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayId === assigningSession.dayId
          ? {
              ...d,
              sessions: d.sessions.map((s) =>
                s.id === assigningSession.session.id
                  ? { ...s, officers: updatedOfficers }
                  : s
              ),
            }
          : d
      ),
    }));
  };

  const handleCopyFromDay1 = (targetDayId: string) => {
    const day1 = eventData.days.find((d) => d.dayId === 'd1');
    if (!day1) return;

    setEventData((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayId === targetDayId
          ? {
              ...d,
              status: 'Upcoming',
              sessions: day1.sessions.map((s, idx) => ({
                ...s,
                id: `${targetDayId}-s-${idx + 1}`,
                status: 'Upcoming',
              })),
            }
          : d
      ),
    }));
    setExpandedDayId(targetDayId);
  };

  const handleEventPublished = (newEvent: any) => {
    // Add published event
    setEventData({
      id: `ev-${Date.now()}`,
      name: newEvent.name,
      dateRange: `October 2 - 5, 2026 · ${newEvent.daysCount} days`,
      durationDays: newEvent.daysCount,
      status: 'Ongoing',
      days: initialEvent.days,
    });
  };

  const filteredDays = useMemo(() => {
    return eventData.days.filter((day) => {
      const matchesDate = dateFilter === 'all' || day.dateStr.toLowerCase().includes(dateFilter.toLowerCase());
      const matchesSearch =
        search === '' ||
        day.dayLabel.toLowerCase().includes(search.toLowerCase()) ||
        day.sessions.some(
          (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.officers.some((o) => o.name.toLowerCase().includes(search.toLowerCase()))
        );
      const matchesStatus =
        statusFilter === 'all' ||
        day.sessions.some((s) => s.status.toLowerCase() === statusFilter.toLowerCase());

      return matchesDate && matchesSearch && matchesStatus;
    });
  }, [eventData, search, statusFilter, dateFilter]);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 text-[#24133F]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight">Attendance Schedule</h1>
          <p className="text-xs text-[#756883]">
            Manage attendance sessions, locations, and assigned for your events.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateEventOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-[#451475] px-5 py-2.5 text-xs font-bold text-white shadow-[0_5px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[4px] active:shadow-none transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>

      {/* Filter Bar (No tabs on top!) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#756883]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, session, or admin"
            className="w-full rounded-2xl border border-[#E5E0EB] bg-white py-2 pl-10 pr-4 text-xs text-[#24133F] placeholder-[#756883] focus:border-[#451475] focus:outline-none transition-colors"
          />
        </div>

        <Dropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Completed' },
          ]}
        />

        <Dropdown
          value={dateFilter}
          onChange={setDateFilter}
          options={[
            { value: 'all', label: 'All Dates' },
            { value: 'october 2', label: 'Oct 2, 2026' },
            { value: 'october 3', label: 'Oct 3, 2026' },
            { value: 'october 4', label: 'Oct 4, 2026' },
            { value: 'october 5', label: 'Oct 5, 2026' },
          ]}
        />
      </div>

      {/* Event Accordion Container (Cite Festival) */}
      <div className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 shadow-sm">
        {/* Main Event Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F1EEF4]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6F4F8] text-[#451475]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#24133F]">{eventData.name}</h2>
              <p className="text-xs text-[#756883]">{eventData.dateRange}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#10B981]">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              Ongoing
            </span>
            <button
              type="button"
              onClick={() => setIsEventExpanded(!isEventExpanded)}
              aria-label="Toggle event days"
              className="rounded-lg p-1 text-[#756883] hover:bg-slate-100"
            >
              {isEventExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Event Days Content */}
        {isEventExpanded && (
          <div className="mt-5 space-y-4">
            {filteredDays.map((day) => {
              const isDayOpen = expandedDayId === day.dayId;

              return (
                <div
                  key={day.dayId}
                  className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden transition-all shadow-sm"
                >
                  {/* Day Header Row */}
                  <div
                    onClick={() => setExpandedDayId(isDayOpen ? '' : day.dayId)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#756883]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#24133F]">{day.dayLabel}</h3>
                        {!isDayOpen && (
                          <p className="text-[10px] text-[#756883]">
                            Morning, afternoon, evening · {day.sessions.length} Sessions
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDayOpen ? (
                        <>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-[#756883]">
                            {day.sessions.length} sessions
                          </span>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 text-[#756883] hover:text-[#24133F]"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          {day.dayId !== 'd1' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyFromDay1(day.dayId);
                              }}
                              className="hidden sm:flex items-center gap-1 rounded-xl border border-dashed border-[#451475]/40 bg-[#FAF7FD] px-2.5 py-1 text-[11px] font-bold text-[#451475] hover:bg-[#F3EDFB] transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                              Copy from Day 1
                            </button>
                          )}
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-[#756883]">
                            {day.status === 'Not Started' ? 'Not Started' : 'Configured'}
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#756883]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day Sessions List (Expanded) */}
                  {isDayOpen && (
                    <div className="border-t border-[#F1EEF4] p-4 space-y-3 bg-[#FAF8FB]/40">
                      {day.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-sm"
                        >
                          {/* Session Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-[#24133F]">{session.name}</h4>
                              <p className="text-[11px] text-[#756883] flex items-center gap-1.5 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {session.timeWindow}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${
                                  session.status === 'Active'
                                    ? 'bg-[#10B981]'
                                    : session.status === 'Upcoming'
                                    ? 'bg-[#3B82F6]'
                                    : 'bg-slate-400'
                                }`}
                              >
                                {session.status}
                              </span>
                              <button
                                type="button"
                                className="rounded p-1 text-[#756883] hover:text-[#24133F]"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Assigned Officers Row */}
                          <div className="mt-3.5 border-t border-[#F1EEF4] pt-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#756883]">
                              <Users className="h-3.5 w-3.5" />
                              <span>{session.officers.length} officer assigned</span>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {session.officers.slice(0, 3).map((officer) => (
                                <div
                                  key={officer.id}
                                  className="flex items-center gap-2 rounded-full border border-[#E5E0EB] bg-white py-1 pl-1.5 pr-3 shadow-xs"
                                >
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E9D5FF] text-[10px] font-bold text-[#6D21A8]">
                                    {officer.initials}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[11px] font-bold leading-tight text-[#24133F]">
                                      {officer.name}
                                    </p>
                                    <p className="flex items-center gap-0.5 text-[9px] text-[#756883]">
                                      <MapPin className="h-2 w-2" />
                                      {officer.location}
                                    </p>
                                  </div>
                                </div>
                              ))}

                              {session.officers.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssign(day.dayId, session, day.dateStr)}
                                  className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-bold text-[#451475] hover:bg-purple-200 transition-colors"
                                >
                                  +{session.officers.length - 3} more
                                </button>
                              )}

                              {/* Add Officers Pill Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenAssign(day.dayId, session, day.dateStr)}
                                className="flex items-center gap-1 rounded-full border border-dashed border-[#451475] bg-[#FAF7FD] px-3 py-1.5 text-xs font-bold text-[#451475] hover:bg-[#F3EDFB] transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add officers
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5-Step Create Event Flow Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onPublished={handleEventPublished}
      />

      {/* Assign Officers Drawer (With location per officer) */}
      {assigningSession && (
        <AssignOfficersDrawer
          isOpen={Boolean(assigningSession)}
          onClose={() => setAssigningSession(null)}
          sessionName={assigningSession.session.name}
          sessionTime={assigningSession.session.timeWindow}
          sessionDate={assigningSession.dateStr}
          sessionStatus={
            assigningSession.session.status === 'Active'
              ? 'Active'
              : assigningSession.session.status === 'Upcoming'
              ? 'Upcoming'
              : 'Completed'
          }
          initialAssigned={assigningSession.session.officers}
          onSave={handleSaveAssignedOfficers}
        />
      )}
    </div>
  );
}

export default AttendancePage;
