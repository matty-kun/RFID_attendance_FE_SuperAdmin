import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
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
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useToast } from '../context';
import { Button } from '../components/common/Button';
import { Dropdown } from '../components/common/Dropdown';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { DeleteConfirmationModal } from '../components/common/DeleteConfirmationModal';
import { CreateEventModal } from '../features/events/views/CreateEventModal';
import { EditTimeWindowDrawer } from '../features/events/views/EditTimeWindowDrawer';
import {
  AssignOfficersDrawer,
  type AssignedOfficer,
} from '../features/events/views/AssignOfficersDrawer';
import { adminService, type SessionLocations } from '../services/adminService';
import { getEventStatus, getSessionStatus } from '../utils/status';
import type { EventRecord, SessionRecord } from '../types';
import hawiQuestionImg from '../assets/illustrations/Hawi Question.png';
import hawiFindingImg from '../assets/illustrations/Hawi Finding.png';

interface SessionItem {
  id: string;
  name: string;
  date: string;
  timeInStart: string;
  timeInEnd: string;
  timeOutStart: string;
  timeOutEnd: string;
  timeWindow: string;
  status: 'Active' | 'Upcoming' | 'Completed';
  officers: AssignedOfficer[];
}

interface DaySchedule {
  dayId: string;
  dayLabel: string;
  dateStr: string;
  ymd: string;
  sessions: SessionItem[];
  status: 'Active' | 'Upcoming' | 'Not Started';
}

interface EventData {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  dateRange: string;
  durationDays: number;
  status: 'Ongoing' | 'Upcoming' | 'Completed';
  days: DaySchedule[];
}

