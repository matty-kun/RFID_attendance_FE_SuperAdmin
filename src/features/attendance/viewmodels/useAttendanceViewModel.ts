import { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, AttendanceFilterType } from '../models';
import { attendanceService } from '../services';
import { isDevPreview } from '../../auth/devPreview';

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

export const useAttendanceViewModel = (previewRecords?: AttendanceRecord[]): UseAttendanceViewModelReturn => {
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
      const data = isDevPreview() && previewRecords ? (() => {
        const matching = previewRecords.filter((record) =>
          (filterType === 'all' || record.type === filterType)
          && (!startDate || record.recorded_at.slice(0, 10) >= startDate)
          && (!endDate || record.recorded_at.slice(0, 10) <= endDate));
        return { records: matching.slice((page - 1) * 30, page * 30), total: matching.length };
      })() : await attendanceService.getRecentAttendance(page, filterType, startDate, endDate);
      setRecords(data.records);
      setTotal(data.total);
    } catch {
      setError('Could not load attendance records. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, filterType, startDate, endDate, previewRecords]);

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
