import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../../utils/cn';

export interface TargetAccountInfo {
  id: string;
  name: string;
  email?: string | null;
  identifier?: string | null;
  type: 'Student' | 'Admin';
  avatarUrl?: string | null;
}

export interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: TargetAccountInfo | null;
  onReset: (id: string, newPassword: string) => Promise<boolean | void>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  account,
  onReset,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsSubmitting(false);
      setGeneralError(null);
      setFieldErrors({});
    }
  }, [isOpen, account?.id]);

  // Real-time requirement evaluation
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9\s]/.test(newPassword);
  const isAllRequirementsMet = hasMinLength && hasNumber && hasSpecialChar;

  const requirements = [
    {
      id: 'length',
      label: 'At least 8 characters long',
      isMet: hasMinLength,
    },
    {
      id: 'number',
      label: 'Contains at least one number (0–9)',
      isMet: hasNumber,
    },
    {
      id: 'special',
      label: 'Contains at least one special character (e.g., !, @, #, $, %)',
      isMet: hasSpecialChar,
    },
  ];

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      errors.newPassword = 'New password is required.';
    } else if (!hasMinLength) {
      errors.newPassword = 'Password must be at least 8 characters long.';
    } else if (!hasNumber) {
      errors.newPassword = 'Password must contain at least one number (0–9).';
    } else if (!hasSpecialChar) {
      errors.newPassword = 'Password must contain at least one special character (e.g., !, @, #, $, %).';
    } else if (newPassword.length > 128) {
      errors.newPassword = 'Password cannot exceed 128 characters.';
    }

    if (!trimmedConfirm) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please re-enter.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !account) return;

    if (!validate() || !isAllRequirementsMet) {
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const result = await onReset(account.id, newPassword);
      // If result is explicitly false, viewmodel/caller handled failure
      if (result !== false) {
        onClose();
      }
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to reset password. Please check your network and try again.';
      setGeneralError(apiMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = account?.name
    ? account.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : '';

  return (
    <Modal
      isOpen={isOpen && Boolean(account)}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Reset ${account?.type ?? 'User'} Password`}
      description="Assign a secure replacement password in Supabase Authentication."
      maxWidth="md"
      zIndex={700}
    >
      {account && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
          {/* Account Identification Card */}
          <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#756883] mb-2">
              {account.type === 'Student' ? 'Selected Student' : 'Selected Account'}
            </p>
            <div className="flex items-center gap-3">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  alt={account.name}
                  className="h-11 w-11 shrink-0 rounded-full object-cover border border-[#E5E0EB]"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F2E9FC] text-sm font-bold text-[#7026B7]">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="truncate text-sm font-extrabold text-[#24133F]">
                    {account.name}
                  </h3>
                  {account.identifier && (
                    <span className="font-mono text-xs font-semibold text-[#756883]">
                      {account.identifier}
                    </span>
                  )}
                </div>
                {account.email && (
                  <p className="truncate text-xs font-medium text-[#756883] mt-0.5">
                    {account.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {generalError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 animate-in fade-in duration-150"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="space-y-3">
            <Input
              id="new-password-input"
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter at least 8 characters"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                }
              }}
              error={fieldErrors.newPassword}
              disabled={isSubmitting}
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            {/* Real-Time Password Requirements Checklist */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Password Requirements
              </p>
              <ul className="space-y-1.5" aria-label="Password requirements checklist">
                {requirements.map((req) => (
                  <li
                    key={req.id}
                    className={cn(
                      'flex items-center gap-2.5 text-xs transition-colors duration-150',
                      req.isMet ? 'text-emerald-700 font-medium' : 'text-slate-500'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150',
                        req.isMet
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300'
                      )}
                      data-testid={`req-${req.id}`}
                      aria-label={req.isMet ? `${req.label} satisfied` : `${req.label} not satisfied`}
                    >
                      {req.isMet && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                    <span>{req.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Input
              id="confirm-password-input"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              error={fieldErrors.confirmPassword}
              disabled={isSubmitting}
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              Reset Password
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default ResetPasswordModal;
