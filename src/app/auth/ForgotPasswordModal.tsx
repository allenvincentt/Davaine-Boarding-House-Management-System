import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { Input } from '@/components/ui/Input';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { Gradient } from '@/constants/gradient';
import { useForgotPasswordFlow } from '@/hooks/useForgotPasswordFlow';

type ForgotPasswordModalProps = {
  visible: boolean;
  onClose: () => void;
  onBackToSignIn?: () => void;
};

type Step = 'email' | 'reset';

type FieldErrors = {
  email?: string;
  code?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^\d{6}$/;
const RESEND_COOLDOWN_SECONDS = 600;

const webHeroGradient: ViewStyle & { backgroundImage: string } = {
  backgroundImage: Gradient.base,
};

function formatCooldown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ForgotPasswordModal({ visible, onClose, onBackToSignIn }: ForgotPasswordModalProps) {
  const onResetSuccessRef = useRef<() => void>(() => {});
  const handleResetSuccess = useCallback(() => onResetSuccessRef.current(), []);

  const {
    sendStatus,
    sendErrorMessage,
    sendCode,
    resetSendState,
    resetStatus,
    resetErrorMessage,
    resetPassword,
    resetResetState,
  } = useForgotPasswordFlow(handleResetSuccess);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [cooldown, setCooldown] = useState(0);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);

  const isSendingCode = sendStatus === 'submitting';
  const isResettingPassword = resetStatus === 'submitting';

  useEffect(() => {
    if (resendAvailableAt == null) {
      setCooldown(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.round((resendAvailableAt - Date.now()) / 1000));
      setCooldown(remaining);
      if (remaining <= 0) {
        setResendAvailableAt(null);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  const resetForm = useCallback(() => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    resetSendState();
    resetResetState();
  }, [resetSendState, resetResetState]);

  onResetSuccessRef.current = () => {
    resetForm();
    onBackToSignIn?.();
  };

  const handleClose = useCallback(() => {
    if (isSendingCode || isResettingPassword) {
      return;
    }
    onClose();
    resetForm();
  }, [isSendingCode, isResettingPassword, onClose, resetForm]);

  const handleBackToSignIn = useCallback(() => {
    if (isSendingCode || isResettingPassword) {
      return;
    }
    resetForm();
    onBackToSignIn?.();
  }, [isSendingCode, isResettingPassword, resetForm, onBackToSignIn]);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
    setFieldErrors((current) => (current.email ? { ...current, email: undefined } : current));
  }, []);

  const handleChangeCode = useCallback((text: string) => {
    setCode(text.replace(/[^0-9]/g, ''));
    setFieldErrors((current) => (current.code ? { ...current, code: undefined } : current));
  }, []);

  const handleChangeNewPassword = useCallback((text: string) => {
    setNewPassword(text);
    setFieldErrors((current) => (current.newPassword ? { ...current, newPassword: undefined } : current));
  }, []);

  const handleChangeConfirmPassword = useCallback((text: string) => {
    setConfirmPassword(text);
    setFieldErrors((current) => (current.confirmPassword ? { ...current, confirmPassword: undefined } : current));
  }, []);

  const handleSendCode = useCallback(async () => {
    if (cooldown > 0) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFieldErrors((current) => ({ ...current, email: 'Email is required' }));
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFieldErrors((current) => ({ ...current, email: 'Enter a valid email address' }));
      return;
    }

    const sent = await sendCode(trimmedEmail);
    if (sent) {
      setStep('reset');
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    }
  }, [cooldown, email, sendCode]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isSendingCode) {
      return;
    }
    const sent = await sendCode(email.trim());
    if (sent) {
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    }
  }, [cooldown, isSendingCode, email, sendCode]);

  const handleUseDifferentEmail = useCallback(() => {
    setStep('email');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setResendAvailableAt(null);
    resetSendState();
    resetResetState();
  }, [resetSendState, resetResetState]);

  const handleResetPassword = useCallback(() => {
    const nextErrors: FieldErrors = {};

    if (!CODE_PATTERN.test(code.trim())) {
      nextErrors.code = 'Enter the 6-digit code';
    }
    if (!newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (nextErrors.code || nextErrors.newPassword || nextErrors.confirmPassword) {
      setFieldErrors(nextErrors);
      return;
    }

    resetPassword(email.trim(), code.trim(), newPassword);
  }, [code, newPassword, confirmPassword, email, resetPassword]);

  const sendCodeLabel = useMemo(
    () =>
      isSendingCode ? (
        <>
          <ActivityIndicator color={DefaultTheme.colors.white} />
          <Text style={styles.submitLabel}>Sending…</Text>
        </>
      ) : (
        <>
          <Text style={styles.submitLabel}>Send Reset Code</Text>
          <Text style={styles.submitArrow}>{'→'}</Text>
        </>
      ),
    [isSendingCode],
  );

  const resetPasswordLabel = useMemo(
    () =>
      isResettingPassword ? (
        <>
          <ActivityIndicator color={DefaultTheme.colors.white} />
          <Text style={styles.submitLabel}>Resetting…</Text>
        </>
      ) : (
        <>
          <Text style={styles.submitLabel}>Reset Password</Text>
          <Text style={styles.submitArrow}>{'→'}</Text>
        </>
      ),
    [isResettingPassword],
  );

  return (
    <>
      <Modal
        visible={visible}
        onClose={handleClose}
        dismissOnBackdropPress={!isSendingCode && !isResettingPassword}
        sheetHandleFloating
        contentStyle={styles.modalContent}>
        <View style={styles.hero}>
          <View
            pointerEvents="none"
            style={[styles.heroGradient, Platform.OS === 'web' && webHeroGradient]}
          />
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close forgot password"
            hitSlop={10}
            style={styles.closeButton}>
            <AppIcon name="close" size={16} tintColor={DefaultTheme.colors.white} />
          </Pressable>
          <View style={styles.heroMark}>
            <Image
              accessible={false}
              source={require('../../../assets/images/davaine-mark.svg')}
              contentFit="contain"
              style={styles.heroMarkImage}
            />
          </View>
        </View>

        <View style={styles.sheet}>
          {step === 'email' ? (
            <>
              <Text style={styles.title}>Forgot your password?</Text>
              <Text style={styles.subtitle}>
                Enter your email and we&apos;ll send you a reset code
              </Text>

              <Input
                label="Email Address"
                value={email}
                onChangeText={handleChangeEmail}
                error={fieldErrors.email}
                icon="at"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
                style={styles.field}
              />

              {sendStatus === 'error' && <Text style={styles.generalError}>{sendErrorMessage}</Text>}

              <GradientButton
                accessibilityLabel="Send reset code"
                onPress={handleSendCode}
                disabled={isSendingCode || cooldown > 0}
                style={styles.submitButton}>
                {sendCodeLabel}
              </GradientButton>

              {cooldown > 0 && (
                <Text style={styles.cooldownHint}>
                  You can request a new code in {formatCooldown(cooldown)}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter reset code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {email.trim()}. It expires shortly.
              </Text>

              <Input
                label="Reset Code"
                value={code}
                onChangeText={handleChangeCode}
                error={fieldErrors.code}
                icon="lock"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="next"
                style={styles.field}
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={handleChangeNewPassword}
                error={fieldErrors.newPassword}
                icon="lock"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="next"
                style={styles.field}
              />
              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={handleChangeConfirmPassword}
                error={fieldErrors.confirmPassword}
                icon="lock"
                secureTextEntry
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
                style={styles.field}
              />

              {resetStatus === 'error' && <Text style={styles.generalError}>{resetErrorMessage}</Text>}

              <GradientButton
                accessibilityLabel="Reset password"
                onPress={handleResetPassword}
                disabled={isResettingPassword}
                style={styles.submitButton}>
                {resetPasswordLabel}
              </GradientButton>

              <View style={styles.resendRow}>
                <Pressable
                  onPress={handleResend}
                  disabled={cooldown > 0 || isSendingCode}
                  accessibilityRole="button"
                  accessibilityLabel="Resend reset code"
                  hitSlop={8}
                  style={styles.resendPressable}>
                  {isSendingCode ? (
                    <>
                      <ActivityIndicator size="small" color={DefaultTheme.colors.primary} />
                      <Text style={styles.resendText}>Sending…</Text>
                    </>
                  ) : (
                    <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
                      {cooldown > 0 ? `Resend code in ${formatCooldown(cooldown)}` : 'Resend code'}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={handleUseDifferentEmail}
                  accessibilityRole="button"
                  accessibilityLabel="Use a different email"
                  hitSlop={8}>
                  <Text style={styles.resendText}>Use a different email</Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            onPress={handleBackToSignIn}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            style={styles.backButton}
            hitSlop={8}>
            <Text style={styles.backText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    maxWidth: 400,
  },
  hero: {
    height: 210,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: Gradient.base,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroMark: {
    width: 72,
    height: 72,
    borderRadius: DefaultTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DefaultTheme.colors.white,
  },
  heroMarkImage: {
    width: 40,
    height: 40,
  },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: DefaultTheme.radius.lg,
    borderTopRightRadius: DefaultTheme.radius.lg,
    backgroundColor: DefaultTheme.colors.white,
    paddingHorizontal: 26,
    paddingTop: 40,
    paddingBottom: 48,
  },
  title: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.heading,
    fontSize: 27,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  field: {
    marginTop: 22,
    marginHorizontal: 8,
  },
  generalError: {
    marginTop: 16,
    marginHorizontal: 8,
    color: '#D64545',
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12.5,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 26,
    alignSelf: 'stretch',
  },
  submitLabel: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  submitArrow: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
    lineHeight: 16,
  },
  resendRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  resendPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resendText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 12.5,
  },
  resendTextDisabled: {
    color: DefaultTheme.colors.muted,
  },
  cooldownHint: {
    marginTop: 12,
    marginHorizontal: 8,
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 12,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 18,
    alignSelf: 'center',
  },
  backText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
  },
});
