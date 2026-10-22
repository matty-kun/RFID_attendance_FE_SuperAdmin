import { useState, useEffect, useCallback } from 'react';
import { AdminRecord } from '../models';
import { adminManagementService } from '../services';

export interface UseAdminsViewModelReturn {
  admins: AdminRecord[];
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  role: 'admin' | 'super_admin';
  setRole: (v: 'admin' | 'super_admin') => void;
  loadAdmins: () => Promise<void>;
  handleCreate: (e: React.FormEvent) => Promise<void>;
}

export const useAdminsViewModel = (): UseAdminsViewModelReturn => {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminManagementService.getAdmins();
      setAdmins(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newAdmin = await adminManagementService.createAdmin({ name, email, role });
      setAdmins((prev) => [...prev, newAdmin]);
      setIsModalOpen(false);
      setName('');
      setEmail('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    admins,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    name,
    setName,
    email,
    setEmail,
    role,
    setRole,
    loadAdmins,
    handleCreate,
  };
};
