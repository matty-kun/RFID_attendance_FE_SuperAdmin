import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Pencil,
  CheckCircle2,
  Trash2,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../context';
import { Dropdown } from '../components/common/Dropdown';
import { CreateEventModal } from '../features/events/views/CreateEventModal';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';
import {
  AssignOfficersDrawer,
  type AssignedOfficer,
} from '../features/events/views/AssignOfficersDrawer';

interface SessionItem {
  id: string;
  name: string;
  timeWindow: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Not Started';
  previousStatus?: 'Active' | 'Upcoming' | 'Not Started';
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

function parseTimeWindow(tw: string): { start: string; end: string } {
  try {
    const parts = tw.split('-').map((s) => s.trim());
    if (parts.length < 2) return { start: '08:00', end: '10:00' };

    const endRaw = parts[1];
    const endPeriodMatch = endRaw.match(/(AM|PM)/i);
    const endPeriod = endPeriodMatch ? endPeriodMatch[1].toUpperCase() : 'AM';

    const startRaw = parts[0];
    const startPeriodMatch = startRaw.match(/(AM|PM)/i);
    let startPeriod = startPeriodMatch ? startPeriodMatch[1].toUpperCase() : endPeriod;

    if (!startPeriodMatch && endPeriod === 'PM') {
      const startHour = parseInt(startRaw.split(':')[0], 10);
      if (startHour >= 7 && startHour <= 11) {
        startPeriod = 'AM';
      }
    }

    const to24 = (timeStr: string, period: string) => {
      const cleaned = timeStr.replace(/(AM|PM)/gi, '').trim();
      const [hStr, mStr] = cleaned.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10) || 0;
      if (isNaN(h)) h = 8;
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
      start: to24(startRaw, startPeriod),
      end: to24(endRaw, endPeriod),
    };
  } catch {
    return { start: '08:00', end: '10:00' };
  }
}

function formatTimeWindow(start24: string, end24: string): string {
  try {
    const to12 = (t24: string) => {
      const [hStr, mStr] = t24.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr ? mStr.padStart(2, '0') : '00';
      if (isNaN(h)) h = 8;
      const period = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return { time: `${h}:${m}`, period };
    };

    const s = to12(start24);
    const e = to12(end24);

    if (s.period === e.period) {
      return `${s.time} - ${e.time} ${e.period}`;
    }
    return `${s.time} ${s.period} - ${e.time} ${e.period}`;
  } catch {
    return `${start24} - ${end24}`;
  }
}

