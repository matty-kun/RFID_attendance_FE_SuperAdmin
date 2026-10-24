import React from 'react';
import { cn } from '../../utils/cn';

export interface TimePickerProps {
  value: string; // "HH:mm" (24-hour format)
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

// 30-minute intervals throughout 24 hours (2:00 AM, 2:30 AM ... 11:30 PM)
const TIME_SLOTS: { label: string; val: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    const label = `${h12}:${m === 0 ? '00' : '30'} ${period}`;
    const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    TIME_SLOTS.push({ label, val });
  }
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#756883]">
          {label}
        </label>
      )}

      {/* 3-column scrollable grid matching Calendly/Deel style */}
      <div className="max-h-56 overflow-y-auto rounded-2xl border border-[#E5E0EB] bg-[#FAF8FB]/40 p-2.5">
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((slot) => {
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
      </div>
    </div>
  );
};
