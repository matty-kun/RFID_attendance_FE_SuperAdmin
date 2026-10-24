import React, { useMemo, useState } from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { AddStudentDrawer } from './AddStudentDrawer';
import { RapidCardScanDrawer } from './RapidCardScanDrawer';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import { RegisterActionsDropdown } from './RegisterActionsDropdown';
import {
  BookOpen,
  Search,
  UsersRound,
  Zap,
  Link as LinkIcon,
  Unlink,
  Radio,
  Clock,
} from 'lucide-react';
import hawiQuestionImg from '../../../assets/illustrations/Hawi Question.png';
import hawiTapCardImg from '../../../assets/illustrations/Hawi Tap Card.png';

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
  } = useStudentsViewModel();

  const [activeTab, setActiveTab] = useState<'students' | 'inventory'>('students');
  const [courseFilter, setCourseFilter] = useState('all');
  const [rfidFilter, setRfidFilter] = useState('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');

  // Stats calculation
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

  const visibleInventoryCards = inventoryCards.filter((card) => {
    if (inventoryFilter === 'unassigned') return card.status === 'unassigned';
    if (inventoryFilter === 'assigned') return card.status === 'assigned';
    return true;
  });

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

        {/* Split Dropdown Action Button (matches Reports ExportButton) */}
        <RegisterActionsDropdown
          onAddStudent={() => setIsAddDrawerOpen(true)}
          onRapidScan={() => setIsRapidScanOpen(true)}
          onBulkImport={() => setIsBulkImportOpen(true)}
          onAutoPair={handleAutoPairSequential}
          pairableCount={pairableCount}
        />
      </div>

      {/* KPI Headline Metrics: Unified container split by 1px rules (Anti-Slop / design-taste-frontend §5) */}
      <div className="rounded-2xl border border-[#E5E0EB] bg-white grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E0EB]">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">Total students</p>
          <p className="text-2xl font-bold tracking-tight text-[#24133F] mt-1 tabular-nums">
            {total.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">Enrolled student roster</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">Verified RFID cards</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-[#16883F] tabular-nums">
              {verifiedCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {total > 0 ? `${Math.round((verifiedCount / total) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">Active cards in circulation</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">No card assigned</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-[#24133F] tabular-nums">
              {unverifiedCount.toLocaleString()}
            </span>
            {unverifiedCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700">
                Pending assignment
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">
            {unverifiedCount === 0 ? 'All students equipped' : 'Awaiting card pairing'}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-[#756883]">Card pool ready</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-[#7026B7] tabular-nums">
              {unassignedCards.length.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-[#7026B7]">
              {unassignedCards.length > 0 ? 'In stock' : 'Depleted'}
            </span>
          </div>
          <p className="text-[11px] text-[#A59AAB] mt-0.5">
            {pairableCount > 0 ? `${pairableCount} ready to auto-pair` : 'Available to assign'}
          </p>
        </div>
      </div>

      {/* Main Tabs: Quiet underline navigation on 1px border */}
      <div className="flex items-center gap-6 border-b border-[#E5E0EB]">
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-xs font-semibold border-b-2 -mb-[1px] transition-all flex items-center gap-1.5 ${
            activeTab === 'students'
              ? 'border-[#7026B7] text-[#7026B7]'
              : 'border-transparent text-[#756883] hover:text-[#24133F]'
          }`}
        >
          <span>Students roster</span>
          <span className="text-[11px] text-[#A59AAB] font-normal">({total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-xs font-semibold border-b-2 -mb-[1px] transition-all flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'border-[#7026B7] text-[#7026B7]'
              : 'border-transparent text-[#756883] hover:text-[#24133F]'
          }`}
        >
          <span>Card inventory pool</span>
          <span className="text-[11px] text-[#A59AAB] font-normal">({inventoryCards.length})</span>
        </button>
      </div>

      {/* TAB 1: Students Roster */}
      {activeTab === 'students' && (
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
              icon={<BookOpen className="h-4 w-4" />}
              options={[
                { value: 'all', label: 'All Courses' },
                ...courses.map((c) => ({ value: c, label: c })),
              ]}
            />

            <Dropdown
              value={rfidFilter}
              onChange={(val) => setRfidFilter(val)}
              icon={<UsersRound className="h-4 w-4" />}
              options={[
                { value: 'all', label: 'RFID Status: All' },
                { value: 'verified', label: 'Verified Only' },
                { value: 'no-card', label: 'Needs Card' },
              ]}
            />
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
            {error && <p role="alert" className="px-3 py-2 text-sm text-rose-600">{error}</p>}
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
                  <tr key={student.id} className="border-b border-[#E9EDF4] last:border-b-0 hover:bg-[#FAF8FC]">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DFE8F8] text-[10px] font-extrabold text-[#294B85]">
                          {initials(student.name)}
                        </span>
                        <div>
                          <p className="font-bold text-[#24133F] leading-snug">{student.name}</p>
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
                          onClick={() => handleUnlinkCard(student.id)}
                          title="Unlink RFID Card"
                          aria-label={`Unlink RFID card from ${student.name}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Unlink className="w-3 h-3" />
                          Unlink
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {unassignedCards.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQuickPair(student.id, unassignedCards[0].uid)}
                              title={`Pair with card #${unassignedCards[0].cardNumber}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Pair Pool #{unassignedCards[0].cardNumber}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsRapidScanOpen(true)}
                            title="Scan with USB reader"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7026B7] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Zap className="w-3 h-3" />
                            Scan Tap
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
                  src={hawiQuestionImg}
                  alt="No students found"
                  className="w-24 h-24 object-contain mb-3"
                />
                <p className="text-sm font-bold text-[#24133F]">
                  {isLoading ? 'Loading students…' : error ? 'Unable to load students.' : 'No students found'}
                </p>
                <p className="text-xs text-[#756883] max-w-xs mt-1">
                  {searchQuery || courseFilter !== 'all' || rfidFilter !== 'all'
                    ? 'Try clearing or relaxing your filters.'
                    : 'Get started by adding a student or importing a bulk CSV roster.'}
                </p>
                {!isLoading && !searchQuery && courseFilter === 'all' && (
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
      )}

      {/* TAB 2: Card Inventory Pool */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInventoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inventoryFilter === 'all'
                    ? 'bg-[#7026B7] text-white'
                    : 'bg-white border border-[#E5E0EB] text-[#756883] hover:text-[#24133F]'
                }`}
              >
                All Cards ({inventoryCards.length})
              </button>
              <button
                type="button"
                onClick={() => setInventoryFilter('unassigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inventoryFilter === 'unassigned'
                    ? 'bg-[#7026B7] text-white'
                    : 'bg-white border border-[#E5E0EB] text-[#756883] hover:text-[#24133F]'
                }`}
              >
                Available ({unassignedCards.length})
              </button>
              <button
                type="button"
                onClick={() => setInventoryFilter('assigned')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  inventoryFilter === 'assigned'
                    ? 'bg-[#7026B7] text-white'
                    : 'bg-white border border-[#E5E0EB] text-[#756883] hover:text-[#24133F]'
                }`}
              >
                Assigned ({inventoryCards.length - unassignedCards.length})
              </button>
            </div>

            <Button
              variant="primary"
              leftIcon={<Zap className="w-4 h-4" />}
              onClick={() => setIsRapidScanOpen(true)}
            >
              Scan More Cards to Pool
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#E9EDF4] text-xs font-medium text-[#756883]">
                  <th className="px-3 py-3">Batch</th>
                  <th className="px-3 py-3">Card UID</th>
                  <th className="px-3 py-3">Added time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Assigned student</th>
                </tr>
              </thead>
              <tbody>
                {visibleInventoryCards.map((card) => (
                  <tr key={card.uid} className="border-b border-[#E9EDF4] last:border-b-0 hover:bg-[#FAF8FC]">
                    <td className="px-3 py-3 font-extrabold text-[#7026B7]">
                      #{card.cardNumber || '—'}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-[#24133F]">
                      <div className="inline-flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-[#7026B7]" />
                        {card.uid}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#756883]">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-[#A59AAB]" />
                        {new Date(card.registeredAt).toLocaleDateString()} · {new Date(card.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 font-semibold ${
                          card.status === 'unassigned'
                            ? 'bg-purple-50 text-[#7026B7]'
                            : 'bg-[#E4F7EB] text-[#16883F]'
                        }`}
                      >
                        <i
                          className={`h-1.5 w-1.5 rounded-full ${
                            card.status === 'unassigned' ? 'bg-[#7026B7]' : 'bg-[#17B556]'
                          }`}
                        />
                        {card.status === 'unassigned' ? 'Available in Pool' : 'Assigned'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#24133F]">
                      {card.assignedToStudentName ? (
                        <span>{card.assignedToStudentName}</span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">None (Ready to assign)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!visibleInventoryCards.length && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <img
                  src={hawiTapCardImg}
                  alt="No inventory cards"
                  className="w-24 h-24 object-contain mb-3"
                />
                <p className="text-sm font-bold text-[#24133F]">No cards in this view</p>
                <p className="text-xs text-[#756883] max-w-xs mt-1">
                  Connect your USB RFID scanner and use Rapid Scanner to swipe cards continuously into the pool.
                </p>
                <div className="mt-4">
                  <Button variant="primary" size="sm" onClick={() => setIsRapidScanOpen(true)}>
                    ⚡ Open Rapid Scanner
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
