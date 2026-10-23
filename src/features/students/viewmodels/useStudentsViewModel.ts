import { useState, useEffect, useCallback, useMemo } from 'react';
import { StudentRecord, RegisterStudentPayload } from '../models';
import { studentService } from '../services';

export interface UseStudentsViewModelReturn {
  students: StudentRecord[];
  filteredStudents: StudentRecord[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  studentId: string;
  setStudentId: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  temporaryPassword: string;
  setTemporaryPassword: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  total: number;
  error: string;
  course: string;
  setCourse: (v: string) => void;
  yearLevel: number;
  setYearLevel: (v: number) => void;
  rfidUid: string;
  setRfidUid: (v: string) => void;
  loadStudents: () => Promise<void>;
  handleRegister: (e: React.FormEvent) => Promise<void>;
}

export const useStudentsViewModel = (): UseStudentsViewModelReturn => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [course, setCourse] = useState('BS Information Technology');
  const [yearLevel, setYearLevel] = useState(1);
  const [rfidUid, setRfidUid] = useState('');

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await studentService.getStudents(page, searchQuery.trim());
      setStudents(data.students);
      setTotal(data.total);
    } catch {
      setError('Could not load students. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadStudents(); }, 250);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  const filteredStudents = useMemo(() => students, [students]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: RegisterStudentPayload = {
        student_id: studentId,
        name,
        email,
        temporary_password: temporaryPassword,
        course,
        year_level: yearLevel,
        rfid_uid: rfidUid || undefined,
      };
      const created = await studentService.registerStudent(payload);
      setStudents((prev) => [created, ...prev].slice(0, 25));
      setTotal((previous) => previous + 1);
      setIsModalOpen(false);
      setStudentId('');
      setName('');
      setEmail('');
      setTemporaryPassword('');
      setRfidUid('');
    } catch {
      // Keep the form open so the user can correct the request or retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    students,
    filteredStudents,
    searchQuery,
    setSearchQuery,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    studentId,
    setStudentId,
    name,
    setName,
    email,
    setEmail,
    temporaryPassword,
    setTemporaryPassword,
    page,
    setPage,
    total,
    error,
    course,
    setCourse,
    yearLevel,
    setYearLevel,
    rfidUid,
    setRfidUid,
    loadStudents,
    handleRegister,
  };
};
