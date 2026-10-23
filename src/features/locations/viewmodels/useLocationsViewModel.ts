import { useState, useEffect, useCallback } from 'react';
import { LocationRecord, CreateLocationPayload } from '../models';
import { locationService } from '../services';

export interface UseLocationsViewModelReturn {
  locations: LocationRecord[];
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  name: string;
  setName: (v: string) => void;
  roomOrFloor: string;
  setRoomOrFloor: (v: string) => void;
  loadLocations: () => Promise<void>;
  handleCreate: (e: React.FormEvent) => Promise<void>;
}

export const useLocationsViewModel = (): UseLocationsViewModelReturn => {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [roomOrFloor, setRoomOrFloor] = useState('');

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await locationService.getLocations();
      setLocations(data);
    } catch {
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CreateLocationPayload = {
        name,
        room_or_floor: roomOrFloor || undefined,
      };
      await locationService.createLocation(payload);
      setIsModalOpen(false);
      setName('');
      setRoomOrFloor('');
      await loadLocations();
    } catch (err: any) {
      alert(err?.message || 'Failed to create venue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    locations,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    name,
    setName,
    roomOrFloor,
    setRoomOrFloor,
    loadLocations,
    handleCreate,
  };
};
