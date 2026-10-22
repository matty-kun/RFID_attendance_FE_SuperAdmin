import { useState, useEffect, useCallback, useMemo } from 'react';
import { AttendanceRecord, AttendanceFilterType } from '../models';
import { attendanceService } from '../services';

export interface UseAttendanceViewModelReturn {
  records: AttendanceRecord[];
  filteredRecords: AttendanceRecord[];
  filterType: AttendanceFilterType;
  setFilterType: (type: AttendanceFilterType) => void;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export const useAttendanceViewModel = (): UseAttendanceViewModelReturn => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filterType, setFilterType] = useState<AttendanceFilterType>('all');
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await attendanceService.getRecentAttendance(50);
      setRecords(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const filteredRecords = useMemo(() => {
    if (filterType === 'all') return records;
    return records.filter((r) => r.type === filterType);
  }, [records, filterType]);

  return {
    records,
    filteredRecords,
    filterType,
    setFilterType,
    isLoading,
    refresh,
  };
};
