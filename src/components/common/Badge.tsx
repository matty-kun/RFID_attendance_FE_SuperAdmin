import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant =
  | 'open'
  | 'upcoming'
  | 'closed'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'neutral'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'brand'
  | 'slate'
  | 'time_in'
  | 'time_out'
  | 'on_time'
  | 'late'
  | 'missed';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    open: 'bg-[#E4F7EB] text-[#17B556] border-transparent',
    upcoming: 'bg-[#FFF3D8] text-[#78350F] border-transparent',
    closed: 'bg-[#FDE8EA] text-[#EF3340] border-transparent',
    success: 'bg-[#E4F7EB] text-[#17B556] border-transparent',
    warning: 'bg-[#FFF3D8] text-[#78350F] border-transparent',
    danger: 'bg-[#FDE8EA] text-[#EF3340] border-transparent',
    purple: 'bg-brand-100 text-brand-700 border-transparent',
    neutral: 'bg-slate-100 text-slate-500 border-transparent',
    emerald: 'bg-[#E4F7EB] text-[#17B556] border-transparent',
    amber: 'bg-[#FFF3D8] text-[#78350F] border-transparent',
    rose: 'bg-[#FDE8EA] text-[#EF3340] border-transparent',
    brand: 'bg-brand-100 text-brand-700 border-transparent',
    slate: 'bg-slate-100 text-slate-500 border-transparent',
    time_in: 'bg-[#E4F7EB] text-[#17B556] border-transparent',
    time_out: 'bg-[#FDE8EA] text-[#EF3340] border-transparent',
    on_time: 'bg-[#E4F7EB] text-[#17B556] border-transparent',
    late: 'bg-[#FFF3D8] text-[#78350F] border-transparent',
    missed: 'bg-[#FDE8EA] text-[#EF3340] border-transparent',
  };

  const dotColors: Record<BadgeVariant, string> = {
    open: 'bg-[#17B556]',
    upcoming: 'bg-[#F59E0B]',
    closed: 'bg-[#EF3340]',
    success: 'bg-[#17B556]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#EF3340]',
    purple: 'bg-brand-700',
    neutral: 'bg-slate-400',
    emerald: 'bg-[#17B556]',
    amber: 'bg-[#F59E0B]',
    rose: 'bg-[#EF3340]',
    brand: 'bg-brand-700',
    slate: 'bg-slate-400',
    time_in: 'bg-[#17B556]',
    time_out: 'bg-[#EF3340]',
    on_time: 'bg-[#17B556]',
    late: 'bg-[#F59E0B]',
    missed: 'bg-[#EF3340]',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-[13px]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border',
        variants[variant] || variants.neutral,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5 shrink-0', dotColors[variant] || 'bg-slate-400')} />}
      {children}
    </span>
  );
};
