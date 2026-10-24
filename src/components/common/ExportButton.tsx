import React, { useState, useRef, useEffect } from 'react';
import { Upload, ChevronDown, FileSpreadsheet, FileJson, Printer, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  className?: string;
  defaultFormat?: ExportFormat;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  disabled = false,
  className,
  defaultFormat = 'csv',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(defaultFormat);
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
    if (disabled) return;
    onExport(selectedFormat);
  };

  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format);
    setIsOpen(false);
    onExport(format);
  };

  const formats = [
    {
      id: 'csv' as ExportFormat,
      label: 'CSV Spreadsheet (.csv)',
      desc: 'Comma-separated values for Excel or Google Sheets',
      icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600" />,
    },
    {
      id: 'xlsx' as ExportFormat,
      label: 'Excel Document (.xls)',
      desc: 'Formatted spreadsheet for Microsoft Excel',
      icon: <FileSpreadsheet className="h-4 w-4 text-blue-600" />,
    },
    {
      id: 'json' as ExportFormat,
      label: 'JSON Data (.json)',
      desc: 'Machine-readable structured raw data',
      icon: <FileJson className="h-4 w-4 text-amber-600" />,
    },
    {
      id: 'pdf' as ExportFormat,
      label: 'Print / Save as PDF',
      desc: 'Printer-friendly printable attendance report',
      icon: <Printer className="h-4 w-4 text-purple-600" />,
    },
  ];

  return (
    <div className={cn('relative inline-flex', className)} ref={containerRef}>
      {/* 3D Tactile Split Button matching screenshot */}
      <div
        className={cn(
          'inline-flex h-10 items-stretch rounded-2xl bg-[#7026B7] text-white shadow-[0_5px_0_0_#451475] select-none transition-all',
          disabled && 'opacity-50 cursor-not-allowed shadow-[0_2px_0_0_#451475]'
        )}
      >
        {/* Left Export action button */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleMainClick}
          className="flex items-center gap-2 pl-4 pr-3 text-xs font-bold rounded-l-2xl hover:bg-[#621FA3] active:translate-y-[3px] active:shadow-none transition-all disabled:pointer-events-none"
        >
          <Upload className="h-4 w-4 stroke-[2.5]" />
          <span>Export</span>
        </button>

        {/* Thin vertical separator line matching screenshot */}
        <div className="w-[1px] bg-white/25 my-2 self-stretch" />

        {/* Right dropdown chevron trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Select export file format"
          className="flex items-center justify-center px-3 rounded-r-2xl hover:bg-[#621FA3] active:translate-y-[3px] active:shadow-none transition-all disabled:pointer-events-none"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 stroke-[2.5] transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Dropdown Menu to choose format */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Choose export format"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-2xl border border-[#E5E0EB] bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[#24133F]"
        >
          <div className="px-3 py-1.5 border-b border-[#F0E8FC] mb-1">
            <span className="text-[10px] uppercase font-bold text-[#756883] tracking-wider">
              Select Export Format
            </span>
          </div>

          <div className="space-y-1">
            {formats.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  type="button"
                  key={fmt.id}
                  role="menuitem"
                  onClick={() => handleFormatSelect(fmt.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                    isSelected
                      ? 'bg-[#F0E8FC] text-brand-700 font-bold'
                      : 'hover:bg-[#FAF8FC] text-[#24133F]'
                  )}
                >
                  <span className="mt-0.5 shrink-0">{fmt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{fmt.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-brand-700 ml-1" />}
                    </div>
                    <div className="text-[10px] text-[#756883] mt-0.5 line-clamp-1 font-normal">
                      {fmt.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
