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
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
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

  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<SessionItem | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [collapsedDayIds, setCollapsedDayIds] = useState<Set<string>>(new Set());
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(null);

  const toggleDayCollapse = (dayId: string) => {
    setCollapsedDayIds((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

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

  // Session edit time modal state
  const [editingTimeSession, setEditingTimeSession] = useState<{ dayId: string; session: SessionItem } | null>(null);
  const [startTimeInput, setStartTimeInput] = useState('07:00');
  const [endTimeInput, setEndTimeInput] = useState('09:00');

  const handleOpenEditTime = (dayId: string, session: SessionItem) => {
    setEditingTimeSession({ dayId, session });
    setStartTimeInput(session.timeInStart.slice(0, 5));
    setEndTimeInput(session.timeInEnd.slice(0, 5));
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

  // Edit Event Modal state & handlers
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editEventName, setEditEventName] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventStart, setEditEventStart] = useState('');
  const [editEventEnd, setEditEventEnd] = useState('');
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const handleOpenEditEvent = () => {
    if (!eventData) return;
    setEditEventName(eventData.name);
    setEditEventDesc(eventData.description || '');
    setEditEventStart(eventData.startDate);
    setEditEventEnd(eventData.endDate);
    setIsEditEventOpen(true);
  };

  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData) return;
    const trimmedName = editEventName.trim();
    if (!trimmedName) {
      showFeedback('Event name is required.', 'warning');
      return;
    }
    if (!editEventStart || !editEventEnd || editEventStart > editEventEnd) {
      showFeedback('Valid Start Date and End Date are required.', 'warning');
      return;
    }

    setIsSavingEvent(true);
    try {
      await adminService.updateEvent(eventData.id, {
        name: trimmedName,
        description: editEventDesc.trim() || null,
        start_date: editEventStart,
        end_date: editEventEnd,
      });
      showFeedback('Event details updated successfully!', 'success');
      setIsEditEventOpen(false);
      await loadSchedule(eventData.id);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to update event.';
      showFeedback(apiMsg, 'warning');
    } finally {
      setIsSavingEvent(false);
    }
  };

  // Add Session to Day state & handlers
  const [addingSessionToDay, setAddingSessionToDay] = useState<DaySchedule | null>(null);
  const [newSessionName, setNewSessionName] = useState('Morning Session');
  const [newSessionTimeInStart, setNewSessionTimeInStart] = useState('07:00');
  const [newSessionTimeInEnd, setNewSessionTimeInEnd] = useState('08:30');
  const [newSessionTimeOutStart, setNewSessionTimeOutStart] = useState('11:00');
  const [newSessionTimeOutEnd, setNewSessionTimeOutEnd] = useState('12:00');
  const [isSavingNewSession, setIsSavingNewSession] = useState(false);

  const handleOpenAddSession = (
    day: DaySchedule,
    preset?: 'Morning' | 'Afternoon' | 'Evening' | 'Custom'
  ) => {
    const hasMorning = day.sessions.some((s) => s.name.toLowerCase().includes('morning'));
    const hasAfternoon = day.sessions.some((s) => s.name.toLowerCase().includes('afternoon'));

    const choice = preset && preset !== 'Custom'
      ? preset
      : !hasMorning
      ? 'Morning'
      : !hasAfternoon
      ? 'Afternoon'
      : 'Evening';

    if (choice === 'Morning') {
      setNewSessionName('Morning Session');
      setNewSessionTimeInStart('07:00');
      setNewSessionTimeInEnd('08:30');
      setNewSessionTimeOutStart('11:00');
      setNewSessionTimeOutEnd('12:00');
    } else if (choice === 'Afternoon') {
      setNewSessionName('Afternoon Session');
      setNewSessionTimeInStart('13:00');
      setNewSessionTimeInEnd('14:30');
      setNewSessionTimeOutStart('16:30');
      setNewSessionTimeOutEnd('17:30');
    } else if (choice === 'Evening') {
      setNewSessionName('Evening Session');
      setNewSessionTimeInStart('18:00');
      setNewSessionTimeInEnd('19:30');
      setNewSessionTimeOutStart('20:30');
      setNewSessionTimeOutEnd('21:30');
    } else {
      setNewSessionName('');
      setNewSessionTimeInStart('08:00');
      setNewSessionTimeInEnd('09:00');
      setNewSessionTimeOutStart('12:00');
      setNewSessionTimeOutEnd('13:00');
    }

    setAddingSessionToDay(day);
  };

  const handleToggleSessionCancel = async (session: SessionItem) => {
    if (!eventData) return;
    setTogglingSessionId(session.id);
    const isCurrentlyCancelled = session.name.startsWith('[CANCELLED]');
    const newName = isCurrentlyCancelled
      ? session.name.replace(/^\[CANCELLED\]\s*/, '')
      : `[CANCELLED] ${session.name}`;

    try {
      await adminService.updateSession(session.id, { name: newName });
      showFeedback(
        isCurrentlyCancelled ? 'Session turned on / reactivated.' : 'Session turned off / cancelled.',
        'success'
      );
      await loadSchedule(eventData.id);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to update session status.';
      showFeedback(apiMsg, 'warning');
    } finally {
      setTogglingSessionId(null);
    }
  };

  const handleSaveNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData || !addingSessionToDay) return;
    const trimmedName = newSessionName.trim();
    if (!trimmedName) {
      showFeedback('Session name is required.', 'warning');
      return;
    }

    if (newSessionTimeInStart >= newSessionTimeInEnd) {
      showFeedback('Time-In Start must be before Time-In End.', 'warning');
      return;
    }
    if (newSessionTimeInEnd > newSessionTimeOutStart) {
      showFeedback('Time-In End must be on or before Time-Out Start.', 'warning');
      return;
    }
    if (newSessionTimeOutStart >= newSessionTimeOutEnd) {
      showFeedback('Time-Out Start must be before Time-Out End.', 'warning');
      return;
    }

    setIsSavingNewSession(true);
    try {
      const dayPrefix = addingSessionToDay.dayLabel.split(' - ')[0];
      const formattedName = `${dayPrefix} - ${trimmedName}`;
      await adminService.createSession(eventData.id, {
        name: formattedName,
        date: addingSessionToDay.ymd,
        time_in_start: newSessionTimeInStart + ':00',
        time_in_end: newSessionTimeInEnd + ':00',
        time_out_start: newSessionTimeOutStart + ':00',
        time_out_end: newSessionTimeOutEnd + ':00',
      });
      showFeedback(`Session added to ${dayPrefix}!`, 'success');
      setAddingSessionToDay(null);
      await loadSchedule(eventData.id);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to create session.';
      showFeedback(apiMsg, 'warning');
    } finally {
      setIsSavingNewSession(false);
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
      setCollapsedDayIds((prev) => {
        const next = new Set(prev);
        next.delete(targetDayId);
        return next;
      });
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
              <p className="text-xs font-semibold text-[#756883] mt-1 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#756883]" />
                <span>{eventData.dateRange} · {eventData.durationDays} {eventData.durationDays === 1 ? 'day' : 'days'}</span>
                <span className="h-1 w-1 rounded-full bg-[#756883]/40" />
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    eventData.status === 'Ongoing'
                      ? 'bg-[#E4F7EB] text-[#11883E] border border-[#17B556]/30'
                      : eventData.status === 'Upcoming'
                      ? 'bg-purple-50 text-[#7026B7] border border-[#7026B7]/30'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      eventData.status === 'Ongoing'
                        ? 'bg-[#17B556]'
                        : eventData.status === 'Upcoming'
                        ? 'bg-[#7026B7]'
                        : 'bg-slate-400'
                    }`}
                  />
                  {eventData.status}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={handleOpenEditEvent}
              className="font-bold text-xs"
            >
              Edit Event
            </Button>
            {eventData.id === serverActiveId ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E4F7EB] border border-[#17B556]/30 px-3 py-2 text-xs font-bold text-[#11883E]">
                <CheckCircle2 className="h-4 w-4 text-[#17B556]" />
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
            <button
              type="button"
              onClick={() => setEventToDelete({ id: eventData.id, name: eventData.name })}
              className="rounded-xl border border-[#E5E0EB] bg-white p-2 text-[#756883] hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs cursor-pointer"
              title="Delete Event"
            >
              <Trash2 className="h-4 w-4" />
            </button>
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
        <div className="rounded-[24px] border border-[#E5E0EB] bg-white p-6 space-y-4">
          {/* Event Days Content - Always open & visible immediately */}
          <div className="space-y-4">
            {filteredDays.map((day) => {
              const isDayOpen = isSearching || !collapsedDayIds.has(day.dayId);

              return (
                <div
                  key={day.dayId}
                  className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden transition-all shadow-2xs"
                >
                  {/* Day Header Row */}
                  <div
                    onClick={() => toggleDayCollapse(day.dayId)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#756883]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#24133F]">{day.dayLabel}</h3>
                        <p className="text-[10px] text-[#756883]">
                          {day.visibleSessions.length}{' '}
                          {day.visibleSessions.length === 1 ? 'session' : 'sessions'} configured
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {day.dayId !== 'd1' && day.sessions.length === 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCopyFromDay1(day.dayId);
                          }}
                          className="flex items-center gap-1 rounded-xl border border-dashed border-[#451475]/40 bg-[#FAF7FD] px-2.5 py-1 text-[11px] font-bold text-[#451475] hover:bg-[#F3EDFB] transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copy from Day 1</span>
                        </button>
                      )}
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-[#756883]">
                        {day.status === 'Not Started' ? 'No Sessions' : 'Configured'}
                      </span>
                      {isDayOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#756883]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#756883]" />
                      )}
                    </div>
                  </div>

                  {/* Day Sessions List */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isDayOpen
                        ? 'max-h-[3000px] opacity-100 border-t border-[#F1EEF4] p-4 space-y-3 bg-[#FAF8FB]/40'
                        : 'max-h-0 opacity-0 p-0 pointer-events-none'
                    }`}
                  >
                    {day.visibleSessions.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#756883]">
                        No sessions configured for this day yet.
                      </p>
                    ) : (
                      day.visibleSessions.map((session) => {
                        const isCancelled = session.name.startsWith('[CANCELLED]');
                        const displaySessionName = isCancelled
                          ? session.name.replace(/^\[CANCELLED\]\s*/, '')
                          : session.name;

                        return (
                          <div
                            key={session.id}
                            className={`rounded-2xl border bg-white p-4 transition-colors duration-200 ${
                              isCancelled
                                ? 'border-slate-200 bg-slate-50/60 opacity-85'
                                : highlightedSessionId === session.id
                                ? 'border-[#451475] ring-2 ring-[#451475]/25'
                                : 'border-[#E5E0EB]'
                            }`}
                          >
                            {/* Session Header */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4
                                    className={`text-xs font-bold ${
                                      isCancelled ? 'text-slate-400 line-through' : 'text-[#24133F]'
                                    }`}
                                  >
                                    {displaySessionName}
                                  </h4>
                                  {isCancelled && (
                                    <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                      Cancelled
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTime(day.dayId, session)}
                                  className="group inline-flex items-center gap-1.5 mt-0.5 rounded-md px-1.5 py-0.5 -ml-1.5 text-[11px] text-[#756883] hover:text-[#7026B7] hover:bg-[#FAF7FD] transition-colors cursor-pointer"
                                  title="Click to edit session times"
                                >
                                  <Clock className="h-3 w-3 text-[#756883] group-hover:text-[#7026B7]" />
                                  <span className="font-medium">{session.timeWindow}</span>
                                  <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#7026B7]" />
                                </button>
                              </div>

                              <div className="flex items-center gap-2.5">
                                {/* Status badge */}
                                {!isCancelled ? (
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                      session.status === 'Active'
                                        ? 'bg-[#17B556] text-white'
                                        : session.status === 'Upcoming'
                                        ? 'bg-[#F59E0B] text-white'
                                        : 'bg-[#E4F7EB] text-[#11883E] border border-[#17B556]/30'
                                    }`}
                                  >
                                    {session.status}
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-200 text-slate-600 px-2.5 py-0.5 text-[10px] font-bold">
                                    Off
                                  </span>
                                )}

                                {/* Turn On / Turn Off (Cancel) Toggle */}
                                <div
                                  className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200"
                                  title={
                                    isCancelled
                                      ? 'Session is turned off / cancelled. Click to turn ON.'
                                      : 'Session is active. Click to turn OFF / cancel.'
                                  }
                                >
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!isCancelled}
                                    disabled={togglingSessionId === session.id}
                                    onClick={() => void handleToggleSessionCancel(session)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      !isCancelled ? 'bg-[#7026B7]' : 'bg-slate-300'
                                    } ${togglingSessionId === session.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        !isCancelled ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                  <span className="text-[11px] font-semibold text-[#756883] min-w-5">
                                    {!isCancelled ? 'On' : 'Off'}
                                  </span>
                                </div>

                                {/* Direct Delete Session Button */}
                                <button
                                  type="button"
                                  onClick={() => setSessionToDelete(session)}
                                  title="Delete Session"
                                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
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
                                  className="flex items-center gap-1 rounded-full border border-dashed border-[#451475] bg-[#FAF7FD] px-3 py-1.5 text-xs font-bold text-[#451475] hover:bg-[#F3EDFB] transition-colors cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Assign checkpoints / officers
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Missing Standard Sessions & Add Custom Session Slots */}
                    {(() => {
                      const hasMorning = day.sessions.some((s) => s.name.toLowerCase().includes('morning'));
                      const hasAfternoon = day.sessions.some((s) => s.name.toLowerCase().includes('afternoon'));
                      const hasEvening = day.sessions.some((s) => s.name.toLowerCase().includes('evening'));

                      const missingSlots: Array<{
                        type: 'Morning' | 'Afternoon' | 'Evening';
                        label: string;
                        timeHint: string;
                      }> = [];
                      if (!hasMorning) {
                        missingSlots.push({
                          type: 'Morning',
                          label: 'Add Morning Session',
                          timeHint: 'Typical: 7:00 AM - 8:30 AM · 11:00 AM - 12:00 PM',
                        });
                      }
                      if (!hasAfternoon) {
                        missingSlots.push({
                          type: 'Afternoon',
                          label: 'Add Afternoon Session',
                          timeHint: 'Typical: 1:00 PM - 2:30 PM · 4:30 PM - 5:30 PM',
                        });
                      }
                      if (!hasEvening) {
                        missingSlots.push({
                          type: 'Evening',
                          label: 'Add Evening Session',
                          timeHint: 'Typical: 6:00 PM - 7:30 PM · 8:30 PM - 9:30 PM',
                        });
                      }

                      return (
                        <div className="pt-2 space-y-2">
                          {missingSlots.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {missingSlots.map((slot) => (
                                <button
                                  key={slot.type}
                                  type="button"
                                  onClick={() => handleOpenAddSession(day, slot.type)}
                                  className="flex items-center justify-between rounded-xl border border-dashed border-[#D4C8E2] bg-white/80 p-3 hover:border-[#7026B7] hover:bg-[#FAF7FD] transition-all text-left group cursor-pointer shadow-2xs"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF7FD] border border-[#E5E0EB] group-hover:border-[#7026B7]/40 text-[#7026B7]">
                                      <Plus className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-[#24133F] group-hover:text-[#7026B7]">
                                        {slot.label}
                                      </p>
                                      <p className="text-[10px] text-[#756883]">{slot.timeHint}</p>
                                    </div>
                                  </div>
                                  <span className="rounded-lg bg-white border border-[#E5E0EB] px-2 py-0.5 text-[10px] font-bold text-[#7026B7] group-hover:bg-[#7026B7] group-hover:text-white transition-colors">
                                    + Add
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenAddSession(day, 'Custom')}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7026B7] hover:underline cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Custom Session to {day.dayLabel.split(' - ')[0]}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
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
                                ? 'bg-[#E4F7EB] text-[#11883E] border border-[#17B556]/20'
                                : evRawStatus === 'upcoming'
                                ? 'bg-purple-50 text-[#7026B7]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                evRawStatus === 'ongoing'
                                  ? 'bg-[#17B556]'
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
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E4F7EB] border border-[#17B556]/30 px-3 py-2 text-xs font-bold text-[#11883E]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#17B556]" />
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

      {/* Edit Event Details & Dates Modal */}
      <Modal
        isOpen={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
        title="Edit Event Details"
        description="Update event name, description, and date range. Extending dates dynamically adds more days to the event."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEditEvent} className="space-y-4">
          <Input
            label="Event Name"
            placeholder="e.g. IT Week 2026"
            value={editEventName}
            onChange={(e) => setEditEventName(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#24133F] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={editEventDesc}
              onChange={(e) => setEditEventDesc(e.target.value)}
              placeholder="Brief description of the event..."
              rows={3}
              className="w-full rounded-xl border border-[#E5E0EB] bg-white px-3.5 py-2.5 text-xs text-[#24133F] placeholder-[#756883] outline-none transition-all focus:border-[#7026B7] focus:ring-2 focus:ring-[#7026B7]/15 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={editEventStart}
              onChange={(e) => setEditEventStart(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={editEventEnd}
              min={editEventStart}
              onChange={(e) => setEditEventEnd(e.target.value)}
              required
            />
          </div>

          <div className="rounded-xl bg-[#FAF7FD] border border-[#E9DDF8] p-3 text-[11px] text-[#7026B7] flex items-start gap-2">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Tip: Extending the date range will automatically create new day tabs. Existing sessions and attendance logs will not be affected.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E0EB]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditEventOpen(false)}
              disabled={isSavingEvent}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingEvent}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Session to Day Modal */}
      <Modal
        isOpen={Boolean(addingSessionToDay)}
        onClose={() => setAddingSessionToDay(null)}
        title={`Add Session to ${addingSessionToDay?.dayLabel.split(' - ')[0] || 'Day'}`}
        description={`Create a new attendance session for ${addingSessionToDay?.dateStr || ''}.`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveNewSession} className="space-y-4">
          {/* Quick preset selector */}
          <div>
            <label className="block text-xs font-semibold text-[#24133F] mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewSessionName('Morning Session');
                  setNewSessionTimeInStart('07:00');
                  setNewSessionTimeInEnd('08:30');
                  setNewSessionTimeOutStart('11:00');
                  setNewSessionTimeOutEnd('12:00');
                }}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                  newSessionName.toLowerCase().includes('morning')
                    ? 'border-[#7026B7] bg-[#FAF7FD] text-[#7026B7]'
                    : 'border-[#E5E0EB] bg-white text-[#756883] hover:border-slate-300'
                }`}
              >
                Morning
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewSessionName('Afternoon Session');
                  setNewSessionTimeInStart('13:00');
                  setNewSessionTimeInEnd('14:30');
                  setNewSessionTimeOutStart('16:30');
                  setNewSessionTimeOutEnd('17:30');
                }}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                  newSessionName.toLowerCase().includes('afternoon')
                    ? 'border-[#7026B7] bg-[#FAF7FD] text-[#7026B7]'
                    : 'border-[#E5E0EB] bg-white text-[#756883] hover:border-slate-300'
                }`}
              >
                Afternoon
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewSessionName('Evening Session');
                  setNewSessionTimeInStart('18:00');
                  setNewSessionTimeInEnd('19:30');
                  setNewSessionTimeOutStart('20:30');
                  setNewSessionTimeOutEnd('21:30');
                }}
                className={`rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                  newSessionName.toLowerCase().includes('evening')
                    ? 'border-[#7026B7] bg-[#FAF7FD] text-[#7026B7]'
                    : 'border-[#E5E0EB] bg-white text-[#756883] hover:border-slate-300'
                }`}
              >
                Evening
              </button>
            </div>
          </div>

          <Input
            label="Session Name"
            placeholder="e.g. Morning Session, Afternoon Session, Keynote"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            required
          />

          {/* Time-In Window */}
          <div className="rounded-xl border border-[#E5E0EB] bg-[#FAF7FD]/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#7026B7]">
              <Clock className="h-3.5 w-3.5" />
              <span>Time-In Window</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Time-In Opens"
                type="time"
                value={newSessionTimeInStart}
                onChange={(e) => setNewSessionTimeInStart(e.target.value)}
                required
              />
              <Input
                label="Time-In Closes"
                type="time"
                value={newSessionTimeInEnd}
                onChange={(e) => setNewSessionTimeInEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Time-Out Window */}
          <div className="rounded-xl border border-[#E5E0EB] bg-[#FAF7FD]/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#7026B7]">
              <Clock className="h-3.5 w-3.5" />
              <span>Time-Out Window</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Time-Out Opens"
                type="time"
                value={newSessionTimeOutStart}
                onChange={(e) => setNewSessionTimeOutStart(e.target.value)}
                required
              />
              <Input
                label="Time-Out Closes"
                type="time"
                value={newSessionTimeOutEnd}
                onChange={(e) => setNewSessionTimeOutEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E0EB]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddingSessionToDay(null)}
              disabled={isSavingNewSession}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingNewSession}
            >
              Add Session
            </Button>
          </div>
        </form>
      </Modal>

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
