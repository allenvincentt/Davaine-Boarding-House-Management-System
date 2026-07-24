import { useCallback, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';

export type SignInFlowStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useSignInFlow(onSuccess: () => void) {
  const { signIn } = useAuth();
  const [status, setStatus] = useState<SignInFlowStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = useCallback(
    async (email: string, password: string) => {
      setStatus('submitting');
      setErrorMessage('');
      try {
        await signIn(email, password);
        setStatus('success');
        onSuccess();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
        setStatus('error');
      }
    },
    [signIn, onSuccess],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  return { status, errorMessage, submit, reset };
}
