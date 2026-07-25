import type { PasskeyListItem, Session } from '@supabase/supabase-js';
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
import { Platform } from 'react-native';

import type { AdminUserModel } from '@/models/adminUserModel';
import {
  confirmPasswordReset,
  deletePasskey,
  fetchAdminProfile,
  listPasskeys,
  registerPasskey,
  requestPasswordReset,
  signInAdmin,
  signInWithCachedBiometricSession,
  signInWithPasskey,
  signOutAdmin,
} from '@/services/authService';
import {
  authenticateWithBiometrics,
  cacheBiometricRefreshToken,
  clearCachedBiometricRefreshToken,
  getBiometricKind,
  getCachedBiometricRefreshToken,
  supportsPlatformPasskey,
  type BiometricKind,
} from '@/services/biometricAuthService';
import { supabase } from '@/services/supabaseClient';

type AuthContextValue = {
  session: Session | null;
  profile: AdminUserModel | null;
  initializing: boolean;
  initError: string | null;
  retryInitialization: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  biometricKind: BiometricKind | null;
  biometricAvailable: boolean;
  biometricSignInEnabled: boolean;
  passkeySupported: boolean;
  signInWithBiometrics: () => Promise<void>;
  enableBiometricSignIn: () => Promise<void>;
  disableBiometricSignIn: () => Promise<void>;
  listPasskeys: () => Promise<PasskeyListItem[]>;
  registerPasskey: () => Promise<void>;
  deletePasskey: (passkeyId: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminUserModel | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [biometricKind, setBiometricKind] = useState<BiometricKind | null>(null);
  const [hasCachedBiometricSession, setHasCachedBiometricSession] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const activeRef = useRef(true);

  useEffect(() => {
    Promise.all([getBiometricKind(), getCachedBiometricRefreshToken(), supportsPlatformPasskey()]).then(
      ([kind, cachedToken, passkey]) => {
        if (!activeRef.current) {
          return;
        }
        setBiometricKind(kind);
        setHasCachedBiometricSession(cachedToken != null);
        setPasskeySupported(passkey);
      },
    );
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

        if (Platform.OS !== 'web' && biometricKind != null) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.refresh_token) {
            await cacheBiometricRefreshToken(data.session.refresh_token);
            setHasCachedBiometricSession(true);
          }
        }
      },
      signOut: async () => {
        await signOutAdmin();
        setProfile(null);
        await clearCachedBiometricRefreshToken();
        setHasCachedBiometricSession(false);
      },
      requestPasswordReset: async (email: string) => {
        await requestPasswordReset(email);
      },
      confirmPasswordReset: async (email: string, code: string, newPassword: string) => {
        await confirmPasswordReset(email, code, newPassword);
      },
      biometricKind,
      biometricAvailable:
        Platform.OS === 'web' ? passkeySupported : biometricKind != null && hasCachedBiometricSession,
      biometricSignInEnabled: hasCachedBiometricSession,
      passkeySupported,
      signInWithBiometrics: async () => {
        if (Platform.OS === 'web') {
          const { profile: nextProfile } = await signInWithPasskey();
          setProfile(nextProfile);
          return;
        }

        const cachedToken = await getCachedBiometricRefreshToken();
        if (!cachedToken) {
          throw new Error('No saved sign-in found for biometrics. Sign in with your password first.');
        }

        const authenticated = await authenticateWithBiometrics('Sign in to Davaine');
        if (!authenticated) {
          throw new Error('Biometric authentication was not completed.');
        }

        const { profile: nextProfile } = await signInWithCachedBiometricSession(cachedToken);
        setProfile(nextProfile);
      },
      enableBiometricSignIn: async () => {
        if (Platform.OS === 'web' || biometricKind == null) {
          throw new Error('Biometric sign-in is not available on this device.');
        }

        const authenticated = await authenticateWithBiometrics('Enable biometric sign-in');
        if (!authenticated) {
          throw new Error('Biometric authentication was not completed.');
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session?.refresh_token) {
          throw new Error('No active session to enable biometrics for.');
        }

        await cacheBiometricRefreshToken(data.session.refresh_token);
        setHasCachedBiometricSession(true);
      },
      disableBiometricSignIn: async () => {
        await clearCachedBiometricRefreshToken();
        setHasCachedBiometricSession(false);
      },
      listPasskeys: () => listPasskeys(),
      registerPasskey: () => registerPasskey(),
      deletePasskey: (passkeyId: string) => deletePasskey(passkeyId),
    }),
    [
      session,
      profile,
      initializing,
      initError,
      initialize,
      biometricKind,
      hasCachedBiometricSession,
      passkeySupported,
    ],
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
