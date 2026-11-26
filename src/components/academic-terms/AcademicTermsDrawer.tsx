import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  Plus,
  Sparkles,
  AlertCircle,
  GraduationCap,
  ChevronDown,
  Clock,
  Layers,
} from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Checkbox } from '../common/Checkbox';
import { Dropdown } from '../common/Dropdown';
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
  const { terms, activeTerm, activateTerm, createTerm } = useAcademicTerm();

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

  // Form State: 'year' (create new school year) vs 'semester' (add semester to existing year)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<'year' | 'semester'>('year');
  const [schoolYear, setSchoolYear] = useState('');
  const [semester, setSemester] = useState<SemesterType>('1st Sem');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [setActiveNow, setSetActiveNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setSchoolYear('');
    setSemester('1st Sem');
    setStartDate('');
    setEndDate('');
    setSetActiveNow(true);
    setFormError('');
    setShowCreateForm(false);
    setCreateMode('year');
  };

  const openAddSemesterForYear = (sy: string, defaultSem?: SemesterType) => {
    setCreateMode('semester');
    setSchoolYear(sy);
    setSemester(defaultSem || '1st Sem');
    setFormError('');
    setShowCreateForm(true);
  };

  const openCreateNewYear = () => {
    setCreateMode('year');
    setSchoolYear('');
    setSemester('1st Sem');
    setFormError('');
    setShowCreateForm(true);
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
      setFormError('Please select both start and end dates.');
      return;
    }
    if (startDate > endDate) {
      setFormError('Start date must be before or equal to end date.');
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

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Academic Years & Semesters"
      description="Configure school years and semesters. Active term automatically scopes students, attendance, and reports."
      icon={<GraduationCap className="h-5 w-5 text-[#7026B7]" />}
      maxWidth="xl"
      footer={
        <div className="flex w-full items-center justify-end">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-xs"
          >
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pt-1">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
              Academic Years ({yearGroups.length})
            </h4>
            <p className="text-[11px] text-[#756883] mt-0.5">
              Click an Academic Year to view its semesters.
            </p>
          </div>

          {!showCreateForm && (
            <div className="flex items-center gap-2">
              {yearGroups.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAddSemesterForYear(yearGroups[0].school_year, yearGroups[0].missingSemesters[0])}
                  className="gap-1.5 text-xs text-[#7026B7] border-[#7026B7]/30 hover:bg-[#F0E8FC]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Semester
                </Button>
              )}
              <Button
                size="sm"
                onClick={openCreateNewYear}
                className="gap-1.5 text-xs bg-[#7026B7] hover:bg-[#5E1E9D] text-white shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Academic Year
              </Button>
            </div>
          )}
        </div>

        {/* Create Form (Interactive choice: New Academic Year vs Add Semester) */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateTerm}
            className="rounded-2xl border border-[#7026B7]/30 bg-white p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0EB]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#24133F]">
                <Sparkles className="h-4 w-4 text-[#7026B7]" />
                {createMode === 'year' ? 'Create New Academic Year' : 'Add Semester to Existing Year'}
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-[#756883] hover:text-[#24133F]"
              >
                Cancel
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setCreateMode('year');
                  setSchoolYear('');
                }}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  createMode === 'year'
                    ? 'bg-white text-[#7026B7] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                New Academic Year
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateMode('semester');
                  if (yearGroups.length > 0 && !schoolYear) {
                    setSchoolYear(yearGroups[0].school_year);
                  }
                }}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                  createMode === 'semester'
                    ? 'bg-white text-[#7026B7] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Add Semester
              </button>
            </div>

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
                {createMode === 'semester' && yearGroups.length > 0 ? (
                  <Dropdown
                    value={schoolYear || yearGroups[0]?.school_year || ''}
                    onChange={(val) => {
                      setSchoolYear(val);
                      const targetGroup = yearGroups.find((g) => g.school_year === val);
                      if (targetGroup && targetGroup.missingSemesters.length > 0) {
                        setSemester(targetGroup.missingSemesters[0]);
                      }
                    }}
                    icon={<GraduationCap className="h-4 w-4 text-[#756883]" />}
                    className="w-full"
                    buttonClassName="w-full h-10 justify-between text-xs"
                    options={yearGroups.map((g) => ({
                      value: g.school_year,
                      label: `A.Y. ${g.school_year}${g.hasActive ? ' (Active Year)' : ''}`,
                    }))}
                  />
                ) : (
                  <Input
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    placeholder="e.g. 2027-2028"
                    required
                  />
                )}
              </div>

              {/* Semester Field */}
              <div>
                <label className="block text-xs font-bold text-[#24133F] mb-1">Semester</label>
                <div className="flex gap-2">
                  {(['1st Sem', '2nd Sem'] as SemesterType[]).map((sem) => {
                    const group = yearGroups.find((g) => g.school_year === schoolYear.trim());
                    const alreadyConfigured = group?.terms.some((t) => t.semester === sem);

                    return (
                      <button
                        key={sem}
                        type="button"
                        disabled={alreadyConfigured}
                        onClick={() => setSemester(sem)}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-xs font-bold transition-all border select-none',
                          alreadyConfigured
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                            : semester === sem
                              ? 'bg-[#7026B7] text-white border-[#7026B7] shadow-xs'
                              : 'bg-white text-[#756883] border-[#E5E0EB] hover:bg-[#FAF8FC]'
                        )}
                        title={alreadyConfigured ? `${sem} already configured for this year` : ''}
                      >
                        {sem}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24133F] mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24133F] mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={setActiveNow}
                  onChange={(e) => setSetActiveNow(e.target.checked)}
                />
                <span className="text-xs font-medium text-[#24133F]">
                  Set as active term immediately after creation
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs bg-[#7026B7] hover:bg-[#5E1E9D] text-white"
              >
                {isSubmitting
                  ? 'Saving...'
                  : createMode === 'year'
                    ? 'Create Academic Year'
                    : 'Add Semester'}
              </Button>
            </div>
          </form>
        )}

        {/* Academic Years Accordion List (Patterned after Events & Attendance) */}
        {yearGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E0EB] bg-[#FAF8FC] p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[#7026B7]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#24133F]">No Academic Years Configured</p>
              <p className="text-xs text-[#756883] mt-1">
                Create your first academic year or run the Supabase database migration to get started.
              </p>
            </div>
            <Button
              size="sm"
              onClick={openCreateNewYear}
              className="gap-1.5 text-xs bg-[#7026B7] text-white hover:bg-[#5E1E9D]"
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
                          className="hidden sm:flex items-center gap-1 rounded-xl border border-dashed border-[#7026B7]/40 bg-[#FAF7FD] px-2.5 py-1 text-[11px] font-bold text-[#7026B7] hover:bg-[#F3EDFB] transition-colors"
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
                                  className="text-xs hover:border-[#7026B7] hover:text-[#7026B7] hover:bg-[#F0E8FC]"
                                >
                                  Set as Active
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Missing Semester Prompt */}
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
                            + Add
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
  );
};

export default AcademicTermsDrawer;
