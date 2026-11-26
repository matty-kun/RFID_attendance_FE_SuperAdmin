import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Calendar, Settings } from 'lucide-react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { cn } from '../../utils/cn';

interface AcademicTermHeaderSelectorProps {
  onOpenManageModal: () => void;
}

export const AcademicTermHeaderSelector: React.FC<AcademicTermHeaderSelectorProps> = ({
  onOpenManageModal,
}) => {
  const { terms, selectedTerm, activeTerm, setSelectedTerm } = useAcademicTerm();
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

  const isCurrentActive = selectedTerm && activeTerm && selectedTerm.id === activeTerm.id;

  return (
    <div ref={containerRef} className="relative inline-block text-left z-20">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-bold select-none cursor-pointer transition-all duration-200 active:scale-95',
          isCurrentActive
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70'
            : 'border-[#E5E0EB] bg-white text-[#24133F] hover:border-[#7026B7]/40 hover:bg-[#FAF8FC]'
        )}
      >
        <span className="text-sm">🎓</span>
        <span className="whitespace-nowrap">
          {selectedTerm
            ? `${selectedTerm.school_year} · ${selectedTerm.semester}`
            : 'Academic Term'}
        </span>
        {isCurrentActive && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        )}
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#756883] transition-transform duration-200',
            isOpen && 'rotate-180 text-[#7026B7]'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-72 origin-top-right rounded-2xl border border-[#E5E0EB] bg-white p-2 text-[#24133F] shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-2 border-b border-[#E5E0EB] mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#756883]">
                Academic Term
              </span>
              {activeTerm && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Active: {activeTerm.school_year}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#756883] mt-0.5">
              Select term to filter students, events, and reports.
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 py-1">
            {terms.map((term) => {
              const isSelected = selectedTerm?.id === term.id;
              const isActive = term.id === activeTerm?.id;

              return (
                <button
                  key={term.id}
                  type="button"
                  onClick={() => {
                    setSelectedTerm(term);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-[#F0E8FC] text-[#7026B7] font-bold'
                      : 'text-[#24133F] hover:bg-[#FAF8FC]'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-[#756883]" />
                    <span className="truncate">
                      {term.school_year} · {term.semester}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#7026B7]" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#E5E0EB] pt-1.5 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenManageModal();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#7026B7] hover:bg-[#F0E8FC] transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage School Years & Semesters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
