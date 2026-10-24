import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  contextBox?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  contextBox,
  children,
  footer,
  maxWidth = 'md',
  className,
}) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setIsMounted(true);
      const rAF = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(rAF);
    } else {
      setIsVisible(false);
      timer = setTimeout(() => {
        setIsMounted(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'fixed inset-0 z-[100] flex justify-end bg-[#170D29]/40 backdrop-blur-xs transition-opacity duration-300 ease-out',
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex h-full w-full flex-col justify-between border-l border-[#E5E0EB] bg-white shadow-2xl transition-transform duration-300 cubic-bezier(0.16,1,0.3,1)',
          maxWidthMap[maxWidth],
          isVisible ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Drawer Header */}
        <div className="border-b border-[#F1EEF4] p-6 shrink-0 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4EFFB] text-[#451475]">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-[#24133F]">{title}</h2>
                {description && <p className="text-xs text-[#756883] mt-0.5">{description}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {contextBox && <div className="mt-4">{contextBox}</div>}
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 flex flex-col">
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div className="border-t border-[#F1EEF4] p-6 bg-white shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