function formatTo12(timeStr: string): string {
  if (!timeStr) return '--:--';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateRangeLabel(startDate: string, endDate: string): { label: string; daysCount: number } {
  try {
    const d1 = new Date(`${startDate}T00:00:00`);
    const d2 = new Date(`${endDate}T00:00:00`);
    const daysCount = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const startFormatted = d1.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const endFormatted = d2.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const rangeText = startDate === endDate ? startFormatted : `${startFormatted} - ${endFormatted}`;
    return {
      label: `${rangeText} · ${daysCount} ${daysCount === 1 ? 'day' : 'days'}`,
      daysCount,
    };
  } catch {
    return { label: `${startDate} - ${endDate}`, daysCount: 1 };
  }
}

export function AttendancePage() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(() => searchParams.get('eventId') || '');
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [serverActiveId, setServerActiveId] = useState<string | null>(() =>
    localStorage.getItem('presnt_active_event_id')
  );
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEventMenuOpen, setIsEventMenuOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionItem | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isEventExpanded, setIsEventExpanded] = useState(true);
  const [expandedDayId, setExpandedDayId] = useState<string>('d1');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [assigningSession, setAssigningSession] = useState<{
    dayId: string;
    session: SessionItem;
    dateStr: string;
  } | null>(null);

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

  const buildEventSchedule = useCallback(async (ev: EventRecord) => {
    const sessions: SessionRecord[] = await adminService.getSessions(ev.id);

    // Fetch allowed checkpoint locations for each session in parallel
    const sessionLocationsEntries: Array<[string, SessionLocations]> = await Promise.all(
      sessions.map(async (ses): Promise<[string, SessionLocations]> => {
        try {
          const locs = await adminService.getSessionLocations(ses.id);
          return [ses.id, locs];
        } catch {
          return [ses.id, { session_id: ses.id, time_in_locations: [], time_out_locations: [] }];
        }
      })
    );
    const locationsMap = new Map<string, SessionLocations>(sessionLocationsEntries);

    const { label: dateRangeLabel, daysCount } = formatDateRangeLabel(ev.start_date, ev.end_date);
    const startObj = new Date(`${ev.start_date}T00:00:00`);

    const days: DaySchedule[] = Array.from({ length: daysCount }, (_, idx) => {
      const cur = new Date(startObj);
      cur.setDate(startObj.getDate() + idx);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      const dateStr = cur.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const dayId = `d${idx + 1}`;
      const daySessions = sessions
        .filter((s) => s.date === ymd)
        .map((s): SessionItem => {
          const rawStatus = getSessionStatus(s.date, s.time_in_start, s.time_out_end);
          const status: SessionItem['status'] =
            rawStatus === 'open' ? 'Active' : rawStatus === 'upcoming' ? 'Upcoming' : 'Completed';
          const locs = locationsMap.get(s.id);
          const uniqueLocations = new Map<string, string>();
          for (const l of locs?.time_in_locations || []) uniqueLocations.set(l.id, l.name);
          for (const l of locs?.time_out_locations || []) uniqueLocations.set(l.id, l.name);

          const officers: AssignedOfficer[] = Array.from(uniqueLocations.entries()).map(([locId, locName]) => ({
            id: `loc-${locId}`,
            name: locName,
            initials: locName.slice(0, 2).toUpperCase(),
            role: 'Checkpoint',
            location: locName,
            locationId: locId,
            status: 'Online',
          }));

          return {
            id: s.id,
            name: s.name,
            date: s.date,
            timeInStart: s.time_in_start,
            timeInEnd: s.time_in_end,
            timeOutStart: s.time_out_start,
            timeOutEnd: s.time_out_end,
            timeWindow: `IN: ${formatTo12(s.time_in_start)} - ${formatTo12(s.time_in_end)} · OUT: ${formatTo12(s.time_out_start)} - ${formatTo12(s.time_out_end)}`,
            status,
            officers,
          };
        });

      const hasActive = daySessions.some((s) => s.status === 'Active');
      const hasAny = daySessions.length > 0;

      return {
        dayId,
        dayLabel: `Day ${idx + 1} - ${dateStr}`,
        dateStr,
        ymd,
        sessions: daySessions,
        status: hasActive ? 'Active' : hasAny ? 'Upcoming' : 'Not Started',
      };
    });

    const evRawStatus = getEventStatus(ev.start_date, ev.end_date);
    const evStatus: EventData['status'] =
      evRawStatus === 'ongoing' ? 'Ongoing' : evRawStatus === 'upcoming' ? 'Upcoming' : 'Completed';

    setEventData({
      id: ev.id,
      name: ev.name,
      description: ev.description,
      startDate: ev.start_date,
      endDate: ev.end_date,
      dateRange: dateRangeLabel,
      durationDays: daysCount,
      status: evStatus,
      days,
    });
  }, []);

  const loadSchedule = useCallback(
    async (preferredEventId?: string) => {
      setLoading(true);
      setError('');
      try {
        const [allEvents, activeRes] = await Promise.all([
          adminService.getEvents(),
          adminService.getActiveEvent().catch(() => ({ active_event_id: null, event: null })),
        ]);
        setEvents(allEvents);
        const activeId = activeRes?.active_event_id || localStorage.getItem('presnt_active_event_id');
        setServerActiveId(activeId);

        const targetId =
          preferredEventId !== undefined
            ? preferredEventId
            : searchParams.get('eventId') || '';

        if (targetId) {
          const targetEvent = allEvents.find((e) => e.id === targetId);
          if (targetEvent) {
            setSelectedEventId(targetEvent.id);
            await buildEventSchedule(targetEvent);
            return;
          }
        }

        setSelectedEventId('');
        setEventData(null);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'Could not load attendance schedule. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [searchParams, buildEventSchedule]
  );

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setSearchParams({ eventId });
    void loadSchedule(eventId);
  };

  const handleBackToEvents = () => {
    setSelectedEventId('');
    setSearchParams({});
    setEventData(null);
  };

  const handleSetActiveEvent = async (e: React.MouseEvent, eventId: string, eventName: string) => {
    e.stopPropagation();
    try {
      await adminService.setActiveEvent(eventId);
      setServerActiveId(eventId);
      localStorage.setItem('presnt_active_event_id', eventId);
      showFeedback(`Event "${eventName}" set as active campus event.`, 'success');
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to set active event.';
      showFeedback(apiMsg, 'warning');
    }
  };

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const handleOpenAssign = (dayId: string, session: SessionItem, dateStr: string) => {
    setAssigningSession({ dayId, session, dateStr });
  };

  const handleSaveAssignedOfficers = async (updatedOfficers: AssignedOfficer[]) => {
    if (!assigningSession) return;
    const targetSessionId = assigningSession.session.id;
    const targetSessionName = assigningSession.session.name;

    const locationIds = Array.from(
      new Set(updatedOfficers.map((o) => o.locationId).filter((id): id is string => Boolean(id)))
    );

    try {
      await adminService.saveSessionLocations(targetSessionId, {
        time_in_location_ids: locationIds,
        time_out_location_ids: locationIds,
      });

      setEventData((prev) =>
        !prev
          ? prev
          : {
              ...prev,
              days: prev.days.map((d) =>
                d.dayId === assigningSession.dayId
                  ? {
                      ...d,
                      sessions: d.sessions.map((s) =>
                        s.id === targetSessionId ? { ...s, officers: updatedOfficers } : s
                      ),
                    }
                  : d
              ),
            }
      );
      triggerHighlight(targetSessionId);
      showFeedback(
        `Saved ${locationIds.length} checkpoint${locationIds.length === 1 ? '' : 's'} for ${targetSessionName}`,
        'success'
      );
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Could not save session checkpoints.';
      showFeedback(apiMsg, 'warning');
    }
  };

  // Session action menus & edit modal state
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [editingTimeSession, setEditingTimeSession] = useState<{ dayId: string; session: SessionItem } | null>(null);
  const [startTimeInput, setStartTimeInput] = useState('07:00');
  const [endTimeInput, setEndTimeInput] = useState('09:00');

  const handleToggleSessionComplete = (_dayId: string, session: SessionItem) => {
    setOpenMenuSessionId(null);
    showFeedback(
      `Manual session status override for "${session.name}" is not supported: sessions open and close automatically based on their configured schedule.`,
      'warning'
    );
  };

  const handleOpenEditTime = (dayId: string, session: SessionItem) => {
    setEditingTimeSession({ dayId, session });
    setStartTimeInput(session.timeInStart.slice(0, 5));
    setEndTimeInput(session.timeInEnd.slice(0, 5));
    setOpenMenuSessionId(null);
  };

  const handleSaveEditTime = async (start: string, end: string, _formatted: string) => {
    if (!editingTimeSession) return;
    const targetSession = editingTimeSession.session;
    const newInStart = `${start}:00`;
    const newInEnd = `${end}:00`;

    // Ensure time_out_start >= newInEnd so backend validation passes
    let newOutStart = targetSession.timeOutStart;
    let newOutEnd = targetSession.timeOutEnd;
    if (newOutStart < newInEnd) {
      newOutStart = newInEnd;
      if (newOutEnd <= newOutStart) {
        const [h] = newOutStart.split(':').map(Number);
        const outEndHr = Math.min(23, (h || 12) + 1);
        newOutEnd = `${String(outEndHr).padStart(2, '0')}:30:00`;
      }
    }

    try {
      await adminService.updateSession(targetSession.id, {
        time_in_start: newInStart,
        time_in_end: newInEnd,
        time_out_start: newOutStart,
        time_out_end: newOutEnd,
      });
      await loadSchedule(selectedEventId);
      triggerHighlight(targetSession.id);
      showFeedback(`Updated time window for "${targetSession.name}"`, 'success');
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Could not update session time window.';
      showFeedback(apiMsg, 'warning');
    } finally {
      setEditingTimeSession(null);
    }
  };

  const handleDeleteSessionConfirm = async () => {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);
    try {
      await adminService.deleteSession(sessionToDelete.id);
      showFeedback(`Session "${sessionToDelete.name}" deleted successfully.`, 'success');
      setSessionToDelete(null);
      await loadSchedule(selectedEventId);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to delete session.';
      showFeedback(apiMsg, 'warning');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleCopyFromDay1 = async (targetDayId: string) => {
    if (!eventData) return;
    const day1 = eventData.days.find((d) => d.dayId === 'd1');
    const targetDay = eventData.days.find((d) => d.dayId === targetDayId);
    if (!day1 || !targetDay || day1.sessions.length === 0) {
      showFeedback('Day 1 has no configured sessions to copy.', 'warning');
      return;
    }

    try {
      for (const s of day1.sessions) {
        const created = await adminService.createSession(eventData.id, {
          name: s.name.replace(/^Day 1\s*-\s*/i, `${targetDay.dayLabel.split('-')[0].trim()} - `),
          date: targetDay.ymd,
          time_in_start: s.timeInStart,
          time_in_end: s.timeInEnd,
          time_out_start: s.timeOutStart,
          time_out_end: s.timeOutEnd,
        });
        const locIds = s.officers.map((o) => o.locationId).filter((id): id is string => Boolean(id));
        if (locIds.length > 0) {
          await adminService.saveSessionLocations(created.id, {
            time_in_location_ids: locIds,
            time_out_location_ids: locIds,
          });
        }
      }
      await loadSchedule(eventData.id);
      setExpandedDayId(targetDayId);
      showFeedback(
        `Copied ${day1.sessions.length} session(s) from Day 1 to ${targetDay.dayLabel.split('-')[0].trim()}`,
        'success'
      );
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to copy sessions from Day 1.';
      showFeedback(apiMsg, 'warning');
    }
  };

  const handleDeleteEventConfirm = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    try {
      await adminService.deleteEvent(eventToDelete.id);
      showFeedback(`Event "${eventToDelete.name}" deleted successfully.`, 'success');
      if (serverActiveId === eventToDelete.id) {
        localStorage.removeItem('presnt_active_event_id');
        setServerActiveId(null);
      }
      const deletedId = eventToDelete.id;
      setEventToDelete(null);
      if (selectedEventId === deletedId) {
        handleBackToEvents();
      }
      await loadSchedule('');
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to delete event.';
      showFeedback(apiMsg, 'warning');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleEventPublished = (createdEvent: EventRecord) => {
    handleSelectEvent(createdEvent.id);
  };

  const filteredEventsList = useMemo(() => {
    return events.filter((ev) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = ev.name.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      if (statusFilter !== 'all') {
        const evRawStatus = getEventStatus(ev.start_date, ev.end_date);
        if (evRawStatus !== statusFilter) return false;
      }

      if (dateRange.start && ev.end_date < dateRange.start) return false;
      if (dateRange.end && ev.start_date > dateRange.end) return false;

      return true;
    });
  }, [events, search, statusFilter, dateRange]);

  const hasDateFilter = Boolean(dateRange.start || dateRange.end);
  const isSearching = Boolean(search.trim()) || statusFilter !== 'all' || hasDateFilter;

  const filteredDays = useMemo(() => {
    if (!eventData) return [];
    return eventData.days
      .map((day) => {
        const matchesDate = (() => {
          if (!dateRange.start && !dateRange.end) return true;
          const dayYMD = day.ymd;
          if (!dayYMD) return true;
          if (dateRange.start && !dateRange.end) return dayYMD === dateRange.start;
          if (dateRange.start && dateRange.end) return dayYMD >= dateRange.start && dayYMD <= dateRange.end;
          return true;
        })();

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
  }, [eventData, search, statusFilter, dateRange, isSearching]);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 text-[#24133F]">
      {/* Top Header & Navigation */}
      {eventData ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleBackToEvents}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E0EB] bg-white text-[#756883] hover:text-[#24133F] hover:border-brand-700 hover:bg-[#FAF7FD] transition-all shadow-2xs"
              title="Back to All Events"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#756883]">
                <button
                  type="button"
                  onClick={handleBackToEvents}
                  className="hover:text-brand-700 hover:underline"
                >
                  Events & Attendance
                </button>
                <span>/</span>
                <span className="font-semibold text-brand-700">{eventData.name}</span>
              </div>
              <h1 className="text-2xl font-extrabold leading-tight text-[#24133F]">{eventData.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {eventData.id === serverActiveId ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-[#10B981]">
                <CheckCircle2 className="h-4 w-4" />
                Active Campus Event
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => void handleSetActiveEvent(e, eventData.id, eventData.name)}
                className="rounded-xl border border-[#E5E0EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#756883] hover:border-brand-700 hover:text-brand-700 hover:bg-[#FAF7FD] transition-all shadow-2xs"
              >
                Set as Active Campus Event
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight">Events &amp; Attendance</h1>
            <p className="text-xs text-[#756883]">
              Manage campus events, attendance sessions, scanning windows, and checkpoints.
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateEventOpen(true)}
          >
            Create Event
          </Button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button type="button" onClick={() => void loadSchedule(selectedEventId)} className="underline">
            Retry
          </button>
        </div>
      )}

      {/* Toolbar: Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#756883]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={eventData ? "Search sessions or checkpoints" : "Search events by name or description..."}
              className="h-10 w-60 rounded-xl border border-[#E5E0EB] bg-white pl-9 pr-4 text-xs text-[#24133F] placeholder-[#756883] transition-colors focus:border-brand-700 focus:outline-none md:w-72"
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
            options={
              eventData
                ? [
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'completed', label: 'Completed' },
                  ]
                : [
                    { value: 'all', label: 'All Status' },
                    { value: 'ongoing', label: 'Ongoing' },
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'completed', label: 'Completed' },
                  ]
            }
          />

          <CalendarDatePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={(range) => {
              setDateRange({
                start: range.startDate || undefined,
                end: range.endDate || undefined,
              });
            }}
          />
        </div>
      </div>

      {/* Event Accordion Container */}
      {loading && !eventData ? (
        <div className="rounded-[24px] border border-[#E5E0EB] bg-white p-12 text-center flex flex-col items-center justify-center">
          <img
            src={hawiFindingImg}
            alt="Loading attendance schedule…"
            className="w-24 h-24 object-contain mb-3"
          />
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#7026B7]" />
            <p className="text-sm font-bold text-[#24133F]">Loading attendance schedule…</p>
          </div>
          <p className="text-xs text-[#756883] mt-1">Fetching events, sessions, and checkpoint mappings.</p>
        </div>
      ) : eventData ? (
        <div className="rounded-[24px] border border-[#E5E0EB] bg-white p-6">
          {/* Main Event Header */}
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
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  eventData.status === 'Ongoing'
                    ? 'bg-emerald-50 text-[#10B981]'
                    : eventData.status === 'Upcoming'
                    ? 'bg-purple-50 text-[#7026B7]'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    eventData.status === 'Ongoing'
                      ? 'bg-[#10B981]'
                      : eventData.status === 'Upcoming'
                      ? 'bg-[#7026B7]'
                      : 'bg-slate-400'
                  }`}
                />
                {eventData.status}
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
                    <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl border border-[#E5E0EB] bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEventMenuOpen(false);
                          setEventToDelete({ id: eventData.id, name: eventData.name });
                        }}
                        disabled={isDeletingEvent}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
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
                            {day.visibleSessions.length}{' '}
                            {day.visibleSessions.length === 1 ? 'Session' : 'Sessions'} configured
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
                          {day.dayId !== 'd1' && day.sessions.length === 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleCopyFromDay1(day.dayId);
                              }}
                              className="hidden sm:flex items-center gap-1 rounded-xl border border-dashed border-[#451475]/40 bg-[#FAF7FD] px-2.5 py-1 text-[11px] font-bold text-[#451475] hover:bg-[#F3EDFB] transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                              Copy from Day 1
                            </button>
                          )}
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-[#756883]">
                            {day.status === 'Not Started' ? 'No Sessions' : 'Configured'}
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#756883]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day Sessions List */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isDayOpen
                        ? 'max-h-[1600px] opacity-100 border-t border-[#F1EEF4] p-4 space-y-3 bg-[#FAF8FB]/40'
                        : 'max-h-0 opacity-0 p-0 pointer-events-none'
                    }`}
                  >
                    {day.visibleSessions.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#756883]">
                        No sessions configured for this day.
                      </p>
                    ) : (
                      day.visibleSessions.map((session) => (
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
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-emerald-700'
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
                                    <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border border-[#E5E0EB] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-xs">
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
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleSessionComplete(day.dayId, session);
                                        }}
                                        title="Sessions open/close automatically based on schedule"
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-slate-400 cursor-not-allowed"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                                        Auto-scheduled status
                                      </button>
                                      <div className="my-1 border-t border-[#F1EEF4]" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuSessionId(null);
                                          setSessionToDelete(session);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                        Delete session
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Assigned Checkpoints / Officers Row */}
                          <div className="mt-3.5 border-t border-[#F1EEF4] pt-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#756883]">
                              <Users className="h-3.5 w-3.5" />
                              <span>
                                {session.officers.length}{' '}
                                {session.officers.length === 1 ? 'checkpoint / officer' : 'checkpoints / officers'} configured
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

                              <button
                                type="button"
                                onClick={() => handleOpenAssign(day.dayId, session, day.dateStr)}
                                className="flex items-center gap-1 rounded-full border border-dashed border-[#451475] bg-[#FAF7FD] px-3 py-1.5 text-xs font-bold text-[#451475] hover:bg-[#F3EDFB] transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Assign checkpoints / officers
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {filteredDays.length === 0 && (
              <div className="py-12 text-center bg-white rounded-2xl border border-[#E5E0EB] p-8 flex flex-col items-center justify-center">
                <img
                  src={hawiQuestionImg}
                  alt="Hawi Question"
                  className="h-28 w-28 sm:h-36 sm:w-36 object-contain mx-auto mb-3"
                />
                <p className="text-sm font-bold text-[#24133F]">No sessions found</p>
                <p className="text-xs text-[#756883] mt-1 max-w-xs mx-auto">
                  No attendance sessions match your search or date filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setDateRange({});
                  }}
                  className="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold text-[#7026B7] bg-[#FAF7FD] border border-[#E9DDF8] hover:bg-[#F3EDFB] transition-colors"
                >
                  Clear search & filters
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Events Directory List View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#756883]">
              {filteredEventsList.length} Campus Event{filteredEventsList.length !== 1 ? 's' : ''} Listed
            </p>
          </div>

          {filteredEventsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#E5E0EB] bg-white p-12 text-center">
              <img
                src={hawiQuestionImg}
                alt="No Event"
                className="h-32 w-32 sm:h-40 sm:w-40 object-contain mx-auto mb-4"
              />
              <h3 className="text-base font-bold text-[#24133F]">No Events Found</h3>
              <p className="mt-1 max-w-sm text-xs text-[#756883]">
                {search || statusFilter !== 'all' || dateRange.start || dateRange.end
                  ? 'No events match your current search or filter criteria. Try clearing search or filters.'
                  : 'There are currently no campus events registered. Create a new event to configure schedules and attendance sessions.'}
              </p>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateEventOpen(true)}
                className="mt-4"
              >
                Create Event
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredEventsList.map((ev) => {
                const dateInfo = formatDateRangeLabel(ev.start_date, ev.end_date);
                const evRawStatus = getEventStatus(ev.start_date, ev.end_date);
                const isActiveCampus = ev.id === serverActiveId;

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev.id)}
                    className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[24px] border border-[#E5E0EB] bg-white p-5 md:p-6 shadow-2xs hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6F4F8] text-[#7026B7]">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-[#24133F]">
                            {ev.name}
                          </h3>
                          <span
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              evRawStatus === 'ongoing'
                                ? 'bg-emerald-50 text-[#10B981]'
                                : evRawStatus === 'upcoming'
                                ? 'bg-purple-50 text-[#7026B7]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                evRawStatus === 'ongoing'
                                  ? 'bg-[#10B981]'
                                  : evRawStatus === 'upcoming'
                                  ? 'bg-[#7026B7]'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {evRawStatus.charAt(0).toUpperCase() + evRawStatus.slice(1)}
                          </span>
                        </div>

                        {ev.description && (
                          <p className="text-xs text-[#756883] line-clamp-2 max-w-2xl">
                            {ev.description}
                          </p>
                        )}

                        <p className="text-xs font-medium text-[#756883]">
                          {dateInfo.label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {isActiveCampus ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Active Event
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => void handleSetActiveEvent(e, ev.id, ev.name)}
                          className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 text-xs font-semibold text-[#756883] hover:border-brand-500 hover:text-brand-700 hover:bg-[#FAF7FD] transition-all shadow-2xs"
                        >
                          Set as Active
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectEvent(ev.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 px-4 py-2 text-xs font-bold transition-colors"
                      >
                        <span>Manage Sessions</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventToDelete({ id: ev.id, name: ev.name });
                        }}
                        title="Delete Event"
                        className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Event Flow Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onPublished={handleEventPublished}
      />

      {/* Assign Officers & Checkpoints Drawer */}
      <AssignOfficersDrawer
        isOpen={Boolean(assigningSession)}
        onClose={() => setAssigningSession(null)}
        sessionName={assigningSession?.session.name || ''}
        sessionTime={assigningSession?.session.timeWindow || ''}
        sessionDate={assigningSession?.dateStr || ''}
        sessionStatus={
          assigningSession?.session.status === 'Active'
            ? 'Active'
            : assigningSession?.session.status === 'Upcoming'
            ? 'Upcoming'
            : 'Completed'
        }
        initialAssigned={assigningSession?.session.officers || []}
        onSave={handleSaveAssignedOfficers}
      />

      {/* Edit Session Time Window Drawer */}
      <EditTimeWindowDrawer
        isOpen={Boolean(editingTimeSession)}
        onClose={() => setEditingTimeSession(null)}
        sessionTitle={editingTimeSession ? `${editingTimeSession.session.name}` : ''}
        windowType="IN"
        dateStr={eventData?.days.find((d) => d.dayId === editingTimeSession?.dayId)?.dateStr}
        initialStart={startTimeInput}
        initialEnd={endTimeInput}
        onSave={handleSaveEditTime}
      />

      {/* Delete Event Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(eventToDelete)}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => void handleDeleteEventConfirm()}
        title="Delete Event"
        itemName={eventToDelete ? `event "${eventToDelete.name}"` : undefined}
        description={
          eventToDelete ? (
            <>
              Are you sure you want to delete event <span className="font-bold text-[#24133F]">"{eventToDelete.name}"</span>?
              This will permanently delete the event along with all its sessions, checkpoints, and recorded attendance logs.
            </>
          ) : undefined
        }
        confirmLabel="Delete Event"
        isDeleting={isDeletingEvent}
      />

      {/* Delete Session Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => void handleDeleteSessionConfirm()}
        title="Delete Session"
        itemName={sessionToDelete ? `session "${sessionToDelete.name}"` : undefined}
        description={
          sessionToDelete ? (
            <>
              Are you sure you want to delete session <span className="font-bold text-[#24133F]">"{sessionToDelete.name}"</span>?
              This will permanently delete the session along with its checkpoint assignments and recorded attendance logs.
            </>
          ) : undefined
        }
        confirmLabel="Delete Session"
        isDeleting={isDeletingSession}
      />
    </div>
  );
}

export default AttendancePage;
