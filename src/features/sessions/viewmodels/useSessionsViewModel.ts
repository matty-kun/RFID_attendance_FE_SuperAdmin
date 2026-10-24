import { useState, useEffect, useCallback } from 'react';
import { SessionRecord, CreateSessionPayload } from '../models';
import { EventRecord } from '../../../types';
import { sessionService } from '../services';
import { toast } from '../../../context';

export interface UseSessionsViewModelReturn {
  sessions: SessionRecord[];
  events: EventRecord[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  editingSessionId: string | null;
  formError: string | null;
  startEdit: (session: SessionRecord) => void;
  startCreate: () => void;
  name: string;
  setName: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  timeInStart: string;
  setTimeInStart: (v: string) => void;
  timeInEnd: string;
  setTimeInEnd: (v: string) => void;
  timeOutStart: string;
  setTimeOutStart: (v: string) => void;
  timeOutEnd: string;
  setTimeOutEnd: (v: string) => void;
  loadData: () => Promise<void>;
  handleCreate: (e: React.FormEvent) => Promise<void>;
}

export const useSessionsViewModel = (initialEventId?: string): UseSessionsViewModelReturn => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [timeInStart, setTimeInStart] = useState('07:00');
  const [timeInEnd, setTimeInEnd] = useState('09:00');
  const [timeOutStart, setTimeOutStart] = useState('11:30');
  const [timeOutEnd, setTimeOutEnd] = useState('13:00');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const evList = await sessionService.getEvents();
      setEvents(evList);
      if (evList.length > 0 && !selectedEventId) {
        setSelectedEventId(evList[0].id);
        return;
      }
      setSessions(selectedEventId ? await sessionService.getSessions(selectedEventId) : []);
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startEdit = (session: SessionRecord) => {
    setEditingSessionId(session.id);
    setName(session.name);
    setDate(session.date);
    setTimeInStart(session.time_in_start.slice(0, 5));
    setTimeInEnd(session.time_in_end.slice(0, 5));
    setTimeOutStart(session.time_out_start.slice(0, 5));
    setTimeOutEnd(session.time_out_end.slice(0, 5));
    setFormError(null);
    setIsModalOpen(true);
  };

  const startCreate = () => {
    setEditingSessionId(null);
    setName('');
    setDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const selectedEvent = events.find((event) => event.id === selectedEventId);
    if (selectedEvent && (date < selectedEvent.start_date || date > selectedEvent.end_date)) {
      setFormError('Session date must be within the selected event.');
      return;
    }
    if (!(timeInStart < timeInEnd && timeInEnd <= timeOutStart && timeOutStart < timeOutEnd)) {
      setFormError('Time windows must be ordered: Time In, then Time Out.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateSessionPayload = {
        name,
        date,
        time_in_start: `${timeInStart}:00`,
        time_in_end: `${timeInEnd}:00`,
        time_out_start: `${timeOutStart}:00`,
        time_out_end: `${timeOutEnd}:00`,
      };
      if (editingSessionId) {
        await sessionService.updateSession(editingSessionId, payload);
        toast.success(`Session "${name}" updated successfully`);
      } else {
        await sessionService.createSession(selectedEventId, payload);
        toast.success(`Session "${name}" created successfully`);
      }
      setIsModalOpen(false);
      setEditingSessionId(null);
      setName('');
      setDate('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || (editingSessionId ? 'Failed to update session' : 'Failed to create session'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    sessions,
    events,
    selectedEventId,
    setSelectedEventId,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    editingSessionId,
    formError,
    startEdit,
    startCreate,
    name,
    setName,
    date,
    setDate,
    timeInStart,
    setTimeInStart,
    timeInEnd,
    setTimeInEnd,
    timeOutStart,
    setTimeOutStart,
    timeOutEnd,
    setTimeOutEnd,
    loadData,
    handleCreate,
  };
};
