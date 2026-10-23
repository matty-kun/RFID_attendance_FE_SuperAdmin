import { useState, useEffect, useCallback } from 'react';
import { AdminRecord } from '../models';
import { adminManagementService } from '../services';
import { isDevPreview } from '../../auth/devPreview';
import { previewAdmins } from '../models/previewAdmins';

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
  temporaryPassword: string;
  setTemporaryPassword: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  total: number;
  error: string;
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
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = isDevPreview() ? (() => {
        const matching = previewAdmins.filter((admin) => `${admin.name} ${admin.email} ${admin.role}`.toLowerCase().includes(searchQuery.trim().toLowerCase()));
        return { admins: matching.slice((page - 1) * 25, page * 25), total: matching.length };
      })() : await adminManagementService.getAdmins(page, searchQuery.trim());
      setAdmins(data.admins);
      setTotal(data.total);
    } catch {
      setError('Could not load administrators. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadAdmins(); }, 250);
    return () => clearTimeout(timer);
  }, [loadAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newAdmin: AdminRecord = isDevPreview() ? {
        id: `preview-admin-${Date.now()}`,
        auth_user_id: `preview-auth-${Date.now()}`,
        name, email, role, created_at: new Date().toISOString(),
      } : await adminManagementService.createAdmin({ name, email, role, temporary_password: temporaryPassword });
      if (isDevPreview()) previewAdmins.unshift(newAdmin);
      setAdmins((prev) => [newAdmin, ...prev].slice(0, 25));
      setTotal((previous) => previous + 1);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setTemporaryPassword('');
    } catch {
      // The shared API error banner shows the server error; keep the form open.
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
    temporaryPassword,
    setTemporaryPassword,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    total,
    error,
    loadAdmins,
    handleCreate,
  };
};
