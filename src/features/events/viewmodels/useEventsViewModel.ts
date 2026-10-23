import { useState, useEffect, useCallback } from 'react';
import { EventRecord, CreateEventPayload } from '../models';
import { eventService } from '../services';

export interface UseEventsViewModelReturn {
  events: EventRecord[];
  isLoading: boolean;
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
    try {
      const data = await eventService.getEvents();
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      setFormError('End date must be on or after the start date.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateEventPayload = {
        name,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
      };
      await eventService.createEvent(payload);
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      await loadEvents();
    } catch (err: any) {
      alert(err?.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    events,
    isLoading,
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
