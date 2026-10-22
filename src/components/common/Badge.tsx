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
    open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    upcoming: 'bg-amber-50 text-amber-700 border-amber-200',
    closed: 'bg-rose-50 text-rose-700 border-rose-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    brand: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    time_in: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    time_out: 'bg-amber-50 text-amber-700 border-amber-200',
    on_time: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    late: 'bg-amber-50 text-amber-700 border-amber-200',
    missed: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    open: 'bg-emerald-500',
    upcoming: 'bg-amber-500',
    closed: 'bg-rose-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    purple: 'bg-purple-500',
    neutral: 'bg-slate-400',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    brand: 'bg-purple-500',
    slate: 'bg-slate-400',
    time_in: 'bg-emerald-500',
    time_out: 'bg-amber-500',
    on_time: 'bg-emerald-500',
    late: 'bg-amber-500',
    missed: 'bg-rose-500',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
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
