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

// Helper to get backend token from cookies (same as api.ts)
function getBackendToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('backendToken='));
  
  if (!tokenCookie) return null;
  
  return decodeURIComponent(tokenCookie.split('=')[1]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize as null to avoid hydration mismatch
  // Load cached user after hydration in useEffect
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasAttemptedLoad = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const loadUser = async (force = false) => {
    // Prevent infinite loops - only attempt once per mount unless forced
    if (hasAttemptedLoad.current && !force) {
      return;
    }
    hasAttemptedLoad.current = true;

    try {
      // Get the backend token from cookies
      const token = getBackendToken();
      
      // If no token, don't make the API call - just use cached user
      if (!token) {
        // Keep cached user if available, otherwise clear
        if (!currentUser) {
          setCurrentUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('qsights_current_user');
          }
        }
        return;
      }

      // Call Laravel backend directly with token
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prod.qsights.com/api';
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
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
    await loadUser(true); // Force reload
  };

  const clearUser = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('qsights_current_user');
    }
  };

  useEffect(() => {
    // Load cached user after hydration to avoid mismatch
    if (!isHydrated) {
      try {
        const cached = localStorage.getItem('qsights_current_user');
        if (cached) {
          try {
            setCurrentUser(JSON.parse(cached));
          } catch (e) {
            // Invalid cached data
          }
        }
      } catch (e) {
        // localStorage not available (incognito mode, etc.)
      }
      setIsHydrated(true);
    }
    
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
