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
      const user = await login(identifier.trim(), password);
      navigate(user.must_change_password ? '/change-password' : '/');
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error?.code;
      const serverMessage = err?.response?.data?.error?.message || err?.message;

      if (
        status === 401 ||
        code === 'invalid_credentials' ||
        /student id/i.test(serverMessage || '')
      ) {
        setError('Invalid credentials');
      } else {
        setError(serverMessage || 'Invalid credentials');
      }
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
