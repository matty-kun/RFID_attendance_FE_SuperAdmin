import React from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, disabled, label, id, ...props }, ref) => {
    return (
      <label
        className={cn(
          'relative inline-flex items-center gap-2 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150',
            checked
              ? 'bg-[#451475] border-[#451475] shadow-sm'
              : 'bg-white border-[#D1CBD8] hover:border-[#8E7E9F] peer-focus-visible:ring-2 peer-focus-visible:ring-[#451475]/40'
          )}
        >
          {checked && (
            <svg
              className="h-2.5 w-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </div>
        {label && <span className="text-xs text-[#24133F]">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
