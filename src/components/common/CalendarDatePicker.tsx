import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

export interface CalendarDatePickerProps {
  startDate?: string;
  endDate?: string;
  onChange: (range: DateRange) => void;
  className?: string;
}

function toYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayRange(start?: string, end?: string): string {
  if (!start && !end) return 'All Dates';
  if (start && !end) {
    const d = new Date(`${start}T00:00:00`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (start && end) {
    if (start === end) {
      const d = new Date(`${start}T00:00:00`);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const d1 = new Date(`${start}T00:00:00`);
    const d2 = new Date(`${end}T00:00:00`);
    const m1 = d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const m2 = d2.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${m1} – ${m2}`;
  }
  return 'Select Date Range';
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  const [tempStart, setTempStart] = useState<string | null>(startDate || null);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate || null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Synchronize internal state with external props
  useEffect(() => {
    setTempStart(startDate || null);
    setTempEnd(endDate || null);
  }, [startDate, endDate]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (ymd: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(ymd);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (ymd < tempStart) {
        setTempEnd(tempStart);
        setTempStart(ymd);
      } else {
        setTempEnd(ymd);
      }
    }
  };

  const applyRange = (start: string | null, end: string | null) => {
    const finalStart = start || '';
    const finalEnd = end || finalStart;
    onChange({
      startDate: finalStart,
      endDate: finalEnd,
      label: formatDisplayRange(finalStart, finalEnd),
    });
    setIsOpen(false);
  };

  const setPreset = (preset: 'today' | 'last7' | 'last30' | 'thisMonth' | 'all') => {
    const today = new Date();
    if (preset === 'today') {
      const ymd = toYMD(today);
      setTempStart(ymd);
      setTempEnd(ymd);
      applyRange(ymd, ymd);
    } else if (preset === 'last7') {
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      const start = toYMD(past);
      const end = toYMD(today);
      setTempStart(start);
      setTempEnd(end);
      applyRange(start, end);
    } else if (preset === 'last30') {
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      const start = toYMD(past);
      const end = toYMD(today);
      setTempStart(start);
      setTempEnd(end);
      applyRange(start, end);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const start = toYMD(firstDay);
      const end = toYMD(lastDay);
      setTempStart(start);
      setTempEnd(end);
      applyRange(start, end);
    } else if (preset === 'all') {
      setTempStart(null);
      setTempEnd(null);
      onChange({ startDate: '', endDate: '', label: 'All Dates' });
      setIsOpen(false);
    }
  };

  // Calendar matrix calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  const days: { ymd: string; dayNum: number; isCurrentMonth: boolean }[] = [];
  // Days from previous month
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    days.push({
      ymd: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      ymd: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Fill remaining trailing days
  const remaining = 42 - days.length; // 6 rows * 7
  for (let d = 1; d <= remaining && days.length < 35; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    days.push({
      ymd: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const displayTrigger = formatDisplayRange(startDate, endDate);

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      {/* Trigger Button Matching Mockup */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs font-semibold text-[#24133F] hover:border-brand-700 transition-colors focus-visible:outline-2 focus-visible:outline-brand-700"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarDays className="h-4 w-4 text-[#756883]" />
        <span>{displayTrigger}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#756883]" />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Date range calendar picker"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[310px] sm:w-[340px] rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Presets */}
          <div className="mb-3 flex flex-wrap gap-1 border-b border-[#F0E8FC] pb-2.5">
            <button
              type="button"
              onClick={() => setPreset('all')}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756883] hover:bg-[#F4F6FA] hover:text-[#24133F]"
            >
              All Dates
            </button>
            <button
              type="button"
              onClick={() => setPreset('today')}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756883] hover:bg-[#F4F6FA] hover:text-[#24133F]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPreset('last7')}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756883] hover:bg-[#F4F6FA] hover:text-[#24133F]"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setPreset('last30')}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756883] hover:bg-[#F4F6FA] hover:text-[#24133F]"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setPreset('thisMonth')}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[#756883] hover:bg-[#F4F6FA] hover:text-[#24133F]"
            >
              This Month
            </button>
          </div>

          {/* Month/Year Navigation */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#24133F]">
              {monthNames[viewMonth]} {viewYear}
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E0EB] text-[#756883] hover:bg-slate-50 hover:text-[#24133F]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E0EB] text-[#756883] hover:bg-slate-50 hover:text-[#24133F]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#637596] mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {days.map(({ ymd, dayNum, isCurrentMonth }) => {
              const isStart = tempStart === ymd;
              const isEnd = tempEnd === ymd;
              const isInRange =
                tempStart &&
                tempEnd &&
                ymd > tempStart &&
                ymd < tempEnd;
              const isHoverInRange =
                tempStart &&
                !tempEnd &&
                hoverDate &&
                ymd > tempStart &&
                ymd <= hoverDate;

              return (
                <button
                  type="button"
                  key={ymd}
                  onClick={() => handleDayClick(ymd)}
                  onMouseEnter={() => setHoverDate(ymd)}
                  className={cn(
                    'relative h-8 w-full text-xs font-semibold flex items-center justify-center transition-colors',
                    !isCurrentMonth ? 'text-slate-300' : 'text-[#24133F]',
                    (isStart || isEnd) &&
                      'bg-brand-700 text-white font-extrabold rounded-lg shadow-sm z-10',
                    (isInRange || isHoverInRange) &&
                      'bg-[#F0E8FC] text-brand-900 rounded-none'
                  )}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer with Apply / Clear */}
          <div className="mt-4 flex items-center justify-between border-t border-[#E5E0EB] pt-3 text-xs">
            <button
              type="button"
              onClick={() => setPreset('all')}
              className="text-[#756883] hover:text-[#24133F] font-semibold"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[#E5E0EB] px-3 py-1.5 font-bold text-[#756883] hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyRange(tempStart, tempEnd)}
                className="rounded-lg bg-brand-700 px-3.5 py-1.5 font-bold text-white shadow-sm hover:bg-brand-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarDatePicker;
