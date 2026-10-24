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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="min-h-screen grid place-items-center text-slate-500">Checking account…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to="/overview" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword !== confirmPassword || newPassword === currentPassword) {
      setError('Use a different password of at least 8 characters and confirm it.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await request.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      try {
        await refreshUser();
        navigate('/overview', { replace: true });
      } catch {
        logout();
        navigate('/login', { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not change password. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="min-h-screen grid place-items-center bg-slate-950 p-6">
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl">
      <h1 className="text-2xl font-black">Set your password</h1>
      <p className="mt-2 text-sm text-slate-400">Your account uses a temporary password. Change it before entering the Super Admin portal.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-900/30 p-3 text-sm text-rose-200">{error}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input label="Temporary Password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
        <Input label="New Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
        <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        <Button type="submit" variant="primary" className="w-full" isLoading={submitting}>Change password</Button>
      </form>
      <button type="button" className="mt-4 text-sm text-slate-400 underline" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Sign out</button>
    </div>
  </div>;
}
