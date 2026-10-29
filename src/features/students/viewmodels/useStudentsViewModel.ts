import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  StudentRecord,
  StudentRosterStats,
  RegisterStudentPayload,
  InventoryCard,
  BulkImportStudentRow,
  UpdateStudentPayload,
} from '../models';
import { studentService } from '../services';
import { request } from '../../../services/apiClient';
import { toast } from '../../../context';

const ARCHIVED_STORAGE_KEY = 'presnt_archived_students';
const LOST_CARDS_STORAGE_KEY = 'presnt_lost_cards';
type StudentSortField = 'created_at' | 'name' | 'student_id' | 'course' | 'year_level';
type StudentSortDirection = 'asc' | 'desc';
export type BulkStudentAction = 'unlink' | 'archive' | 'delete';

export interface LostCardRecord {
  id: string;
  cardNumber: number;
  uid: string;
  previousStudentName?: string;
  previousStudentId?: string;
  revokedAt: string;
  reason: 'lost';
}

export interface UseStudentsViewModelReturn {
  students: StudentRecord[];
  filteredStudents: StudentRecord[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sort: StudentSortField;
  setSort: (value: StudentSortField) => void;
  direction: StudentSortDirection;
  setDirection: (value: StudentSortDirection) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  page: number;
  setPage: (v: number) => void;
  total: number;
  studentStats: StudentRosterStats;
  error: string;

  // Inventory Cards State
  inventoryCards: InventoryCard[];
  unassignedCards: InventoryCard[];
  cardlessStudents: StudentRecord[];
  lostCards: LostCardRecord[];

  // Modals & Drawers
  isAddDrawerOpen: boolean;
  setIsAddDrawerOpen: (v: boolean) => void;
  isRapidScanOpen: boolean;
  setIsRapidScanOpen: (v: boolean) => void;
  isBulkImportOpen: boolean;
  setIsBulkImportOpen: (v: boolean) => void;

  // Archiving
  archivedStudentIds: string[];
  handleArchiveStudent: (studentId: string) => Promise<boolean>;
  handleDeleteStudent: (studentId: string) => Promise<boolean>;
  handleRestoreStudent: (studentId: string) => Promise<void>;
  handleRestoreLostCard: (uid: string) => void;
  handleBulkStudentAction: (studentIds: string[], action: BulkStudentAction) => Promise<{ succeeded: string[]; failed: string[]; failures: { id: string; name: string; message: string }[] }>;

  // Actions
  handleRegisterStudent: (payload: RegisterStudentPayload) => Promise<void>;
  handleCardScannedForStudent: (studentId: string, uid: string) => Promise<{ success: boolean; message: string }>;
  handleAutoPairSequential: () => Promise<{ pairedCount: number }>;
  handleBulkImport: (newStudents: BulkImportStudentRow[], autoPair: boolean, onProgress?: (current: number, total: number) => void) => Promise<void>;
  handleQuickPair: (studentId: string, cardUid: string) => Promise<{ success: boolean; message: string }>;
  handleUnlinkCard: (studentId: string, reason?: 'lost' | 'returned') => Promise<void>;
  handleUpdateStudent: (studentId: string, payload: UpdateStudentPayload) => Promise<StudentRecord>;
  uploadStudentAvatar: (studentId: string, imageBase64: string) => Promise<string>;
  removeStudentAvatar: (studentId: string) => Promise<void>;
  loadStudents: () => Promise<void>;
}

export const useStudentsViewModel = (showArchived = false): UseStudentsViewModelReturn => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [unassignedPool, setUnassignedPool] = useState<InventoryCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<StudentSortField>('created_at');
  const [direction, setDirection] = useState<StudentSortDirection>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const archivedStudentIds = useMemo(() => students.filter((student) => Boolean(student.archived_at)).map((student) => student.id), [students]);
  const legacyArchiveMigrationStarted = useRef(false);
  const legacyCardMigrationStarted = useRef(false);

  const [lostCards, setLostCards] = useState<LostCardRecord[]>([]);

