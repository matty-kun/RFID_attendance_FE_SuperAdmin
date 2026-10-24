import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Calendar, Check } from 'lucide-react';
import { TimePicker } from '../../../components/common/TimePicker';

export interface EditTimeWindowDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
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
  windowType = 'Session',
  dateStr,
  initialStart,
  initialEnd,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
  const [start, setStart] = useState(initialStart || '07:00');
  const [end, setEnd] = useState(initialEnd || '08:30');

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStart(initialStart || '07:00');
      setEnd(initialEnd || '08:30');
      setActiveTab('start');
      setIsRendered(true);
      const rAF = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(rAF);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialStart, initialEnd]);

  if (!isRendered) return null;

  const handleTimeChange = (val: string) => {
    if (activeTab === 'start') {
      setStart(val);
      // Auto-advance end if start >= end
      if (val >= end) {
        const [h, m] = val.split(':').map(Number);
        const totalMinutes = (h || 0) * 60 + (m || 0) + 90;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        setEnd(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
      }
    } else {
      setEnd(val);
    }
  };

  const handleSave = () => {
    const formatted = `${formatTo12(start)} - ${formatTo12(end)}`;
    onSave(start, end, formatted);
    onClose();
  };

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex justify-end bg-[#170D29]/40 backdrop-blur-md transition-opacity duration-250 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-time-window-title"
        className={`flex h-full w-full max-w-md flex-col justify-between border-l border-[#E5E0EB] bg-white shadow-2xl transform transition-transform duration-250 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b border-[#F1EEF4] p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFB] text-[#451475]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 id="edit-time-window-title" className="text-lg font-bold text-[#24133F]">
                  Edit Time Window
                </h2>
                <p className="text-xs text-[#756883]">
                  Configure attendance scanning window
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Session Context Box */}
          <div className="mt-4 rounded-2xl border border-[#E5E0EB] bg-[#F9F7FA] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#24133F]">{sessionTitle}</span>
              {windowType === 'IN' && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Check-in Window (IN)
                </span>
              )}
              {windowType === 'OUT' && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-[#EF3340] border border-rose-200">
                  Check-out Window (OUT)
                </span>
              )}
              {windowType === 'Session' && (
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-[#7026B7] border border-purple-200">
                  Full Window
                </span>
              )}
            </div>
            {dateStr && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#756883]">
                <Calendar className="h-3.5 w-3.5" />
                <span>{dateStr}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Dual Start / End Tab Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F4F8] p-1.5 border border-[#E5E0EB]">
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

          {/* TimePicker */}
          <TimePicker
            label={`Select ${activeTab === 'start' ? 'Start' : 'End'} Time`}
            value={activeTab === 'start' ? start : end}
            onChange={handleTimeChange}
          />

        </div>

        {/* Footer */}
        <div className="border-t border-[#F1EEF4] p-6 bg-white flex items-center justify-end gap-3">
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
            className="flex items-center gap-1.5 rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#631FA4] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Save Window</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
