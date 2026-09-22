'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const CREATOR_PIN_STORAGE_KEY = 'studyquiz_creator_unlocked';
const DEFAULT_CREATOR_PIN = process.env.NEXT_PUBLIC_CREATOR_PIN || 'studybud2026';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOnline: boolean;
  isCreator: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  unlockCreator: (pin: string) => boolean;
  lockCreator: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isOnline: true,
  isCreator: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  unlockCreator: () => false,
  lockCreator: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [creatorUnlocked, setCreatorUnlocked] = useState(false);

  // Monitor network status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check creator unlocked status from localStorage
    try {
      const savedUnlock = localStorage.getItem(CREATOR_PIN_STORAGE_KEY);
      if (savedUnlock === 'true') {
        setCreatorUnlocked(true);
      }
    } catch {}

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase client instance
  const supabase = useMemo(() => {
    try {
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        return createClient();
      }
    } catch (e) {
      console.warn('Supabase client init skipped (running offline)', e);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Determine if current user is Creator (via PIN or Admin email)
  const isCreator = useMemo(() => {
    if (creatorUnlocked) return true;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase().trim();
    if (adminEmail && user?.email?.toLowerCase().trim() === adminEmail) {
      return true;
    }
    return false;
  }, [creatorUnlocked, user]);

  const unlockCreator = (pin: string): boolean => {
    const trimmedPin = pin.trim();
    if (trimmedPin === DEFAULT_CREATOR_PIN) {
      try {
        localStorage.setItem(CREATOR_PIN_STORAGE_KEY, 'true');
      } catch {}
      setCreatorUnlocked(true);
      return true;
    }
    return false;
  };

  const lockCreator = () => {
    try {
      localStorage.removeItem(CREATOR_PIN_STORAGE_KEY);
    } catch {}
    setCreatorUnlocked(false);
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      alert('Supabase credentials are not configured in .env.local yet.');
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Google sign-in error:', error);
      alert(`Could not sign in: ${error.message}`);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isOnline,
        isCreator,
        signInWithGoogle,
        signOut,
        unlockCreator,
        lockCreator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
