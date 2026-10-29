import React, { useMemo, useState, useEffect } from 'react';
import { useStudentsViewModel, type BulkStudentAction } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { formatYearLevel } from '../../../utils/formatters';
import { Dropdown } from '../../../components/common/Dropdown';
import { Checkbox } from '../../../components/common/Checkbox';
import { Modal } from '../../../components/common/Modal';
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
  ArrowDownAZ,
  Link2Off,
  Trash2,
} from 'lucide-react';
import hawiQuestionImg from '../../../assets/illustrations/Hawi Question.png';
import hawiFindingImg from '../../../assets/illustrations/Hawi Finding.png';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';
import hawiBoxImg from '../../../assets/illustrations/Hawi Box.png';
import hawiTrashCanImg from '../../../assets/illustrations/Hawi Trash Can.png';

export const StudentsView: React.FC = () => {
  const [studentTab, setStudentTab] = useState<'active' | 'archived'>('active');
  const {
    students,
    filteredStudents,
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    direction,
    setDirection,
    isLoading,
    isSubmitting,
    page,
    setPage,
    total,
    studentStats,
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
    handleBulkStudentAction,
    handleDeleteStudent,
    handleRestoreStudent,
    handleRegisterStudent,
    handleCardScannedForStudent,
    handleBulkImport,
    handleQuickPair,
    handleUnlinkCard,
    handleUpdateStudent,
    uploadStudentAvatar,
    removeStudentAvatar,
    loadStudents,
  } = useStudentsViewModel(studentTab === 'archived');

  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isCardInspectorOpen, setIsCardInspectorOpen] = useState(false);

  useEffect(() => {
    const onOpenInspector = () => setIsCardInspectorOpen(true);
    window.addEventListener('presnt:open-card-inspector', onOpenInspector);
    return () => window.removeEventListener('presnt:open-card-inspector', onOpenInspector);
  }, []);
  const [courseFilter, setCourseFilter] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkStudentAction | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [bulkFailures, setBulkFailures] = useState<{ id: string; name: string; message: string }[]>([]);

  useEffect(() => {
    setSelectedStudentIds([]);
    setBulkFailures([]);
  }, [page, studentTab, courseFilter, searchQuery]);

  // Split students into active and archived cohorts
  const activeStudents = useMemo(
    () => filteredStudents.filter((s) => !archivedStudentIds.includes(s.id)),
    [filteredStudents, archivedStudentIds]
  );

  const archivedStudents = useMemo(
    () => filteredStudents.filter((s) => archivedStudentIds.includes(s.id)),
    [filteredStudents, archivedStudentIds]
  );

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course).filter((c): c is string => Boolean(c)))].sort(),
    [students]
  );

  const currentCohort = studentTab === 'active' ? activeStudents : archivedStudents;

  // Filtered rows for current cohort
  const visibleStudents = currentCohort.filter(
    (student) => courseFilter === 'all' || student.course === courseFilter
  );
  const selectedStudents = visibleStudents.filter((student) => selectedStudentIds.includes(student.id));
  const selectedWithCards = selectedStudents.filter((student) => Boolean(student.rfid_uid));
  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every((student) => selectedStudentIds.includes(student.id));

  const runBulkAction = async () => {
    if (!pendingBulkAction || bulkBusy) return;
    const ids = pendingBulkAction === 'unlink' ? selectedWithCards.map((student) => student.id) : selectedStudents.map((student) => student.id);
    if (!ids.length || (pendingBulkAction === 'delete' && deleteConfirmation !== 'DELETE')) return;
    setBulkBusy(true);
    try {
      const result = await handleBulkStudentAction(ids, pendingBulkAction);
      setSelectedStudentIds(result.failed);
      setBulkFailures(result.failures);
      setPendingBulkAction(null);
      setDeleteConfirmation('');
    } finally {
      setBulkBusy(false);
    }
  };

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
          />
        </div>
      </div>

      {/* KPI Headline Metrics */}
      <div className="rounded-2xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Active students</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
            {isLoading && students.length === 0 ? '—' : studentStats.active.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total students currently enrolled</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Students with cards</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
              {isLoading && students.length === 0 ? '—' : studentStats.with_cards.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {studentStats.active > 0 ? `${Math.round((studentStats.with_cards / studentStats.active) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready to tap in for attendance</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Students without cards</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading && students.length === 0 ? '—' : studentStats.without_cards.toLocaleString()}
            </span>
            {studentStats.without_cards > 0 ? (
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
            {studentStats.without_cards === 0 ? 'Every student has a card' : 'Needs an RFID card to tap in'}
          </p>
        </div>
      </div>

      {/* Main Section */}
      <div className="space-y-3">
        {/* Toolbar: Search & Filters (Matching icons and styling) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition-all focus-within:border-[#7026B7] focus-within:ring-4 focus-within:ring-purple-100 sm:max-w-[280px]">
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
              onChange={(val: any) => { setStudentTab(val); setPage(1); setCourseFilter('all'); }}
              icon={studentTab === 'active' ? <Users className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              options={[
                {
                  value: 'active',
                  label: `Active Students (${studentStats.active})`,
                  icon: <UserCheck className="h-3.5 w-3.5 text-brand-700" />,
                },
                {
                  value: 'archived',
                  label: `Archived (${studentStats.archived})`,
                  icon: <Archive className="h-3.5 w-3.5 text-slate-500" />,
                },
              ]}
            />
            <Dropdown
              value={`${sort}:${direction}`}
              onChange={(value) => {
                const [field, order] = value.split(':');
                setSort(field as typeof sort);
                setDirection(order as typeof direction);
                setPage(1);
              }}
              icon={<ArrowDownAZ className="h-4 w-4" />}
              options={[
                { value: 'created_at:desc', label: 'Newest first' },
                { value: 'created_at:asc', label: 'Oldest first' },
                { value: 'name:asc', label: 'Name A–Z' },
                { value: 'name:desc', label: 'Name Z–A' },
                { value: 'year_level:asc', label: 'Year level 1–4' },
                { value: 'year_level:desc', label: 'Year level 4–1' },
                { value: 'student_id:asc', label: 'Student ID ascending' },
                { value: 'student_id:desc', label: 'Student ID descending' },
              ]}
            />
          </div>
        </div>

        {bulkFailures.length > 0 && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
            <p className="font-extrabold">Could not update {bulkFailures.length} selected student{bulkFailures.length === 1 ? '' : 's'}:</p>
            <ul className="mt-1.5 space-y-1">
              {bulkFailures.map((failure) => <li key={failure.id}><span className="font-bold">{failure.name}:</span> {failure.message}</li>)}
            </ul>
          </div>
        )}

        {/* Students Table */}
        <div className="relative flex flex-col gap-2 2xl:block">
          <aside aria-label="Bulk student actions" aria-live="polite" className="flex h-9 w-full shrink-0 gap-1 2xl:absolute 2xl:right-[calc(100%+16px)] 2xl:top-12 2xl:h-auto 2xl:w-24 2xl:flex-col">
            {selectedStudents.length > 0 && (
              <>
                {studentTab === 'active' && <button type="button" disabled={bulkBusy} onClick={() => setPendingBulkAction('archive')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#7026B7] transition-colors hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-[#7026B7] disabled:opacity-40"><Archive className="h-3.5 w-3.5 shrink-0" /> Archive</button>}
                <button type="button" disabled={bulkBusy} onClick={() => setPendingBulkAction('delete')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5 shrink-0" /> Delete</button>
                {studentTab === 'active' && <button type="button" disabled={!selectedWithCards.length || bulkBusy} onClick={() => setPendingBulkAction('unlink')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#7026B7] transition-colors hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-[#7026B7] disabled:opacity-40"><Link2Off className="h-3.5 w-3.5 shrink-0" /> Unlink</button>}
                <button type="button" disabled={bulkBusy} onClick={() => setSelectedStudentIds([])} className="inline-flex h-9 items-center rounded-lg px-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40">Clear</button>
              </>
            )}
          </aside>
        <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2.5">
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
                <th className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox aria-label={`Select all students on this page (${visibleStudents.length})`} checked={allVisibleSelected} disabled={!visibleStudents.length || bulkBusy} onChange={(event) => setSelectedStudentIds(event.target.checked ? visibleStudents.map((student) => student.id) : [])} />
                    <span>Student</span>
                    {selectedStudents.length > 0 && <span className="font-bold text-[#7026B7]">{selectedStudents.length} selected</span>}
                  </div>
                </th>
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
                    className={`border-b border-slate-200 last:border-b-0 cursor-pointer transition-colors group ${selectedStudentIds.includes(student.id) ? 'bg-purple-50/70 hover:bg-purple-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
                          <Checkbox aria-label={`Select ${student.name}`} checked={selectedStudentIds.includes(student.id)} disabled={bulkBusy} onChange={(event) => setSelectedStudentIds((previous) => event.target.checked ? [...previous, student.id] : previous.filter((id) => id !== student.id))} />
                        </span>
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
              {total.toLocaleString()} {studentTab} students · Page {page} of {Math.max(1, Math.ceil(total / 25))}
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
      </div>

      <Modal
        isOpen={pendingBulkAction !== null}
        onClose={() => { if (!bulkBusy) { setPendingBulkAction(null); setDeleteConfirmation(''); } }}
        title={pendingBulkAction === 'unlink' ? 'Unlink selected cards' : pendingBulkAction === 'archive' ? 'Archive selected students' : 'Delete selected students'}
        description={`${pendingBulkAction === 'unlink' ? selectedWithCards.length : selectedStudents.length} selected student${(pendingBulkAction === 'unlink' ? selectedWithCards.length : selectedStudents.length) === 1 ? '' : 's'}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${pendingBulkAction === 'delete' ? 'bg-rose-50' : 'bg-[#F8F2FF]'}`}>
            <img
              src={pendingBulkAction === 'unlink' ? hawiTapCardImg : pendingBulkAction === 'archive' ? hawiBoxImg : hawiTrashCanImg}
              alt=""
              className="h-20 w-20 shrink-0 object-contain"
            />
            <p className="leading-relaxed text-[#24133F]">
              {pendingBulkAction === 'unlink'
                ? 'Hawi will free the selected RFID cards so they can be paired again.'
                : pendingBulkAction === 'archive'
                ? 'These students will leave the active list. Their cards will be unlinked, while attendance history stays preserved.'
                : 'This permanently removes eligible student accounts. Students with attendance history cannot be deleted; archive them instead.'}
            </p>
          </div>
          {pendingBulkAction === 'delete' && (
            <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
              <span>Type DELETE to confirm</span>
              <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} disabled={bulkBusy} autoComplete="off" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
            </label>
          )}
          <div className="flex justify-end gap-2.5 border-t border-[#F1EEF4] pt-4 pb-1">
            <Button type="button" variant="secondary" size="md" disabled={bulkBusy} onClick={() => { setPendingBulkAction(null); setDeleteConfirmation(''); }}>Cancel</Button>
            <Button type="button" variant={pendingBulkAction === 'delete' ? 'danger' : 'primary'} size="md" isLoading={bulkBusy} disabled={pendingBulkAction === 'delete' && deleteConfirmation !== 'DELETE'} onClick={() => void runBulkAction()} leftIcon={pendingBulkAction === 'unlink' ? <Link2Off className="h-4 w-4" /> : pendingBulkAction === 'archive' ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}>
              {pendingBulkAction === 'unlink' ? 'Unlink cards' : pendingBulkAction === 'archive' ? 'Archive students' : 'Delete students'}
            </Button>
          </div>
        </div>
      </Modal>

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
        onDeleteStudent={handleDeleteStudent}
        onUploadAvatar={uploadStudentAvatar}
        onRemoveAvatar={removeStudentAvatar}
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
        students={students}
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
