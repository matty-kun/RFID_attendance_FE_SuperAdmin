import { useState } from 'react';
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
      let serverMessage = err?.response?.data?.error?.message || err?.message || 'Invalid credentials.';

      if (
        serverMessage === 'Network Error' ||
        err?.code === 'ERR_NETWORK' ||
        !err?.response
      ) {
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
      }

      // Strip any raw field prefix like "password: " or "identifier: "
      serverMessage = serverMessage.replace(/^[a-zA-Z0-9_.-]+:\s*/, '');
      setError(serverMessage);

      if (serverMessage.toLowerCase().includes('password')) {
        setPasswordError(true);
      } else if (serverMessage.toLowerCase().includes('id') || serverMessage.toLowerCase().includes('email') || serverMessage.toLowerCase().includes('student')) {
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
