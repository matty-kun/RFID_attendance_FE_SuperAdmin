import { useState, useEffect, useCallback } from 'react';
import { AdminRecord, AdminCheckpointActivityPage, UpdateAdminPayload } from '../models';
import { adminManagementService } from '../services';
import { toast } from '../../../context';
import { useAuth } from '../../auth/context/AuthContext';

export interface UseAdminsViewModelReturn {
  admins: AdminRecord[];
  isLoading: boolean;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isSubmitting: boolean;
  formError: string | null;
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
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
  loadAdmins: () => Promise<void>;
  handleCreate: (e: React.FormEvent) => Promise<void>;
  handleUpdateAdmin: (adminId: string, payload: UpdateAdminPayload) => Promise<boolean>;
  handleArchiveAdmin: (adminId: string) => Promise<boolean>;
  handleRestoreAdmin: (adminId: string) => Promise<boolean>;
  deletingAdmin: AdminRecord | null;
  setDeletingAdmin: (admin: AdminRecord | null) => void;
  handleDeleteAdmin: (adminId: string) => Promise<boolean>;
  uploadAdminAvatar: (adminId: string, image: string) => Promise<string>;
  removeAdminAvatar: (adminId: string) => Promise<void>;
  loadAdminCheckpointActivity: (adminId: string, page: number) => Promise<AdminCheckpointActivityPage>;
}

export const useAdminsViewModel = (): UseAdminsViewModelReturn => {
  const { user, refreshUser } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Edit / Delete state
  const [deletingAdmin, setDeletingAdmin] = useState<AdminRecord | null>(null);

  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await adminManagementService.getAdmins(page, searchQuery.trim(), showArchived);
      setAdmins(data.admins);
      setTotal(data.total);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Could not load administrators. Try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, showArchived]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadAdmins(); }, 250);
    return () => clearTimeout(timer);
  }, [loadAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Full name and email address are required.');
      return;
    }
    if (temporaryPassword.length < 12) {
      setFormError('Temporary password must be at least 12 characters.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await adminManagementService.createAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        temporary_password: temporaryPassword,
      });
      toast.success(`Admin "${name.trim()}" registered successfully.`);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setTemporaryPassword('');
      await loadAdmins();
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to register administrator.';
      setFormError(apiMsg);
      toast.error(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAdmin = async (adminId: string, payload: UpdateAdminPayload): Promise<boolean> => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await adminManagementService.updateAdmin(adminId, payload);
      toast.success('Administrator updated successfully.');
      await loadAdmins();
      return true;
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to update administrator.';
      setFormError(apiMsg);
      toast.error(apiMsg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveAdmin = async (adminId: string): Promise<boolean> => {
    try {
      await adminManagementService.archiveAdmin(adminId);
      toast.success('Administrator archived. Login access disabled.');
      await loadAdmins();
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to archive administrator.');
      return false;
    }
  };

  const handleRestoreAdmin = async (adminId: string): Promise<boolean> => {
    try {
      await adminManagementService.restoreAdmin(adminId);
      toast.success('Administrator restored. Login access enabled.');
      await loadAdmins();
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to restore administrator.');
      return false;
    }
  };

  const handleDeleteAdmin = async (adminId: string): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      await adminManagementService.deleteAdmin(adminId);
      toast.success('Administrator deleted successfully.');
      setDeletingAdmin(null);
      await loadAdmins();
      return true;
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to delete administrator.';
      toast.error(apiMsg);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAdminAvatar = async (adminId: string, image: string): Promise<string> => {
    try {
      const { avatar_url } = await adminManagementService.uploadAvatar(adminId, image);
      setAdmins((previous) => previous.map((admin) => admin.id === adminId ? { ...admin, avatar_url } : admin));
      if (user?.id === adminId) await refreshUser();
      toast.success('Administrator profile picture updated.');
      return avatar_url;
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to upload administrator photo.');
      throw err;
    }
  };

  const removeAdminAvatar = async (adminId: string): Promise<void> => {
    try {
      await adminManagementService.removeAvatar(adminId);
      setAdmins((previous) => previous.map((admin) => admin.id === adminId ? { ...admin, avatar_url: null } : admin));
      if (user?.id === adminId) await refreshUser();
      toast.success('Administrator photo removed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to remove administrator photo.');
      throw err;
    }
  };

  const loadAdminCheckpointActivity = useCallback((adminId: string, page: number) =>
    adminManagementService.getCheckpointActivity(adminId, page), []);

  return {
    admins,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    formError,
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
    showArchived,
    setShowArchived,
    loadAdmins,
    handleCreate,
    handleUpdateAdmin,
    handleArchiveAdmin,
    handleRestoreAdmin,
    deletingAdmin,
    setDeletingAdmin,
    handleDeleteAdmin,
    uploadAdminAvatar,
    removeAdminAvatar,
    loadAdminCheckpointActivity,
  };
};
