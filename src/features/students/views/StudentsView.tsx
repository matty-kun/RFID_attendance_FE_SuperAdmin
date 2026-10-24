import React, { useMemo, useState } from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { AddStudentDrawer } from './AddStudentDrawer';
import { RapidCardScanDrawer } from './RapidCardScanDrawer';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import {
  BookOpen,
  CreditCard,
  Plus,
  Search,
  UsersRound,
  Zap,
  UploadCloud,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Radio,
  Clock,
  Layers,
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

        {/* Global Suite Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {unassignedCards.length > 0 && cardlessStudents.length > 0 && (
            <button
              type="button"
              onClick={() => handleAutoPairSequential()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all"
              title="Automatically pair unassigned inventory cards with cardless students in sequence"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Auto-Pair ({Math.min(unassignedCards.length, cardlessStudents.length)})
            </button>
          )}

          <Button
            variant="secondary"
            leftIcon={<UploadCloud className="h-4 w-4 text-[#7026B7]" />}
            onClick={() => setIsBulkImportOpen(true)}
          >
            Bulk Import
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Zap className="h-4 w-4 text-amber-500 fill-amber-500" />}
            onClick={() => setIsRapidScanOpen(true)}
          >
            Rapid Scanner
          </Button>

          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsAddDrawerOpen(true)}
          >
            Add Student
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#756883]">Total Students</p>
            <p className="text-xl font-extrabold text-[#24133F] mt-0.5">{total.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7026B7] flex items-center justify-center">
            <UsersRound className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#756883]">Verified RFID</p>
            <p className="text-xl font-extrabold text-[#16883F] mt-0.5">{verifiedCount.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#756883]">No Card Assigned</p>
            <p className="text-xl font-extrabold text-amber-600 mt-0.5">{unverifiedCount.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#756883]">Card Pool Ready</p>
            <p className="text-xl font-extrabold text-[#7026B7] mt-0.5">{unassignedCards.length.toLocaleString()}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7026B7] flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E5E0EB] pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'students'
              ? 'border-[#7026B7] text-[#7026B7]'
              : 'border-transparent text-[#756883] hover:text-[#24133F]'
          }`}
        >
          <UsersRound className="w-4 h-4" />
          Students Roster
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'students' ? 'bg-[#7026B7]/10 text-[#7026B7]' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'inventory'
              ? 'border-[#7026B7] text-[#7026B7]'
              : 'border-transparent text-[#756883] hover:text-[#24133F]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Card Inventory Pool
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'inventory' ? 'bg-[#7026B7]/10 text-[#7026B7]' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {inventoryCards.length}
          </span>
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
                <tr className="rounded-xl border border-[#E9EDF4] text-[10px] uppercase text-[#637596]">
                  <th className="rounded-l-xl border-y border-l border-[#E9EDF4] px-3 py-3 font-medium">Student</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Course</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Year</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">RFID Card</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">RFID Status</th>
                  <th className="rounded-r-xl border-y border-r border-[#E9EDF4] px-3 py-3 font-medium text-right">Actions</th>
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
                <tr className="rounded-xl border border-[#E9EDF4] text-[10px] uppercase text-[#637596]">
                  <th className="rounded-l-xl border-y border-l border-[#E9EDF4] px-3 py-3 font-medium">Batch #</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Card UID</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Added Time</th>
                  <th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Status</th>
                  <th className="rounded-r-xl border-y border-r border-[#E9EDF4] px-3 py-3 font-medium">Assigned Student</th>
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
