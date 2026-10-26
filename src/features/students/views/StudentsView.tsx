import React, { useMemo, useState } from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Dropdown } from '../../../components/common/Dropdown';
import { AddStudentDrawer } from './AddStudentDrawer';
import { RapidCardScanDrawer } from './RapidCardScanDrawer';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import { RegisterActionsDropdown } from './RegisterActionsDropdown';
import { StudentProfileDrawer } from './StudentProfileDrawer';
import type { StudentRecord } from '../models';
import {
  Search,
  Zap,
  Link as LinkIcon,
  Radio,
  RefreshCw,
  ArchiveRestore,
  CreditCard,
  User,
  AlertTriangle,
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
    lostCards,
    isAddDrawerOpen,
    setIsAddDrawerOpen,
    isRapidScanOpen,
    setIsRapidScanOpen,
    isBulkImportOpen,
    setIsBulkImportOpen,
    archivedStudentIds,
    handleArchiveStudent,
    handleRestoreStudent,
    handleRestoreLostCard,
    handleRegisterStudent,
    handleCardScannedForInventory,
    handleCardScannedForStudent,
    handleAutoPairSequential,
    handleBulkImport,
    handleQuickPair,
    handleUnlinkCard,
    handleUpdateStudent,
    loadStudents,
  } = useStudentsViewModel();

  const [activeTab, setActiveTab] = useState<'students' | 'cards' | 'archived'>('students');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentRecord | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState('all');
  const [rfidFilter, setRfidFilter] = useState('all');
  const [cardStatusFilter, setCardStatusFilter] = useState<'all' | 'unassigned' | 'assigned' | 'lost'>('all');

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
  const pairableCount = useMemo(
    () => Math.min(unassignedCards.length, cardlessStudents.filter((s) => !archivedStudentIds.includes(s.id)).length),
    [unassignedCards.length, cardlessStudents, archivedStudentIds]
  );

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course).filter((c): c is string => Boolean(c)))].sort(),
    [students]
  );

  // Active student rows filtered
  const visibleStudents = activeStudents.filter(
    (student) =>
      (courseFilter === 'all' || student.course === courseFilter) &&
      (rfidFilter === 'all' || (rfidFilter === 'verified' ? Boolean(student.rfid_uid) : !student.rfid_uid))
  );

  // Card Inventory rows filtered
  const visibleCards = useMemo(() => {
    return inventoryCards.filter((card) => {
      const matchesStatus =
        cardStatusFilter === 'all' || card.status === cardStatusFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        card.uid.toLowerCase().includes(q) ||
        String(card.cardNumber).includes(q) ||
        (card.assignedToStudentName && card.assignedToStudentName.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [inventoryCards, cardStatusFilter, searchQuery]);

  // Keep active profile student synced with latest student data
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
    <div className="mx-auto w-full max-w-[1180px] space-y-5 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight text-slate-900">Students &amp; RFID Cards</h1>
          <p className="text-xs text-slate-500 mt-0.5">
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
            onOpenCardPool={() => setActiveTab('cards')}
            pairableCount={pairableCount}
          />
        </div>
      </div>

      {/* KPI Headline Metrics */}
      <div className="rounded-2xl border border-slate-200 bg-white grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Active students</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
            {isLoading && students.length === 0 ? '—' : activeStudents.length.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Enrolled active roster</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">Verified RFID cards</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
              {isLoading && students.length === 0 ? '—' : verifiedCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">
              {activeStudents.length > 0 ? `${Math.round((verifiedCount / activeStudents.length) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active cards in circulation</p>
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-500">No card assigned</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {isLoading && students.length === 0 ? '—' : unverifiedCount.toLocaleString()}
            </span>
            {unverifiedCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700">
                Pending assignment
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {unverifiedCount === 0 ? 'All active students equipped' : 'Awaiting card pairing'}
          </p>
        </div>

        {/* Interactive KPI Card: Switches directly to Card Inventory Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('cards')}
          className="p-4 sm:p-5 text-left transition-colors hover:bg-slate-50 group rounded-b-2xl lg:rounded-b-none lg:rounded-r-2xl cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 group-hover:text-brand-700 transition-colors">
              Card pool stock
            </p>
            <span className="text-[11px] font-semibold text-brand-700 opacity-80 group-hover:opacity-100 transition-opacity">
              View inventory &rarr;
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold tracking-tight text-brand-700 tabular-nums">
              {unassignedCards.length.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-brand-700">
              {unassignedCards.length > 0 ? 'In stock' : 'Empty'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {unassignedCards.length > 0 ? `${unassignedCards.length} ready for new students` : 'Scan blank cards to add to pool'}
          </p>
        </button>
      </div>

      {/* Main Section */}
      <div className="space-y-3">
        {/* Unified Filter Toolbar (Dropdown View Filter + Contextual Filters) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* View / Type Filter Dropdown */}
            <Dropdown
              value={activeTab}
              onChange={(val: any) => setActiveTab(val)}
              options={[
                { value: 'students', label: `Active Students (${activeStudents.length})` },
                { value: 'cards', label: `Card Inventory (${inventoryCards.length})` },
                { value: 'archived', label: `Archived Records (${archivedStudents.length + lostCards.length})` },
              ]}
              buttonClassName="h-10 min-w-[200px] font-bold text-brand-700 bg-brand-50 border-brand-200"
            />

            {/* Live Search Input */}
            <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-500 sm:max-w-[280px]">
              <Search className="h-4 w-4" />
              <span className="sr-only">Search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setPage(1);
                  setSearchQuery(event.target.value);
                }}
                placeholder={
                  activeTab === 'cards'
                    ? 'Search UID, Card #, or student…'
                    : 'Search by name, ID or RFID…'
                }
                className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            {activeTab === 'students' && (
              <>
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
              </>
            )}

            {activeTab === 'cards' && (
              <>
                <Dropdown
                  value={cardStatusFilter}
                  onChange={(val: any) => setCardStatusFilter(val)}
                  options={[
                    { value: 'all', label: `All Cards (${inventoryCards.length})` },
                    { value: 'unassigned', label: `Available in Pool (${unassignedCards.length})` },
                    { value: 'assigned', label: `Assigned to Students (${inventoryCards.filter((c) => c.status === 'assigned').length})` },
                    { value: 'lost', label: `Lost / Revoked (${lostCards.length})` },
                  ]}
                />

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRapidScanOpen(true)}
                  leftIcon={<Zap className="w-3.5 h-3.5 fill-current" />}
                >
                  Rapid Scan Cards
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ACTIVE STUDENTS TABLE */}
        {/* ========================================================================= */}
        {activeTab === 'students' && (
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
                    className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-extrabold text-brand-700 group-hover:scale-105 transition-transform border border-brand-200/50">
                          {initials(student.name)}
                        </span>
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
                        <span className="text-slate-400 text-[11px] italic">No card linked</span>
                      )}
                    </td>

                    {/* Status column */}
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>

                    {/* Actions column */}
                    <td className="px-3 py-3 text-right">
                      {student.rfid_uid ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForProfile(student);
                            setIsProfileDrawerOpen(true);
                          }}
                          title="View student profile & attendance history"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-slate-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          View Profile &rarr;
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {unassignedCards.length > 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickPair(student.id, unassignedCards[0].uid);
                              }}
                              title={`Pair next card #${unassignedCards[0].cardNumber} from pool`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                            >
                              <LinkIcon className="w-3 h-3" />
                              Pair #{unassignedCards[0].cardNumber}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRapidScanOpen(true);
                              }}
                              title="Scan blank cards into pool"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                            >
                              <Zap className="w-3 h-3" />
                              Scan Card
                            </button>
                          )}
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
                <p className="text-sm font-bold text-slate-900">
                  {isLoading ? 'Loading students…' : error ? 'Unable to load students.' : 'No active students found.'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  {error
                    ? 'Check your backend connection and try again.'
                    : searchQuery || courseFilter !== 'all' || rfidFilter !== 'all'
                    ? 'Try clearing or relaxing your search filters.'
                    : 'Get started by adding a student or importing a bulk CSV roster.'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-3 py-3 text-xs text-slate-500">
              <span>
                {activeStudents.length.toLocaleString()} active students · Page {page} of {Math.max(1, Math.ceil(total / 25))}
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
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CARD INVENTORY POOL TABLE (Directly In-Page!) */}
        {/* ========================================================================= */}
        {activeTab === 'cards' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2.5">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="px-3 py-3">Card &amp; UID</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Assigned Student</th>
                  <th className="px-3 py-3">Registered / Revoked</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card) => {
                  const isAssigned = card.status === 'assigned';
                  const isLost = card.status === 'lost';
                  const isAvailable = card.status === 'unassigned';

                  return (
                    <tr
                      key={card.id}
                      className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-brand-700 bg-brand-50 border border-brand-200/70 px-2 py-0.5 rounded-md text-[11px] tabular-nums shrink-0">
                            #{card.cardNumber}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                            {card.uid}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {isAvailable && (
                          <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                            <i className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                            Available in Pool
                          </span>
                        )}
                        {isAssigned && (
                          <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Assigned
                          </span>
                        )}
                        {isLost && (
                          <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <i className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Lost / Revoked
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {card.assignedToStudentName ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-slate-900">
                              {card.assignedToStudentName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            — Blank stock in pool
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-slate-500 text-[11px]">
                        {card.registeredAt ? new Date(card.registeredAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '—'}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {isAvailable && cardlessStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleQuickPair(cardlessStudents[0].id, card.uid)}
                            title={`Pair to ${cardlessStudents[0].name}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Pair to {cardlessStudents[0].name.split(' ')[0]}
                          </button>
                        )}
                        {isLost && (
                          <button
                            type="button"
                            onClick={() => handleRestoreLostCard(card.uid)}
                            title="Return card to available stock pool"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                          >
                            <ArchiveRestore className="w-3 h-3" />
                            Restore to Pool
                          </button>
                        )}
                        {isAssigned && (
                          <span className="text-slate-400 text-[11px]">In Circulation</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!visibleCards.length && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-900">No cards in inventory.</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Use the Rapid Scanner to register blank RFID tags into the pool.
                </p>
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsRapidScanOpen(true)}
                    leftIcon={<Zap className="w-3.5 h-3.5 fill-current" />}
                  >
                    Scan Blank Cards Now
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ARCHIVED TABLE (Students + Lost Cards) */}
        {/* ========================================================================= */}
        {activeTab === 'archived' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2.5 space-y-4">
            <div>
              <div className="px-2 py-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Archived Students ({archivedStudents.length})
                </p>
                <span className="text-[11px] text-slate-400">
                  Attendance logs remain permanently intact
                </span>
              </div>

              <table className="w-full min-w-[760px] text-left text-xs mt-1">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="px-3 py-2.5">Student</th>
                    <th className="px-3 py-2.5">Course</th>
                    <th className="px-3 py-2.5">Year</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedStudents.map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentForProfile(student);
                        setIsProfileDrawerOpen(true);
                      }}
                      className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            {initials(student.name)}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">{student.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{student.student_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{student.course || '—'}</td>
                      <td className="px-3 py-3 text-slate-500">{yearLabel(student.year_level)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <i className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Archived
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRestoreStudent(student.id);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Restore Student
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!archivedStudents.length && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400 italic">
                        No archived student records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Lost / Revoked Cards Section */}
            <div className="pt-2 border-t border-slate-200">
              <div className="px-2 py-1.5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  Lost &amp; Revoked RFID Cards ({lostCards.length})
                </p>
                <span className="text-[11px] text-slate-400">
                  Deactivated from circulation
                </span>
              </div>

              <table className="w-full min-w-[760px] text-left text-xs mt-1">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="px-3 py-2.5">Card UID</th>
                    <th className="px-3 py-2.5">Reported By</th>
                    <th className="px-3 py-2.5">Revoked Date</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lostCards.map((card) => (
                    <tr key={card.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">
                        {card.uid}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {card.previousStudentName ? `${card.previousStudentName} (${card.previousStudentId || '—'})` : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-[11px]">
                        {card.revokedAt ? new Date(card.revokedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <i className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Lost &amp; Revoked
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRestoreLostCard(card.uid)}
                          title="Restore card back to available inventory pool"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          Restore Card to Pool
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!lostCards.length && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400 italic">
                        No lost cards reported.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Slide-in Drawer: Student Profile & Scan History */}
      <StudentProfileDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        student={activeProfileStudent}
        availableCards={unassignedCards}
        onUnlinkCard={handleUnlinkCard}
        onQuickPair={handleQuickPair}
        onUpdateStudent={handleUpdateStudent}
        onOpenRapidScan={() => setIsRapidScanOpen(true)}
        isArchived={activeProfileStudent ? archivedStudentIds.includes(activeProfileStudent.id) : false}
        onArchiveStudent={handleArchiveStudent}
        onRestoreStudent={handleRestoreStudent}
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
