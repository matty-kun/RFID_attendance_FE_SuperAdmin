import { useState, useEffect, useCallback } from 'react';
import { SessionRecord, CreateSessionPayload } from '../models';
import { EventRecord } from '../../../types';
import { sessionService } from '../services';

export interface UseSessionsViewModelReturn {
  sessions: SessionRecord[];
  events: EventRecord[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
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
      const [evList, sesList] = await Promise.all([
        sessionService.getEvents(),
        sessionService.getSessions(selectedEventId || undefined),
      ]);
      setEvents(evList);
      if (evList.length > 0 && !selectedEventId) {
        setSelectedEventId(evList[0].id);
      }
      setSessions(sesList);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
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
      await sessionService.createSession(selectedEventId, payload);
      setIsModalOpen(false);
      setName('');
      setDate('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create session');
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
