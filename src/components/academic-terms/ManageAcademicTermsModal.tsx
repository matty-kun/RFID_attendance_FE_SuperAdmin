import React, { useState } from 'react';
import { Calendar, CheckCircle2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Checkbox } from '../common/Checkbox';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import type { SemesterType } from '../../types';

interface ManageAcademicTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageAcademicTermsModal: React.FC<ManageAcademicTermsModalProps> = ({ isOpen, onClose }) => {
  const { terms, activeTerm, activateTerm, createTerm } = useAcademicTerm();

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
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
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Manage Academic Terms"
      description="Configure school years and semesters. The active term automatically scopes students, attendance, and reports."
      maxWidth="2xl"
    >
      <div className="space-y-6 pt-2">
        {/* Existing Terms List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#756883]">
              Configured Terms ({terms.length})
            </h4>
            {!showCreateForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="gap-1.5 text-xs text-[#7026B7] border-[#7026B7]/30 hover:bg-[#F0E8FC]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Term
              </Button>
            )}
          </div>

          <div className="divide-y divide-[#E5E0EB] rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] overflow-hidden">
            {terms.map((term) => {
              const isActive = term.id === activeTerm?.id;
              return (
                <div
                  key={term.id}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    isActive ? 'bg-[#F4EEFC]' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isActive ? 'bg-[#7026B7] text-white shadow-sm' : 'bg-[#E5E0EB] text-[#756883]'
                      }`}
                    >
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#24133F]">
                          {term.school_year} · {term.semester}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Active Term
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#756883]">
                        {term.start_date} to {term.end_date}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isActive ? (
                      <span className="text-xs font-semibold text-[#7026B7] px-3 py-1.5 rounded-lg bg-white/70 border border-[#7026B7]/20">
                        Current Active
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => activateTerm(term.id)}
                        className="text-xs hover:border-[#7026B7] hover:text-[#7026B7]"
                      >
                        Set as Active
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Term Collapsible / Sub-form */}
        {showCreateForm ? (
          <form onSubmit={handleCreateTerm} className="rounded-2xl border border-[#7026B7]/30 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0EB]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#24133F]">
                <Sparkles className="h-4 w-4 text-[#7026B7]" />
                Create New Academic Term
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-xs text-[#756883] hover:text-[#24133F]"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#24133F] mb-1">
                  School Year <span className="text-[#756883] font-normal">(YYYY-YYYY)</span>
                </label>
                <Input
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  placeholder="e.g. 2027-2028"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24133F] mb-1">Semester</label>
                <div className="flex gap-2">
                  {(['1st Sem', '2nd Sem'] as SemesterType[]).map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setSemester(sem)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        semester === sem
                          ? 'bg-[#7026B7] text-white border-[#7026B7]'
                          : 'bg-white text-[#756883] border-[#E5E0EB] hover:bg-[#FAF8FC]'
                      }`}
                    >
                      {sem}
                    </button>
                  ))}
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
                onClick={() => setShowCreateForm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs bg-[#7026B7] hover:bg-[#5E1E9D] text-white"
              >
                {isSubmitting ? 'Creating...' : 'Create Academic Term'}
              </Button>
            </div>
          </form>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-[#E5E0EB]">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
