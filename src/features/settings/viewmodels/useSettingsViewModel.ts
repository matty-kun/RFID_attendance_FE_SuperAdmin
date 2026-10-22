import { useState, useEffect, useCallback } from 'react';
import { HealthState } from '../models';
import { settingsService } from '../services';
import { useAuth } from '../../auth';

export interface UseSettingsViewModelReturn {
  user: ReturnType<typeof useAuth>['user'];
  apiUrl: string;
  healthStatus: HealthState;
  latency: number | null;
  checkHealth: () => Promise<void>;
}

export const useSettingsViewModel = (): UseSettingsViewModelReturn => {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<HealthState>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  const checkHealth = useCallback(async () => {
    setHealthStatus('checking');
    const result = await settingsService.pingBackendHealth();
    setHealthStatus(result.status);
    setLatency(result.latency);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    user,
    apiUrl,
    healthStatus,
    latency,
    checkHealth,
  };
};
