'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  Wifi,
  WifiOff,
  LogOut,
  BookOpen,
  Lock,
  Unlock,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import { getAttempts } from '@/lib/storage';

export function Navbar() {
  const {
    user,
    loading,
    isOnline,
    isCreator,
    signInWithGoogle,
    signOut,
    unlockCreator,
    lockCreator,
  } = useAuth();

  const { theme, setTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [hasAttempts, setHasAttempts] = useState(false);

  useEffect(() => {
    const attempts = getAttempts();
    if (attempts.length > 0) {
      setHasAttempts(true);
    }
  }, []);

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Student';

  const avatarUrl = user?.photoURL;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const success = unlockCreator(pinInput);
    if (success) {
      setPinModalOpen(false);
      setPinInput('');
    } else {
      setPinError('Incorrect creator PIN. Please try again.');
    }
  };

  return (
    <>
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-base tracking-tight font-medium">StudyQuiz</span>
            </Link>

            {/* History Link */}
            {hasAttempts && (
              <Link
                href="/history"
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="View Quiz History"
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </Link>
            )}

            {/* Creator Badge or Student Indicator */}
            {isCreator ? (
              <button
                onClick={() => lockCreator()}
                title="Click to lock Creator Mode"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-80 transition-opacity"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                <span>Creator Mode</span>
              </button>
            ) : (
              <button
                onClick={() => setPinModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                title="Unlock creator mode"
              >
                <Lock className="w-3 h-3" />
                <span>Creator Access</span>
              </button>
            )}

            {/* Network Indicator */}
            <div
              className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-zinc-500" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Theme Toggler */}
            <button
              onClick={() => {
                if (theme === 'system') setTheme('light');
                else if (theme === 'light') setTheme('dark');
                else setTheme('system');
              }}
              title={`Theme: ${theme}`}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
            >
              {theme === 'system' && <Monitor className="w-4 h-4" />}
              {theme === 'light' && <Sun className="w-4 h-4" />}
              {theme === 'dark' && <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* User Auth Controls */}
          <div className="flex items-center gap-2">
            {!isCreator && (
              <button
                onClick={() => setPinModalOpen(true)}
                className="sm:hidden p-1.5 text-zinc-500 hover:text-zinc-800 rounded"
                title="Creator Login"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {loading ? (
              <div className="w-20 h-8 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-xs text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-[10px]">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[110px] truncate">{displayName}</span>
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 p-1 text-xs z-50 animate-in fade-in slide-in-from-top-1"
                    onClick={() => setMenuOpen(false)}
                  >
                    <div className="px-3 py-2 text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                      Signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{displayName}</span>
                    </div>

                    {isCreator ? (
                      <button
                        onClick={() => lockCreator()}
                        className="w-full text-left px-3 py-2 rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Lock Creator Mode
                      </button>
                    ) : (
                      <button
                        onClick={() => setPinModalOpen(true)}
                        className="w-full text-left px-3 py-2 rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Unlock Creator Mode
                      </button>
                    )}

                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-3 py-2 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 mt-1 border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Creator PIN Unlock Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 font-semibold text-base">
              <Lock className="w-5 h-5 text-blue-500" />
              <span>Unlock Creator Mode</span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Quiz creation is currently restricted to instructors and authorized creators during this prototype.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Creator PIN / Password
                </label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter creator PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
                {pinError && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{pinError}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinModalOpen(false);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