  // Drawer / Modal triggers
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isRapidScanOpen, setIsRapidScanOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [studentStats, setStudentStats] = useState<StudentRosterStats>({ active: 0, with_cards: 0, without_cards: 0, archived: 0 });
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const loadStudents = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError('');
    try {
      const [data, stats, inventory] = await Promise.all([
        studentService.getStudents(page, searchQuery.trim(), sort, direction, 25, showArchived),
        studentService.getRosterStats(),
        request.get<{cards: {id: string; uid: string; status: string; created_at: string; last_holder?: {student_name: string; student_number: string}}[]; total: number}>('/cards?limit=100'),
      ]);
      if (currentRequest === requestId.current) {
        setStudents(data.students);
        setTotal(data.total);
        setStudentStats(stats);
        setUnassignedPool(inventory.cards.filter(card => card.status === 'available').map((card, index) => ({ id: card.id, cardNumber: index + 1, uid: card.uid, status: 'unassigned' as const, registeredAt: card.created_at })));
        setLostCards(inventory.cards.filter(card => card.status === 'lost').map((card, index) => ({ id: card.id, cardNumber: index + 1, uid: card.uid, previousStudentName: card.last_holder?.student_name, previousStudentId: card.last_holder?.student_number, revokedAt: card.created_at, reason: 'lost' as const })));
      }
    } catch (err: any) {
      if (currentRequest === requestId.current) {
        setError(err?.response?.data?.error?.message || 'Could not load students. Try again.');
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [page, searchQuery, sort, direction, showArchived]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStudents();
    }, searchQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  useEffect(() => {
    if (legacyArchiveMigrationStarted.current) return;
    legacyArchiveMigrationStarted.current = true;
    let ids: string[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(ARCHIVED_STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) ids = parsed.filter((id): id is string => typeof id === 'string');
    } catch {
      return;
    }
    if (!ids.length) return;
    void Promise.allSettled(ids.map((id) => studentService.archiveStudent(id))).then((results) => {
      const failed = ids.filter((_, index) => results[index].status === 'rejected');
      if (failed.length) localStorage.setItem(ARCHIVED_STORAGE_KEY, JSON.stringify(failed));
      else localStorage.removeItem(ARCHIVED_STORAGE_KEY);
      if (failed.length) toast.error(`${failed.length} previously archived student${failed.length === 1 ? '' : 's'} could not be moved to the database.`);
      void loadStudents();
    });
  }, [loadStudents]);

  useEffect(() => {
    if (legacyCardMigrationStarted.current) return;
    legacyCardMigrationStarted.current = true;
    let legacy: LostCardRecord[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(LOST_CARDS_STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) legacy = parsed.filter((card): card is LostCardRecord => typeof card?.uid === 'string');
    } catch { return; }
    if (!legacy.length) return;
    void (async () => {
      const pending: LostCardRecord[] = [];
      for (const card of legacy) {
        try {
          const uid = card.uid.trim();
          const existing = await request.get<{ cards: { uid: string; status: string }[] }>(`/cards?q=${encodeURIComponent(uid)}&limit=100`);
          const match = existing.cards.find(item => item.uid.toUpperCase() === uid.toUpperCase());
          if (match?.status === 'lost') continue;
          if (match && match.status !== 'available') { pending.push(card); continue; }
          if (!match) await request.post(`/cards/${encodeURIComponent(uid)}/actions`, { action: 'register', note: 'Imported from previous browser card list' });
          await request.post(`/cards/${encodeURIComponent(uid)}/actions`, { action: 'lost', note: `Previous holder: ${card.previousStudentName || 'unknown'} (${card.previousStudentId || 'unknown'})` });
        } catch { pending.push(card); }
      }
      if (pending.length) {
        localStorage.setItem(LOST_CARDS_STORAGE_KEY, JSON.stringify(pending));
        toast.error(`${pending.length} older lost-card flag${pending.length === 1 ? '' : 's'} need review in RFID Cards.`);
      } else localStorage.removeItem(LOST_CARDS_STORAGE_KEY);
      void loadStudents();
    })();
  }, [loadStudents]);

  // Reorder the current page during the click, then replace it with the server's
  // correctly paginated result when the request completes.
  const filteredStudents = useMemo(() => [...students].sort((a, b) => {
    const left = a[sort];
    const right = b[sort];
    if (left == null && right == null) return a.id.localeCompare(b.id);
    if (left == null) return 1;
    if (right == null) return -1;
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return (direction === 'asc' ? comparison : -comparison) || a.id.localeCompare(b.id);
  }), [students, sort, direction]);

  // Combine assigned cards from real backend students + unassigned cards + lost cards
  const inventoryCards = useMemo<InventoryCard[]>(() => {
    const assignedFromStudents: InventoryCard[] = students
      .filter((s): s is StudentRecord & { rfid_uid: string } => Boolean(s.rfid_uid))
      .map((s, idx) => ({
        id: `assigned-${s.id}`,
        cardNumber: idx + 1,
        uid: s.rfid_uid,
        status: 'assigned' as const,
        assignedToStudentId: s.id,
        assignedToStudentName: s.name,
        registeredAt: s.created_at,
      }));

    const assignedUids = new Set(assignedFromStudents.map((c) => c.uid.toUpperCase()));
    const lostUids = new Set(lostCards.map((c) => c.uid.toUpperCase()));

    const remainingUnassigned = unassignedPool
      .filter((c) => !assignedUids.has(c.uid.toUpperCase()) && !lostUids.has(c.uid.toUpperCase()))
      .map((c, idx) => ({
        ...c,
        cardNumber: assignedFromStudents.length + idx + 1,
      }));

    const formattedLostCards: InventoryCard[] = lostCards.map((l, idx) => ({
      id: l.id,
      cardNumber: assignedFromStudents.length + remainingUnassigned.length + idx + 1,
      uid: l.uid,
      status: 'lost' as const,
      assignedToStudentId: l.previousStudentId,
      assignedToStudentName: l.previousStudentName,
      registeredAt: l.revokedAt,
    }));

    return [...remainingUnassigned, ...assignedFromStudents, ...formattedLostCards];
  }, [students, unassignedPool, lostCards]);

  // Unassigned cards available for pairing
  const unassignedCards = useMemo(
    () => inventoryCards.filter((c) => c.status === 'unassigned'),
    [inventoryCards]
  );

  // Students who do not have an RFID card paired yet
  const cardlessStudents = useMemo(
    () => students.filter((s) => !s.archived_at && !s.rfid_uid),
    [students]
  );

  // 1. Register Single Student
  const handleRegisterStudent = async (payload: RegisterStudentPayload) => {
    setIsSubmitting(true);
    try {
      const created = await studentService.registerStudent(payload);

      if (payload.rfid_uid) {
        setUnassignedPool((prev) =>
          prev.filter((c) => c.uid.toUpperCase() !== payload.rfid_uid?.toUpperCase())
        );
      }

      setIsAddDrawerOpen(false);
      toast.success(`Student "${created.name}" registered successfully!`);
      await loadStudents();
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to register student. Please try again.';
      toast.error(apiMsg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Scan & Pair to Single Student
  const handleCardScannedForStudent = async (studentId: string, uid: string) => {
    const clean = uid.trim().toUpperCase();

    // Check if card is already assigned to another student
    const alreadyAssignedStudent = students.find(
      (s) => s.rfid_uid?.trim().toUpperCase() === clean && s.id !== studentId
    );
    if (alreadyAssignedStudent) {
      const msg = `Card ${clean} is already assigned to ${alreadyAssignedStudent.name} (${alreadyAssignedStudent.student_id})!`;
      toast.error(msg);
      return { success: false, message: msg };
    }

    const targetStudent = students.find((s) => s.id === studentId);
    const previousUid = targetStudent?.rfid_uid;

    // Instant optimistic update (0ms UI transition to next student in queue)
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, rfid_uid: clean } : s))
    );
    setUnassignedPool((prev) => prev.filter((c) => c.uid.toUpperCase() !== clean));

    try {
      await studentService.updateStudent(studentId, { rfid_uid: clean });
      // Non-blocking background re-sync
      void loadStudents();
      return { success: true, message: `Card ${clean} successfully linked to student!` };
    } catch (err: any) {
      // Revert optimistic update on failure
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, rfid_uid: previousUid } : s))
      );
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to link card to student.';
      toast.error(apiMsg);
      return { success: false, message: apiMsg };
    }
  };

  // 4. Auto-Pair Available Stock to Students with Sequential Numbering
  const handleAutoPairSequential = async () => {
    const available = [...unassignedCards];
    const unlinked = [...cardlessStudents];
    const pairCount = Math.min(available.length, unlinked.length);

    if (pairCount === 0) {
      toast.info('No unassigned cards or cardless students available to pair.');
      return { pairedCount: 0 };
    }

    let successCount = 0;
    for (let i = 0; i < pairCount; i++) {
      try {
        await studentService.updateStudent(unlinked[i].id, { rfid_uid: available[i].uid });
        successCount++;
      } catch {
        // continue
      }
    }

    if (successCount > 0) {
      const pairedUids = new Set(available.slice(0, successCount).map((c) => c.uid.toUpperCase()));
      setUnassignedPool((prev) => prev.filter((c) => !pairedUids.has(c.uid.toUpperCase())));
      toast.success(`Auto-paired ${successCount} student${successCount === 1 ? '' : 's'} with RFID cards!`);
      await loadStudents();
    }

    return { pairedCount: successCount };
  };

  // 5. Bulk Import Students from CSV via real POST /api/v1/students
  const handleBulkImport = async (
    newRows: BulkImportStudentRow[],
    autoPair: boolean,
    onProgress?: (current: number, total: number) => void
  ) => {
    const available = [...unassignedCards];
    let cardIdx = 0;
    let successCount = 0;
    let failureCount = 0;
    let lastError = '';
    const usedUids = new Set<string>();

    const CONCURRENCY = 4;
    for (let i = 0; i < newRows.length; i += CONCURRENCY) {
      const chunk = newRows.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (row) => {
          let uid = row.rfid_uid || undefined;
          if (!uid && autoPair && cardIdx < available.length) {
            uid = available[cardIdx].uid;
            cardIdx++;
          }

          try {
            const cleanId = row.student_id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            await studentService.registerStudent({
              student_id: row.student_id.trim(),
              name: row.name.trim(),
              email: (row.email || `${cleanId}@ndmc.edu.ph`).trim().toLowerCase(),
              temporary_password: row.temporary_password || '',
              course: row.course || 'BS Information Technology',
              year_level: row.year_level || 1,
              rfid_uid: uid,
            });
            successCount++;
            if (uid) usedUids.add(uid.toUpperCase());
          } catch (err: any) {
            failureCount++;
            lastError = err?.response?.data?.error?.message || err?.message || 'Registration failed';
          }
        })
      );
      onProgress?.(Math.min(i + chunk.length, newRows.length), newRows.length);
    }

    if (usedUids.size > 0) {
      setUnassignedPool((prev) => prev.filter((c) => !usedUids.has(c.uid.toUpperCase())));
    }

    await loadStudents();

    if (successCount > 0 && failureCount === 0) {
      toast.success(`Imported ${successCount} student${successCount === 1 ? '' : 's'} to the backend!`);
    } else if (successCount > 0 && failureCount > 0) {
      toast.info(`Imported ${successCount} students; ${failureCount} failed (${lastError}).`);
    } else {
      toast.error(`Bulk import failed: ${lastError || 'Could not register students.'}`);
      throw new Error(lastError || 'Bulk import failed');
    }
  };

  // 6. Quick Inline Link & Unlink Card
  const handleQuickPair = async (studentId: string, cardUid: string): Promise<{ success: boolean; message: string }> => {
    return await handleCardScannedForStudent(studentId, cardUid);
  };

  const handleUnlinkCard = async (studentId: string, reason: 'lost' | 'returned' = 'returned') => {
    try {
      const targetStudent = students.find((s) => s.id === studentId);
      const oldUid = targetStudent?.rfid_uid;

      if (oldUid) await request.post(`/cards/${encodeURIComponent(oldUid)}/actions`, { action: reason === 'lost' ? 'lost' : 'return' });
      else await studentService.updateStudent(studentId, { rfid_uid: null });

      if (oldUid) {
        if (reason === 'returned') {
          toast.success(`Card ${oldUid} returned to available stock.`);
        } else {
          toast.success(`Card ${oldUid} reported lost and blocked from scanning.`);
        }
      } else {
        toast.success('Card unlinked successfully.');
      }

      await loadStudents();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to unlink card.';
      toast.error(msg);
    }
  };

  const handleRestoreLostCard = (uid: string) => {
    const cleaned = uid.trim().toUpperCase();
    void request.post(`/cards/${encodeURIComponent(cleaned)}/actions`, { action: 'restore' }).then(() => {
      toast.success(`Card ${cleaned} restored to available stock.`);
      void loadStudents();
    }).catch((error: any) => toast.error(error?.response?.data?.error?.message || 'Could not restore card.'));
  };

  const handleDeleteStudent = async (studentId: string): Promise<boolean> => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return false;

    try {
      await studentService.deleteStudent(studentId);

      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      toast.success(`Student "${student.name}" permanently deleted.`);
      await loadStudents();
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to delete student.';
      toast.error(msg);
      return false;
    }
  };

  const handleBulkStudentAction = async (studentIds: string[], action: BulkStudentAction) => {
    const targets = studentIds.map((id) => students.find((student) => student.id === id)).filter((student): student is StudentRecord => Boolean(student));
    const succeeded: string[] = [];
    const failed: string[] = [];
    const failures: { id: string; name: string; message: string }[] = [];
    let firstError = '';
    for (const student of targets) {
      try {
        if (action === 'delete') {
          await studentService.deleteStudent(student.id);
        } else if (action === 'archive') {
          await studentService.archiveStudent(student.id);
        } else if (student.rfid_uid) {
          await request.post(`/cards/${encodeURIComponent(student.rfid_uid)}/actions`, { action: 'return' });
        }
        succeeded.push(student.id);
      } catch (err: any) {
        failed.push(student.id);
        const message = err?.response?.data?.error?.message || err?.message || 'Action failed.';
        failures.push({ id: student.id, name: student.name, message });
        if (!firstError) firstError = message;
      }
    }

    if (action === 'delete' && succeeded.length) {
      setStudents((previous) => previous.filter((student) => !succeeded.includes(student.id)));
      setTotal((previous) => Math.max(0, previous - succeeded.length));
    }
    if (succeeded.length) await loadStudents();

    const label = action === 'unlink' ? 'returned' : action === 'archive' ? 'archived' : 'deleted';
    if (succeeded.length) toast.success(`${succeeded.length} student${succeeded.length === 1 ? '' : 's'} ${label}.`);
    if (failed.length) toast.error(`${failed.length} student${failed.length === 1 ? '' : 's'} failed. ${firstError}`);
    return { succeeded, failed, failures };
  };

  const handleArchiveStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return false;

    try {
      await studentService.archiveStudent(studentId);

      toast.success(`Student "${student.name}" archived. Attendance history preserved.`);
      await loadStudents();
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to archive student.';
      toast.error(msg);
      return false;
    }
  };

  const handleRestoreStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    try {
      await studentService.restoreStudent(studentId);

      toast.success(student ? `Student "${student.name}" restored to active roster.` : 'Student restored.');
      await loadStudents();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to restore student.';
      toast.error(msg);
    }
  };

  const handleUpdateStudent = async (studentId: string, payload: UpdateStudentPayload) => {
    setIsSubmitting(true);
    try {
      const updated = await studentService.updateStudent(studentId, payload);
      toast.success(`Student "${updated.name}" updated successfully!`);
      await loadStudents();
      return updated;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to update student.';
      toast.error(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadAvatar = async (studentId: string, imageBase64: string) => {
    setIsSubmitting(true);
    try {
      const res = await studentService.uploadAvatar(studentId, imageBase64);
      toast.success('Profile picture updated successfully!');
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, avatar_url: res.avatar_url } : s))
      );
      return res.avatar_url;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to upload profile picture.';
      toast.error(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAvatar = async (studentId: string): Promise<void> => {
    try {
      await studentService.removeAvatar(studentId);
      setStudents((previous) => previous.map((student) => student.id === studentId ? { ...student, avatar_url: null } : student));
      toast.success('Student photo removed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to remove student photo.');
      throw err;
    }
  };

  return {
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

    // Inventory Cards
    inventoryCards,
    unassignedCards,
    cardlessStudents,
    lostCards,

    // Drawers & Modals
    isAddDrawerOpen,
    setIsAddDrawerOpen,
    isRapidScanOpen,
    setIsRapidScanOpen,
    isBulkImportOpen,
    setIsBulkImportOpen,

    // Archiving
    archivedStudentIds,
    handleArchiveStudent,
    handleDeleteStudent,
    handleRestoreStudent,
    handleRestoreLostCard,
    handleBulkStudentAction,

    // Handlers
    handleRegisterStudent,
    handleCardScannedForStudent,
    handleAutoPairSequential,
    handleBulkImport,
    handleQuickPair,
    handleUnlinkCard,
    handleUpdateStudent,
    uploadStudentAvatar: handleUploadAvatar,
    removeStudentAvatar: handleRemoveAvatar,
    loadStudents,
  };
};
