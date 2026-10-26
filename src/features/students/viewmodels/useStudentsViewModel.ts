import { useState, useEffect, useCallback, useMemo } from 'react';
import type { StudentRecord, RegisterStudentPayload, InventoryCard, BulkImportStudentRow } from '../models';
import { studentService } from '../services';
import { toast } from '../../../context';

export interface UseStudentsViewModelReturn {
  students: StudentRecord[];
  filteredStudents: StudentRecord[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  page: number;
  setPage: (v: number) => void;
  total: number;
  error: string;

  // Inventory Cards State
  inventoryCards: InventoryCard[];
  unassignedCards: InventoryCard[];
  cardlessStudents: StudentRecord[];

  // Modals & Drawers
  isAddDrawerOpen: boolean;
  setIsAddDrawerOpen: (v: boolean) => void;
  isRapidScanOpen: boolean;
  setIsRapidScanOpen: (v: boolean) => void;
  isBulkImportOpen: boolean;
  setIsBulkImportOpen: (v: boolean) => void;

  // Actions
  handleRegisterStudent: (payload: RegisterStudentPayload) => Promise<void>;
  handleCardScannedForInventory: (uid: string) => { success: boolean; message: string; cardNumber?: number };
  handleCardScannedForStudent: (studentId: string, uid: string) => { success: boolean; message: string };
  handleAutoPairSequential: () => { pairedCount: number };
  handleBulkImport: (newStudents: BulkImportStudentRow[], autoPair: boolean) => Promise<void>;
  handleQuickPair: (studentId: string, cardUid: string) => void;
  handleUnlinkCard: (studentId: string) => void;
  loadStudents: () => Promise<void>;
}

export const useStudentsViewModel = (): UseStudentsViewModelReturn => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [unassignedPool, setUnassignedPool] = useState<InventoryCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drawer / Modal triggers
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isRapidScanOpen, setIsRapidScanOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await studentService.getStudents(page, searchQuery.trim());
      setStudents(data.students);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not load students. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  const filteredStudents = useMemo(() => students, [students]);

  // Combine assigned cards from real backend students with unassigned cards scanned into the pool
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
    const remainingUnassigned = unassignedPool
      .filter((c) => !assignedUids.has(c.uid.toUpperCase()))
      .map((c, idx) => ({
        ...c,
        cardNumber: assignedFromStudents.length + idx + 1,
      }));

    return [...remainingUnassigned, ...assignedFromStudents];
  }, [students, unassignedPool]);

  const unassignedCards = useMemo(
    () => inventoryCards.filter((c) => c.status === 'unassigned'),
    [inventoryCards]
  );

  const cardlessStudents = useMemo(
    () => students.filter((s) => !s.rfid_uid),
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Rapid Scan for Blank Inventory Card Pool
  const handleCardScannedForInventory = (uid: string) => {
    const clean = uid.trim().toUpperCase();

    const existsInInventory = inventoryCards.some((c) => c.uid.toUpperCase() === clean);
    if (existsInInventory) {
      return { success: false, message: `Card ${clean} is already registered in inventory!` };
    }

    const existingStudent = students.find((s) => s.rfid_uid?.toUpperCase() === clean);
    if (existingStudent) {
      return {
        success: false,
        message: `Card ${clean} is already assigned to ${existingStudent.name}!`,
      };
    }

    const nextCardNum = inventoryCards.length + 1;
    const newCard: InventoryCard = {
      id: `inv-${Date.now()}`,
      cardNumber: nextCardNum,
      uid: clean,
      status: 'unassigned',
      registeredAt: new Date().toISOString(),
    };

    setUnassignedPool((prev) => [newCard, ...prev]);
    return {
      success: true,
      message: `Card #${nextCardNum} (${clean}) saved to inventory pool for new student registration!`,
      cardNumber: nextCardNum,
    };
  };

  // 3. Rapid Scan to Existing Student Queue
  const handleCardScannedForStudent = (_studentId: string, uid: string) => {
    const clean = uid.trim().toUpperCase();
    // Save card into the unassigned pool and notify that existing student updates require PATCH /students/:id
    handleCardScannedForInventory(clean);
    const msg = `Card ${clean} added to pool. Assigning cards to already-registered students requires a backend student update endpoint (assign during student creation instead).`;
    toast.error(msg);
    return { success: false, message: msg };
  };

  // 4. One-Click Sequential Auto-Pairing
  const handleAutoPairSequential = () => {
    toast.error('Auto-pairing cards to already-registered students is not supported by the current backend API. Pair cards during New Student Registration or Bulk CSV Import.');
    return { pairedCount: 0 };
  };

  // 5. Bulk Import Students from CSV via real POST /api/v1/students
  const handleBulkImport = async (
    newRows: BulkImportStudentRow[],
    autoPair: boolean
  ) => {
    const available = [...unassignedCards];
    let cardIdx = 0;
    let successCount = 0;
    let failureCount = 0;
    let lastError = '';
    const usedUids = new Set<string>();

    for (const row of newRows) {
      let uid = row.rfid_uid || undefined;
      if (!uid && autoPair && cardIdx < available.length) {
        uid = available[cardIdx].uid;
        cardIdx++;
      }

      try {
        await studentService.registerStudent({
          student_id: row.student_id.trim(),
          name: row.name.trim(),
          email: (row.email || `${row.student_id}@university.edu`).trim().toLowerCase(),
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
  const handleQuickPair = (studentId: string, cardUid: string) => {
    handleCardScannedForStudent(studentId, cardUid);
  };

  const handleUnlinkCard = (_studentId: string) => {
    toast.error('Unlinking an RFID card from an existing student is not supported by the current backend API.');
  };

  return {
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

    // Inventory Cards
    inventoryCards,
    unassignedCards,
    cardlessStudents,

    // Drawers & Modals
    isAddDrawerOpen,
    setIsAddDrawerOpen,
    isRapidScanOpen,
    setIsRapidScanOpen,
    isBulkImportOpen,
    setIsBulkImportOpen,

    // Handlers
    handleRegisterStudent,
    handleCardScannedForInventory,
    handleCardScannedForStudent,
    handleAutoPairSequential,
    handleBulkImport,
    handleQuickPair,
    handleUnlinkCard,
    loadStudents,
  };
};
