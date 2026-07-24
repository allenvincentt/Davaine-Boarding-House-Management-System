import { Redirect, Slot } from 'expo-router';

import { SplashScreen } from '@/components/common/SplashScreen';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminLayout() {
  const { session, initializing, initError, retryInitialization } = useAuth();

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

  return <Slot />;
}
