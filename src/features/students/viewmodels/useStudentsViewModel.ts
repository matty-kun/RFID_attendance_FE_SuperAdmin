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
  const [course, setCourse] = useState('BS Information Technology');
  const [yearLevel, setYearLevel] = useState(1);
  const [rfidUid, setRfidUid] = useState('');

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await studentService.getStudents();
      setStudents(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        (s.rfid_uid && s.rfid_uid.toLowerCase().includes(q)) ||
        (s.course && s.course.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: RegisterStudentPayload = {
        student_id: studentId,
        name,
        email: email || undefined,
        course,
        year_level: yearLevel,
        rfid_uid: rfidUid || undefined,
      };
      const created = await studentService.registerStudent(payload);
      setStudents((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setStudentId('');
      setName('');
      setEmail('');
      setRfidUid('');
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
