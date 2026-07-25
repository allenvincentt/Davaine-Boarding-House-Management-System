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
import { AppState, Platform } from 'react-native';

import type { AdminUserModel } from '@/models/adminUserModel';
import {
  ExpiredBiometricSessionError,
  confirmPasswordReset,
  fetchAdminProfile,
  requestPasswordReset,
  signInAdmin,
  signInWithCachedBiometricSession,
  signOutAdmin,
} from '@/services/authService';
import {
  authenticateWithBiometrics,
  cacheBiometricRefreshToken,
  clearCachedBiometricRefreshToken,
  getBiometricKind,
  getCachedBiometricRefreshToken,
  type BiometricKind,
} from '@/services/biometricAuthService';
import { supabase } from '@/services/supabaseClient';

type AuthContextValue = {
  session: Session | null;
  profile: AdminUserModel | null;
  initializing: boolean;
  initError: string | null;
  retryInitialization: () => void;
  signIn: (email: string, password: string, enableFingerprintSignIn?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  biometricKind: BiometricKind | null;
  biometricAvailable: boolean;
  biometricSignInEnabled: boolean;
  signInWithBiometrics: () => Promise<void>;
  locked: boolean;
  unlockWithBiometrics: () => Promise<void>;
  enableBiometricSignIn: () => Promise<void>;
  disableBiometricSignIn: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminUserModel | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [biometricKind, setBiometricKind] = useState<BiometricKind | null>(null);
  const [hasCachedBiometricSession, setHasCachedBiometricSession] = useState(false);
  const [locked, setLocked] = useState(false);
  const activeRef = useRef(true);
  const biometricEnabledRef = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    biometricEnabledRef.current = hasCachedBiometricSession;
  }, [hasCachedBiometricSession]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    Promise.all([getBiometricKind(), getCachedBiometricRefreshToken()]).then(([kind, cachedToken]) => {
      if (!activeRef.current) {
        return;
      }
      setBiometricKind(kind);
      setHasCachedBiometricSession(cachedToken != null);
      biometricEnabledRef.current = cachedToken != null;
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      const previousState = appStateRef.current;
      appStateRef.current = state;

      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        if (previousState === 'background' && sessionRef.current && biometricEnabledRef.current) {
          setLocked(true);
        }
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

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
        if (biometricEnabledRef.current && nextSession.refresh_token) {
          cacheBiometricRefreshToken(nextSession.refresh_token).catch(() => undefined);
        }
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
      signIn: async (email: string, password: string, enableFingerprintSignIn = false) => {
        const { profile: nextProfile } = await signInAdmin(email, password);
        setProfile(nextProfile);
        setLocked(false);

        if (enableFingerprintSignIn && Platform.OS !== 'web' && biometricKind === 'fingerprint') {
          const { data } = await supabase.auth.getSession();
          if (data.session?.refresh_token) {
            await cacheBiometricRefreshToken(data.session.refresh_token);
            setHasCachedBiometricSession(true);
            biometricEnabledRef.current = true;
          }
        }
      },
      signOut: async () => {
        await signOutAdmin();
        await clearCachedBiometricRefreshToken();
        setHasCachedBiometricSession(false);
        biometricEnabledRef.current = false;
        setProfile(null);
        setLocked(false);
      },
      requestPasswordReset: async (email: string) => {
        await requestPasswordReset(email);
      },
      confirmPasswordReset: async (email: string, code: string, newPassword: string) => {
        await confirmPasswordReset(email, code, newPassword);
      },
      biometricKind,
      biometricAvailable: Platform.OS !== 'web' && biometricKind === 'fingerprint' && hasCachedBiometricSession,
      biometricSignInEnabled: hasCachedBiometricSession,
      signInWithBiometrics: async () => {
        const cachedToken = await getCachedBiometricRefreshToken();
        if (!cachedToken) {
          setHasCachedBiometricSession(false);
          biometricEnabledRef.current = false;
          throw new Error('No saved sign-in found for fingerprint sign-in. Sign in with your password first.');
        }

        const authenticated = await authenticateWithBiometrics('Sign in to Davaine');
        if (!authenticated) {
          throw new Error('Fingerprint authentication was not completed.');
        }

        try {
          const { profile: nextProfile } = await signInWithCachedBiometricSession(cachedToken);
          setProfile(nextProfile);
          setLocked(false);
        } catch (error) {
          if (error instanceof ExpiredBiometricSessionError) {
            await clearCachedBiometricRefreshToken();
            setHasCachedBiometricSession(false);
            biometricEnabledRef.current = false;
          }
          throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.refresh_token) {
          await cacheBiometricRefreshToken(data.session.refresh_token);
        }
      },
      locked,
      unlockWithBiometrics: async () => {
        const authenticated = await authenticateWithBiometrics('Unlock Davaine');
        if (!authenticated) {
          throw new Error('Fingerprint authentication was not completed.');
        }
        setLocked(false);
      },
      enableBiometricSignIn: async () => {
        if (Platform.OS === 'web' || biometricKind !== 'fingerprint') {
          throw new Error('Fingerprint sign-in is not available on this device.');
        }

        const authenticated = await authenticateWithBiometrics('Enable fingerprint sign-in');
        if (!authenticated) {
          throw new Error('Fingerprint authentication was not completed.');
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session?.refresh_token) {
          throw new Error('No active session to enable fingerprint sign-in for.');
        }

        await cacheBiometricRefreshToken(data.session.refresh_token);
        setHasCachedBiometricSession(true);
        biometricEnabledRef.current = true;
      },
      disableBiometricSignIn: async () => {
        await clearCachedBiometricRefreshToken();
        setHasCachedBiometricSession(false);
        biometricEnabledRef.current = false;
      },
    }),
    [session, profile, initializing, initError, initialize, biometricKind, hasCachedBiometricSession, locked],
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
