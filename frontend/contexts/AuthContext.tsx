'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Load cached user immediately for instant rendering
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('qsights_current_user');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const hasAttemptedLoad = useRef(false);

  const loadUser = async () => {
    // Prevent infinite loops - only attempt once per mount
    if (hasAttemptedLoad.current) {
      return;
    }
    hasAttemptedLoad.current = true;

    try {
      // Call Laravel backend directly with cookie credentials
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        // Cache user for instant loading next time
        if (typeof window !== 'undefined') {
          localStorage.setItem('qsights_current_user', JSON.stringify(data.user));
        }
      } else {
        // Silently handle 401 (happens during logout)
        setCurrentUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('qsights_current_user');
        }
      }
    } catch (error) {
      // Silently handle errors (network issues, logout, etc.)
      // Keep cached user if available
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    hasAttemptedLoad.current = false;
    setIsLoading(true);
    await loadUser();
  };

  const clearUser = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qsights_current_user');
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, refreshUser, clearUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
