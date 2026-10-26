import React, { createContext, useContext, useState, useEffect } from 'react';
import { SuperAdminUser } from '../models';
import { authService } from '../services';
import { DEV_PREVIEW_TOKEN } from '../devPreview';

interface AuthContextType {
  user: SuperAdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<SuperAdminUser>;
  refreshUser: () => Promise<SuperAdminUser>;
  logout: () => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('super_admin_token');
      if (storedToken) {
        if (storedToken === DEV_PREVIEW_TOKEN) {
          localStorage.removeItem('super_admin_token');
          localStorage.removeItem('super_admin_user');
          setIsLoading(false);
          return;
        }
        setToken(storedToken);
        try {
          const profile = await authService.getMe();
          setUser(profile);
        } catch {
          authService.logout();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const { token: newToken, user: newUser } = await authService.login(identifier, password);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const profile = await authService.getMe();
    setUser(profile);
    return profile;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        refreshUser,
        logout,
        isAuthenticated: !!token && !!user,
        isSuperAdmin: user?.role === 'super_admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
