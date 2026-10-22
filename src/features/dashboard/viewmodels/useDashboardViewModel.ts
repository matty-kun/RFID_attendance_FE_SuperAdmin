import { useState, useEffect, useCallback } from 'react';
import { DashboardMetrics } from '../models';
import { AttendanceRecord, EventRecord } from '../../../types';
import { dashboardService } from '../services';

export interface UseDashboardViewModelReturn {
  metrics: DashboardMetrics | null;
  recentScans: AttendanceRecord[];
  events: EventRecord[];
  isLoading: boolean;
  loadData: () => Promise<void>;
}

export const useDashboardViewModel = (): UseDashboardViewModelReturn => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [m, scans, ev] = await Promise.all([
        dashboardService.getMetrics(),
        dashboardService.getRecentScans(8),
        dashboardService.getEvents(),
      ]);
      setMetrics(m);
      setRecentScans(scans);
      setEvents(ev);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      dashboardService.getRecentScans(8).then(setRecentScans);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  return {
    metrics,
    recentScans,
    events,
    isLoading,
    loadData,
  };
};
