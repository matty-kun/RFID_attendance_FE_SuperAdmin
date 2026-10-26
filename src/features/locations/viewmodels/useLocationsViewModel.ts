import { useState, useEffect, useCallback } from 'react';
import { LocationRecord, CreateLocationPayload } from '../models';
import { locationService } from '../services';
import { toast } from '../../../context';

export interface UseLocationsViewModelReturn {
  locations: LocationRecord[];
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  formError: string | null;
  name: string;
  setName: (v: string) => void;
  loadLocations: () => Promise<void>;
  handleCreate: (e: React.FormEvent) => Promise<void>;
}

export const useLocationsViewModel = (): UseLocationsViewModelReturn => {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await locationService.getLocations();
      setLocations(data);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load scanning checkpoints. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Location name is required.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const payload: CreateLocationPayload = {
        name: name.trim(),
      };
      await locationService.createLocation(payload);
      toast.success(`Venue "${name.trim()}" created successfully`);
      setIsModalOpen(false);
      setName('');
      await loadLocations();
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to create venue';
      setFormError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    locations,
    isLoading,
    error,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    formError,
    name,
    setName,
    loadLocations,
    handleCreate,
  };
};
