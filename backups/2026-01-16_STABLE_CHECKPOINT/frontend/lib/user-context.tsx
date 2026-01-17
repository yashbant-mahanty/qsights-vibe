"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserData {
  userId: string;
  email: string;
  role: string;
  organizationId?: string;
  programId?: string;
  name?: string;
}

interface UserContextType {
  user: UserData | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Silently handle 401 (happens during logout)
        setUser(null);
      }
    } catch (error) {
      // Silently handle errors (network issues, logout, etc.)
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  return (