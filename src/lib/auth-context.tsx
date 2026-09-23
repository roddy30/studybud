'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';

const CREATOR_PIN_STORAGE_KEY = 'studyquiz_creator_unlocked';
const DEFAULT_CREATOR_PIN = process.env.NEXT_PUBLIC_CREATOR_PIN || 'studybud2026';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
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

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          photoURL: fbUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Firebase popup sign-in notice:', err.code, err.message);
      // Fallback to redirect if popup is blocked on mobile
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (e: any) {
          alert(`Could not sign in: ${e.message}`);
        }
      } else if (err.code !== 'auth/cancelled-popup-request') {
        alert(`Sign in error: ${err.message}`);
      }
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
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
