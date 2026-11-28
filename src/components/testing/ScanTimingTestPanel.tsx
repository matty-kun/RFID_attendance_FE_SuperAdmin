// TEMP: Scan-to-Confirmation Time Tracking (Testing Only — remove this file and its import before production)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, FlaskConical, RefreshCw, Timer, Trash2, X } from 'lucide-react';
import { request } from '../../services/apiClient';
import { adminService } from '../../services/adminService';
import { Button } from '../common/Button';
import { toast } from '../../context';
import type { EventRecord } from '../../types';

interface ScanTimingRecordItem {
  id: string;
  student_id: string;
  student_number: string;
  student_name: string;
  event_id: string;
  event_name: string;
  session_id: string;
  session_name: string;
  session_date?: string | null;
  day_number?: number | null;
  location_name: string;
  type: 'time_in' | 'time_out';
  recorded_at: string;
  detection_time: string | null;
  confirmation_time: string | null;
  scan_duration_ms: number | null;
}

interface EventScanTimingAverage {
  event_id: string;
  event_name: string;
  scan_count: number;
  average_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
}

interface ScanTimingMetricsResponse {
  overall: {
    total_tracked_scans: number;
    average_duration_ms: number | null;
    min_duration_ms: number | null;
    max_duration_ms: number | null;
  };
  event_averages: EventScanTimingAverage[];
  available_days?: number[];
  records: ScanTimingRecordItem[];
}

function formatExactTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const base = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);

  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${base.replace(/ (AM|PM)$/, `.${ms} $1`)}`;
}

function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  if (ms >= 1000) {
    return `${ms.toLocaleString()} ms (${(ms / 1000).toFixed(2)} s)`;
  }
  return `${ms.toLocaleString()} ms`;
}

export function ScanTimingTestPanel() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [metrics, setMetrics] = useState<ScanTimingMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    void adminService
      .getEvents()
      .then((list) => setEvents(Array.isArray(list) ? list : []))
      .catch(() => {
        // Event filter dropdown is optional; metrics still load without it
      });
  }, []);

  const availableDays = useMemo(() => {
    if (metrics?.available_days && metrics.available_days.length > 0) {
      return metrics.available_days;
    }
    const days = new Set<number>();
    (metrics?.records ?? []).forEach((r) => {
      if (typeof r.day_number === 'number') {
        days.add(r.day_number);
      }
    });
    return Array.from(days).sort((a, b) => a - b);
  }, [metrics]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { limit: 50 };
      if (selectedEventId !== 'all') {
        params.eventId = selectedEventId;
      }
      if (selectedDay !== 'all') {
        params.day = selectedDay;
      }
      const data = await request.get<ScanTimingMetricsResponse>(
        '/attendance/scan-timing-metrics',
        { params }
      );
      setMetrics(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          'Failed to load scan-to-confirmation timing metrics from database.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, selectedDay]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const params: Record<string, string | number> = {};
      if (selectedEventId !== 'all') {
        params.eventId = selectedEventId;
      }
      if (selectedDay !== 'all') {
        params.day = selectedDay;
      }

      const res = await request.delete<{ deleted_count: number }>(
        '/attendance/scan-timing-metrics',
        { params }
      );
      toast.success(
        `Reset complete: ${res?.deleted_count ?? 0} test scan record(s) deleted. Ready for fresh testing!`
      );
      setIsResetModalOpen(false);
      await loadMetrics();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || 'Failed to delete test scan records.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  const selectedEventName =
    selectedEventId === 'all'
      ? 'All Events'
      : events.find((e) => e.id === selectedEventId)?.name || 'Selected Event';

  return (
    <section
      aria-label="Temporary Scan-to-Confirmation Time Tracking Panel"
      className="rounded-3xl border-2 border-dashed border-amber-400 bg-amber-50/40 p-6 shadow-xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
              <FlaskConical className="h-3 w-3" />
              Temporary Testing UI
            </span>
            <h2 className="text-base font-extrabold text-[#24133F]">
              Scan-to-Confirmation Time Tracking
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#756883]">
            Live database measurements from RFID UID detection to confirmed scan feedback (remove before production).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <select
            aria-label="Filter scan timing by event"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setSelectedDay('all');
            }}
            className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 text-xs font-semibold text-[#24133F] focus:border-[#7026B7] focus:outline-none"
          >
            <option value="all">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          {/* Day Filter */}
          <select
            aria-label="Filter scan timing by day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 text-xs font-semibold text-[#24133F] focus:border-[#7026B7] focus:outline-none"
          >
            <option value="all">All Days</option>
            {availableDays.length > 0 ? (
              availableDays.map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))
            ) : (
              <>
                <option value="1">Day 1</option>
                <option value="2">Day 2</option>
              </>
            )}
          </select>

          <button
            type="button"
            onClick={() => void loadMetrics()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7026B7] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#5c1e99] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Reset / Delete Test Data Button */}
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            disabled={loading || !metrics?.overall?.total_tracked_scans}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
            title="Delete test scan records to start with fresh data"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            Reset Data
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void loadMetrics()}
            className="font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Overall Summary Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#756883]">
            <span>Tracked Scans</span>
            <Clock className="h-4 w-4 text-[#7026B7]" />
          </div>
          <p className="mt-2 text-xl font-black text-[#24133F] tabular-nums">
            {metrics ? metrics.overall.total_tracked_scans.toLocaleString() : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#756883]">
            <span>Overall Avg Scan Duration</span>
            <Timer className="h-4 w-4 text-[#7026B7]" />
          </div>
          <p className="mt-2 text-xl font-black text-[#24133F] tabular-nums">
            {metrics ? formatDuration(metrics.overall.average_duration_ms) : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#756883]">
            <span>Min / Max Duration</span>
            <Timer className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-sm font-extrabold text-[#24133F] tabular-nums">
            {metrics && metrics.overall.min_duration_ms !== null
              ? `${formatDuration(metrics.overall.min_duration_ms)} / ${formatDuration(metrics.overall.max_duration_ms)}`
              : '—'}
          </p>
        </div>
      </div>

      {/* Average Scan Duration per Event */}
      <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#756883]">
          Average Scan Duration per Event
        </h3>

        {loading && !metrics ? (
          <p className="py-4 text-center text-xs text-[#756883]">Loading event averages...</p>
        ) : metrics && metrics.event_averages.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {metrics.event_averages.map((ev) => (
              <div
                key={ev.event_id}
                className="rounded-xl border border-purple-100 bg-[#FAF8FC] p-3.5"
              >
                <p className="truncate text-xs font-bold text-[#24133F]" title={ev.event_name}>
                  {ev.event_name}
                </p>
                <p className="mt-1.5 text-lg font-black text-[#7026B7] tabular-nums">
                  {formatDuration(ev.average_duration_ms)}
                </p>
                <p className="mt-1 text-[11px] text-[#756883] tabular-nums">
                  {ev.scan_count} {ev.scan_count === 1 ? 'scan' : 'scans'} · Min{' '}
                  {ev.min_duration_ms.toLocaleString()} ms · Max{' '}
                  {ev.max_duration_ms.toLocaleString()} ms
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-[#756883]">
            No scan timing records found in the database yet. Perform an RFID scan on the mobile app to populate live metrics.
          </p>
        )}
      </div>

      {/* Individual Scan Timing Records Table */}
      <div className="rounded-2xl border border-[#E5E0EB] bg-white overflow-hidden">
        <div className="border-b border-[#E5E0EB] px-4 py-3 flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#756883]">
            Recent Tracked Scans (Latest 50)
          </h3>
          <span className="text-[11px] font-semibold text-[#756883]">
            {metrics?.records.length ?? 0} shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8FC] text-[11px] font-bold uppercase tracking-wider text-[#756883]">
              <tr>
                <th className="px-4 py-2.5">Student</th>
                <th className="px-4 py-2.5">Event / Session</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Scan Detection Time</th>
                <th className="px-4 py-2.5">Scan Confirmation Time</th>
                <th className="px-4 py-2.5 text-right">Scan Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECF5]">
              {loading && !metrics ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#756883]">
                    Loading scan timing records...
                  </td>
                </tr>
              ) : metrics && metrics.records.length > 0 ? (
                metrics.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-[#FAF8FC]/70">
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-[#24133F]">{rec.student_name}</p>
                      <p className="text-[11px] text-[#756883]">{rec.student_number}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[#24133F]">{rec.event_name}</p>
                        {typeof rec.day_number === 'number' && (
                          <span className="inline-flex rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-700">
                            Day {rec.day_number}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#756883]">
                        {rec.session_name} · {rec.location_name}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          rec.type === 'time_in'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {rec.type === 'time_in' ? 'Time In' : 'Time Out'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#24133F] whitespace-nowrap">
                      {formatExactTimestamp(rec.detection_time)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[#24133F] whitespace-nowrap">
                      {formatExactTimestamp(rec.confirmation_time)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#7026B7] tabular-nums whitespace-nowrap">
                      {formatDuration(rec.scan_duration_ms)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#756883]">
                    No tracked scan logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-3xl border border-[#E5E0EB] bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#24133F]">
                    Reset Test Scan Data
                  </h3>
                  <p className="text-xs text-[#756883]">
                    Clean slate for RFID benchmark re-testing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isResetting && setIsResetModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-xs text-rose-900 space-y-1.5">
              <p className="font-bold">
                Delete test scan records for:
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                <li>Event: <span className="font-bold">{selectedEventName}</span></li>
                <li>Filter: <span className="font-bold">{selectedDay === 'all' ? 'All Days' : `Day ${selectedDay}`}</span></li>
                <li>Records to clear: <span className="font-bold">{metrics?.overall.total_tracked_scans.toLocaleString() ?? 0} scan(s)</span></li>
              </ul>
              <p className="pt-1 text-[11px] text-[#756883]">
                This permanently deletes the test attendance records so students can be tapped again fresh.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E0EB]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isResetting}
                disabled={isResetting}
                onClick={() => void handleConfirmReset()}
              >
                Yes, Delete & Reset Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ScanTimingTestPanel;