export function AttendancePage() {
  const { showToast } = useToast();
  const [eventData, setEventData] = useState<EventData | null>(initialEvent);
  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
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

  // Toast Feedback & Card Highlight States
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);

  const triggerHighlight = (sessionId: string) => {
    setHighlightedSessionId(sessionId);
    setTimeout(() => {
      setHighlightedSessionId((current) => (current === sessionId ? null : current));
    }, 1200);
  };

  const showFeedback = (
    message: string,
    type: 'success' | 'delete' | 'warning' | 'info' = 'success',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    showToast(message, { type, actionLabel, onAction });
  };

  const handleSaveAssignedOfficers = (updatedOfficers: AssignedOfficer[]) => {
    if (!assigningSession) return;
    const targetSessionId = assigningSession.session.id;
    const targetSessionName = assigningSession.session.name;
    setEventData((prev) => !prev ? prev : ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayId === assigningSession.dayId
          ? {
              ...d,
              sessions: d.sessions.map((s) =>
                s.id === targetSessionId
                  ? { ...s, officers: updatedOfficers }
                  : s
              ),
            }
          : d
      ),
    }));
    triggerHighlight(targetSessionId);
    showFeedback(
      `Assigned ${updatedOfficers.length} officer${updatedOfficers.length === 1 ? '' : 's'} to ${targetSessionName}`
    );
  };

  // Session action menus & edit modal state
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [editingTimeSession, setEditingTimeSession] = useState<{ dayId: string; session: SessionItem } | null>(null);
  const [startTimeInput, setStartTimeInput] = useState('07:00');
  const [endTimeInput, setEndTimeInput] = useState('09:00');
  const [deletingSessionInfo, setDeletingSessionInfo] = useState<{ dayId: string; session: SessionItem } | null>(null);

  const handleToggleSessionComplete = (dayId: string, session: SessionItem) => {
    if (session.status === 'Completed') {
      // Reopen session
      const revertStatus = session.previousStatus || 'Active';
      setEventData((prev) => !prev ? prev : ({
        ...prev,
        days: prev.days.map((d) =>
          d.dayId === dayId
            ? {
                ...d,
                sessions: d.sessions.map((s) =>
                  s.id === session.id ? { ...s, status: revertStatus } : s
                ),
              }
            : d
        ),
      }));
      triggerHighlight(session.id);
      showFeedback(`"${session.name}" reopened as ${revertStatus}`, 'success');
    } else {
      // Mark as completed
      const prior = session.status;
      setEventData((prev) => !prev ? prev : ({
        ...prev,
        days: prev.days.map((d) =>
          d.dayId === dayId
            ? {
                ...d,
                sessions: d.sessions.map((s) =>
                  s.id === session.id
                    ? { ...s, status: 'Completed', previousStatus: prior }
                    : s
                ),
              }
            : d
        ),
      }));
      triggerHighlight(session.id);
      showFeedback(`"${session.name}" marked as completed`, 'info', 'Undo', () => {
        setEventData((prev) => !prev ? prev : ({
          ...prev,
          days: prev.days.map((d) =>
            d.dayId === dayId
              ? {
                  ...d,
                  sessions: d.sessions.map((s) =>
                    s.id === session.id ? { ...s, status: prior } : s
                  ),
                }
              : d
          ),
        }));
        triggerHighlight(session.id);
        showFeedback(`"${session.name}" restored to ${prior}`, 'success');
      });
    }
    setOpenMenuSessionId(null);
  };

  const handleOpenEditTime = (dayId: string, session: SessionItem) => {
    setEditingTimeSession({ dayId, session });
    const parsed = parseTimeWindow(session.timeWindow);
    setStartTimeInput(parsed.start);
    setEndTimeInput(parsed.end);
    setOpenMenuSessionId(null);
  };

  const applyDuration = (hoursToAdd: number) => {
    const [h, m] = startTimeInput.split(':').map(Number);
    const totalMinutes = (h || 0) * 60 + (m || 0) + Math.round(hoursToAdd * 60);
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    setEndTimeInput(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const handleSaveEditTime = () => {
    if (!editingTimeSession) return;
    const targetSessionId = editingTimeSession.session.id;
    const formatted = formatTimeWindow(startTimeInput, endTimeInput);
    setEventData((prev) => !prev ? prev : ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayId === editingTimeSession.dayId
          ? {
              ...d,
              sessions: d.sessions.map((s) =>
                s.id === targetSessionId
                  ? { ...s, timeWindow: formatted }
                  : s
              ),
            }
          : d
      ),
    }));
    triggerHighlight(targetSessionId);
    showFeedback(`Time window updated to ${formatted}`, 'success');
    setEditingTimeSession(null);
  };

  const handleConfirmDeleteSession = () => {
    if (!deletingSessionInfo) return;
    const deletedSession = deletingSessionInfo.session;
    const targetDayId = deletingSessionInfo.dayId;
    const targetDay = eventData?.days.find((d) => d.dayId === targetDayId);
    const originalIndex = targetDay
      ? targetDay.sessions.findIndex((s) => s.id === deletedSession.id)
      : -1;

    setEventData((prev) => !prev ? prev : ({
      ...prev,
      days: prev.days.map((d) =>
        d.dayId === targetDayId
          ? {
              ...d,
              sessions: d.sessions.filter((s) => s.id !== deletedSession.id),
            }
          : d
      ),
    }));
    setDeletingSessionInfo(null);
    showFeedback(`"${deletedSession.name}" deleted`, 'delete', 'Undo', () => {
      setEventData((prev) => !prev ? prev : ({
        ...prev,
        days: prev.days.map((d) => {
          if (d.dayId !== targetDayId) return d;
          const nextSessions = [...d.sessions];
          if (originalIndex >= 0 && originalIndex <= nextSessions.length) {
            nextSessions.splice(originalIndex, 0, deletedSession);
          } else {
            nextSessions.push(deletedSession);
          }
          return { ...d, sessions: nextSessions };
        }),
      }));
      triggerHighlight(deletedSession.id);
      showFeedback(`Restored "${deletedSession.name}"`, 'success');
    });
  };

  const handleCopyFromDay1 = (targetDayId: string) => {
    const day1 = eventData?.days.find((d) => d.dayId === 'd1');
    if (!day1) return;

    setEventData((prev) => !prev ? prev : ({
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
    const targetDay = eventData?.days.find((d) => d.dayId === targetDayId);
    showFeedback(
      `Copied schedule from Day 1 to ${targetDay ? targetDay.dayLabel.split('-')[0].trim() : 'Day'}`,
      'success'
    );
  };

  const handleConfirmDeleteEvent = () => {
    if (!eventData) return;
    const deletedEvent = eventData;
    setEventData(null);
    setIsDeletingEvent(false);
    showFeedback(`Event "${deletedEvent.name}" deleted`, 'delete', 'Undo', () => {
      setEventData(deletedEvent);
      showFeedback(`Restored "${deletedEvent.name}"`, 'success');
    });
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
    showFeedback(`Event "${newEvent.name}" published successfully!`, 'success');
  };

  const isSearching = Boolean(search.trim()) || statusFilter !== 'all' || dateFilter !== 'all';

  const filteredDays = useMemo(() => {
    if (!eventData) return [];
    return eventData.days
      .map((day) => {
        const matchesDate =
          dateFilter === 'all' ||
          day.dateStr.toLowerCase().includes(dateFilter.toLowerCase());

        const visibleSessions = day.sessions.filter((s) => {
          const matchesSearch =
            search.trim() === '' ||
            day.dayLabel.toLowerCase().includes(search.toLowerCase()) ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.officers.some(
              (o) =>
                o.name.toLowerCase().includes(search.toLowerCase()) ||
                o.location.toLowerCase().includes(search.toLowerCase())
            );

          const matchesStatus =
            statusFilter === 'all' ||
            s.status.toLowerCase() === statusFilter.toLowerCase();

          return matchesSearch && matchesStatus;
        });

        return {
          ...day,
          visibleSessions,
          matchesDate,
        };
      })
      .filter((day) => day.matchesDate && (!isSearching || day.visibleSessions.length > 0));
  }, [eventData, search, statusFilter, dateFilter, isSearching]);

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
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#756883]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-10 w-56 rounded-xl border border-[#E5E0EB] bg-white pl-9 pr-4 text-xs text-[#24133F] placeholder-[#756883] transition-colors focus:border-brand-700 focus:outline-none md:w-64"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#756883] hover:text-[#24133F]"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Dropdown
          value={statusFilter}
          onChange={setStatusFilter}
          buttonClassName="h-10 rounded-xl"
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
          buttonClassName="h-10 rounded-xl"
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
      {eventData ? (
        <div className="rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          {/* Main Event Header (Divider line only shown when rolled down/expanded) */}
          <div
            className={`flex items-center justify-between transition-all ${
              isEventExpanded ? 'pb-4 border-b border-[#F1EEF4]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F6F4F8] text-[#451475]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#24133F]">{eventData.name}</h2>
                <p className="text-xs text-[#756883]">{eventData.dateRange}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#10B981]">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                Ongoing
              </span>

              {/* Event Actions Kebab Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEventMenuOpen(!isEventMenuOpen)}
                  className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
                  aria-label="Event options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {isEventMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsEventMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-xl border border-[#E5E0EB] bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEventMenuOpen(false);
                          setIsDeletingEvent(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Event</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

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
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isEventExpanded ? 'max-h-[3500px] opacity-100 mt-5 space-y-4' : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          {filteredDays.map((day) => {
            const isDayOpen = isSearching || expandedDayId === day.dayId;

            return (
              <div
                key={day.dayId}
                className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden transition-all"
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
                          Morning, afternoon, evening · {day.visibleSessions.length}{' '}
                          {day.visibleSessions.length === 1 ? 'Session' : 'Sessions'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDayOpen ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-[#756883]">
                        {day.visibleSessions.length}{' '}
                        {day.visibleSessions.length === 1 ? 'session' : 'sessions'}
                      </span>
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

                {/* Day Sessions List (Expanded with smooth sliding animation) */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isDayOpen
                      ? 'max-h-[1600px] opacity-100 border-t border-[#F1EEF4] p-4 space-y-3 bg-[#FAF8FB]/40'
                      : 'max-h-0 opacity-0 p-0 pointer-events-none'
                  }`}
                >
                  {day.visibleSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`rounded-2xl border bg-white p-4 transition-colors duration-200 ${
                            highlightedSessionId === session.id
                              ? 'border-[#451475] ring-2 ring-[#451475]/25'
                              : 'border-[#E5E0EB]'
                          }`}
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
                                    : session.status === 'Completed'
                                    ? 'bg-emerald-700'
                                    : 'bg-slate-400'
                                }`}
                              >
                                {session.status}
                              </span>

                              {/* Session Action Menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuSessionId(openMenuSessionId === session.id ? null : session.id);
                                  }}
                                  className="rounded-lg p-1 text-[#756883] hover:text-[#24133F] hover:bg-slate-100 transition-colors"
                                  title="Session actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {openMenuSessionId === session.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuSessionId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-2xl border border-[#E5E0EB] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditTime(day.dayId, session);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-[#24133F] hover:bg-slate-50 transition-colors"
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-[#756883]" />
                                        Edit time window
                                      </button>
                                      {session.status === 'Completed' ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSessionComplete(day.dayId, session);
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-[#3B82F6] hover:bg-blue-50 transition-colors"
                                        >
                                          <RotateCcw className="h-3.5 w-3.5 text-[#3B82F6]" />
                                          Reopen session
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSessionComplete(day.dayId, session);
                                          }}
                                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-[#24133F] hover:bg-slate-50 transition-colors"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                                          Mark as completed
                                        </button>
                                      )}
                                      <div className="my-1 border-t border-[#F1EEF4]" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingSessionInfo({ dayId: day.dayId, session });
                                          setOpenMenuSessionId(null);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-[#EF4444] hover:bg-rose-50 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-[#EF4444]" />
                                        Delete session
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Assigned Officers Row */}
                          <div className="mt-3.5 border-t border-[#F1EEF4] pt-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#756883]">
                              <Users className="h-3.5 w-3.5" />
                              <span>
                                {session.officers.length}{' '}
                                {session.officers.length === 1 ? 'officer' : 'officers'} assigned
                              </span>
                            </div>

                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {session.officers.slice(0, 3).map((officer) => (
                                <div
                                  key={officer.id}
                                  className="flex items-center gap-2 rounded-full border border-[#E5E0EB] bg-white py-1 pl-1.5 pr-3"
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
                </div>
              );
            })}

            {filteredDays.length === 0 && (
              <div className="py-12 text-center bg-white rounded-2xl border border-[#E5E0EB] p-8">
                <Search className="h-8 w-8 text-[#9E93A9] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-[#24133F]">No sessions found</p>
                <p className="text-xs text-[#756883] mt-1">
                  No attendance sessions match your search or filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                  className="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold text-[#451475] bg-[#FAF7FD] border border-[#E9DDF8] hover:bg-[#F3EDFB] transition-colors"
                >
                  Clear search & filters
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State when Event is deleted */
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#E5E0EB] bg-white p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F6F4F8] text-[#756883] mb-3">
            <Calendar className="h-7 w-7 text-[#756883]" />
          </div>
          <h3 className="text-base font-bold text-[#24133F]">No Event Active</h3>
          <p className="mt-1 max-w-sm text-xs text-[#756883]">
            There is currently no event published. Create a new event to configure schedules and sessions.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateEventOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-2xl bg-[#451475] px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>
      )}

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

      {/* Edit Session Time Window Modal (Portal-rendered, structured time pickers + duration presets) */}
      {editingTimeSession &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditingTimeSession(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl border border-[#E5E0EB] animate-in zoom-in-95 duration-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F1EEF4]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF7FD] text-[#451475]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#24133F]">Edit Session Time Window</h3>
                    <p className="text-[11px] text-[#756883]">{editingTimeSession.session.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTimeSession(null)}
                  className="p-1 rounded-lg text-[#756883] hover:text-[#24133F] hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Structured Start and End time inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#24133F] mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E0EB] text-xs font-semibold text-[#24133F] focus:outline-none focus:border-[#451475] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#24133F] mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E0EB] text-xs font-semibold text-[#24133F] focus:outline-none focus:border-[#451475] bg-white"
                    />
                  </div>
                </div>

                {/* Quick duration presets */}
                <div>
                  <p className="text-[10px] font-bold text-[#756883] uppercase tracking-wider mb-1.5">
                    Quick duration presets
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '1 hr', val: 1 },
                      { label: '1.5 hrs', val: 1.5 },
                      { label: '2 hrs', val: 2 },
                      { label: '2.5 hrs', val: 2.5 },
                      { label: '3 hrs', val: 3 },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyDuration(p.val)}
                        className="rounded-lg border border-[#E5E0EB] bg-[#FAF8FB] px-2.5 py-1 text-[11px] font-semibold text-[#451475] hover:bg-[#F3EDFB] transition-colors"
                      >
                        +{p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formatted live preview */}
                <div className="rounded-xl border border-[#451475]/15 bg-[#FAF7FD] p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#756883]">
                    Active Scanning Window Preview
                  </span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#451475]">
                      {formatTimeWindow(startTimeInput, endTimeInput)}
                    </span>
                    <span className="rounded-md bg-purple-100/70 px-2 py-0.5 text-[10px] font-semibold text-[#451475]">
                      Scanning open
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-[#F1EEF4]">
                <button
                  type="button"
                  onClick={() => setEditingTimeSession(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#756883] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditTime}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#451475] shadow-[0_4px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Time Window
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Event Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeletingEvent}
        onClose={() => setIsDeletingEvent(false)}
        onConfirm={handleConfirmDeleteEvent}
        itemName={eventData ? eventData.name : 'this event'}
      />

      {/* Delete Session Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingSessionInfo)}
        onClose={() => setDeletingSessionInfo(null)}
        onConfirm={handleConfirmDeleteSession}
        itemName={deletingSessionInfo ? `${deletingSessionInfo.session.name}` : 'this session'}
      />
    </div>
  );
}

export default AttendancePage;
