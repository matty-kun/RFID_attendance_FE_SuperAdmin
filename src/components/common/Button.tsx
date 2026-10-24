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
    'inline-flex items-center justify-center font-bold select-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2';

  const variants = {
    primary:
      'bg-brand-700 hover:bg-brand-800 text-white shadow-[0_3px_0_0_#58158C] active:translate-y-[2px] active:shadow-none',
    secondary:
      'bg-white hover:bg-[#F7F6F9] text-[#24133F] border border-[#E5E0EB] shadow-sm active:translate-y-[1px]',
    danger:
      'bg-[#EF3340] hover:bg-[#D92734] text-white shadow-[0_3px_0_0_#B91C2A] active:translate-y-[2px] active:shadow-none',
    success:
      'bg-[#17B556] hover:bg-[#12953B] text-white shadow-[0_3px_0_0_#0E7A2E] active:translate-y-[2px] active:shadow-none',
    outline:
      'bg-transparent hover:bg-brand-50 text-brand-700 border border-brand-700 active:translate-y-[1px]',
    ghost:
      'bg-transparent hover:bg-brand-50 text-brand-700 active:bg-brand-100',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-xs font-bold gap-2 rounded-xl',
    lg: 'h-12 px-6 text-sm font-extrabold gap-2.5 rounded-xl',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-current" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
