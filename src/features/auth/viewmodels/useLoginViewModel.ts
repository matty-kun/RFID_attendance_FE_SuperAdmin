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
  handleQuickDemo: () => void;
}

export const useLoginViewModel = (): UseLoginViewModelReturn => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('superadmin');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Invalid credentials or access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setIdentifier('superadmin');
    setPassword('password123');
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
    handleQuickDemo,
  };
};
