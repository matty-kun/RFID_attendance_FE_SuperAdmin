import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, Plus, GraduationCap, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  getAllKnownCourses,
  saveCustomCourse,
  getCourseAbbreviation,
  areCoursesEqual,
  normalizeCourse,
} from '../../utils/courseUtils';

export interface CourseComboboxProps {
  value: string;
  onChange: (value: string) => void;
  availableCourses?: string[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  required?: boolean;
}

export const CourseCombobox: React.FC<CourseComboboxProps> = ({
  value,
  onChange,
  availableCourses = [],
  placeholder = 'Select or type course...',
  className,
  buttonClassName,
  menuClassName,
  disabled = false,
  label,
  error,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allCourses = useMemo(() => {
    return getAllKnownCourses(availableCourses);
  }, [availableCourses, isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 280 && rect.top > spaceBelow) {
          setOpenUpward(true);
        } else {
          setOpenUpward(false);
        }
      }
    }
  }, [isOpen]);

  // Close on outside click or Esc
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

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return allCourses;
    return allCourses.filter((course) => {
      const abbr = getCourseAbbreviation(course).toLowerCase();
      const full = course.toLowerCase();
      return full.includes(query) || abbr.includes(query);
    });
  }, [allCourses, searchTerm]);

  const trimmedSearch = searchTerm.trim();
  const exactMatchExists = useMemo(() => {
    if (!trimmedSearch) return true;
    return allCourses.some((c) => areCoursesEqual(c, trimmedSearch));
  }, [allCourses, trimmedSearch]);

  const handleSelect = (courseName: string) => {
    const normalized = normalizeCourse(courseName) || courseName;
    saveCustomCourse(normalized);
    onChange(normalized);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (!trimmedSearch) return;
    handleSelect(trimmedSearch);
  };

  const currentAbbr = value ? getCourseAbbreviation(value) : '';

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-[#24133F] mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs font-semibold text-[#24133F] transition-all hover:border-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:cursor-not-allowed disabled:opacity-50 select-none text-left',
          isOpen && 'border-brand-700 ring-2 ring-brand-100',
          error && 'border-red-500 focus-visible:outline-red-500',
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GraduationCap className="h-4 w-4 shrink-0 text-[#756883]" />
          {value ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="truncate">{value}</span>
              {currentAbbr && currentAbbr !== value && (
                <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                  {currentAbbr}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[#756883] shrink-0 transition-transform duration-200 ml-1',
            isOpen && 'rotate-180 text-brand-700'
          )}
        />
      </button>

      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 w-full min-w-[280px] max-w-sm rounded-2xl border border-[#E5E0EB] bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150',
            openUpward ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
            menuClassName
          )}
        >
          {/* Search / Add Input inside popover */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!exactMatchExists && trimmedSearch) {
                    handleCreateNew();
                  } else if (filteredCourses.length > 0) {
                    handleSelect(filteredCourses[0]);
                  }
                }
              }}
              placeholder="Search or type new course..."
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-700 focus:outline-none focus:ring-1 focus:ring-brand-700"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick Create Custom Option if not in list */}
          {!exactMatchExists && trimmedSearch && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-2.5 py-2 mb-1.5 rounded-xl text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors border border-brand-200"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1 text-left">
                Add <strong>"{trimmedSearch}"</strong>
              </span>
              <span className="text-[10px] uppercase font-bold text-brand-600 bg-white px-1.5 py-0.5 rounded border border-brand-200 shrink-0">
                New
              </span>
            </button>
          )}

          {/* Course Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredCourses.length === 0 && exactMatchExists ? (
              <p className="py-4 text-center text-xs text-slate-400">No matching courses found</p>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = areCoursesEqual(c, value);
                const abbr = getCourseAbbreviation(c);
                return (
                  <button
                    type="button"
                    key={c}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(c)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors',
                      isSelected
                        ? 'bg-[#F0E8FC] text-brand-700 font-bold'
                        : 'text-[#24133F] hover:bg-[#FAF8FC] hover:text-brand-700'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GraduationCap
                        className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-brand-700' : 'text-slate-400')}
                      />
                      <span className="truncate">{c}</span>
                      {abbr && abbr !== c && (
                        <span
                          className={cn(
                            'shrink-0 text-[10px] px-1 py-0.2 rounded font-mono',
                            isSelected
                              ? 'bg-brand-200 text-brand-900 font-bold'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {abbr}
                        </span>
                      )}
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

export default CourseCombobox;
