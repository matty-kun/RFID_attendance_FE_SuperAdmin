import { useState, useEffect, useCallback } from 'react';
import { EventRecord, CreateEventPayload } from '../models';
import { eventService } from '../services';
import { adminService } from '../../../services/adminService';
import { toast } from '../../../context';
import { getEventStatus } from '../../../utils/status';

export interface UseEventsViewModelReturn {
  events: EventRecord[];
  isLoading: boolean;
  error: string | null;
  activeEventId: string | null;
  setActiveEventId: (id: string) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  isDeleting: boolean;
  formError: string | null;
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  loadEvents: () => Promise<void>;
  handleCreate: (e: React.FormEvent) => Promise<void>;
  handleDeleteEvent: (id: string, name: string) => Promise<boolean>;
}

export const useEventsViewModel = (): UseEventsViewModelReturn => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeEventId, setActiveEventIdState] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const setActiveEventId = (id: string) => {
    const target = events.find((e) => e.id === id);
    if (target && getEventStatus(target.start_date, target.end_date) === 'completed') {
      toast.error('Cannot set completed event as active');
      return;
    }
    setActiveEventIdState(id);
    localStorage.setItem('presnt_active_event_id', id);
    adminService
      .setActiveEvent(id)
      .then(() => {
        toast.success('Active event synced across campus');
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.error?.message || 'Failed to sync active event to server');
      });
  };

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, activeRes] = await Promise.all([
        eventService.getEvents(),
        adminService.getActiveEvent().catch(() => ({ active_event_id: null, event: null })),
      ]);
      setEvents(data);

      let serverActiveId = activeRes?.active_event_id;
      const ongoingEvent = data.find((e) => getEventStatus(e.start_date, e.end_date) === 'ongoing');

      if (!serverActiveId || activeRes?.active_event_id === null) {
        if (ongoingEvent) {
          serverActiveId = ongoingEvent.id;
          setActiveEventIdState(ongoingEvent.id);
          localStorage.setItem('presnt_active_event_id', ongoingEvent.id);
          adminService.setActiveEvent(ongoingEvent.id).catch(() => {});
        } else {
          setActiveEventIdState(null);
          localStorage.removeItem('presnt_active_event_id');
        }
      } else {
        const ev = data.find((e) => e.id === serverActiveId);
        if (ev && getEventStatus(ev.start_date, ev.end_date) === 'completed') {
          if (ongoingEvent) {
            serverActiveId = ongoingEvent.id;
            setActiveEventIdState(ongoingEvent.id);
            localStorage.setItem('presnt_active_event_id', ongoingEvent.id);
            adminService.setActiveEvent(ongoingEvent.id).catch(() => {});
          } else {
            setActiveEventIdState(null);
            localStorage.removeItem('presnt_active_event_id');
          }
        } else if (ev) {
          if (getEventStatus(ev.start_date, ev.end_date) !== 'ongoing' && ongoingEvent) {
            serverActiveId = ongoingEvent.id;
            setActiveEventIdState(ongoingEvent.id);
            localStorage.setItem('presnt_active_event_id', ongoingEvent.id);
            adminService.setActiveEvent(ongoingEvent.id).catch(() => {});
          } else {
            setActiveEventIdState(serverActiveId);
            localStorage.setItem('presnt_active_event_id', serverActiveId);
          }
        } else {
          if (ongoingEvent) {
            serverActiveId = ongoingEvent.id;
            setActiveEventIdState(ongoingEvent.id);
            localStorage.setItem('presnt_active_event_id', ongoingEvent.id);
            adminService.setActiveEvent(ongoingEvent.id).catch(() => {});
          } else {
            setActiveEventIdState(null);
            localStorage.removeItem('presnt_active_event_id');
          }
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load campus events. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Event name is required.');
      return;
    }
    if (startDate > endDate) {
      setFormError('End date must be on or after the start date.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateEventPayload = {
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate,
      };
      const created = await eventService.createEvent(payload);
      toast.success(`Event "${name.trim()}" created successfully`);
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setActiveEventId(created.id);
      await loadEvents();
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to create event';
      setFormError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventName: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await eventService.deleteEvent(id);
      toast.success(`Event "${eventName}" deleted successfully.`);
      if (activeEventId === id) {
        localStorage.removeItem('presnt_active_event_id');
      }
      await loadEvents();
      return true;
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to delete event.';
      toast.error(apiMsg);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    events,
    isLoading,
    error,
    activeEventId,
    setActiveEventId,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    isDeleting,
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
    handleDeleteEvent,
  };
};
