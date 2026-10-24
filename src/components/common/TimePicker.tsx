import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TimePickerProps {
  value: string; // "HH:mm" (24-hour format)
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  label,
  className,
}) => {
  const [h24, m] = (value || '07:00').split(':').map((s) => Number(s) || 0);

  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;
  const minute = m;

  const updateTime = (newH12: number, newMin: number, newPeriod: 'AM' | 'PM') => {
    let finalH24 = newH12 % 12;
    if (newPeriod === 'PM') finalH24 += 12;
    const timeStr = `${String(finalH24).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
    onChange(timeStr);
  };

  return (
    <div className={cn('space-y-1', className)}>
      {label && <label className="block text-xs font-bold text-[#24133F]">{label}</label>}
      <div className="flex items-center gap-1.5 rounded-xl border border-[#E5E0EB] bg-white px-2.5 py-1.5 shadow-xs focus-within:border-[#451475]">
        <Clock className="h-4 w-4 text-[#451475] shrink-0" />

        {/* Hours selector */}
        <select
          value={hour12}
          onChange={(e) => updateTime(Number(e.target.value), minute, period)}
          className="rounded-lg bg-transparent px-1 py-0.5 text-xs font-bold text-[#24133F] focus:outline-none cursor-pointer hover:bg-slate-50"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((hr) => (
            <option key={hr} value={hr}>
              {hr}
            </option>
          ))}
        </select>

        <span className="text-xs font-bold text-[#756883]">:</span>

        {/* Minutes selector (every 5 or 15 mins) */}
        <select
          value={minute}
          onChange={(e) => updateTime(hour12, Number(e.target.value), period)}
          className="rounded-lg bg-transparent px-1 py-0.5 text-xs font-bold text-[#24133F] focus:outline-none cursor-pointer hover:bg-slate-50"
        >
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min) => (
            <option key={min} value={min}>
              {String(min).padStart(2, '0')}
            </option>
          ))}
        </select>

        {/* AM / PM Toggle */}
        <div className="ml-auto flex items-center rounded-lg bg-[#FAF8FB] p-0.5 border border-[#E5E0EB]/70">
          <button
            type="button"
            onClick={() => updateTime(hour12, minute, 'AM')}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all',
              period === 'AM'
                ? 'bg-[#451475] text-white shadow-2xs'
                : 'text-[#756883] hover:text-[#24133F]'
            )}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => updateTime(hour12, minute, 'PM')}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all',
              period === 'PM'
                ? 'bg-[#451475] text-white shadow-2xs'
                : 'text-[#756883] hover:text-[#24133F]'
            )}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};
