import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, UserPlus, Zap, UploadCloud } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface RegisterActionsDropdownProps {
  onAddStudent: () => void;
  onRapidScan: () => void;
  onBulkImport: () => void;
  className?: string;
}

export const RegisterActionsDropdown: React.FC<RegisterActionsDropdownProps> = ({
  onAddStudent,
  onRapidScan,
  onBulkImport,
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
    onAddStudent();
  };

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className={cn('relative inline-flex', className)} ref={containerRef}>
      {/* 3D Tactile Split Button */}
      <div className="inline-flex h-10 items-stretch rounded-2xl bg-[#7026B7] text-white shadow-[0_5px_0_0_#451475] select-none transition-all">
        {/* Left primary Add Student button */}
        <button
          type="button"
          onClick={handleMainClick}
          className="flex items-center gap-2 pl-4 pr-3 text-xs font-bold rounded-l-2xl hover:bg-[#621FA3] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Student</span>
        </button>

        {/* Thin vertical separator */}
        <div className="w-[1px] bg-white/25 my-2 self-stretch" />

        {/* Right dropdown chevron trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Registration and RFID actions"
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
          aria-label="Registration and RFID actions"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-[#E5E0EB] bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[#24133F]"
        >
          <div className="px-3 py-1.5 border-b border-[#F0E8FC] mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756883]">
              Registration &amp; RFID tools
            </span>
          </div>

          <div className="space-y-1">
            {/* 1. Add Single Student */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect(onAddStudent)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#FAF8FC] transition-colors cursor-pointer"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7026B7]">
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#24133F]">Add Single Student</p>
                <p className="text-[11px] text-[#756883] line-clamp-1">Register student profile &amp; link card</p>
              </div>
            </button>

            {/* 2. Rapid Card Scanner */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect(onRapidScan)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#FAF8FC] transition-colors cursor-pointer"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Zap className="h-4 w-4 fill-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#24133F]">Rapid Card Scanner</p>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-md">
                    USB Reader
                  </span>
                </div>
                <p className="text-[11px] text-[#756883] line-clamp-1">Sequential tap-to-pair for students without a card</p>
              </div>
            </button>

            {/* 3. Bulk CSV / Excel Import */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect(onBulkImport)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#FAF8FC] transition-colors cursor-pointer"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <UploadCloud className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#24133F]">Bulk Import Students</p>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded-md">
                    CSV / Excel
                  </span>
                </div>
                <p className="text-[11px] text-[#756883] line-clamp-1">Upload roster file with auto-pairing</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterActionsDropdown;
