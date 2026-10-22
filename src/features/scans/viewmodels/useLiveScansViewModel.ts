import { useState, useEffect, useCallback, useMemo } from 'react';
import { AttendanceRecord, ScanFilterType } from '../models';
import { scanService } from '../services';

export interface UseLiveScansViewModelReturn {
  scans: AttendanceRecord[];
  filteredScans: AttendanceRecord[];
  filterType: ScanFilterType;
  setFilterType: (filter: ScanFilterType) => void;
  isLoading: boolean;
  fetchScans: () => Promise<void>;
}

export const useLiveScansViewModel = (): UseLiveScansViewModelReturn => {
  const [scans, setScans] = useState<AttendanceRecord[]>([]);
  const [filterType, setFilterType] = useState<ScanFilterType>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchScans = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await scanService.getRecentScans(30);
      setScans(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
    const interval = setInterval(fetchScans, 5000);
    return () => clearInterval(interval);
  }, [fetchScans]);

  const filteredScans = useMemo(() => {
    if (filterType === 'all') return scans;
    return scans.filter((sc) => sc.type === filterType);
  }, [scans, filterType]);

  return {
    scans,
    filteredScans,
    filterType,
    setFilterType,
    isLoading,
    fetchScans,
  };
};
