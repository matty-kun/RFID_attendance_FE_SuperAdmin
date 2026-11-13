import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
