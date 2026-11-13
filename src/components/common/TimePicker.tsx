import React from 'react';
import { cn } from '../../utils/cn';

export interface TimePickerProps {
  value: string; // "HH:mm" (24-hour format)
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  gridContainerClassName?: string;
  minTime?: string;
  maxTime?: string;
  sessionType?: 'Morning' | 'Afternoon' | 'Evening';
}

// 30-minute intervals throughout 24 hours (00:00 to 23:30)
const ALL_TIME_SLOTS: { label: string; val: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const label = `${h12}:${m === 0 ? '00' : '30'} ${period}`;
    const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    ALL_TIME_SLOTS.push({ label, val });
  }
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  className,
  gridContainerClassName,
  minTime,
  maxTime,
  sessionType,
}) => {
  const defaultMin =
    sessionType === 'Morning'
      ? '06:00'
      : sessionType === 'Afternoon'
      ? '12:00'
      : sessionType === 'Evening'
      ? '18:00'
      : '00:00';

  const defaultMax =
    sessionType === 'Morning'
      ? '12:00'
      : sessionType === 'Afternoon'
      ? '18:00'
      : sessionType === 'Evening'
      ? '23:30'
      : '23:30';

  const effectiveMin = minTime || defaultMin;
  const effectiveMax = maxTime || defaultMax;

  const visibleSlots = ALL_TIME_SLOTS.filter(
    (slot) => slot.val >= effectiveMin && slot.val <= effectiveMax
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between shrink-0">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-[#756883]">
            {label}
          </label>
        )}
        {sessionType && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
            {sessionType === 'Morning' && 'Morning Limit: max 12:00 PM'}
            {sessionType === 'Afternoon' && 'Afternoon: 12:00 PM – 6:00 PM'}
            {sessionType === 'Evening' && 'Evening: 6:00 PM onwards'}
          </span>
        )}
      </div>

      {/* Scrollable grid matching Calendly/Deel style */}
      <div
        className={cn(
          'max-h-56 overflow-y-auto rounded-2xl border border-[#E5E0EB] bg-[#FAF8FB]/40 p-2.5',
          gridContainerClassName
        )}
      >
        {visibleSlots.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#756883]">
            No available time slots within the selected window bounds.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {visibleSlots.map((slot) => {
              const isSelected = value === slot.val;
              return (
                <button
                  key={slot.val}
                  type="button"
                  onClick={() => onChange(slot.val)}
                  className={cn(
                    'rounded-xl border py-2.5 text-center text-xs font-bold transition-all shadow-2xs',
                    isSelected
                      ? 'border-[#451475] bg-[#451475] text-white shadow-xs'
                      : 'border-[#E5E0EB] bg-white text-[#24133F] hover:border-[#451475] hover:bg-[#FAF7FD]'
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
