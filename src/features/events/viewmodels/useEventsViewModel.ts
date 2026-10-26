import { useState, useEffect, useCallback } from 'react';
import { EventRecord, CreateEventPayload } from '../models';
import { eventService } from '../services';
import { toast } from '../../../context';

export interface UseEventsViewModelReturn {
  events: EventRecord[];
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
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
}

export const useEventsViewModel = (): UseEventsViewModelReturn => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventService.getEvents();
      setEvents(data);
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
      await eventService.createEvent(payload);
      toast.success(`Event "${name.trim()}" created successfully`);
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      await loadEvents();
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to create event';
      setFormError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
};
