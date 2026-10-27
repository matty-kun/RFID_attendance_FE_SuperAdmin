import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperAdminUser } from '../models';
import { authService } from '../services';
import { DEV_PREVIEW_TOKEN } from '../devPreview';
import { WaveTransition, type WaveTransitionProps } from '../../../components/common/WaveTransition';

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
  const navigate = useNavigate();
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transitionState, setTransitionState] = useState<WaveTransitionProps | null>(null);

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

      // Start wave transition: Left to Right
      setTransitionState({
        direction: 'ltr',
        phase: 'enter',
        message: 'Entering Super Admin Dashboard…',
      });

      // Wait for waves to sweep across and cover screen + brief celebration hold
      await new Promise((resolve) => setTimeout(resolve, 1100));

      setToken(newToken);
      setUser(newUser);
      navigate(newUser.must_change_password ? '/change-password' : '/overview', { replace: true });

      // Start wave exit phase (sweeping out to the right)
      setTransitionState({
        direction: 'ltr',
        phase: 'exit',
        message: 'Entering Super Admin Dashboard…',
      });

      // Wait for waves to finish sweeping off screen
      await new Promise((resolve) => setTimeout(resolve, 950));
      setTransitionState(null);

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

  const logout = async () => {
    // Start wave transition: Right to Left
    setTransitionState({
      direction: 'rtl',
      phase: 'enter',
      message: 'Signing out…',
    });

    // Wait for waves to sweep across and cover screen + brief hold
    await new Promise((resolve) => setTimeout(resolve, 1100));

    authService.logout();
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });

    // Start wave exit phase (sweeping out to the left)
    setTransitionState({
      direction: 'rtl',
      phase: 'exit',
      message: 'Signing out…',
    });

    // Wait for waves to finish sweeping off screen
    await new Promise((resolve) => setTimeout(resolve, 950));
    setTransitionState(null);
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
      {transitionState && <WaveTransition {...transitionState} />}
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
