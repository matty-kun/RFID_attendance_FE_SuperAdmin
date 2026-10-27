import React, { useMemo, useState, useEffect } from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { formatYearLevel } from '../../../utils/formatters';
import { Dropdown } from '../../../components/common/Dropdown';
import { AddStudentDrawer } from './AddStudentDrawer';
import { RapidCardScanDrawer } from './RapidCardScanDrawer';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import { RegisterActionsDropdown } from './RegisterActionsDropdown';
import { StudentProfileDrawer } from './StudentProfileDrawer';
import { CardInspectorDrawer } from './CardInspectorDrawer';
import type { StudentRecord } from '../models';
import {
  Search,
  Radio,
  ArchiveRestore,
  Loader2,
  GraduationCap,
  Users,
  UserCheck,
  Archive,
} from 'lucide-react';
import hawiQuestionImg from '../../../assets/illustrations/Hawi Question.png';
import hawiFindingImg from '../../../assets/illustrations/Hawi Finding.png';

export const StudentsView: React.FC = () => {
  const {
    students,
    filteredStudents,
    searchQuery,
    setSearchQuery,
    isLoading,
    isSubmitting,
    page,
    setPage,
    total,
    error,
    cardlessStudents,
    isAddDrawerOpen,
    setIsAddDrawerOpen,
    isRapidScanOpen,
    setIsRapidScanOpen,
    isBulkImportOpen,
    setIsBulkImportOpen,
    archivedStudentIds,
    handleArchiveStudent,
    handleRestoreStudent,
    handleRegisterStudent,
    handleCardScannedForStudent,
    handleBulkImport,
    handleQuickPair,
    handleUnlinkCard,
    handleUpdateStudent,
    uploadStudentAvatar,
    loadStudents,
  } = useStudentsViewModel();

  const [studentTab, setStudentTab] = useState<'active' | 'archived'>('active');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isCardInspectorOpen, setIsCardInspectorOpen] = useState(false);

  useEffect(() => {
    const onOpenInspector = () => setIsCardInspectorOpen(true);
    window.addEventListener('presnt:open-card-inspector', onOpenInspector);
    return () => window.removeEventListener('presnt:open-card-inspector', onOpenInspector);
  }, []);
  const [courseFilter, setCourseFilter] = useState('all');

  // Split students into active and archived cohorts
  const activeStudents = useMemo(
    () => filteredStudents.filter((s) => !archivedStudentIds.includes(s.id)),
    [filteredStudents, archivedStudentIds]
  );

  const archivedStudents = useMemo(
    () => filteredStudents.filter((s) => archivedStudentIds.includes(s.id)),
    [filteredStudents, archivedStudentIds]
  );

  // Active students stats
  const verifiedCount = useMemo(() => activeStudents.filter((s) => Boolean(s.rfid_uid)).length, [activeStudents]);
  const unverifiedCount = useMemo(() => activeStudents.filter((s) => !s.rfid_uid).length, [activeStudents]);

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course).filter((c): c is string => Boolean(c)))].sort(),
    [students]
  );

  const currentCohort = studentTab === 'active' ? activeStudents : archivedStudents;

  // Filtered rows for current cohort
  const visibleStudents = currentCohort.filter(
    (student) => courseFilter === 'all' || student.course === courseFilter
  );

  // Keep active profile student synced with latest student data
  const activeProfileStudent = useMemo(() => {
    if (!selectedStudentForProfile) return null;
    return students.find((s) => s.id === selectedStudentForProfile.id) || selectedStudentForProfile;
  }, [selectedStudentForProfile, students]);

  const yearLabel = formatYearLevel;

  const initials = (fullName: string) =>
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight text-slate-900">Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin Registration Suite · continuous desktop scanner, bulk import, and student roster.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsCardInspectorOpen(true)}
            leftIcon={<Radio className="h-4 w-4 text-[#7026B7]" />}
          >
            Inspect Card
          </Button>
          <RegisterActionsDropdown
            onAddStudent={() => setIsAddDrawerOpen(true)}
            onRapidScan={() => setIsRapidScanOpen(true)}
            onBulkImport={() => setIsBulkImportOpen(true)}
            onInspectCard={() => setIsCardInspectorOpen(true)}
          />
        </div>
      </div>

      {/* KPI Headline Metrics */}
      <div className="rounded-2xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Active students</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
            {isLoading && students.length === 0 ? '—' : activeStudents.length.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total students currently enrolled</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Students with cards</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
              {isLoading && students.length === 0 ? '—' : verifiedCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {activeStudents.length > 0 ? `${Math.round((verifiedCount / activeStudents.length) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready to tap in for attendance</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Students without cards</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading && students.length === 0 ? '—' : unverifiedCount.toLocaleString()}
            </span>
            {unverifiedCount > 0 ? (
              <span className="text-[11px] font-semibold text-amber-700">
                Needs card
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-700">
                All set
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {unverifiedCount === 0 ? 'Every student has a card' : 'Needs an RFID card to tap in'}
          </p>
        </div>
      </div>

      {/* Main Section */}
      <div className="space-y-3">
        {/* Toolbar: Search & Filters (Matching icons and styling) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 sm:max-w-[280px]">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="sr-only">Search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setPage(1);
                  setSearchQuery(event.target.value);
                }}
                placeholder="Search by name, ID or RFID…"
                className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            <Dropdown
              value={courseFilter}
              onChange={(val) => setCourseFilter(val)}
              icon={<GraduationCap className="h-4 w-4" />}
              options={[
                { value: 'all', label: 'All Courses', icon: <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> },
                ...courses.map((c) => ({
                  value: c,
                  label: c,
                  icon: <GraduationCap className="h-3.5 w-3.5 text-brand-700" />,
                })),
              ]}
            />

            <Dropdown
              value={studentTab}
              onChange={(val: any) => setStudentTab(val)}
              icon={studentTab === 'active' ? <Users className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              options={[
                {
                  value: 'active',
                  label: `Active Students (${activeStudents.length})`,
                  icon: <UserCheck className="h-3.5 w-3.5 text-brand-700" />,
                },
                {
                  value: 'archived',
                  label: `Archived (${archivedStudents.length})`,
                  icon: <Archive className="h-3.5 w-3.5 text-slate-500" />,
                },
              ]}
            />
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2.5">
          {error && (
            <div role="alert" className="mb-2 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              <span>{error}</span>
              <button type="button" onClick={() => void loadStudents()} className="underline">
                Retry
              </button>
            </div>
          )}
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Course</th>
                <th className="px-3 py-3">Year level</th>
                <th className="px-3 py-3">RFID card</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => {
                const isStudentArchived = archivedStudentIds.includes(student.id);
                return (
                  <tr
                    key={student.id}
                    onClick={() => {
                      setSelectedStudentForProfile(student);
                      setIsProfileDrawerOpen(true);
                    }}
                    className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt={student.name}
                            className="h-8 w-8 shrink-0 rounded-full object-cover group-hover:scale-105 transition-transform border border-brand-200/50 shadow-xs"
                          />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-extrabold text-brand-700 group-hover:scale-105 transition-transform border border-brand-200/50">
                            {initials(student.name)}
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 leading-snug group-hover:text-brand-700 transition-colors">
                            {student.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">{student.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{student.course || '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{yearLabel(student.year_level)}</td>

                    {/* RFID Card column */}
                    <td className="px-3 py-3">
                      {student.rfid_uid ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-900 font-mono text-[11px] font-semibold">
                          <Radio className="w-3 h-3 text-brand-700" />
                          {student.rfid_uid}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          {isStudentArchived ? 'Unlinked (Archived)' : 'No card linked'}
                        </span>
                      )}
                    </td>

                    {/* Actions column */}
                    <td className="px-3 py-3 text-right">
                      {isStudentArchived ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRestoreStudent(student.id);
                          }}
                          title="Restore student to active roster"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      ) : (
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentForProfile(student);
                              setIsProfileDrawerOpen(true);
                            }}
                            title={student.rfid_uid ? 'View student profile & attendance history' : 'Link RFID card to student'}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs ${
                              student.rfid_uid
                                ? 'text-slate-700 bg-white hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-slate-200'
                                : 'text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200'
                            }`}
                          >
                            {student.rfid_uid ? 'View Profile →' : 'Link Card →'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!visibleStudents.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <img
                src={isLoading ? hawiFindingImg : hawiQuestionImg}
                alt={isLoading ? 'Loading students...' : 'No students found'}
                className="w-24 h-24 object-contain mb-3"
              />
              <div className="flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}
                <p className="text-sm font-bold text-slate-900">
                  {isLoading
                    ? 'Loading students…'
                    : error
                    ? 'Unable to load students.'
                    : studentTab === 'archived'
                    ? 'No archived students.'
                    : 'No active students found.'}
                </p>
              </div>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                {error
                  ? 'Check your backend connection and try again.'
                  : studentTab === 'archived'
                  ? 'Students you archive will appear here safely preserved.'
                  : searchQuery || courseFilter !== 'all'
                  ? 'Try clearing or relaxing your search filters.'
                  : 'Get started by adding a student or importing a bulk CSV roster.'}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-xs text-slate-500">
            <span>
              {currentCohort.length.toLocaleString()} {studentTab} students · Page {page} of {Math.max(1, Math.ceil(total / 25))}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page * 25 >= total || isLoading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in Drawer: Student Profile & Scan History */}
      <StudentProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        student={activeProfileStudent}
        onUnlinkCard={handleUnlinkCard}
        onQuickPair={handleQuickPair}
        onUpdateStudent={handleUpdateStudent}
        onOpenRapidScan={() => setIsRapidScanOpen(true)}
        isArchived={activeProfileStudent ? archivedStudentIds.includes(activeProfileStudent.id) : false}
        onArchiveStudent={handleArchiveStudent}
        onRestoreStudent={handleRestoreStudent}
        onUploadAvatar={uploadStudentAvatar}
      />

      {/* Slide-in Drawer: Add Single Student */}
      <AddStudentDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSubmit={handleRegisterStudent}
        isSubmitting={isSubmitting}
      />

      {/* Slide-in Drawer: Rapid Continuous RFID Scanner */}
      <RapidCardScanDrawer
        isOpen={isRapidScanOpen}
        onClose={() => setIsRapidScanOpen(false)}
        cardlessStudents={cardlessStudents}
        onCardScannedForStudent={handleCardScannedForStudent}
      />

      {/* Modal: Bulk Student Import */}
      <BulkStudentImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
      />

      {/* Slide-in Drawer: Card Inspector & Rapid Tap Lookup */}
      <CardInspectorDrawer
        isOpen={isCardInspectorOpen}
        onClose={() => setIsCardInspectorOpen(false)}
        students={students}
        cardlessStudents={cardlessStudents}
        onQuickPair={handleQuickPair}
        onUnlinkCard={handleUnlinkCard}
        onViewStudent={(student) => {
          setSelectedStudentForProfile(student);
          setIsProfileDrawerOpen(true);
        }}
      />
    </div>
  );
};
