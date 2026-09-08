'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthUser, TokenResponse } from '@/types';

interface AuthContextValue {
  currentUser: AuthUser | null;
  loading: boolean;
  setAuth: (data: TokenResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  loading: true,
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('authUser');
    if (token && stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        setCurrentUser({ ...user, token });
      } catch {}
    }
    setLoading(false);
  }, []);

  const setAuth = useCallback((data: TokenResponse) => {
    const user: AuthUser = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role as 'GUEST' | 'HOST',
      avatar_url: data.avatar_url,
      token: data.access_token,
    };
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('authUser', JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('authUser');
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
