import React from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';

interface AcademicTermHeaderSelectorProps {
  onOpenManageModal?: () => void;
  align?: 'left' | 'right';
}

export const AcademicTermHeaderSelector: React.FC<AcademicTermHeaderSelectorProps> = ({
  onOpenManageModal,
}) => {
  const { selectedTerm, activeTerm } = useAcademicTerm();

  const termText = selectedTerm
    ? `${selectedTerm.school_year} · ${selectedTerm.semester}`
    : activeTerm
      ? `${activeTerm.school_year} · ${activeTerm.semester}`
      : '2026-2027 · 2nd Sem';

  const isCurrentActive = selectedTerm
    ? Boolean(activeTerm && selectedTerm.id === activeTerm.id)
    : Boolean(activeTerm);

  const handleClick = () => {
    if (onOpenManageModal) {
      onOpenManageModal();
    } else {
      window.dispatchEvent(new CustomEvent('presnt:open-academic-terms-drawer'));
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isCurrentActive ? 'Active Academic Term (click to manage)' : 'Click to manage academic terms'}
      className="inline-flex items-center gap-1.5 text-left select-none cursor-pointer transition-colors hover:text-[#7026B7] focus:outline-hidden"
    >
      <span className="text-xs sm:text-[13px] font-bold tracking-tight text-[#24133F] hover:text-[#7026B7] whitespace-nowrap">
        {termText}
      </span>
      {isCurrentActive && (
        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Active Academic Term" />
      )}
    </button>
  );
};
