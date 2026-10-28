import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Loader2,
  UserX,
  ShieldAlert,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import type { AdminRecord } from '../models';

export interface DeleteAdminConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminRecord | null;
  onConfirmDelete: (adminId: string) => Promise<boolean>;
}

export const DeleteAdminConfirmationModal: React.FC<DeleteAdminConfirmationModalProps> = ({
  isOpen,
  onClose,
  admin,
  onConfirmDelete,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setIsDeleting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!admin) return null;

  const targetIdentifier = admin.email.toLowerCase();
  const isMatch = confirmInput.trim().toLowerCase() === targetIdentifier;

  const initials = admin.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      const success = await onConfirmDelete(admin.id);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message || err?.message || 'Failed to delete administrator.';
      setError(apiMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title="Delete administrator account"
      description="Permanent removal of administrator account and login credentials."
      maxWidth="md"
    >
      <div className="space-y-4 pt-1 text-[#24133F]">
        {/* Error Alert if Deletion Blocked */}
        {error && (
          <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 animate-in fade-in leading-relaxed">
            {error}
          </div>
        )}

        {/* Admin Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DFE8F8] text-xs font-black text-[#294B85]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#24133F] truncate">{admin.name}</p>
              <p className="text-xs text-[#756883] truncate">{admin.email}</p>
            </div>
          </div>

          <span className="shrink-0 rounded-md bg-[#F4EFFB] px-2 py-0.5 text-[10px] font-bold text-[#7026B7] border border-[#E9D5FF] flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>{admin.role === 'super_admin' ? 'Super Admin' : 'Scanner Admin'}</span>
          </span>
        </div>

        {/* Consequences Card */}
        <div className="rounded-2xl border border-rose-200/90 bg-[#FFF5F5] p-3.5 space-y-2.5 text-xs text-rose-950">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-[#EF3340] shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <p className="text-xs font-extrabold text-[#B91C2A] uppercase tracking-wider">
              Permanent Deletion Notice
            </p>
          </div>

          <div className="space-y-2 pt-0.5">
            <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#7A1C25]">
              <UserX className="h-4 w-4 shrink-0 text-[#EF3340] mt-0.5" />
              <span>
                Administrator record and Supabase login account (<code className="font-mono font-bold text-[#24133F]">{admin.email}</code>) will be permanently deleted.
              </span>
            </div>

            <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#7A1C25]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#EF3340] mt-0.5" />
              <span>
                <strong>Audit trail protection:</strong> If this administrator has recorded attendance scans or created events, deletion will be rejected by the database to preserve history.
              </span>
            </div>
          </div>
        </div>

        {/* Intentional Confirmation Input */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#24133F]">
              To confirm, type email <strong className="font-mono font-bold text-[#EF3340] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 select-all">{admin.email}</strong> below:
            </label>
            {isMatch && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Matched
              </span>
            )}
          </div>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type ${admin.email} to confirm`}
            autoFocus
            disabled={isDeleting}
            className={`font-mono text-xs transition-all ${
              isMatch
                ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 focus:border-emerald-600'
                : 'border-slate-200'
            }`}
            rightElement={
              isMatch ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : undefined
            }
          />
        </div>

        {/* Action Buttons with 3D tactile feedback */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            leftIcon={
              isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )
            }
          >
            {isDeleting ? 'Deleting admin...' : 'Delete Admin'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteAdminConfirmationModal;
