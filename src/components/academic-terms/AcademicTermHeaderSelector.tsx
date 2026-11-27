import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, GraduationCap, Settings } from 'lucide-react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { cn } from '../../utils/cn';

interface AcademicTermHeaderSelectorProps {
  onOpenManageModal?: () => void;
  align?: 'left' | 'right';
}

export const AcademicTermHeaderSelector: React.FC<AcademicTermHeaderSelectorProps> = ({
  onOpenManageModal,
  align = 'left',
}) => {
  const { terms, selectedTerm, setSelectedTerm, activeTerm } = useAcademicTerm();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTerm = selectedTerm || activeTerm || terms[0];
  const termText = currentTerm
    ? `${currentTerm.school_year} · ${currentTerm.semester}`
    : '2026-2027 · 2nd Sem';

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenDrawer = () => {
    setIsOpen(false);
    if (onOpenManageModal) {
      onOpenManageModal();
    } else {
      window.dispatchEvent(new CustomEvent('presnt:open-academic-terms-drawer'));
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Click to switch semester view or manage terms"
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border select-none cursor-pointer transition-all focus:outline-hidden',
          isOpen
            ? 'border-[#7026B7]/30 bg-[#FAF7FD] shadow-xs'
            : 'border-transparent hover:border-[#E5E0EB] hover:bg-slate-50/80 active:scale-95'
        )}
      >
        <span className="text-xs sm:text-[13px] font-bold tracking-tight text-[#24133F] whitespace-nowrap">
          {termText}
        </span>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#756883] transition-transform duration-200 ease-out',
            isOpen && 'rotate-180 text-[#7026B7]'
          )}
        />
      </button>

      {/* Quick Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'absolute top-full mt-2 z-50 min-w-[270px] rounded-2xl border border-[#E5E0EB] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {/* Header Label */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b border-[#F1EEF4]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#756883]">
              Academic Semester
            </span>
            <span className="text-[10px] text-[#A094AC]">
              {terms.length} {terms.length === 1 ? 'term' : 'terms'}
            </span>
          </div>

          {/* List of Configured Semesters */}
          <div className="max-h-[260px] overflow-y-auto py-1 space-y-0.5 [scrollbar-width:thin]">
            {terms.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-[#756883]">
                No academic terms configured yet.
              </div>
            ) : (
              terms.map((t) => {
                const isSelected = currentTerm ? t.id === currentTerm.id : false;
                const isLiveActive = activeTerm ? t.id === activeTerm.id : Boolean(t.is_active);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTerm(t);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left',
                      isSelected
                        ? 'bg-[#FAF6FE] text-[#7026B7] font-bold'
                        : 'text-[#24133F] hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GraduationCap
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isSelected ? 'text-[#7026B7]' : 'text-[#756883]'
                        )}
                      />
                      <span className="truncate">
                        {t.school_year} · {t.semester}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLiveActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}

                      {isSelected && (
                        <Check className="h-4 w-4 text-[#7026B7] shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-[#F1EEF4]" />

          {/* Manage Academic Terms Drawer Trigger */}
          <button
            type="button"
            onClick={handleOpenDrawer}
            className="flex w-full items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#7026B7] hover:bg-[#FAF6FE] transition-colors cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 shrink-0 text-[#7026B7]" />
            <span>Manage Academic Terms...</span>
          </button>
        </div>
      )}
    </div>
  );
};
