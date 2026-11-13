import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  startDate = '',
  endDate = '',
  onChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());

  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Synchronize internal state with external props
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const d = new Date(`${startDate}T00:00:00`);
      setViewMonth(d.getMonth());
      setViewYear(d.getFullYear());
    }
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
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dayStr: string) => {
    if (!tempStart || (tempStart && tempEnd && tempStart !== tempEnd)) {
      setTempStart(dayStr);
      setTempEnd(dayStr);
    } else if (tempStart && (!tempEnd || tempStart === tempEnd)) {
      if (dayStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dayStr);
      } else {
        setTempEnd(dayStr);
      }
    }
  };

  const setPreset = (preset: 'all' | 'today' | 'last7' | 'last30' | 'thisMonth') => {
    const today = new Date();
    if (preset === 'today') {
      const ymd = toYMD(today);
      setTempStart(ymd);
      setTempEnd(ymd);
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
    } else if (preset === 'last7') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      const start = toYMD(past);
      const end = toYMD(today);
      setTempStart(start);
      setTempEnd(end);
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
    } else if (preset === 'last30') {
      const past = new Date(today);
      past.setDate(today.getDate() - 29);
      const start = toYMD(past);
      const end = toYMD(today);
      setTempStart(start);
      setTempEnd(end);
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const start = toYMD(firstDay);
      const end = toYMD(lastDay);
      setTempStart(start);
      setTempEnd(end);
      setViewMonth(today.getMonth());
      setViewYear(today.getFullYear());
    } else if (preset === 'all') {
      setTempStart('');
      setTempEnd('');
    }
  };

  const handleApply = () => {
    onChange({
      startDate: tempStart,
      endDate: tempEnd,
      label: formatDisplayRange(tempStart, tempEnd),
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart('');
    setTempEnd('');
    onChange({
      startDate: '',
      endDate: '',
      label: 'All Dates',
    });
    setIsOpen(false);
  };

  const displayTrigger = formatDisplayRange(startDate, endDate);

  // Month rendering calculation (matching CreateEventModal)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  // Active range determination (including hover preview)
  const effectiveEnd = useMemo(() => {
    if (tempEnd) return tempEnd;
    if (tempStart && hoverDate && hoverDate >= tempStart) return hoverDate;
    return tempStart;
  }, [tempStart, tempEnd, hoverDate]);

  const effectiveStart = useMemo(() => {
    if (tempStart && hoverDate && !tempEnd && hoverDate < tempStart) return hoverDate;
    return tempStart;
  }, [tempStart, tempEnd, hoverDate]);

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      {/* Trigger Button with Single Chevron and Calendar Icon */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs font-semibold text-[#24133F] hover:border-[#7026B7] transition-colors focus-visible:outline-2 focus-visible:outline-[#7026B7]"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Calendar className="h-4 w-4 text-[#756883]" />
        <span>{displayTrigger}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#756883] transition-transform duration-200',
            isOpen && 'rotate-180 text-[#7026B7]'
          )}
        />
      </button>

      {/* Popover Dropdown matching CreateEventModal calendar design */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Date range calendar picker"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] sm:w-[350px] rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Quick Presets (Pill Chips) */}
          <div className="mb-3.5 flex flex-wrap gap-1.5 border-b border-[#F1EEF4] pb-3">
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
            ].map((p) => {
              const isSelected =
                (p.id === 'all' && !tempStart && !tempEnd) ||
                (p.id === 'today' && tempStart === toYMD(new Date()) && tempEnd === toYMD(new Date()));

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as any)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-[#F4EFFB] text-[#7026B7] font-bold'
                      : 'text-[#756883] hover:bg-slate-100 hover:text-[#24133F]'
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-[#F1EEF4]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#7026B7]" />
              <span className="text-xs font-bold text-[#24133F]">
                {new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-bold text-[#756883]">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Interactive Day Cells with CreateEventModal Range Ribbon */}
          <div className="grid grid-cols-7 text-center text-xs">
            {(() => {
              const cells = [];

              // Blank spaces for initial offset
              for (let i = 0; i < firstDay; i++) {
                cells.push(<div key={`blank-${i}`} className="h-8" />);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isStart = dayStr === effectiveStart;
                const isEnd = dayStr === effectiveEnd;
                const inRange =
                  effectiveStart && effectiveEnd && dayStr > effectiveStart && dayStr < effectiveEnd;
                const hasRange =
                  effectiveStart && effectiveEnd && effectiveStart !== effectiveEnd;

                const dayOfWeek = (firstDay + day - 1) % 7;
                const isRowStart = dayOfWeek === 0;
                const isRowEnd = dayOfWeek === 6;

                cells.push(
                  <div
                    key={day}
                    className="relative flex h-9 items-center justify-center py-0.5"
                    onMouseEnter={() => setHoverDate(dayStr)}
                    onMouseLeave={() => setHoverDate(null)}
                  >
                    {hasRange && (
                      <>
                        {isStart && (
                          <div
                            className={cn(
                              'absolute right-0 top-0.5 bottom-0.5 left-1/2 bg-[#E9D5FF]/60',
                              isRowEnd && 'rounded-r-full'
                            )}
                          />
                        )}
                        {inRange && (
                          <div
                            className={cn(
                              'absolute inset-x-0 top-0.5 bottom-0.5 bg-[#E9D5FF]/60',
                              isRowStart && isRowEnd && 'rounded-full',
                              isRowStart && !isRowEnd && 'rounded-l-full',
                              isRowEnd && !isRowStart && 'rounded-r-full'
                            )}
                          />
                        )}
                        {isEnd && (
                          <div
                            className={cn(
                              'absolute left-0 top-0.5 bottom-0.5 right-1/2 bg-[#E9D5FF]/60',
                              isRowStart && 'rounded-l-full'
                            )}
                          />
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDayClick(dayStr)}
                      className={cn(
                        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                        isStart || isEnd
                          ? 'bg-[#7026B7] font-bold text-white shadow-xs'
                          : inRange
                          ? 'text-[#7026B7] font-bold hover:bg-[#D8B4FE]/40'
                          : 'text-[#24133F] hover:bg-slate-100'
                      )}
                    >
                      {day}
                    </button>
                  </div>
                );
              }
              return cells;
            })()}
          </div>

          {/* Footer Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-[#F1EEF4] pt-3 text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-[#756883] hover:text-[#24133F] transition-colors"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempStart(startDate);
                  setTempEnd(endDate);
                  setIsOpen(false);
                }}
                className="rounded-xl border border-[#E5E0EB] px-3 py-1.5 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-xl bg-[#7026B7] px-4 py-1.5 text-xs font-bold text-white shadow-[0_2px_0_0_#451475] hover:bg-[#621FA3] active:translate-y-[1px] transition-all"
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
