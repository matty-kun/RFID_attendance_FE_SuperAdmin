import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar, Check, AlertCircle } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { TimePicker } from '../../../components/common/TimePicker';

export interface EditTimeWindowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  sessionType?: 'Morning' | 'Afternoon' | 'Evening';
  windowType?: 'IN' | 'OUT' | 'Session';
  dateStr?: string;
  initialStart: string; // "07:00"
  initialEnd: string;   // "08:30"
  onSave: (start: string, end: string, formattedWindow: string) => void;
}

function formatTo12(t: string): string {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  const period = (h || 0) >= 12 ? 'PM' : 'AM';
  const hr = (h || 0) % 12 || 12;
  return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
}

export const EditTimeWindowDrawer: React.FC<EditTimeWindowDrawerProps> = ({
  isOpen,
  onClose,
  sessionTitle,
  sessionType,
  windowType = 'Session',
  dateStr,
  initialStart,
  initialEnd,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');

  const detectedSessionType: 'Morning' | 'Afternoon' | 'Evening' | undefined = useMemo(() => {
    if (sessionType) return sessionType;
    const lower = sessionTitle.toLowerCase();
    if (lower.includes('morning')) return 'Morning';
    if (lower.includes('afternoon')) return 'Afternoon';
    if (lower.includes('evening')) return 'Evening';
    return undefined;
  }, [sessionType, sessionTitle]);

  const defaultBounds = useMemo(() => {
    if (windowType === 'IN') {
      if (detectedSessionType === 'Morning') {
        return { defaultStart: '07:00', defaultEnd: '08:30', min: '05:00', max: '14:00' };
      }
      if (detectedSessionType === 'Afternoon') {
        return { defaultStart: '12:30', defaultEnd: '14:00', min: '11:00', max: '18:00' };
      }
      if (detectedSessionType === 'Evening') {
        return { defaultStart: '17:30', defaultEnd: '19:00', min: '16:00', max: '23:30' };
      }
    } else if (windowType === 'OUT') {
      if (detectedSessionType === 'Morning') {
        return { defaultStart: '11:00', defaultEnd: '12:30', min: '08:00', max: '17:00' };
      }
      if (detectedSessionType === 'Afternoon') {
        return { defaultStart: '16:00', defaultEnd: '17:30', min: '13:00', max: '22:00' };
      }
      if (detectedSessionType === 'Evening') {
        return { defaultStart: '20:00', defaultEnd: '21:30', min: '18:00', max: '23:30' };
      }
    }
    return { defaultStart: '07:00', defaultEnd: '08:30', min: '00:00', max: '23:30' };
  }, [detectedSessionType, windowType]);

  const clampTimeToBound = (t: string, fallback: string) => {
    if (!t) return fallback;
    if (t < defaultBounds.min) return defaultBounds.min;
    if (t > defaultBounds.max) return defaultBounds.max;
    return t;
  };

  const [start, setStart] = useState(() => clampTimeToBound(initialStart, defaultBounds.defaultStart));
  const [end, setEnd] = useState(() => clampTimeToBound(initialEnd, defaultBounds.defaultEnd));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const clampedStart = clampTimeToBound(initialStart, defaultBounds.defaultStart);
      const clampedEnd = clampTimeToBound(initialEnd, defaultBounds.defaultEnd);
      setStart(clampedStart);
      setEnd(clampedEnd >= clampedStart ? clampedEnd : defaultBounds.max);
      setActiveTab('start');
      setValidationError(null);
    }
  }, [isOpen, initialStart, initialEnd, defaultBounds]);

  const handleTimeChange = (val: string) => {
    setValidationError(null);
    if (activeTab === 'start') {
      setStart(val);
      if (val >= end) {
        const [h, m] = val.split(':').map(Number);
        const totalMinutes = (h || 0) * 60 + (m || 0) + 60;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        const proposedEnd = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
        if (proposedEnd <= defaultBounds.max) {
          setEnd(proposedEnd);
        } else {
          setEnd(defaultBounds.max);
        }
      }
    } else {
      if (val <= start) {
        setValidationError('End time must be after start time.');
        return;
      }
      setEnd(val);
    }
  };

  const handleSave = () => {
    if (start >= end) {
      setValidationError('Start time must be strictly before end time.');
      return;
    }

    const formatted = `${formatTo12(start)} - ${formatTo12(end)}`;
    onSave(start, end, formatted);
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        windowType === 'IN'
          ? 'Edit Time-IN Window'
          : windowType === 'OUT'
          ? 'Edit Time-OUT Window'
          : 'Edit Time Window'
      }
      description={
        windowType === 'IN'
          ? 'Configure arrival scanning window (Time-IN)'
          : windowType === 'OUT'
          ? 'Configure departure scanning window (Time-OUT)'
          : 'Configure attendance scanning window'
      }
      icon={<Clock className="h-5 w-5" />}
      contextBox={
        <div className="rounded-2xl border border-[#E5E0EB] bg-[#F9F7FA] p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#24133F]">{sessionTitle}</span>
            {windowType === 'IN' && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Time-IN Window (Arrivals)
              </span>
            )}
            {windowType === 'OUT' && (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                Time-OUT Window (Departures)
              </span>
            )}
            {windowType === 'Session' && (
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-[#7026B7] border border-purple-200">
                Full Window
              </span>
            )}
          </div>
          {dateStr && (
            <div className="flex items-center gap-1.5 text-xs text-[#756883]">
              <Calendar className="h-3.5 w-3.5" />
              <span>{dateStr}</span>
            </div>
          )}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5E0EB] px-5 py-2.5 text-xs font-bold text-[#756883] hover:bg-slate-50 hover:text-[#24133F] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-800 shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Window</span>
          </button>
        </div>
      }
    >
      <div className="flex-1 flex flex-col space-y-4 min-h-0">
        {validationError && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Dual Start / End Tab Toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F4F8] p-1.5 border border-[#E5E0EB] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('start')}
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-3 transition-all ${
              activeTab === 'start'
                ? 'bg-white text-[#451475] shadow-xs font-bold'
                : 'text-[#756883] hover:text-[#24133F] font-semibold'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider">Start Window</span>
            <span className="text-sm font-bold mt-0.5">
              {formatTo12(start)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('end')}
            className={`flex flex-col items-center justify-center rounded-xl py-2 px-3 transition-all ${
              activeTab === 'end'
                ? 'bg-white text-[#451475] shadow-xs font-bold'
                : 'text-[#756883] hover:text-[#24133F] font-semibold'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider">End Window</span>
            <span className="text-sm font-bold mt-0.5">
              {formatTo12(end)}
            </span>
          </button>
        </div>

        {/* TimePicker with dynamic constraints */}
        <TimePicker
          label={`Select ${activeTab === 'start' ? 'Start' : 'End'} Time`}
          value={activeTab === 'start' ? start : end}
          onChange={handleTimeChange}
          sessionType={detectedSessionType}
          minTime={activeTab === 'end' ? start : defaultBounds.min}
          maxTime={defaultBounds.max}
          className="flex-1 flex flex-col min-h-0"
          gridContainerClassName="flex-1 min-h-[360px] max-h-none"
        />
      </div>
    </Drawer>
  );
};
