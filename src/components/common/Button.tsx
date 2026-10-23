import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-[20px] transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

  const variants = {
    primary:
      'bg-brand-600 hover:bg-[#671E9F] text-white shadow-tactile active:translate-y-[4px] active:shadow-tactile-pressed',
    secondary:
      'bg-[#DFD8E7] hover:bg-[#D5CCE0] text-slate-900 shadow-[0_5px_0_0_#C4BAD4] active:translate-y-[4px] active:shadow-[0_1px_0_0_#C4BAD4]',
    danger:
      'bg-[#EF3340] hover:bg-[#D92734] text-white shadow-[0_5px_0_0_#B91C2A] active:translate-y-[4px] active:shadow-[0_1px_0_0_#B91C2A]',
    success:
      'bg-[#25C85A] hover:bg-[#1CA347] text-white shadow-[0_5px_0_0_#12953B] active:translate-y-[4px] active:shadow-[0_1px_0_0_#12953B]',
    outline:
      'bg-transparent hover:bg-brand-50 text-brand-700 border-[1.5px] border-brand-700 active:translate-y-0.5',
    ghost:
      'bg-transparent hover:bg-brand-50 text-brand-700 active:bg-brand-100',
  };

  const sizes = {
    sm: 'text-sm px-4 min-h-[39px] gap-2 rounded-[14px]',
    md: 'text-base px-6 min-h-[53px] gap-2',
    lg: 'text-lg px-6 min-h-[60px] gap-2.5 rounded-[22px]',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
