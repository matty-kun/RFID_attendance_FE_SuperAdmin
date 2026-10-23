import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface UseLoginViewModelReturn {
  identifier: string;
  setIdentifier: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export const useLoginViewModel = (): UseLoginViewModelReturn => {
  const navigate = useNavigate();
  const { login, enterPreview } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (import.meta.env.DEV && !identifier.trim() && !password) {
      enterPreview();
      navigate('/overview');
      return;
    }
    if (!identifier.trim() || !password) {
      setError('Enter your Super Admin email and password.');
      return;
    }
    setIsLoading(true);

    try {
      const user = await login(identifier.trim(), password);
      navigate(user.must_change_password ? '/change-password' : '/');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Invalid credentials or access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    isLoading,
    error,
    clearError,
    handleSubmit,
  };
};
