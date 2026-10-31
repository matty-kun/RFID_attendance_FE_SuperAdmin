import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { request } from '../services/apiClient';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export function FirstLoginPasswordPage() {
  const navigate = useNavigate();
  const { isLoading, user, logout, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="min-h-screen grid place-items-center text-slate-500">Checking account…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to="/overview" replace />;

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!currentPassword) {
      errors.currentPassword = 'Enter the temporary password you received.';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters long.';
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'New password cannot be identical to your temporary password.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please re-type.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setGeneralError('');
    try {
      await request.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      try {
        await refreshUser();
        navigate('/overview', { replace: true });
      } catch {
        logout();
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
      const lower = (apiMessage || '').toLowerCase();
      if (lower.includes('current') || lower.includes('incorrect') || lower.includes('temporary')) {
        setFieldErrors((prev) => ({
          ...prev,
          currentPassword: apiMessage || 'Incorrect temporary password.',
        }));
      } else {
        setGeneralError(apiMessage || (err instanceof Error ? err.message : 'Could not change password. Try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl">
        <h1 className="text-2xl font-black">Set your password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your account uses a temporary password. Change it before entering the Super Admin portal.
        </p>

        {generalError && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-900/30 border border-rose-800/50 p-3 text-xs font-semibold text-rose-200">
            {generalError}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            label="Temporary Password"
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
            }}
            error={fieldErrors.currentPassword}
            required
          />

          <Input
            label="New Password (min 8 chars)"
            type="password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
            }}
            error={fieldErrors.newPassword}
            minLength={8}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={fieldErrors.confirmPassword}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>
            Change password
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 text-xs font-semibold text-slate-400 hover:text-white transition-colors underline"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
