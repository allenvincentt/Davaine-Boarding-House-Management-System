import { useCallback, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';

export type SignInFlowStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useSignInFlow(onSuccess: () => void) {
  const { signIn, signInWithBiometrics } = useAuth();
  const [status, setStatus] = useState<SignInFlowStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = useCallback(
    async (email: string, password: string, enableFingerprintSignIn: boolean) => {
      setStatus('submitting');
      setErrorMessage('');
      try {
        await signIn(email, password, enableFingerprintSignIn);
        setStatus('success');
        onSuccess();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
        setStatus('error');
      }
    },
    [signIn, onSuccess],
  );

  const submitBiometric = useCallback(async () => {
    setStatus('submitting');
    setErrorMessage('');
    try {
      await signInWithBiometrics();
      setStatus('success');
      onSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in with fingerprint.');
      setStatus('error');
    }
  }, [signInWithBiometrics, onSuccess]);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  return { status, errorMessage, submit, submitBiometric, reset };
}
