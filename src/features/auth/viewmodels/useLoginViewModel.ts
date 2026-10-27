import { useState } from 'react';
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
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter your Super Admin email and password.');
      return;
    }
    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.error?.message || err?.message;
      setError(serverMessage || 'Invalid credentials');
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
