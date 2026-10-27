import { useState, useEffect, useCallback } from 'react';
import { EventRecord, CreateEventPayload } from '../models';
import { eventService } from '../services';
import { adminService } from '../../../services/adminService';
import { toast } from '../../../context';

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
  const [activeEventId, setActiveEventIdState] = useState<string | null>(() =>
    localStorage.getItem('presnt_active_event_id')
  );
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

      const serverActiveId = activeRes?.active_event_id;
      const savedActive = serverActiveId || localStorage.getItem('presnt_active_event_id');
      if (savedActive && data.some((e) => e.id === savedActive)) {
        setActiveEventIdState(savedActive);
        localStorage.setItem('presnt_active_event_id', savedActive);
      } else if (data.length > 0) {
        setActiveEventIdState(data[0].id);
        localStorage.setItem('presnt_active_event_id', data[0].id);
        void adminService.setActiveEvent(data[0].id).catch(() => {});
      } else {
        setActiveEventIdState(null);
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
