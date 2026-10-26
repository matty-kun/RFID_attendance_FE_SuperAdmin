import React, { useMemo, useState } from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { AddStudentDrawer } from './AddStudentDrawer';
import { RapidCardScanDrawer } from './RapidCardScanDrawer';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import { RegisterActionsDropdown } from './RegisterActionsDropdown';
import { CardPoolDrawer } from './CardPoolDrawer';
import { StudentProfileDrawer } from './StudentProfileDrawer';
import type { StudentRecord } from '../models';
import {
  Search,
  Zap,
  Link as LinkIcon,
  Unlink,
  Radio,
  RefreshCw,
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
    inventoryCards,
    unassignedCards,
    cardlessStudents,
    isAddDrawerOpen,
    setIsAddDrawerOpen,
    isRapidScanOpen,
    setIsRapidScanOpen,
    isBulkImportOpen,
    setIsBulkImportOpen,
    handleRegisterStudent,
    handleCardScannedForInventory,
    handleCardScannedForStudent,
    handleAutoPairSequential,
    handleBulkImport,
    handleQuickPair,
    handleUnlinkCard,
    loadStudents,
  } = useStudentsViewModel();

  const [isCardPoolOpen, setIsCardPoolOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState('all');
  const [rfidFilter, setRfidFilter] = useState('all');

  // Stats calculation from real backend records
  const verifiedCount = useMemo(() => students.filter((s) => Boolean(s.rfid_uid)).length, [students]);
  const unverifiedCount = useMemo(() => students.filter((s) => !s.rfid_uid).length, [students]);
  const pairableCount = useMemo(
    () => Math.min(unassignedCards.length, cardlessStudents.length),
    [unassignedCards.length, cardlessStudents.length]
  );

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course).filter((c): c is string => Boolean(c)))].sort(),
    [students]
  );

  const visibleStudents = filteredStudents.filter(
    (student) =>
      (courseFilter === 'all' || student.course === courseFilter) &&
      (rfidFilter === 'all' || (rfidFilter === 'verified' ? Boolean(student.rfid_uid) : !student.rfid_uid))
  );

  // Keep active profile student synced with latest student data (e.g. after unlink/link)
  const activeProfileStudent = useMemo(() => {
    if (!selectedStudentForProfile) return null;
    return students.find((s) => s.id === selectedStudentForProfile.id) || selectedStudentForProfile;
  }, [selectedStudentForProfile, students]);

  const yearLabel = (year?: number | null) =>
    year ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : '—';

  const initials = (fullName: string) =>
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 text-[#24133F]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight text-[#24133F]">Students &amp; RFID Cards</h1>
          <p className="text-xs text-[#756883] mt-0.5">
            Super Admin Registration Suite · continuous desktop scanner, bulk auto-pair, and inventory roster.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadStudents()}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <RegisterActionsDropdown
            onAddStudent={() => setIsAddDrawerOpen(true)}
            onRapidScan={() => setIsRapidScanOpen(true)}
            onBulkImport={() => setIsBulkImportOpen(true)}
            onAutoPair={handleAutoPairSequential}
            onOpenCardPool={() => setIsCardPoolOpen(true)}
            pairableCount={pairableCount}
          />
        </div>
      </div>

      {/* KPI Headline Metrics */}
      <div className="rounded-2xl border border-[#E5E0EB] bg-white grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E0EB]">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">Total students</p>
          <p className="text-2xl font-bold tracking-tight text-[#24133F] mt-1 tabular-nums">
            {isLoading && students.length === 0 ? '—' : total.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">Enrolled student roster</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">Verified RFID cards (current page)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-[#16883F] tabular-nums">
              {isLoading && students.length === 0 ? '—' : verifiedCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {students.length > 0 ? `${Math.round((verifiedCount / students.length) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">Active cards in circulation</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">No card assigned (current page)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-[#24133F] tabular-nums">
              {isLoading && students.length === 0 ? '—' : unverifiedCount.toLocaleString()}
            </span>
            {unverifiedCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700">
                Pending assignment
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">
            {unverifiedCount === 0 ? 'All listed students equipped' : 'Awaiting card pairing'}
          </p>
        </div>

        {/* Interactive KPI Card: Card Pool Stock */}
        <button
          type="button"
          onClick={() => setIsCardPoolOpen(true)}
          className="p-4 sm:p-5 text-left transition-colors hover:bg-[#FAF8FC] group rounded-b-2xl lg:rounded-b-none lg:rounded-r-2xl cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#756883] group-hover:text-[#7026B7] transition-colors">
              Card pool stock
            </p>
            <span className="text-[11px] font-semibold text-[#7026B7] opacity-80 group-hover:opacity-100 transition-opacity">
              View pool &rarr;
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-[#7026B7] tabular-nums">
              {unassignedCards.length.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-[#7026B7]">
              {unassignedCards.length > 0 ? 'In stock' : 'Empty'}
            </span>
          </div>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">
            {unassignedCards.length > 0 ? `${unassignedCards.length} ready for new students` : 'Scan blank cards to add to pool'}
          </p>
        </button>
      </div>

      {/* Main Student Section */}
      <div className="space-y-3">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] sm:max-w-[310px]">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search students</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setPage(1);
                setSearchQuery(event.target.value);
              }}
              placeholder="Search by name, ID or RFID…"
              className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]"
            />
          </label>

          <Dropdown
            value={courseFilter}
            onChange={(val) => setCourseFilter(val)}
            options={[
              { value: 'all', label: 'All Courses' },
              ...courses.map((c) => ({ value: c, label: c })),
            ]}
          />

          <Dropdown
            value={rfidFilter}
            onChange={(val) => setRfidFilter(val)}
            options={[
              { value: 'all', label: 'All RFID status' },
              { value: 'verified', label: 'Assigned / Verified' },
              { value: 'no-card', label: 'Unassigned (No card)' },
            ]}
          />
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
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
              <tr className="border-b border-[#E9EDF4] text-xs font-medium text-[#756883]">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Course</th>
                <th className="px-3 py-3">Year level</th>
                <th className="px-3 py-3">RFID card</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentForProfile(student);
                    setIsProfileDrawerOpen(true);
                  }}
                  className="border-b border-[#E9EDF4] last:border-b-0 hover:bg-[#FAF8FC] cursor-pointer transition-colors group"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DFE8F8] text-[10px] font-extrabold text-[#294B85] group-hover:scale-105 transition-transform">
                        {initials(student.name)}
                      </span>
                      <div>
                        <p className="font-bold text-[#24133F] leading-snug group-hover:text-[#7026B7] transition-colors">
                          {student.name}
                        </p>
                        <p className="text-[10px] font-mono text-[#756883]">{student.student_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#24133F]">{student.course || '—'}</td>
                  <td className="px-3 py-3 text-[#756883]">{yearLabel(student.year_level)}</td>
                  <td className="px-3 py-3">
                    {student.rfid_uid ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 font-mono text-[11px] font-semibold">
                        <Radio className="w-3 h-3 text-[#7026B7]" />
                        {student.rfid_uid}
                      </div>
                    ) : (
                      <span className="text-[#A59AAB] text-[11px] italic">No card linked</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 font-semibold ${
                        student.rfid_uid
                          ? 'bg-[#E4F7EB] text-[#16883F]'
                          : 'bg-[#FFF2DE] text-[#E58A00]'
                      }`}
                    >
                      <i
                        className={`h-1.5 w-1.5 rounded-full ${
                          student.rfid_uid ? 'bg-[#17B556]' : 'bg-[#F59E0B]'
                        }`}
                      />
                      {student.rfid_uid ? 'Verified' : 'No card'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {student.rfid_uid ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkCard(student.id);
                        }}
                        title="Unlinking existing student RFID cards is not supported by the backend API"
                        aria-label={`Unlink RFID card from ${student.name} unavailable`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg opacity-60 cursor-not-allowed" 
                      >
                        <Unlink className="w-3 h-3" />
                        Linked
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {unassignedCards.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickPair(student.id, unassignedCards[0].uid);
                            }}
                            title="Updating existing student RFID cards is not supported by the backend API"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg opacity-60 cursor-not-allowed" 
                          >
                            <LinkIcon className="w-3 h-3" />
                            Pair Pool #{unassignedCards[0].cardNumber}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsRapidScanOpen(true);
                          }}
                          title="Scan blank cards into pool" 
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7026B7] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          Scan Pool
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!visibleStudents.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <img
                src={isLoading ? hawiFindingImg : hawiQuestionImg}
                alt={isLoading ? 'Loading students...' : 'No students found'}
                className={`w-24 h-24 object-contain mb-3 ${isLoading ? 'animate-pulse' : ''}`}
              />
              <p className="text-sm font-bold text-[#24133F]">
                {isLoading ? 'Loading students…' : error ? 'Unable to load students.' : 'No students found.'}
              </p>
              <p className="text-xs text-[#756883] max-w-xs mt-1">
                {error
                  ? 'Check your backend connection and try again.'
                  : searchQuery || courseFilter !== 'all' || rfidFilter !== 'all'
                  ? 'Try clearing or relaxing your filters.'
                  : 'Get started by adding a student or importing a bulk CSV roster.'}
              </p>
              {!isLoading && !error && !searchQuery && courseFilter === 'all' && (
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="primary" size="sm" onClick={() => setIsAddDrawerOpen(true)}>
                    + Add Student
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsBulkImportOpen(true)}>
                    Bulk Import CSV
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[#E9EDF4] px-3 py-3 text-xs text-[#756883]">
            <span>
              {total.toLocaleString()} students · Page {page} of {Math.max(1, Math.ceil(total / 25))}
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
        availableCards={unassignedCards}
        onUnlinkCard={handleUnlinkCard}
        onQuickPair={handleQuickPair}
        onOpenRapidScan={() => setIsRapidScanOpen(true)}
      />

      {/* Slide-in Drawer: Card Inventory Pool */}
      <CardPoolDrawer
        isOpen={isCardPoolOpen}
        onClose={() => setIsCardPoolOpen(false)}
        inventoryCards={inventoryCards}
        onOpenRapidScan={() => setIsRapidScanOpen(true)}
      />

      {/* Slide-in Drawer: Add Single Student */}
      <AddStudentDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        availableCards={unassignedCards}
        onSubmit={handleRegisterStudent}
        isSubmitting={isSubmitting}
      />

      {/* Slide-in Drawer: Rapid Continuous RFID Scanner */}
      <RapidCardScanDrawer
        isOpen={isRapidScanOpen}
        onClose={() => setIsRapidScanOpen(false)}
        cardlessStudents={cardlessStudents}
        onCardScannedForInventory={handleCardScannedForInventory}
        onCardScannedForStudent={handleCardScannedForStudent}
        existingInventoryCount={inventoryCards.length}
      />

      {/* Modal: Bulk Student Import with Sequential Auto-Pairing */}
      <BulkStudentImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        availableCards={unassignedCards}
        onImport={handleBulkImport}
      />
    </div>
  );
};
