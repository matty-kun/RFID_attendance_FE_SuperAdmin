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
      title="Click to manage academic terms"
      className="text-left select-none cursor-pointer transition-colors hover:text-[#7026B7] focus:outline-hidden"
    >
      <span className="text-xs sm:text-[13px] font-bold tracking-tight text-[#24133F] hover:text-[#7026B7] whitespace-nowrap">
        {termText}
      </span>
    </button>
  );
};
