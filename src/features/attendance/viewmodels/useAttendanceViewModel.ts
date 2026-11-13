import { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, AttendanceFilterType } from '../models';
import { attendanceService } from '../services';

export interface UseAttendanceViewModelReturn {
  records: AttendanceRecord[];
  filteredRecords: AttendanceRecord[];
  filterType: AttendanceFilterType;
  setFilterType: (type: AttendanceFilterType) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  total: number;
  error: string;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export const useAttendanceViewModel = (): UseAttendanceViewModelReturn => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filterType, setFilterType] = useState<AttendanceFilterType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await attendanceService.getRecentAttendance(page, filterType, startDate, endDate);
      setRecords(data.records);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load attendance records. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, filterType, startDate, endDate]);

  useEffect(() => {
    refresh();
    return undefined;
  }, [refresh]);

  return {
    records,
    filteredRecords: records,
    filterType,
    setFilterType: (value) => { setPage(1); setFilterType(value); },
    startDate,
    setStartDate: (value) => { setPage(1); setStartDate(value); },
    endDate,
    setEndDate: (value) => { setPage(1); setEndDate(value); },
    page,
    setPage,
    total,
    error,
    isLoading,
    refresh,
  };
};
