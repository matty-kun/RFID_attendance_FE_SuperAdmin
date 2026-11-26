import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Plus,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Pencil,
} from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Checkbox } from '../common/Checkbox';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import type { SemesterType, AcademicTerm } from '../../types';
import { cn } from '../../utils/cn';

export interface AcademicTermsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface YearGroup {
  school_year: string;
  hasActive: boolean;
  terms: AcademicTerm[];
  missingSemesters: SemesterType[];
}

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const AcademicTermsDrawer: React.FC<AcademicTermsDrawerProps> = ({ isOpen, onClose }) => {
  const { terms, activeTerm, activateTerm, createTerm, updateTerm } = useAcademicTerm();

  // Group terms by school year
  const yearGroups: YearGroup[] = useMemo(() => {
    const map = new Map<string, AcademicTerm[]>();
    for (const t of terms) {
      const list = map.get(t.school_year) || [];
      list.push(t);
      map.set(t.school_year, list);
    }

    // Sort descending (newest school years first)
    const sortedYears = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    return sortedYears.map((sy) => {
      const yearTerms = (map.get(sy) || []).sort((a, b) => a.semester.localeCompare(b.semester));
      const hasActive = yearTerms.some((t) => t.id === activeTerm?.id || t.is_active);
      const configuredSems = new Set(yearTerms.map((t) => t.semester));
      const missingSemesters: SemesterType[] = [];
      if (!configuredSems.has('1st Sem')) missingSemesters.push('1st Sem');
      if (!configuredSems.has('2nd Sem')) missingSemesters.push('2nd Sem');

      return {
        school_year: sy,
        hasActive,
        terms: yearTerms,
        missingSemesters,
      };
    });
  }, [terms, activeTerm]);

  // Accordion expanded state for academic years
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // Auto-expand active year on open or initial load
  useEffect(() => {
    if (activeTerm?.school_year) {
      setExpandedYears((prev) => new Set([...prev, activeTerm.school_year]));
    } else if (yearGroups.length > 0) {
      setExpandedYears(new Set([yearGroups[0].school_year]));
    }
  }, [activeTerm, yearGroups]);

  const toggleYear = (sy: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(sy)) next.delete(sy);
      else next.add(sy);
      return next;
    });
  };

  // Form State: 'year' (create new school year from home) vs 'semester' (add semester inside specific year) vs 'edit' (edit semester dates)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<'year' | 'semester' | 'edit'>('year');
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState('');
  const [semester, setSemester] = useState<SemesterType>('1st Sem');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [setActiveNow, setSetActiveNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Custom Calendar Picker State
  const [calMonth, setCalMonth] = useState<number>(() => new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(() => new Date().getFullYear());
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const resetForm = () => {
    setSchoolYear('');
    setSemester('1st Sem');
    setStartDate('');
    setEndDate('');
    setSetActiveNow(true);
    setFormError('');
    setShowCreateForm(false);
    setCreateMode('year');
    setEditingTermId(null);
  };

  const openEditSemester = (term: AcademicTerm) => {
    setCreateMode('edit');
    setEditingTermId(term.id);
    setSchoolYear(term.school_year);
    setSemester(term.semester);

    const sDate = term.start_date ? term.start_date.substring(0, 10) : '';
    const eDate = term.end_date ? term.end_date.substring(0, 10) : '';
    setStartDate(sDate);
    setEndDate(eDate);

    const [yearPart, monthPart] = sDate.split('-').map(Number);
    if (!isNaN(yearPart) && !isNaN(monthPart) && monthPart >= 1 && monthPart <= 12) {
      setCalYear(yearPart);
      setCalMonth(monthPart - 1);
    }

    const isActive = term.id === activeTerm?.id || term.is_active;
    setSetActiveNow(isActive);
    setFormError('');
    setShowCreateForm(true);
  };

  const openAddSemesterForYear = (sy: string, defaultSem?: SemesterType) => {
    setCreateMode('semester');
    setEditingTermId(null);
    setSchoolYear(sy);
    const semToSet = defaultSem || '1st Sem';
    setSemester(semToSet);
    setFormError('');

    // Pre-align calendar year based on school year and semester
    const parts = sy.split('-').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (semToSet === '1st Sem') {
        setCalYear(parts[0]);
        setCalMonth(7); // August
        setStartDate(`${parts[0]}-08-15`);
        setEndDate(`${parts[0]}-12-20`);
      } else {
        setCalYear(parts[1]);
        setCalMonth(0); // January
        setStartDate(`${parts[1]}-01-15`);
        setEndDate(`${parts[1]}-05-30`);
      }
    }
    setShowCreateForm(true);
  };

  const openCreateNewYear = () => {
    setCreateMode('year');
    setEditingTermId(null);
    // Suggest next academic year if years already exist
    if (yearGroups.length > 0) {
      const latest = yearGroups[0].school_year;
      const parts = latest.split('-').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const nextStart = parts[0] + 1;
        const nextEnd = parts[1] + 1;
        const nextSy = `${nextStart}-${nextEnd}`;
        setSchoolYear(nextSy);
        setCalYear(nextStart);
        setCalMonth(7); // August
        setStartDate(`${nextStart}-08-15`);
        setEndDate(`${nextStart}-12-20`);
      } else {
        setSchoolYear('');
      }
    } else {
      const currentYear = new Date().getFullYear();
      setSchoolYear(`${currentYear}-${currentYear + 1}`);
      setCalYear(currentYear);
      setCalMonth(7);
      setStartDate(`${currentYear}-08-15`);
      setEndDate(`${currentYear}-12-20`);
    }
    setSemester('1st Sem');
    setFormError('');
    setShowCreateForm(true);
  };

  const handleSemesterChange = (newSem: SemesterType) => {
    setSemester(newSem);
    const parts = schoolYear.trim().split('-').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      if (newSem === '1st Sem') {
        setCalYear(parts[0]);
        setCalMonth(7);
        setStartDate(`${parts[0]}-08-15`);
        setEndDate(`${parts[0]}-12-20`);
      } else {
        setCalYear(parts[1]);
        setCalMonth(0);
        setStartDate(`${parts[1]}-01-15`);
        setEndDate(`${parts[1]}-05-30`);
      }
    }
  };

  const handleCalendarDayClick = (dayStr: string) => {
    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      setStartDate(dayStr);
      setEndDate(dayStr);
    } else if (startDate && (!endDate || startDate === endDate)) {
      if (dayStr < startDate) {
        setEndDate(startDate);
        setStartDate(dayStr);
      } else {
        setEndDate(dayStr);
      }
    }
  };

  const setPresetDates = (type: 'firstSem' | 'secondSem') => {
    const parts = schoolYear.trim().split('-').map(Number);
    const baseYear = parts.length === 2 && !isNaN(parts[0]) ? parts[0] : calYear;
    const endYear = parts.length === 2 && !isNaN(parts[1]) ? parts[1] : baseYear + 1;

    if (type === 'firstSem') {
      setStartDate(`${baseYear}-08-15`);
      setEndDate(`${baseYear}-12-20`);
      setCalYear(baseYear);
      setCalMonth(7); // August
    } else {
      setStartDate(`${endYear}-01-15`);
      setEndDate(`${endYear}-05-30`);
      setCalYear(endYear);
      setCalMonth(0); // January
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedSy = schoolYear.trim();
    if (!/^\d{4}-\d{4}$/.test(trimmedSy)) {
      setFormError('School Year must be in YYYY-YYYY format (e.g. 2026-2027).');
      return;
    }
    const [startYear, endYear] = trimmedSy.split('-').map(Number);
    if (endYear !== startYear + 1) {
      setFormError('End year must be exactly start year + 1 (e.g. 2026-2027).');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Please select both start and end dates from the calendar.');
      return;
    }
    if (startDate > endDate) {
      setFormError('Start date must be before or equal to end date.');
      return;
    }

    if (createMode === 'edit') {
      if (!editingTermId) return;
      setIsSubmitting(true);
      try {
        const res = await updateTerm(editingTermId, {
          start_date: startDate,
          end_date: endDate,
        });
        if (res) {
          if (setActiveNow && (!activeTerm || activeTerm.id !== editingTermId)) {
            await activateTerm(editingTermId);
          }
          setExpandedYears((prev) => new Set([...prev, trimmedSy]));
          resetForm();
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Check if this school year + semester already exists
    const alreadyExists = terms.some(
      (t) => t.school_year === trimmedSy && t.semester === semester
    );
    if (alreadyExists) {
      setFormError(`A.Y. ${trimmedSy} ${semester} is already configured.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTerm({
        school_year: trimmedSy,
        semester,
        start_date: startDate,
        end_date: endDate,
        set_active: setActiveNow,
      });
      if (res) {
        // Expand the affected year
        setExpandedYears((prev) => new Set([...prev, trimmedSy]));
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar rendering calculations
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  const effectiveStart = useMemo(() => {
    if (startDate && hoverDate && !endDate && hoverDate < startDate) return hoverDate;
    return startDate;
  }, [startDate, endDate, hoverDate]);

  const effectiveEnd = useMemo(() => {
    if (endDate) return endDate;
    if (startDate && hoverDate && hoverDate >= startDate) return hoverDate;
    return startDate;
  }, [startDate, endDate, hoverDate]);

  const modalTitle =
    createMode === 'year'
      ? 'Create New Academic Year'
      : createMode === 'semester'
        ? `Add Semester to A.Y. ${schoolYear}`
        : `Edit A.Y. ${schoolYear} · ${semester}`;

  const modalDescription =
    createMode === 'year'
      ? 'Configure a new school year and set the dates for its first semester.'
      : createMode === 'semester'
        ? `Configure dates for ${semester} under A.Y. ${schoolYear}.`
        : `Update the date range for A.Y. ${schoolYear} ${semester}.`;

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={() => {
          resetForm();
          onClose();
        }}
        title="Academic Years & Semesters"
        description="Configure school years and semesters. The active term automatically scopes students, attendance, and reports."
        icon={<GraduationCap className="h-5 w-5 text-[#7026B7]" />}
        maxWidth="xl"
      >
        <div className="space-y-6 pt-1">
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
                Academic Years ({yearGroups.length})
              </h4>
              <p className="text-[11px] text-[#756883] mt-0.5">
                Select an Academic Year to view and configure its semesters.
              </p>
            </div>

            <Button
              size="sm"
              onClick={openCreateNewYear}
              className="gap-1.5 text-xs bg-[#7026B7] hover:bg-[#5E1E9D] text-white shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Academic Year
            </Button>
          </div>

          {/* Academic Years Accordion List (Patterned after Events & Attendance) */}
        {yearGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E0EB] bg-[#FAF8FC] p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[#7026B7]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#24133F]">No Academic Years Configured</p>
              <p className="text-xs text-[#756883] mt-1">
                Create your first academic year to organize semesters, students, and attendance.
              </p>
            </div>
            <Button
              size="sm"
              onClick={openCreateNewYear}
              className="gap-1.5 text-xs bg-[#7026B7] text-white hover:bg-[#5E1E9D] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Academic Year
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {yearGroups.map((group) => {
              const isExpanded = expandedYears.has(group.school_year);

              return (
                <div
                  key={group.school_year}
                  className={cn(
                    'rounded-2xl border transition-all duration-200 overflow-hidden bg-white shadow-2xs',
                    group.hasActive
                      ? 'border-[#7026B7]/40 ring-1 ring-[#7026B7]/10'
                      : 'border-[#E5E0EB] hover:border-[#7026B7]/30'
                  )}
                >
                  {/* Academic Year Header Row (Click to Expand / Collapse) */}
                  <div
                    onClick={() => toggleYear(group.school_year)}
                    className={cn(
                      'flex items-center justify-between p-4 cursor-pointer select-none transition-colors',
                      group.hasActive ? 'bg-[#FAF6FE]' : 'bg-[#FCFBFD] hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                          group.hasActive
                            ? 'bg-[#7026B7] text-white shadow-sm'
                            : 'bg-[#E5E0EB] text-[#756883]'
                        )}
                      >
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-[#24133F]">
                            A.Y. {group.school_year}
                          </h3>
                          {group.hasActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Active Year
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#756883] mt-0.5">
                          {group.terms.length} {group.terms.length === 1 ? 'semester' : 'semesters'} configured
                          {group.missingSemesters.length > 0 && (
                            <span className="text-amber-600 ml-1.5 font-medium">
                              · Missing {group.missingSemesters.join(', ')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {group.missingSemesters.length > 0 && !showCreateForm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddSemesterForYear(group.school_year, group.missingSemesters[0]);
                          }}
                          className="flex items-center gap-1 rounded-xl border border-dashed border-[#7026B7]/40 bg-[#FAF7FD] px-2.5 py-1 text-[11px] font-bold text-[#7026B7] hover:bg-[#F3EDFB] transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add {group.missingSemesters[0]}</span>
                        </button>
                      )}
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg text-[#756883] transition-transform duration-200',
                          isExpanded && 'rotate-180 text-[#7026B7]'
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {/* Semesters List Inside This Year (Accordion Content) */}
                  {isExpanded && (
                    <div className="border-t border-[#F1EEF4] p-4 space-y-2.5 bg-[#FAF8FB]/60 animate-in fade-in slide-in-from-top-1 duration-150">
                      {group.terms.map((term) => {
                        const isActive = term.id === activeTerm?.id || term.is_active;

                        return (
                          <div
                            key={term.id}
                            className={cn(
                              'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border bg-white p-3.5 transition-all',
                              isActive
                                ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                                : 'border-[#E5E0EB] hover:border-slate-300'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                                  isActive
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {term.semester === '1st Sem' ? '1st' : '2nd'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#24133F]">
                                    {term.semester}
                                  </span>
                                  {isActive && (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                      Active Term
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#756883] mt-0.5 flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>
                                    {formatDateDisplay(term.start_date)} – {formatDateDisplay(term.end_date)}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditSemester(term);
                                }}
                                className="h-8 gap-1.5 text-xs text-[#756883] hover:text-[#7026B7] hover:border-[#7026B7] hover:bg-[#FAF6FE] cursor-pointer"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>

                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-3 py-1.5 rounded-xl">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Currently Active
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => activateTerm(term.id)}
                                  className="text-xs hover:border-[#7026B7] hover:text-[#7026B7] hover:bg-[#F0E8FC] cursor-pointer"
                                >
                                  Set as Active
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Missing Semester Prompt / Add Semester Button inside card */}
                      {group.missingSemesters.map((missingSem) => (
                        <button
                          key={missingSem}
                          type="button"
                          onClick={() => openAddSemesterForYear(group.school_year, missingSem)}
                          className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#D6BBFB] bg-white/70 p-3 text-left transition-colors hover:bg-[#FAF6FE] hover:border-[#7026B7] cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF0FE] text-[#7026B7]">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#7026B7]">
                                Configure {missingSem}
                              </span>
                              <p className="text-[10px] text-[#756883]">
                                Not yet added for A.Y. {group.school_year}. Click to set dates.
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#7026B7] px-2.5 py-1 rounded-lg bg-[#F0E8FC]">
                            + Add {missingSem}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>

      {/* Creation / Edit Academic Year Modal (Patterned after Admins & Events Modals) */}
      <Modal
        isOpen={showCreateForm}
        onClose={resetForm}
        title={modalTitle}
        description={modalDescription}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTerm} className="space-y-4 pt-1">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* School Year Field */}
            <div>
              <label className="block text-xs font-bold text-[#24133F] mb-1">
                Academic Year <span className="text-[#756883] font-normal">(YYYY-YYYY)</span>
              </label>
              {createMode === 'semester' || createMode === 'edit' ? (
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#24133F]">
                  <GraduationCap className="h-4 w-4 text-[#7026B7]" />
                  <span>A.Y. {schoolYear}</span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Locked
                  </span>
                </div>
              ) : (
                <Input
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  placeholder="e.g. 2027-2028"
                  required
                />
              )}
            </div>

            {/* Semester Selector */}
            <div>
              <label className="block text-xs font-bold text-[#24133F] mb-1">Semester</label>
              {createMode === 'edit' ? (
                <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-[#24133F]">
                  <Clock className="h-4 w-4 text-[#7026B7]" />
                  <span>{semester}</span>
                  <span className="ml-auto text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Locked
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  {(['1st Sem', '2nd Sem'] as SemesterType[]).map((sem) => {
                    const group = yearGroups.find((g) => g.school_year === schoolYear.trim());
                    const alreadyConfigured = group?.terms.some((t) => t.semester === sem);

                    return (
                      <button
                        key={sem}
                        type="button"
                        disabled={alreadyConfigured}
                        onClick={() => handleSemesterChange(sem)}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-xs font-bold transition-all border select-none cursor-pointer',
                          alreadyConfigured
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                            : semester === sem
                              ? 'bg-[#7026B7] text-white border-[#7026B7] shadow-xs'
                              : 'bg-white text-[#756883] border-[#E5E0EB] hover:bg-[#FAF8FC]'
                        )}
                        title={alreadyConfigured ? `${sem} is already configured for this academic year` : ''}
                      >
                        {sem}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Custom Interactive Calendar Date Picker */}
          <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FB]/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs font-bold text-[#24133F] flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#7026B7]" />
                Term Date Range
              </span>
              {/* Semester Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPresetDates('firstSem')}
                  className="rounded-lg bg-white border border-[#E5E0EB] px-2 py-1 text-[11px] font-semibold text-[#756883] hover:text-[#7026B7] hover:border-[#7026B7]/40 transition-colors cursor-pointer"
                >
                  Aug – Dec (1st Sem)
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDates('secondSem')}
                  className="rounded-lg bg-white border border-[#E5E0EB] px-2 py-1 text-[11px] font-semibold text-[#756883] hover:text-[#7026B7] hover:border-[#7026B7]/40 transition-colors cursor-pointer"
                >
                  Jan – May (2nd Sem)
                </button>
              </div>
            </div>

            {/* Start & End Date Summary Cards (Clickable to jump months) */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => {
                  if (startDate) {
                    const [y, m] = startDate.split('-').map(Number);
                    if (!isNaN(y) && !isNaN(m)) {
                      setCalYear(y);
                      setCalMonth(m - 1);
                    }
                  }
                }}
                title={startDate ? 'Click to jump to Start Month' : undefined}
                className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 shadow-2xs cursor-pointer hover:border-[#7026B7]/50 hover:bg-[#FAF8FC] transition-colors"
              >
                <span className="block text-[10px] font-bold text-[#756883] uppercase tracking-wider mb-0.5">
                  Start Date
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#7026B7] shrink-0" />
                  <span className="text-xs font-bold text-[#24133F]">
                    {startDate ? formatDateDisplay(startDate) : 'Click day on calendar'}
                  </span>
                </div>
              </div>

              <div
                onClick={() => {
                  if (endDate) {
                    const [y, m] = endDate.split('-').map(Number);
                    if (!isNaN(y) && !isNaN(m)) {
                      setCalYear(y);
                      setCalMonth(m - 1);
                    }
                  }
                }}
                title={endDate ? 'Click to jump to End Month' : undefined}
                className="rounded-xl border border-[#E5E0EB] bg-white px-3 py-2 shadow-2xs cursor-pointer hover:border-[#7026B7]/50 hover:bg-[#FAF8FC] transition-colors"
              >
                <span className="block text-[10px] font-bold text-[#756883] uppercase tracking-wider mb-0.5">
                  End Date
                </span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#7026B7] shrink-0" />
                  <span className="text-xs font-bold text-[#24133F]">
                    {endDate ? formatDateDisplay(endDate) : 'Click 2nd day on calendar'}
                  </span>
                </div>
              </div>
            </div>

            {/* Calendar Month Header & Navigation */}
            <div className="flex items-center justify-between pt-1 pb-2 border-b border-[#F1EEF4]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-[#24133F]">
                  {new Date(calYear, calMonth).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  aria-label="Previous month"
                  className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  aria-label="Next month"
                  className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Day Name Headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#756883]">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="py-0.5">
                  {d}
                </div>
              ))}
            </div>

            {/* Interactive Calendar Grid with Ribbon Highlight */}
            <div className="grid grid-cols-7 text-center text-xs">
              {(() => {
                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<div key={`blank-${i}`} className="h-8" />);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isStart = dayStr === effectiveStart;
                  const isEnd = dayStr === effectiveEnd;
                  const inRange =
                    effectiveStart &&
                    effectiveEnd &&
                    dayStr > effectiveStart &&
                    dayStr < effectiveEnd;
                  const hasRange =
                    effectiveStart && effectiveEnd && effectiveStart !== effectiveEnd;

                  const dayOfWeek = (firstDay + day - 1) % 7;
                  const isRowStart = dayOfWeek === 0;
                  const isRowEnd = dayOfWeek === 6;
                  const isFirstDayOfMonth = day === 1;
                  const isLastDayOfMonth = day === daysInMonth;

                  const isLeftEdge = isRowStart || isFirstDayOfMonth;
                  const isRightEdge = isRowEnd || isLastDayOfMonth;

                  cells.push(
                    <div
                      key={day}
                      className="relative flex h-8 items-center justify-center py-0.5"
                      onMouseEnter={() => setHoverDate(dayStr)}
                      onMouseLeave={() => setHoverDate(null)}
                    >
                      {hasRange && (
                        <>
                          {isStart && (
                            <div
                              className={cn(
                                'absolute right-0 top-0.5 bottom-0.5 left-1/2 bg-[#E9D5FF]/60',
                                isRightEdge && 'rounded-r-full'
                              )}
                            />
                          )}
                          {inRange && (
                            <div
                              className={cn(
                                'absolute inset-x-0 top-0.5 bottom-0.5 bg-[#E9D5FF]/60',
                                isLeftEdge && isRightEdge && 'rounded-full',
                                isLeftEdge && !isRightEdge && 'rounded-l-full',
                                isRightEdge && !isLeftEdge && 'rounded-r-full'
                              )}
                            />
                          )}
                          {isEnd && (
                            <div
                              className={cn(
                                'absolute left-0 top-0.5 bottom-0.5 right-1/2 bg-[#E9D5FF]/60',
                                isLeftEdge && 'rounded-l-full'
                              )}
                            />
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCalendarDayClick(dayStr)}
                        className={cn(
                          'relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors cursor-pointer',
                          isStart || isEnd
                            ? 'bg-[#7026B7] font-bold text-white shadow-xs'
                            : inRange
                              ? 'text-[#7026B7] font-bold hover:bg-[#D8B4FE]/40'
                              : 'text-[#24133F] hover:bg-slate-100'
                        )}
                      >
                        {day}
                      </button>
                    </div>
                  );
                }
                return cells;
              })()}
            </div>

            {/* Multi-month Term Continuation Banner */}
            {effectiveEnd &&
              effectiveEnd >
                `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}` && (
                <div className="flex items-center justify-between text-[11px] text-[#7026B7] bg-[#F7F2FD] border border-[#E9D5FF] px-3 py-1.5 rounded-xl animate-in fade-in duration-150">
                  <span className="font-medium">
                    Term continues through {formatDateDisplay(effectiveEnd)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const [y, m] = effectiveEnd.split('-').map(Number);
                      if (!isNaN(y) && !isNaN(m)) {
                        setCalYear(y);
                        setCalMonth(m - 1);
                      }
                    }}
                    className="font-bold underline hover:text-[#5E1E9D] cursor-pointer ml-2 shrink-0"
                  >
                    Jump to End Month ({new Date(Number(effectiveEnd.split('-')[0]), Number(effectiveEnd.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'short' })}) &rarr;
                  </button>
                </div>
              )}
            {effectiveStart &&
              effectiveStart < `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01` && (
                <div className="flex items-center justify-between text-[11px] text-[#7026B7] bg-[#F7F2FD] border border-[#E9D5FF] px-3 py-1.5 rounded-xl animate-in fade-in duration-150">
                  <span className="font-medium">
                    Term started on {formatDateDisplay(effectiveStart)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const [y, m] = effectiveStart.split('-').map(Number);
                      if (!isNaN(y) && !isNaN(m)) {
                        setCalYear(y);
                        setCalMonth(m - 1);
                      }
                    }}
                    className="font-bold underline hover:text-[#5E1E9D] cursor-pointer ml-2 shrink-0"
                  >
                    &larr; Jump to Start Month ({new Date(Number(effectiveStart.split('-')[0]), Number(effectiveStart.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'short' })})
                  </button>
                </div>
              )}
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={setActiveNow}
                onChange={(e) => setSetActiveNow(e.target.checked)}
              />
              <span className="text-xs font-medium text-[#24133F]">
                {createMode === 'edit'
                  ? 'Set as active term'
                  : 'Set as active term immediately after creation'}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-[#7026B7] hover:bg-[#5E1E9D] text-white cursor-pointer"
            >
              {isSubmitting
                ? 'Saving...'
                : createMode === 'year'
                  ? 'Create Academic Year'
                  : createMode === 'semester'
                    ? 'Add Semester'
                    : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AcademicTermsDrawer;
