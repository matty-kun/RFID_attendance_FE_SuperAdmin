import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, ChevronDown, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CardRegisterActionsDropdownProps {
  onRegisterSingle: () => void;
  onRapidIntake: () => void;
  className?: string;
}

export const CardRegisterActionsDropdown: React.FC<CardRegisterActionsDropdownProps> = ({
  onRegisterSingle,
  onRapidIntake,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMainClick = () => {
    onRegisterSingle();
  };

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className={cn('relative inline-flex', className)} ref={containerRef}>
      {/* 3D Tactile Split Button matching Students page */}
      <div className="inline-flex h-10 items-stretch rounded-2xl bg-[#7026B7] text-white shadow-[0_5px_0_0_#451475] select-none transition-all">
        {/* Left primary Register card button */}
        <button
          type="button"
          onClick={handleMainClick}
          className="flex items-center gap-2 pl-4 pr-3 text-xs font-bold rounded-l-2xl hover:bg-[#621FA3] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <CreditCard className="h-4 w-4 stroke-[2.5]" />
          <span>Register card</span>
        </button>

        {/* Thin vertical separator */}
        <div className="w-[1px] bg-white/25 my-2 self-stretch" />

        {/* Right dropdown chevron trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Registration options"
          className="flex items-center justify-center px-3 rounded-r-2xl hover:bg-[#621FA3] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 stroke-[2.5] transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Card registration options"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-[#E5E0EB] bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[#24133F]"
        >
          <div className="px-3 py-1.5 border-b border-[#F0E8FC] mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">
              Card Registration Mode
            </span>
          </div>

          <div className="space-y-1">
            {/* 1. Register Single Card */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect(onRegisterSingle)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#FAF8FC] transition-colors cursor-pointer"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7026B7]">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#24133F]">Register Single Card</p>
                <p className="text-[11px] text-[#756883] line-clamp-1">Quick 1-card registration into inventory</p>
              </div>
            </button>

            {/* 2. Rapid Card Intake */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect(onRapidIntake)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#FAF8FC] transition-colors cursor-pointer"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Zap className="h-4 w-4 fill-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#24133F]">Rapid Card Intake</p>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                    USB Reader
                  </span>
                </div>
                <p className="text-[11px] text-[#756883] line-clamp-1">Continuous tap &amp; numpad intake for batches of cards</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardRegisterActionsDropdown;
