import { useCallback, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';

export type ForgotPasswordStepStatus = 'idle' | 'submitting' | 'success' | 'error';

export function useForgotPasswordFlow(onResetSuccess: () => void) {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [sendStatus, setSendStatus] = useState<ForgotPasswordStepStatus>('idle');
  const [sendErrorMessage, setSendErrorMessage] = useState('');
  const [resetStatus, setResetStatus] = useState<ForgotPasswordStepStatus>('idle');
  const [resetErrorMessage, setResetErrorMessage] = useState('');

  const sendCode = useCallback(
    async (email: string): Promise<boolean> => {
      setSendStatus('submitting');
      setSendErrorMessage('');
      try {
        await requestPasswordReset(email);
        setSendStatus('success');
        return true;
      } catch (error) {
        setSendErrorMessage(error instanceof Error ? error.message : 'Unable to send reset code.');
        setSendStatus('error');
        return false;
      }
    },
    [requestPasswordReset],
  );

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      setResetStatus('submitting');
      setResetErrorMessage('');
      try {
        await confirmPasswordReset(email, code, newPassword);
        setResetStatus('success');
        onResetSuccess();
      } catch (error) {
        setResetErrorMessage(error instanceof Error ? error.message : 'Unable to reset your password.');
        setResetStatus('error');
      }
    },
    [confirmPasswordReset, onResetSuccess],
  );

  const resetSendState = useCallback(() => {
    setSendStatus('idle');
    setSendErrorMessage('');
  }, []);

  const resetResetState = useCallback(() => {
    setResetStatus('idle');
    setResetErrorMessage('');
  }, []);

  return {
    sendStatus,
    sendErrorMessage,
    sendCode,
    resetSendState,
    resetStatus,
    resetErrorMessage,
    resetPassword,
    resetResetState,
  };
}
