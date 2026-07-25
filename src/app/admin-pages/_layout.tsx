import { Redirect, Slot } from 'expo-router';

import { BiometricLockScreen } from '@/components/common/BiometricLockScreen';
import { SplashScreen } from '@/components/common/SplashScreen';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminLayout() {
  const { session, initializing, initError, retryInitialization, locked } = useAuth();

  if (initializing) {
    return <SplashScreen status="loading" loadingMessage="Checking your session…" />;
  }

  if (initError) {
    return (
      <SplashScreen
        status="error"
        errorTitle="Couldn't verify your session"
        errorMessage={initError}
        onRetry={retryInitialization}
      />
    );
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  if (locked) {
    return <BiometricLockScreen />;
  }

  return (
    <PageShell>
      <Slot />
    </PageShell>
  );
}
