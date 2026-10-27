import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  searchable?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  icon,
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  align = 'left',
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const showSearch = searchable ?? options.length >= 4;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, showSearch, searchTerm]);

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

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 220 && rect.top > spaceBelow) {
          setOpenUpward(true);
        } else {
          setOpenUpward(false);
        }
      }
    } else {
      setSearchTerm('');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      {/* Trigger Button with SINGLE arrow */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs font-semibold text-[#24133F] transition-colors hover:border-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:opacity-50 disabled:cursor-not-allowed select-none',
          isOpen && 'border-brand-700 ring-2 ring-brand-100',
          buttonClassName
        )}
      >
        {icon && <span className="text-[#756883] shrink-0">{icon}</span>}
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#756883] shrink-0 transition-transform duration-200 ml-auto',
            isOpen && 'rotate-180 text-brand-700'
          )}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 min-w-[180px] max-w-[280px] rounded-2xl border border-[#E5E0EB] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150',
            openUpward ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          {showSearch && (
            <div className="p-1 border-b border-[#F1EEF4] mb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#756883]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="h-7 w-full rounded-lg bg-[#FAF8FC] pl-7 pr-2 text-[11px] text-[#24133F] placeholder-[#756883] border border-[#E5E0EB] focus:border-[#7026B7] focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {filteredOptions.length === 0 ? (
              <p className="py-2.5 text-center text-[11px] text-[#756883]">No options found</p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold transition-colors',
                      isSelected
                        ? 'bg-[#F0E8FC] text-brand-700 font-bold'
                        : 'text-[#24133F] hover:bg-[#FAF8FC] hover:text-brand-700'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-brand-700 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
