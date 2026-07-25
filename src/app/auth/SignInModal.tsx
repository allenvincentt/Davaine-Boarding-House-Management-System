import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal as RNModal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { SplashScreen } from '@/components/common/SplashScreen';
import { AppIcon } from '@/components/ui/AppIcon';
import { Input } from '@/components/ui/Input';
import { GradientButton } from '@/components/ui/buttons/GradientButton';
import { MatchaButton } from '@/components/ui/buttons/MatchaButton';
import { Modal } from '@/components/ui/modals/Modal';
import { DefaultTheme } from '@/constants/defaultTheme';
import { Gradient } from '@/constants/gradient';
import type { AppIconName } from '@/constants/icons';
import { useSignInFlow } from '@/hooks/useSignInFlow';
import { useAuth } from '@/providers/AuthProvider';

type SignInModalProps = {
  visible: boolean;
  onClose: () => void;
  onForgotPassword?: () => void;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const webHeroGradient: ViewStyle & { backgroundImage: string } = {
  backgroundImage: Gradient.base,
};

const BIOMETRIC_COPY: Record<'facial' | 'fingerprint' | 'other', { label: string; icon: AppIconName }> = {
  facial: { label: 'Sign in with Face ID', icon: 'faceId' },
  fingerprint: { label: 'Sign in with Fingerprint', icon: 'fingerprint' },
  other: { label: 'Sign in with Passkey', icon: 'passkey' },
};

export function SignInModal({ visible, onClose, onForgotPassword }: SignInModalProps) {
  const router = useRouter();
  const { biometricKind, biometricAvailable } = useAuth();
  const handleSignedIn = useCallback(() => {
    router.replace('/admin-pages/DashboardPage');
  }, [router]);
  const { status, errorMessage, submit, submitBiometric, reset } = useSignInFlow(handleSignedIn);
  const isSubmitting = status === 'submitting';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const biometricCopy = useMemo(() => {
    if (Platform.OS === 'web') {
      return BIOMETRIC_COPY.other;
    }
    if (biometricKind === 'facial') {
      return BIOMETRIC_COPY.facial;
    }
    if (biometricKind === 'fingerprint') {
      return BIOMETRIC_COPY.fingerprint;
    }
    return BIOMETRIC_COPY.other;
  }, [biometricKind]);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setFieldErrors({});
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    onClose();
    resetForm();
    reset();
  }, [isSubmitting, onClose, resetForm, reset]);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
    setFieldErrors((current) => (current.email ? { ...current, email: undefined } : current));
  }, []);

  const handleChangePassword = useCallback((text: string) => {
    setPassword(text);
    setFieldErrors((current) => (current.password ? { ...current, password: undefined } : current));
  }, []);

  const handleSubmit = useCallback(() => {
    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    submit(email.trim(), password);
  }, [email, password, submit]);

  const handleBiometricSignIn = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    submitBiometric();
  }, [isSubmitting, submitBiometric]);

  const signInLabel = useMemo(
    () =>
      isSubmitting ? (
        <ActivityIndicator color={DefaultTheme.colors.white} />
      ) : (
        <>
          <Text style={styles.signInLabel}>Sign In</Text>
          <Text style={styles.signInArrow}>{'→'}</Text>
        </>
      ),
    [isSubmitting],
  );

  return (
    <>
      <Modal
        visible={visible && status !== 'success'}
        onClose={handleClose}
        dismissOnBackdropPress={!isSubmitting}
        contentStyle={styles.modalContent}>
        <View style={styles.hero}>
          <View
            pointerEvents="none"
            style={[styles.heroGradient, Platform.OS === 'web' && webHeroGradient]}
          />
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close sign in"
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your stay at Davaine</Text>

          {biometricAvailable && (
            <>
              <MatchaButton
                label={biometricCopy.label}
                icon={biometricCopy.icon}
                variant="outline"
                disabled={isSubmitting}
                onPress={handleBiometricSignIn}
                style={styles.biometricButton}
              />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign in with password</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          <Input
            label="Email Address"
            value={email}
            onChangeText={handleChangeEmail}
            error={fieldErrors.email}
            icon="at"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            style={styles.field}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={handleChangePassword}
            error={fieldErrors.password}
            icon="lock"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={styles.field}
          />

          {status === 'error' && <Text style={styles.generalError}>{errorMessage}</Text>}

          <GradientButton
            accessibilityLabel="Sign in"
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}>
            {signInLabel}
          </GradientButton>

          <Pressable
            onPress={onForgotPassword}
            accessibilityRole="button"
            accessibilityLabel="Forgot your password"
            style={styles.forgotButton}
            hitSlop={8}>
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </Pressable>
        </View>
      </Modal>

      <RNModal visible={visible && status === 'success'} transparent={false} animationType="fade" statusBarTranslucent>
        <SplashScreen status="loading" loadingMessage="Signing you in…" />
      </RNModal>
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
  biometricButton: {
    marginTop: 26,
    marginHorizontal: 8,
    alignSelf: 'stretch',
  },
  dividerRow: {
    marginTop: 20,
    marginHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DefaultTheme.colors.line,
  },
  dividerText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 11.5,
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
  signInLabel: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  signInArrow: {
    color: DefaultTheme.colors.white,
    fontFamily: DefaultTheme.fonts.bodyBold,
    fontSize: 16,
    lineHeight: 16,
  },
  forgotButton: {
    marginTop: 18,
    alignSelf: 'center',
  },
  forgotText: {
    color: DefaultTheme.colors.primary,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
