import { useState, useEffect, useCallback } from 'react';
import { SessionAttendanceReport, AttendanceAnalyticsSummary } from '../models';
import { reportService } from '../services';

export interface UseReportsViewModelReturn {
  reports: SessionAttendanceReport[];
  summary: AttendanceAnalyticsSummary | null;
  isLoading: boolean;
  isExporting: boolean;
  handleExportCSV: () => void;
  loadReports: () => Promise<void>;
}

export const useReportsViewModel = (): UseReportsViewModelReturn => {
  const [reports, setReports] = useState<SessionAttendanceReport[]>([]);
  const [summary, setSummary] = useState<AttendanceAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r, s] = await Promise.all([
        reportService.getReportData(),
        reportService.getSummary(),
      ]);
      setReports(r);
      setSummary(s);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      reportService.exportCsv(reports);
      setIsExporting(false);
    }, 600);
  };

  return {
    reports,
    summary,
    isLoading,
    isExporting,
    handleExportCSV,
    loadReports,
  };
};
