import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setToken, removeToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch (err) {
      setUser(null);
      removeToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    if (localStorage.getItem('careerpilot_token')) {
      refreshUser();
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await api.login({ email, password: pass });
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      await api.register({ email, password: pass, full_name: name });
      await api.login({ email, password: pass });
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

