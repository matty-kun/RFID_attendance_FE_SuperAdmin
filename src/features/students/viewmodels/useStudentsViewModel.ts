import { useState, useEffect, useCallback, useMemo } from 'react';
import type { StudentRecord, RegisterStudentPayload, InventoryCard, BulkImportStudentRow } from '../models';
import { studentService } from '../services';
import { isDevPreview } from '../../auth/devPreview';
import { previewStudents, previewInventoryCards } from '../models/previewStudents';
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
  const [inventoryCards, setInventoryCards] = useState<InventoryCard[]>(previewInventoryCards);
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
      const data = isDevPreview()
        ? (() => {
            const match = previewStudents.filter((student) =>
              `${student.name} ${student.student_id} ${student.email} ${student.course} ${student.rfid_uid}`
                .toLowerCase()
                .includes(searchQuery.trim().toLowerCase())
            );
            return { students: match.slice((page - 1) * 25, page * 25), total: match.length };
          })()
        : await studentService.getStudents(page, searchQuery.trim());

      setStudents(data.students);
      setTotal(data.total);
    } catch {
      setError('Could not load students. Try again.');
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
      const created: StudentRecord = isDevPreview()
        ? {
            id: `preview-${Date.now()}`,
            student_id: payload.student_id,
            name: payload.name,
            email: payload.email,
            course: payload.course || 'BS Information Technology',
            year_level: payload.year_level || 1,
            rfid_uid: payload.rfid_uid || null,
            created_at: new Date().toISOString(),
          }
        : await studentService.registerStudent(payload);

      if (isDevPreview()) previewStudents.unshift(created);

      // If an RFID card was bound, update inventory card status
      if (payload.rfid_uid) {
        setInventoryCards((prev) =>
          prev.map((c) =>
            c.uid.toLowerCase() === payload.rfid_uid?.toLowerCase()
              ? {
                  ...c,
                  status: 'assigned',
                  assignedToStudentId: created.id,
                  assignedToStudentName: created.name,
                }
              : c
          )
        );
      }

      setStudents((prev) => [created, ...prev]);
      setTotal((prev) => prev + 1);
      setIsAddDrawerOpen(false);
      toast.success(`Student "${created.name}" registered successfully!`);
    } catch {
      toast.error('Failed to register student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Rapid Scan for Blank Inventory Card Pool
  const handleCardScannedForInventory = (uid: string) => {
    const clean = uid.trim().toUpperCase();

    // Check duplicate in inventory
    const existsInInventory = inventoryCards.some((c) => c.uid.toUpperCase() === clean);
    if (existsInInventory) {
      return { success: false, message: `Card ${clean} is already registered in inventory!` };
    }

    // Check duplicate in active students
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

    setInventoryCards((prev) => [newCard, ...prev]);
    return {
      success: true,
      message: `Card #${nextCardNum} (${clean}) saved to inventory pool!`,
      cardNumber: nextCardNum,
    };
  };

  // 3. Rapid Scan to Student Queue (Stream directly to next student)
  const handleCardScannedForStudent = (studentId: string, uid: string) => {
    const clean = uid.trim().toUpperCase();

    // Check duplicate in students
    const isUsed = students.some((s) => s.id !== studentId && s.rfid_uid?.toUpperCase() === clean);
    if (isUsed) {
      return { success: false, message: `Card ${clean} is already assigned to another student!` };
    }

    // Link card to student
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, rfid_uid: clean } : s))
    );

    // Also update or add card in inventory
    setInventoryCards((prev) => {
      const existing = prev.find((c) => c.uid.toUpperCase() === clean);
      const student = students.find((s) => s.id === studentId);
      if (existing) {
        return prev.map((c) =>
          c.uid.toUpperCase() === clean
            ? {
                ...c,
                status: 'assigned',
                assignedToStudentId: studentId,
                assignedToStudentName: student?.name,
              }
            : c
        );
      }
      return [
        {
          id: `inv-${Date.now()}`,
          cardNumber: prev.length + 1,
          uid: clean,
          status: 'assigned',
          assignedToStudentId: studentId,
          assignedToStudentName: student?.name,
          registeredAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });

    return { success: true, message: `Card ${clean} assigned!` };
  };

  // 4. One-Click Sequential Auto-Pairing
  const handleAutoPairSequential = () => {
    const available = inventoryCards.filter((c) => c.status === 'unassigned');
    const uncarded = students.filter((s) => !s.rfid_uid);

    if (available.length === 0) {
      toast.error('No unassigned inventory cards available. Scan cards into the pool first.');
      return { pairedCount: 0 };
    }

    if (uncarded.length === 0) {
      toast.info('All students already have assigned cards!');
      return { pairedCount: 0 };
    }

    const pairCount = Math.min(available.length, uncarded.length);
    const updatedStudents = [...students];
    const updatedInventory = [...inventoryCards];

    for (let i = 0; i < pairCount; i++) {
      const student = uncarded[i];
      const card = available[i];

      // Update student
      const sIdx = updatedStudents.findIndex((s) => s.id === student.id);
      if (sIdx !== -1) {
        updatedStudents[sIdx] = { ...updatedStudents[sIdx], rfid_uid: card.uid };
      }

      // Update inventory card
      const cIdx = updatedInventory.findIndex((c) => c.id === card.id);
      if (cIdx !== -1) {
        updatedInventory[cIdx] = {
          ...updatedInventory[cIdx],
          status: 'assigned',
          assignedToStudentId: student.id,
          assignedToStudentName: student.name,
        };
      }
    }

    setStudents(updatedStudents);
    setInventoryCards(updatedInventory);
    toast.success(`Sequentially paired ${pairCount} cards to ${pairCount} students!`);
    return { pairedCount: pairCount };
  };

  // 5. Bulk Import Students from CSV
  const handleBulkImport = async (
    newRows: BulkImportStudentRow[],
    autoPair: boolean
  ) => {
    const available = inventoryCards.filter((c) => c.status === 'unassigned');
    let cardIdx = 0;

    const importedStudents: StudentRecord[] = newRows.map((row, index) => {
      let uid = row.rfid_uid || null;

      // If auto-pairing requested and cards available in pool
      if (!uid && autoPair && cardIdx < available.length) {
        uid = available[cardIdx].uid;
        cardIdx++;
      }

      return {
        id: `import-${Date.now()}-${index}`,
        student_id: row.student_id,
        name: row.name,
        email: row.email || `${row.student_id}@university.edu`,
        course: row.course || 'BS Information Technology',
        year_level: row.year_level || 1,
        rfid_uid: uid,
        created_at: new Date().toISOString(),
      };
    });

    // Mark used inventory cards as assigned
    if (cardIdx > 0) {
      const usedUids = new Set(importedStudents.map((s) => s.rfid_uid).filter(Boolean));
      setInventoryCards((prev) =>
        prev.map((c) => {
          if (usedUids.has(c.uid)) {
            const matched = importedStudents.find((s) => s.rfid_uid === c.uid);
            return {
              ...c,
              status: 'assigned',
              assignedToStudentId: matched?.id,
              assignedToStudentName: matched?.name,
            };
          }
          return c;
        })
      );
    }

    setStudents((prev) => [...importedStudents, ...prev]);
    setTotal((prev) => prev + importedStudents.length);
  };

  // 6. Quick Inline Link & Unlink Card
  const handleQuickPair = (studentId: string, cardUid: string) => {
    handleCardScannedForStudent(studentId, cardUid);
  };

  const handleUnlinkCard = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student || !student.rfid_uid) return;

    const cardUid = student.rfid_uid;
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, rfid_uid: null } : s))
    );

    setInventoryCards((prev) =>
      prev.map((c) =>
        c.uid.toUpperCase() === cardUid.toUpperCase()
          ? {
              ...c,
              status: 'unassigned',
              assignedToStudentId: null,
              assignedToStudentName: null,
            }
          : c
      )
    );

    toast.info(`Card unlinked from ${student.name}. Card returned to unassigned inventory pool.`);
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
