import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { AdminUserModel } from '@/models/adminUserModel';
import { fetchAdminProfile, signInAdmin, signOutAdmin } from '@/services/authService';
import { supabase } from '@/services/supabaseClient';

type AuthContextValue = {
  session: Session | null;
  profile: AdminUserModel | null;
  initializing: boolean;
  initError: string | null;
  retryInitialization: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminUserModel | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const activeRef = useRef(true);

  const initialize = useCallback(async () => {
    setInitializing(true);
    setInitError(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new Error(error.message);
      }
      if (!activeRef.current) {
        return;
      }
      setSession(data.session);

      if (data.session) {
        const nextProfile = await fetchAdminProfile(data.session.user.id);
        if (activeRef.current) {
          setProfile(nextProfile);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      if (activeRef.current) {
        setInitError(error instanceof Error ? error.message : 'Unable to verify your session.');
      }
    } finally {
      if (activeRef.current) {
        setInitializing(false);
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!activeRef.current) {
        return;
      }
      setSession(nextSession);
      if (nextSession) {
        fetchAdminProfile(nextSession.user.id)
          .then((nextProfile) => {
            if (activeRef.current) {
              setProfile(nextProfile);
            }
          })
          .catch(() => {
            if (activeRef.current) {
              setProfile(null);
            }
          });
      } else {
        setProfile(null);
      }
    });

    return () => {
      activeRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, [initialize]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      initError,
      retryInitialization: initialize,
      signIn: async (email: string, password: string) => {
        const { profile: nextProfile } = await signInAdmin(email, password);
        setProfile(nextProfile);
      },
      signOut: async () => {
        await signOutAdmin();
        setProfile(null);
      },
    }),
    [session, profile, initializing, initError, initialize],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
