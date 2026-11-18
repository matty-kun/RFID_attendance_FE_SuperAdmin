import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../../services/apiClient';

export interface UseLoginViewModelReturn {
  identifier: string;
  setIdentifier: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  identifierError: boolean;
  passwordError: boolean;
  clearError: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export const useLoginViewModel = (): UseLoginViewModelReturn => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const clearError = () => {
    setError(null);
    setIdentifierError(false);
    setPasswordError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier && !password) {
      setError('Please enter your Admin ID and password.');
      setIdentifierError(true);
      setPasswordError(true);
      return;
    }

    if (!cleanIdentifier) {
      setError('Please enter your Admin ID.');
      setIdentifierError(true);
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      setPasswordError(true);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setPasswordError(true);
      return;
    }

    setIsLoading(true);

    try {
      await login(cleanIdentifier, password);
    } catch (err: any) {
      let serverMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        (typeof err?.response?.data?.error === 'string' ? err?.response?.data?.error : null) ||
        err?.message ||
        'Invalid credentials.';

      const isAxios = axios.isAxiosError(err);
      const isTimeout =
        err?.code === 'ECONNABORTED' ||
        err?.message?.toLowerCase().includes('timeout');
      const isNetworkError =
        (isAxios && !err.response) ||
        err?.code === 'ERR_NETWORK' ||
        serverMessage === 'Network Error';

      if (isTimeout) {
        serverMessage =
          'Connection timed out. The server took longer than expected to respond (cold start). Please try again.';
      } else if (isNetworkError) {
        if (
          typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1' &&
          API_BASE_URL.includes('localhost')
        ) {
          serverMessage =
            'Network Error: Super Admin cannot reach backend because VITE_API_URL is pointing to localhost. Add VITE_API_URL in Vercel project settings to your Railway URL and redeploy.';
        } else {
          serverMessage =
            'Network Error: Unable to connect to backend server. Please verify your Railway backend is live and CORS allows this domain.';
        }
      } else {
        // Strip any raw validation field prefix like "password: " or "identifier: " but preserve "Access denied: ..."
        serverMessage = serverMessage.replace(/^(?:identifier|password|email|student_id|username|error):\s*/i, '');
      }

      setError(serverMessage);

      const lower = serverMessage.toLowerCase();
      if (
        lower.includes('access denied') ||
        lower.includes('student') ||
        lower.includes('admin') ||
        lower.includes('privilege') ||
        lower.includes('role')
      ) {
        setIdentifierError(true);
      } else if (lower.includes('password')) {
        setPasswordError(true);
      } else if (lower.includes('id') || lower.includes('email') || lower.includes('account')) {
        setIdentifierError(true);
      } else {
        setIdentifierError(true);
        setPasswordError(true);
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
    identifierError,
    passwordError,
    clearError,
    handleSubmit,
  };
};
